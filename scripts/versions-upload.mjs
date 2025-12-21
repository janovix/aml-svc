import { execSync } from "node:child_process";

if (process.env.WORKERS_CI_BRANCH === "main") {
	console.log("Skipping versions:upload because WORKERS_CI_BRANCH=main");
	process.exit(0);
}

// Set preview environment variables for populate and seed scripts
const env = {
	...process.env,
	PREVIEW: "true",
	WRANGLER_CONFIG: "wrangler.preview.jsonc",
};

execSync("pnpm run predeploy:preview", { stdio: "inherit", env });
// Populate catalogs (required for all environments)
execSync("pnpm run populate", { stdio: "inherit", env });
// Seed synthetic data (only for dev/preview)
execSync("pnpm run seed", { stdio: "inherit", env });
execSync("wrangler versions upload --config wrangler.preview.jsonc", {
	stdio: "inherit",
});
