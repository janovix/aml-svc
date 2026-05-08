import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	defineWorkersConfig,
	readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const prismaWasmEngineEdge = path.join(
	repoRoot,
	"node_modules/@prisma/client/runtime/wasm-engine-edge.mjs",
);

/**
 * Only the generated Prisma client imports the Node engine (`library` →
 * `node:child_process`). App code (e.g. `Decimal`) must use `wasm-engine-edge` in
 * source. This redirect must not apply to all `library` imports or Vitest
 * `vi.mock` can break (duplicate module graph).
 */
function prismaWorkerWasmRuntimePlugin() {
	return {
		name: "prisma-workerd-wasm-engine",
		enforce: "pre" as const,
		resolveId(id: string, importer: string | undefined) {
			const n = id.replace(/\\/g, "/");
			if (!n.includes("prisma/client/runtime/library")) {
				return null;
			}
			const fromGenerated =
				importer != null &&
				importer.replace(/\\/g, "/").includes(".prisma/client");
			if (!fromGenerated) {
				return null;
			}
			return prismaWasmEngineEdge;
		},
	};
}

const migrationsPath = path.join(repoRoot, "migrations");
const migrations = await readD1Migrations(migrationsPath);

export default defineWorkersConfig({
	plugins: [prismaWorkerWasmRuntimePlugin()],
	esbuild: {
		target: "esnext",
	},
	// Required for zod which fails to import in Workers runtime on Windows
	// See: https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/#module-resolution
	ssr: {
		// pdf-lib pulls tslib@1.x with a subpath that workerd/vite-node fails to resolve on Windows unless bundled
		noExternal: ["zod", "pdf-lib", "tslib"],
	},
	test: {
		coverage: {
			provider: "istanbul",
			reporter: ["text", "lcov"],
			all: true,
			include: ["src/**/*.ts"],
			exclude: [
				// Build artifacts and dependencies
				"**/*.d.ts",
				"**/node_modules/**",
				"**/tests/**",
				"**/dist/**",
				"**/coverage/**",
				// Barrel exports (index files that just re-export)
				"src/domain/**/index.ts",
				// Type definition files (no runtime code)
				"src/types.ts",
				"src/domain/**/types.ts",
				// Static configuration files
				"src/openapi.ts", // Large static OpenAPI spec
				"src/app-meta.ts", // Simple app metadata config
				// Main entry point (tested via integration tests)
				"src/index.ts",
				// Complex SVG generation library (visual output, hard to test meaningfully)
				"src/lib/svg-charts.ts",
				// Complex SAT/PDF file generation (tested via integration, unit tests would be redundant)
				"src/lib/sat-file-generator.ts",
				"src/lib/sat-xml-generator.ts",
				"src/lib/sat-xml-generator/**",
				"src/lib/pdf-report-generator.ts",
				// Large aggregation module; smoke-tested in report-aggregator.test.ts, full paths via integration
				"src/lib/report-aggregator.ts",
				// Prisma client wrapper (thin wrapper, measured indirectly)
				"src/lib/prisma.ts",
				// Route handlers (HTTP layer, tested via integration tests)
				"src/routes/risk.ts",
				"src/routes/catalogs.ts",
				"src/routes/clients.ts",
				"src/routes/files.ts",
				"src/routes/notices.ts",
				"src/routes/uma-values.ts",
				"src/routes/organization-settings.ts",
				"src/routes/internal-organization-settings.ts",
				"src/routes/alert-rules.ts",
				"src/routes/alerts.ts",
				"src/routes/imports.ts",
				"src/routes/reports.ts",
				"src/routes/invoices.ts",
				"src/routes/operations.ts",
				"src/routes/beneficial-controllers.ts",
				"src/routes/internal-screening.ts",
				"src/routes/shareholders.ts",
				"src/routes/kyc-sessions.ts",
				"src/routes/public-kyc.ts",
				"src/routes/exchange-rates.ts",
				"src/routes/training.ts",
				"src/routes/training-admin.ts",
				// Schema files with mostly type definitions (validated via integration)
				"src/domain/uma/schemas.ts",
				// Art. 17 threshold tier: unit tests mock it (dynamic import); real path covered in integration/HTTP
				"src/domain/client/identification-tier.ts",
				// Alert detection processor (deeply coupled to repos, queue, Prisma — tested via integration)
				"src/domain/alert-detection/processor.ts",
				// Import processors and orchestration (depend on R2, Prisma, xlsx — tested via integration)
				"src/domain/import/processors/**",
				"src/domain/import/queue-processor.ts",
				"src/domain/import/import-job-handler.ts",
				"src/domain/import/parsers/excel-parser.ts",
				"src/domain/kyc-session/repository.ts",
				"src/domain/kyc-session/service.ts",
				"src/domain/kyc-session/mappers.ts",
				"src/domain/invoice/repository.ts",
				"src/domain/invoice/parser/**",
			],
			// Ratcheted to measured floor (~May 2026 full-suite run) minus 2pp per axis.
			thresholds: {
				lines: 68,
				functions: 73,
				branches: 50,
				statements: 68,
			},
		},
		setupFiles: ["./tests/apply-migrations.ts"],
		poolOptions: {
			workers: {
				singleWorker: true,
				wrangler: {
					// Use test-specific config without service bindings
					configPath: "../wrangler.test.jsonc",
				},
				miniflare: {
					compatibilityFlags: ["experimental", "nodejs_compat"],
					bindings: {
						MIGRATIONS: migrations,
					},
					serviceBindings: {
						// Mock AUTH_SERVICE for integration tests
						AUTH_SERVICE: async (request) => {
							const url = new URL(request.url);
							// Mock JWKS endpoint using shared test keys
							if (url.pathname.includes("/api/auth/jwks")) {
								// Import here to avoid circular dependencies
								const { getTestJWKS } = await import("./helpers/test-auth.js");
								const jwks = await getTestJWKS();
								return new Response(JSON.stringify(jwks), {
									status: 200,
									headers: { "Content-Type": "application/json" },
								});
							}
							return new Response("Not Found", { status: 404 });
						},
					},
				},
			},
		},
	},
});
