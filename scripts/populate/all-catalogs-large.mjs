#!/usr/bin/env node
/**
 * Populate Large Catalogs
 *
 * Runs only the large catalog population scripts that take significant time.
 * These are separated from the main catalog population for flexibility.
 *
 * Large catalogs:
 * - catalog-zip-codes.mjs          (~140K+ items)
 * - catalog-cfdi-units.mjs         (~1K items, batched)
 * - catalog-cfdi-product-services.mjs (~52K items, batched)
 *
 * Usage:
 *   pnpm populate:catalogs:large        # Local (default DB)
 *   pnpm populate:catalogs:large:local  # Local (wrangler.local.jsonc)
 *   pnpm populate:catalogs:large:dev    # Remote dev
 *   pnpm populate:catalogs:large:prod   # Remote prod
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const largeCatalogScripts = [
	"catalog-zip-codes.mjs", // ~140K+ items
	"catalog-cfdi-units.mjs", // ~1K items (batched)
	"catalog-cfdi-product-services.mjs", // ~52K items (batched)
];

async function populateLargeCatalogs() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║           Large Catalog Population                         ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	const env = { ...process.env };
	// Inherit WRANGLER_CONFIG if set
	if (process.env.WRANGLER_CONFIG) {
		env.WRANGLER_CONFIG = process.env.WRANGLER_CONFIG;
	}

	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
	console.log(`📦 Mode: ${isRemote ? "remote" : "local"}`);
	console.log(`📋 Large catalogs to populate: ${largeCatalogScripts.length}`);
	console.log(`⚠️  This may take several minutes...\n`);

	let completed = 0;
	for (const script of largeCatalogScripts) {
		const scriptPath = join(__dirname, script);
		completed++;
		console.log(
			`[${completed}/${largeCatalogScripts.length}] Running ${script}...`,
		);
		try {
			execSync(`node "${scriptPath}"`, {
				stdio: "inherit",
				env,
			});
			console.log(`✅ ${script} completed\n`);
		} catch (error) {
			console.error(`❌ Failed to run ${script}:`, error);
			process.exit(1);
		}
	}

	console.log(
		"\n╔════════════════════════════════════════════════════════════╗",
	);
	console.log("║                    Summary                                 ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log(
		`✅ ${largeCatalogScripts.length} large catalog scripts completed successfully!`,
	);
}

populateLargeCatalogs().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
