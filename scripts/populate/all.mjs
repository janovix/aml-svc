#!/usr/bin/env node
/**
 * Populate All Catalogs
 *
 * Master script that runs all catalog population scripts.
 * This includes both regular catalogs and SAT catalogs.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function populateAll() {
	console.log("🚀 Starting catalog population...\n");

	// Populate regular catalogs
	console.log("=".repeat(60));
	console.log("Regular Catalogs");
	console.log("=".repeat(60));
	try {
		execSync(`node "${join(__dirname, "all-catalogs.mjs")}"`, {
			stdio: "inherit",
		});
	} catch (error) {
		console.error("Failed to populate regular catalogs:", error);
		process.exit(1);
	}

	// Populate SAT catalogs
	console.log("\n" + "=".repeat(60));
	console.log("SAT Catalogs");
	console.log("=".repeat(60));
	try {
		execSync(`node "${join(__dirname, "all-sat-catalogs.mjs")}"`, {
			stdio: "inherit",
		});
	} catch (error) {
		console.error("Failed to populate SAT catalogs:", error);
		process.exit(1);
	}

	console.log("\n✅ All catalogs populated successfully!");
}

populateAll().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
