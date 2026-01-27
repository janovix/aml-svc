import path from "node:path";
import {
	defineWorkersConfig,
	readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

const migrationsPath = path.join(__dirname, "..", "migrations");
const migrations = await readD1Migrations(migrationsPath);

export default defineWorkersConfig({
	esbuild: {
		target: "esnext",
	},
	// Required for zod which fails to import in Workers runtime on Windows
	// See: https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/#module-resolution
	ssr: {
		// Force Vite to bundle zod instead of externalizing it
		noExternal: ["zod"],
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
				"src/lib/pdf-report-generator.ts",
				"src/lib/report-aggregator.ts",
				// Prisma client wrapper (thin wrapper, tested via repositories)
				"src/lib/prisma.ts",
				// Route handlers (HTTP layer, tested via integration tests)
				"src/routes/catalogs.ts",
				"src/routes/clients.ts",
				"src/routes/files.ts",
				"src/routes/notices.ts",
				"src/routes/transactions.ts",
				"src/routes/ubos.ts",
				"src/routes/uma-values.ts",
				"src/routes/organization-settings.ts",
				"src/routes/internal-organization-settings.ts",
				"src/routes/alert-rules.ts",
				"src/routes/alerts.ts",
				"src/routes/imports.ts",
				"src/routes/reports.ts",
				// Middleware (HTTP layer, tested via integration tests)
				"src/middleware/admin-auth.ts",
				"src/middleware/auth.ts",
				// Schema files with mostly type definitions (validated via integration)
				"src/domain/ubo/schemas.ts",
				"src/domain/uma/schemas.ts",
				// Organization settings domain (low usage, tested via integration)
				"src/domain/organization-settings/**",
				// Complex domain layers tested via integration tests
				"src/domain/alert/**",
				"src/domain/report/**",
				"src/domain/catalog/service.ts",
				"src/domain/catalog/schemas.ts",
				"src/domain/transaction/repository.ts",
				"src/domain/transaction/schemas.ts",
				"src/domain/transaction/mappers.ts",
				"src/domain/client/mappers.ts",
				"src/domain/client/schemas.ts",
				"src/domain/notice/mappers.ts",
				"src/domain/notice/schemas.ts",
				"src/domain/notice/service.ts",
			],
			thresholds: {
				lines: 85,
				functions: 85,
				branches: 85,
				statements: 85,
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
				},
			},
		},
	},
});
