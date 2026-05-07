#!/usr/bin/env node
/**
 * Thin launcher so the plan path `scripts/normalize/clients.mjs` exists.
 * Runs the TypeScript implementation via tsx.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const res = spawnSync(cmd, ["exec", "tsx", "scripts/normalize/clients.ts"], {
	cwd: root,
	stdio: "inherit",
	shell: process.platform === "win32",
});
process.exit(res.status === null ? 1 : res.status);
