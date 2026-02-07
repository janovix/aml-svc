#!/usr/bin/env node
/**
 * Populate All Catalogs
 *
 * Runs all catalog population scripts EXCEPT large catalogs.
 * Large catalogs (zip-codes, cfdi-units, cfdi-product-services) should be
 * populated separately using their dedicated scripts.
 *
 * Usage:
 *   pnpm populate:catalogs          # Local (default DB)
 *   pnpm populate:catalogs:local    # Local (wrangler.local.jsonc)
 *   pnpm populate:catalogs:dev      # Remote dev
 *   pnpm populate:catalogs:prod     # Remote prod
 *   pnpm populate:catalogs:preview  # Remote preview
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Core catalogs - fast to populate, essential for app functionality
const CORE_CATALOGS = [
	// Legacy/Essential catalogs
	"catalog-armor-levels.mjs",
	"catalog-business-activities.mjs",
	"catalog-countries.mjs",
	"catalog-currencies.mjs",
	"catalog-economic-activities.mjs",
	"catalog-operation-types.mjs",
	"catalog-payment-forms.mjs",
	"catalog-payment-methods.mjs",
	"catalog-states.mjs",
	"catalog-vulnerable-activities.mjs",
];

// Vehicle brands - moderate size
const VEHICLE_CATALOGS = [
	"catalog-terrestrial-vehicle-brands.mjs",
	"catalog-maritime-vehicle-brands.mjs",
	"catalog-air-vehicle-brands.mjs",
];

// CFDI catalogs (SAT c_* catalogs) - small to medium size
const CFDI_CATALOGS = [
	"catalog-cfdi-payment-forms.mjs",
	"catalog-cfdi-payment-methods.mjs",
	"catalog-cfdi-tax-regimes.mjs",
	"catalog-cfdi-usages.mjs",
	"catalog-cfdi-voucher-types.mjs",
	"catalog-cfdi-currencies.mjs",
	"catalog-cfdi-countries.mjs",
	"catalog-cfdi-taxes.mjs",
	"catalog-cfdi-tax-factors.mjs",
	"catalog-cfdi-tax-objects.mjs",
	"catalog-cfdi-relation-types.mjs",
	"catalog-cfdi-export-types.mjs",
];

// CFDI-PLD integration
const CFDI_PLD_CATALOGS = ["catalog-cfdi-pld-mappings.mjs"];

// PLD consolidated catalogs (15 catalogs: alert-types, monetary-instruments, etc.)
const PLD_CATALOGS = ["catalog-pld-consolidated.mjs"];

// Activity-specific catalogs (47 catalogs across all 19 vulnerable activities)
const ACTIVITY_CATALOGS = ["catalog-activity-all.mjs"];

// Large catalogs - excluded by default, run separately
// These are EXCLUDED from the default "all" script
// Prefixed with _ to indicate intentionally unused (for documentation purposes)
const _LARGE_CATALOGS = [
	// "catalog-zip-codes.mjs",              // ~140K+ items
	// "catalog-cfdi-units.mjs",             // ~1K items (batched)
	// "catalog-cfdi-product-services.mjs",  // ~52K items (batched)
];

// Reference _LARGE_CATALOGS to satisfy linter (it's kept for documentation)
void _LARGE_CATALOGS;

// Combine all catalogs (excluding large ones)
const catalogScripts = [
	...CORE_CATALOGS,
	...VEHICLE_CATALOGS,
	...CFDI_CATALOGS,
	...CFDI_PLD_CATALOGS,
	...PLD_CATALOGS,
	...ACTIVITY_CATALOGS,
];

async function populateAllCatalogs() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║           Catalog Population (Core + Essential)            ║");
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
	console.log(`📋 Catalogs to populate: ${catalogScripts.length}`);
	console.log(`⚠️  Large catalogs excluded (run separately if needed)\n`);

	let completed = 0;
	for (const script of catalogScripts) {
		const scriptPath = join(__dirname, script);
		completed++;
		console.log(`[${completed}/${catalogScripts.length}] Running ${script}...`);
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
		`✅ ${catalogScripts.length} catalog scripts completed successfully!`,
	);
	console.log("\n💡 To populate large catalogs (optional), run:");
	console.log("   pnpm populate:catalogs:large");
	console.log("   - or individually:");
	console.log("   pnpm populate:catalog:zip-codes");
	console.log("   pnpm populate:catalog:cfdi-units");
	console.log("   pnpm populate:catalog:cfdi-product-services");
}

populateAllCatalogs().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
