#!/usr/bin/env node
/**
 * Seed Validation Script
 *
 * Validates that every model declared in Prisma schema has a corresponding seed script.
 * This ensures that dev/preview environments always have test data available.
 *
 * Usage: node scripts/seed/validate.mjs
 */

import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "../..");

// Models that don't need seeds (junction tables, enums-only, etc.)
const EXCLUDED_MODELS = new Set([
	"CatalogItem", // Populated via catalog population, not seeded
	"TransactionPaymentMethod", // Created via Transaction seed
	"ClientDocument", // Created via Client seed
	"ClientAddress", // Created via Client seed
	"Alert", // Created via alert detection worker, not seeded
]);

// Models that are populated, not seeded
const POPULATED_MODELS = new Set([
	"Catalog", // Populated via populate scripts
	"UmaValue", // Populated via migration
]);

/**
 * Extract model names from Prisma schema
 */
function extractModelsFromSchema() {
	const schemaPath = join(ROOT_DIR, "prisma/schema.prisma");
	const schemaContent = readFileSync(schemaPath, "utf-8");

	const modelRegex = /^model\s+(\w+)/gm;
	const models = [];
	let match;

	while ((match = modelRegex.exec(schemaContent)) !== null) {
		models.push(match[1]);
	}

	return models;
}

/**
 * Get existing seed scripts
 */
async function getExistingSeedScripts() {
	const seedDir = join(ROOT_DIR, "scripts/seed");
	const files = await readdir(seedDir);

	return files
		.filter((file) => file.endsWith(".mjs") && file !== "validate.mjs")
		.map((file) => file.replace(".mjs", "").replace("seed-", ""));
}

/**
 * Map seed script names to model names
 */
function mapSeedScriptToModel(seedScript) {
	// Convert kebab-case to PascalCase
	// Example: "seed-client" -> "Client", "seed-alert-rule" -> "AlertRule"
	const parts = seedScript.split("-");
	// Skip "seed" prefix if present
	const modelParts = parts[0] === "seed" ? parts.slice(1) : parts;
	const modelName = modelParts
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");

	return modelName;
}

/**
 * Map model name to seed script filename
 */
function mapModelToSeedScript(model) {
	// Convert PascalCase to kebab-case
	// Example: "Client" -> "seed-client.mjs", "AlertRule" -> "seed-alert-rule.mjs"
	const kebabCase = model
		.replace(/([A-Z])/g, "-$1")
		.toLowerCase()
		.replace(/^-/, "");
	return `seed-${kebabCase}.mjs`;
}

/**
 * Main validation function
 */
async function validateSeeds() {
	console.log("🔍 Validating seed scripts...\n");

	const models = extractModelsFromSchema();
	const existingSeeds = await getExistingSeedScripts();
	const seedModels = new Set(existingSeeds.map(mapSeedScriptToModel));

	const missing = [];
	const errors = [];

	for (const model of models) {
		if (EXCLUDED_MODELS.has(model)) {
			console.log(`⏭️  Skipping ${model} (excluded)`);
			continue;
		}

		if (POPULATED_MODELS.has(model)) {
			console.log(`📦 Skipping ${model} (populated, not seeded)`);
			continue;
		}

		if (!seedModels.has(model)) {
			missing.push(model);
			const expectedScript = mapModelToSeedScript(model);
			errors.push(
				`❌ Missing seed script for model: ${model}\n   Expected: scripts/seed/${expectedScript}`,
			);
		} else {
			console.log(`✅ Found seed script for ${model}`);
		}
	}

	console.log("\n" + "=".repeat(60));

	if (errors.length > 0) {
		console.error("\n❌ Seed validation failed!\n");
		console.error(errors.join("\n\n"));
		console.error(`\n📝 Total missing: ${missing.length} model(s)\n`);
		process.exit(1);
	}

	console.log("\n✅ All models have seed scripts!");
	console.log(`📊 Validated ${models.length} models`);
	process.exit(0);
}

// Run validation
validateSeeds().catch((error) => {
	console.error("Fatal error during seed validation:", error);
	process.exit(1);
});
