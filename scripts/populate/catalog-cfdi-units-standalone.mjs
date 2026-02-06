#!/usr/bin/env node
/**
 * Standalone script to populate CFDI Units catalog
 *
 * This is a wrapper that can be run independently with environment-specific configs.
 * Usage:
 *   pnpm populate:catalog:cfdi-units
 *   pnpm populate:catalog:cfdi-units:local
 *   pnpm populate:catalog:cfdi-units:dev
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const env = { ...process.env };
if (process.env.WRANGLER_CONFIG) {
	env.WRANGLER_CONFIG = process.env.WRANGLER_CONFIG;
}

try {
	execSync(`node "${join(__dirname, "catalog-cfdi-units.mjs")}"`, {
		stdio: "inherit",
		env,
	});
} catch (error) {
	console.error("Failed to populate CFDI units catalog:", error);
	process.exit(1);
}
