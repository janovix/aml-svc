#!/usr/bin/env node
/**
 * Cleanup Consolidated Catalogs
 *
 * Removes activity-specific CSV files that have been consolidated into pld-* catalogs.
 * Only keeps unique activity-specific catalogs that weren't consolidated.
 */

import {
	readFileSync,
	writeFileSync,
	existsSync,
	unlinkSync,
	readdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ACTIVITY_DIR = join(__dirname, "output", "activity-catalogs");
const PLD_DIR = join(__dirname, "output", "pld-catalogs");

function cleanup() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║      Cleanup Consolidated Activity Catalogs                ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	// Read PLD manifest to get list of consolidated source files
	const pldManifestPath = join(PLD_DIR, "_manifest.json");
	if (!existsSync(pldManifestPath)) {
		console.error(
			"❌ PLD manifest not found. Run consolidation scripts first.",
		);
		process.exit(1);
	}

	const pldManifest = JSON.parse(readFileSync(pldManifestPath, "utf-8"));

	// Collect all source files that were consolidated
	const consolidatedSources = new Set();
	for (const catalog of pldManifest.catalogs) {
		if (catalog.sources) {
			for (const source of catalog.sources) {
				consolidatedSources.add(source);
			}
		}
	}

	console.log(
		`📋 Found ${consolidatedSources.size} source files that were consolidated\n`,
	);

	// Get current files in activity-catalogs
	const currentFiles = readdirSync(ACTIVITY_DIR).filter((f) =>
		f.endsWith(".csv"),
	);
	console.log(`📁 Current activity-specific files: ${currentFiles.length}\n`);

	// Delete consolidated source files
	const deleted = [];
	const kept = [];

	for (const file of currentFiles) {
		if (consolidatedSources.has(file)) {
			const filepath = join(ACTIVITY_DIR, file);
			try {
				unlinkSync(filepath);
				deleted.push(file);
				console.log(`   🗑️  Deleted: ${file}`);
			} catch (e) {
				console.log(`   ⚠️  Failed to delete: ${file} - ${e.message}`);
			}
		} else {
			kept.push(file);
		}
	}

	// Update activity-catalogs manifest
	const activityManifestPath = join(ACTIVITY_DIR, "_manifest.json");
	if (existsSync(activityManifestPath)) {
		const activityManifest = JSON.parse(
			readFileSync(activityManifestPath, "utf-8"),
		);

		// Filter out consolidated catalogs
		activityManifest.catalogs = activityManifest.catalogs.filter(
			(c) => !consolidatedSources.has(c.filename),
		);

		writeFileSync(
			activityManifestPath,
			JSON.stringify(activityManifest, null, 2),
		);
		console.log(`\n   📝 Updated activity-catalogs manifest`);
	}

	console.log(
		"\n╔════════════════════════════════════════════════════════════╗",
	);
	console.log("║                         Summary                            ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log(`   🗑️  Deleted (consolidated): ${deleted.length} files`);
	console.log(`   ✅ Remaining (unique): ${kept.length} files\n`);

	if (kept.length > 0) {
		console.log("   Remaining activity-specific catalogs:");
		// Group by activity
		const byActivity = {};
		for (const file of kept.sort()) {
			const activity = file.split("-")[0].toUpperCase();
			if (!byActivity[activity]) byActivity[activity] = [];
			byActivity[activity].push(
				file.replace(".csv", "").replace(`${file.split("-")[0]}-`, ""),
			);
		}

		for (const [activity, catalogs] of Object.entries(byActivity).sort()) {
			console.log(`      ${activity}: ${catalogs.join(", ")}`);
		}
	}

	console.log("\n✅ Cleanup complete!");
}

cleanup();
