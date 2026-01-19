import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Parse DATABASE_URL if available (for consistency with Prisma)
function parseDatabaseConfig() {
	const databaseUrl = process.env.DATABASE_URL;

	if (databaseUrl) {
		try {
			// Parse DATABASE_URL: mysql://user:password@host:port/database
			const url = new URL(databaseUrl);
			return {
				host: url.hostname,
				user: url.username,
				password: decodeURIComponent(url.password), // Decode password
				database: url.pathname.slice(1), // Remove leading slash
				port: parseInt(url.port) || 3306,
			};
		} catch (error) {
			console.warn(
				"⚠️  Failed to parse DATABASE_URL, falling back to individual env vars",
			);
		}
	}

	// Fallback to individual env variables
	return {
		host: process.env.DB_HOST || "localhost",
		user: process.env.DB_USER || "root",
		password: process.env.DB_PASSWORD || "",
		database: process.env.DB_NAME || "bogorjuniorfs",
		port: process.env.DB_PORT || 3306,
	};
}

const dbConfig = parseDatabaseConfig();

// Debug: Log database configuration (without password)
console.log("🔧 Database Configuration:");
console.log(
	"  Source:",
	process.env.DATABASE_URL ? "DATABASE_URL" : "Individual env vars",
);
console.log("  Host:", dbConfig.host);
console.log("  User:", dbConfig.user);
console.log("  Password:", dbConfig.password ? "***SET***" : "NOT SET");
console.log("  Database:", dbConfig.database);
console.log("  Port:", dbConfig.port);
console.log("  NODE_ENV:", process.env.NODE_ENV || "development");

// Circuit Breaker State untuk mencegah retry berlebihan
let circuitBreakerState = {
	failures: 0,
	lastFailure: null,
	isOpen: false,
	resetTimeout: null,
	MAX_FAILURES: 5, // Max 5 failures sebelum circuit open
	RESET_TIMEOUT: 60000, // Reset setelah 60 detik
};

const pool = mysql.createPool({
	...dbConfig,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	enableKeepAlive: true,
	keepAliveInitialDelay: 0,
});

// Wrapper function dengan circuit breaker
export async function getConnection() {
	// Jika circuit breaker terbuka, langsung reject tanpa coba koneksi
	if (circuitBreakerState.isOpen) {
		const timeSinceFailure = Date.now() - circuitBreakerState.lastFailure;
		if (timeSinceFailure < circuitBreakerState.RESET_TIMEOUT) {
			const waitTime = Math.ceil(
				(circuitBreakerState.RESET_TIMEOUT - timeSinceFailure) / 1000,
			);
			throw new Error(
				`Database circuit breaker is OPEN. Too many connection failures. Retry in ${waitTime} seconds.`,
			);
		} else {
			// Reset circuit breaker setelah timeout
			console.log("🔄 Circuit breaker reset, trying database connection...");
			circuitBreakerState.isOpen = false;
			circuitBreakerState.failures = 0;
		}
	}

	try {
		const connection = await pool.getConnection();
		// Reset failures on successful connection
		if (circuitBreakerState.failures > 0) {
			console.log("✅ Database connection restored");
			circuitBreakerState.failures = 0;
		}
		return connection;
	} catch (error) {
		// Increment failure counter
		circuitBreakerState.failures++;
		circuitBreakerState.lastFailure = Date.now();

		console.error(
			`❌ Database connection failed (${circuitBreakerState.failures}/${circuitBreakerState.MAX_FAILURES}):`,
			error.message,
		);

		// Open circuit breaker jika terlalu banyak failures
		if (circuitBreakerState.failures >= circuitBreakerState.MAX_FAILURES) {
			circuitBreakerState.isOpen = true;
			console.error(
				"🚨 CIRCUIT BREAKER OPEN - Database connection attempts suspended for 60 seconds",
			);
			console.error(
				"⚠️  This prevents resource exhaustion from repeated connection failures",
			);
		}

		throw error;
	}
}

// Test database connection (non-blocking)
setTimeout(async () => {
	try {
		const connection = await getConnection();
		console.log("✅ Database connected successfully");
		connection.release();
	} catch (error) {
		console.error("❌ Initial database connection failed:", error.message);
		console.error(
			"⚠️  App will continue running but database operations will fail",
		);
		console.error(
			"💡 Fix: Check environment variables or create .env file on server",
		);
	}
}, 2000); // Test after 2 seconds to not block server startup

export default pool;
