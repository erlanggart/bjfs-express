import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function testDatabaseConnection() {
	console.log("🔍 Testing Database Connection...\n");

	// Display database configuration (without password)
	console.log("📋 Database Configuration:");
	console.log(
		"  DATABASE_URL:",
		process.env.DATABASE_URL
			? process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@")
			: "NOT SET",
	);
	console.log("  NODE_ENV:", process.env.NODE_ENV || "development");
	console.log("");

	try {
		// Test 1: Check if Prisma can connect
		console.log("✅ Test 1: Checking Prisma connection...");
		await prisma.$connect();
		console.log("   ✓ Prisma connected successfully!\n");

		// Test 2: Execute a simple query
		console.log("✅ Test 2: Executing test query...");
		const result = await prisma.$queryRaw`SELECT 1 + 1 AS result`;
		console.log("   ✓ Query executed successfully!");
		console.log("   Result:", result);
		console.log("");

		// Test 3: Check database name
		console.log("✅ Test 3: Checking database info...");
		const dbInfo =
			await prisma.$queryRaw`SELECT DATABASE() as db_name, VERSION() as version`;
		console.log("   ✓ Database Name:", dbInfo[0].db_name);
		console.log("   ✓ MySQL Version:", dbInfo[0].version);
		console.log("");

		// Test 4: Count tables (optional)
		console.log("✅ Test 4: Checking tables...");
		try {
			const tables = await prisma.$queryRaw`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
      `;
			console.log("   ✓ Total Tables:", tables[0].table_count);
		} catch (err) {
			console.log("   ⚠️  Could not count tables:", err.message);
		}
		console.log("");

		console.log("═════════════════════════════════════════");
		console.log("✅ DATABASE CONNECTION SUCCESSFUL!");
		console.log("═════════════════════════════════════════\n");

		return true;
	} catch (error) {
		console.log("\n═════════════════════════════════════════");
		console.log("❌ DATABASE CONNECTION FAILED!");
		console.log("═════════════════════════════════════════");
		console.log("\n🔴 Error Details:");
		console.log("   Type:", error.constructor.name);
		console.log("   Message:", error.message);

		if (error.code) {
			console.log("   Code:", error.code);
		}

		console.log("\n💡 Troubleshooting:");
		console.log("   1. Check if MySQL server is running");
		console.log("   2. Verify DATABASE_URL in .env file");
		console.log("   3. Ensure database exists");
		console.log("   4. Check database credentials (user/password)");
		console.log("   5. Verify network connectivity to database server");
		console.log("");

		return false;
	} finally {
		await prisma.$disconnect();
	}
}

// Run the test
testDatabaseConnection()
	.then((success) => {
		process.exit(success ? 0 : 1);
	})
	.catch((error) => {
		console.error("Unexpected error:", error);
		process.exit(1);
	});
