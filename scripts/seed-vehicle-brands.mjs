import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the SQL seed file
const sqlFile = join(__dirname, "seed-vehicle-brands.sql");

// Determine if we're running locally or remotely based on environment
const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
const configFlag = process.env.WRANGLER_CONFIG
	? `--config ${process.env.WRANGLER_CONFIG}`
	: "";

try {
	console.log(
		`Seeding vehicle-brands catalog (${isRemote ? "remote" : "local"})...`,
	);

	const command = isRemote
		? `wrangler d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
		: `wrangler d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

	execSync(command, { stdio: "inherit" });
	console.log("Vehicle-brands catalog seeded successfully!");
} catch (error) {
	console.error("Error seeding vehicle-brands catalog:", error);
	process.exit(1);
}
