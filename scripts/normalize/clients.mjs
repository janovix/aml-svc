#!/usr/bin/env node
/**
 * Launcher for TS normalize script (tsx via npx).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const amlSvcRoot = join(__dirname, "..", "..");

const r = spawnSync("npx", ["tsx", join(__dirname, "clients.ts")], {
	cwd: amlSvcRoot,
	stdio: "inherit",
	env: process.env,
	shell: true,
});

process.exit(r.status ?? 1);
