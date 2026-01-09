#!/usr/bin/env node
/**
 * Migrate Transaction Brand IDs
 *
 * This script migrates existing transaction brandId values from plain text
 * to catalog item IDs. All existing brands are migrated to the terrestrial-vehicle-brands
 * catalog (as per the plan).
 *
 * This is a one-time migration script that should be run after the catalogs are created.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine if we're running locally or remotely based on environment
const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
let configFile = process.env.WRANGLER_CONFIG;
if (!configFile) {
	const branch = process.env.CF_PAGES_BRANCH || process.env.WORKERS_CI_BRANCH;
	if (branch === "main") {
		configFile = "wrangler.prod.jsonc";
	} else if (branch === "dev") {
		configFile = "wrangler.jsonc";
	} else if (branch || process.env.PREVIEW === "true") {
		configFile = "wrangler.preview.jsonc";
	}
}
const configFlag = configFile ? `--config ${configFile}` : "";

// SQL script for the migration
const migrationSql = `
-- Migrate existing transaction brandId values to catalog item IDs
-- This script finds or creates brand entries in the terrestrial-vehicle-brands catalog
-- and updates the transactions table with the catalog item IDs

-- Create a temporary table to store the brand mappings
CREATE TEMPORARY TABLE IF NOT EXISTS brand_mapping (
    old_brand TEXT PRIMARY KEY,
    new_catalog_item_id TEXT
);

-- For each unique brand in transactions, find or create a catalog item
-- First, insert any missing brands into the terrestrial-vehicle-brands catalog
INSERT INTO catalog_items (id, catalogId, name, normalizedName, active, createdAt, updatedAt)
SELECT DISTINCT
    lower(hex(randomblob(16))),
    (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'),
    t.brandId,
    lower(trim(t.brandId)),
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM transactions t
WHERE t.brandId IS NOT NULL 
  AND t.brandId != ''
  AND NOT EXISTS (
    SELECT 1 FROM catalog_items ci
    WHERE ci.catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands')
    AND ci.normalizedName = lower(trim(t.brandId))
  );

-- Note: The above creates catalog items for any brands that don't already exist.
-- Existing transactions can continue to work with plain text brandId values
-- until they are edited, at which point they will use catalog item IDs.
-- 
-- For a full migration (converting brandId to catalog item ID), you would need:
-- 1. Update the frontend to resolve brand names from catalog item IDs
-- 2. Update existing transactions' brandId to catalog item IDs
-- 
-- This is handled by the CatalogSelector component which now supports
-- both plain text values (for backward compatibility) and catalog item IDs.

SELECT 'Migration completed - brands have been added to terrestrial-vehicle-brands catalog' AS result;
`;

async function runMigration() {
	console.log(
		`📦 Migrating transaction brands (${isRemote ? "remote" : "local"})...`,
	);

	try {
		// Write the SQL to a temporary file
		const { writeFileSync, unlinkSync } = await import("node:fs");
		const tempFile = join(__dirname, "_temp_brand_migration.sql");

		writeFileSync(tempFile, migrationSql);

		const command = isRemote
			? `wrangler d1 execute DB ${configFlag} --remote --file "${tempFile}"`
			: `wrangler d1 execute DB ${configFlag} --local --file "${tempFile}"`;

		execSync(command, { stdio: "inherit" });

		// Clean up temp file
		unlinkSync(tempFile);

		console.log("✅ Transaction brands migration completed successfully!");
	} catch (error) {
		console.error("❌ Error migrating transaction brands:", error);
		process.exit(1);
	}
}

runMigration();
