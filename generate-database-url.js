#!/usr/bin/env node

/**
 * Script untuk generate DATABASE_URL dengan password yang sudah di-encode
 * Gunakan script ini jika password database Anda punya karakter special
 */

import readline from "readline";

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

console.log("═══════════════════════════════════════════════════════════");
console.log("🔧 DATABASE_URL Generator dengan Password Encoding");
console.log("═══════════════════════════════════════════════════════════\n");

console.log("Script ini akan membantu membuat DATABASE_URL yang benar");
console.log(
	"untuk database dengan password yang mengandung karakter special.\n",
);

const questions = {
	host: "Database Host (contoh: mysql.hostinger.com): ",
	user: "Database User (contoh: u702886622_erlangga): ",
	password: "Database Password (akan di-encode otomatis): ",
	database: "Database Name (contoh: u702886622_bogorjuniorfs): ",
	port: "Database Port (default: 3306): ",
};

const answers = {};

function ask(key) {
	return new Promise((resolve) => {
		rl.question(questions[key], (answer) => {
			answers[key] = answer.trim() || (key === "port" ? "3306" : "");
			resolve();
		});
	});
}

async function main() {
	try {
		// Tanya semua pertanyaan
		for (const key in questions) {
			await ask(key);
		}

		rl.close();

		// Encode password untuk URL
		const encodedPassword = encodeURIComponent(answers.password);

		// Generate DATABASE_URL
		const databaseUrl = `mysql://${answers.user}:${encodedPassword}@${answers.host}:${answers.port}/${answers.database}`;

		console.log(
			"\n═══════════════════════════════════════════════════════════",
		);
		console.log("✅ DATABASE_URL BERHASIL DI-GENERATE!");
		console.log(
			"═══════════════════════════════════════════════════════════\n",
		);

		console.log("📋 Informasi Database:");
		console.log(`   Host     : ${answers.host}`);
		console.log(`   User     : ${answers.user}`);
		console.log(`   Password : ${answers.password}`);
		console.log(`   Database : ${answers.database}`);
		console.log(`   Port     : ${answers.port}`);
		console.log("");

		console.log("🔐 Password Encoding:");
		console.log(`   Original : ${answers.password}`);
		console.log(`   Encoded  : ${encodedPassword}`);
		console.log("");

		console.log("📝 DATABASE_URL (Copy ini ke .env file):");
		console.log("─────────────────────────────────────────────────────────");
		console.log(`DATABASE_URL="${databaseUrl}"`);
		console.log("─────────────────────────────────────────────────────────");
		console.log("");

		console.log("💡 Cara Pakai:");
		console.log("1. Copy DATABASE_URL di atas");
		console.log("2. Paste ke file .env di server");
		console.log("3. Save dan restart aplikasi");
		console.log("");

		console.log("📌 Contoh isi .env lengkap:");
		console.log("─────────────────────────────────────────────────────────");
		console.log("NODE_ENV=production");
		console.log("PORT=3000");
		console.log(`DATABASE_URL="${databaseUrl}"`);
		console.log(`DB_HOST=${answers.host}`);
		console.log(`DB_USER=${answers.user}`);
		console.log(`DB_PASSWORD=${answers.password}`);
		console.log(`DB_NAME=${answers.database}`);
		console.log(`DB_PORT=${answers.port}`);
		console.log("JWT_SECRET=your-jwt-secret-here");
		console.log("CORS_ORIGIN=https://your-frontend-domain.com");
		console.log("─────────────────────────────────────────────────────────");
		console.log("");
	} catch (error) {
		console.error("❌ Error:", error.message);
		rl.close();
		process.exit(1);
	}
}

main();
