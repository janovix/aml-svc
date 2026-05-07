/**
 * Idempotent normalization for legacy client rows:
 * - ISO-3166 alpha-3 / catalog UUID → alpha-2 for nationality / country_code / country
 * - Activity fields → SAT metadata.code (7-digit) using the correct catalog per person type
 * - Refresh resolved_names from catalogs
 *
 * Run from aml-svc root:
 *   pnpm normalize:clients:local
 *   pnpm normalize:clients:dev   (REMOTE=true + CF credentials)
 *
 * Optional: ORGANIZATION_ID=... to scope updates.
 */

import { resolve } from "node:path";
import { getPlatformProxy } from "wrangler";
import type { Client, Prisma } from "@prisma/client";
import { getPrismaClient } from "../../src/lib/prisma";
import { CatalogRepository } from "../../src/domain/catalog/repository";
import { CatalogNameResolver } from "../../src/domain/catalog/name-resolver";
import { getClientCatalogFields } from "../../src/domain/client/repository";

function mergePatch<T extends Record<string, unknown>>(
	row: T,
	patch: Record<string, unknown>,
): T {
	const out = { ...row };
	for (const [key, val] of Object.entries(patch)) {
		if (val !== undefined) {
			(out as Record<string, unknown>)[key] = val;
		}
	}
	return out;
}

async function normalizeCatalogFields(
	catalogRepo: CatalogRepository,
	row: Client,
): Promise<Prisma.ClientUpdateInput> {
	const updates: Prisma.ClientUpdateInput = {};
	const pt = String(row.personType).toUpperCase();

	const normCountryKey = async (key: keyof Pick<
		Client,
		"nationality" | "countryCode" | "country"
	>) => {
		const v = row[key];
		if (typeof v !== "string" || !v.trim()) return;
		const resolved = await catalogRepo.resolveStoredCountryCode(v);
		if (resolved && resolved !== v) {
			if (key === "nationality") updates.nationality = resolved;
			if (key === "countryCode") updates.countryCode = resolved;
			if (key === "country") updates.country = resolved;
		}
	};

	await normCountryKey("nationality");
	await normCountryKey("countryCode");
	await normCountryKey("country");

	if (pt === "PHYSICAL") {
		const v = row.economicActivityCode;
		if (typeof v === "string" && v.trim()) {
			const r = await catalogRepo.resolveStoredActivityCode(
				"economic-activities",
				v,
			);
			if (r !== v) updates.economicActivityCode = r;
		}
		if (row.commercialActivityCode) {
			updates.commercialActivityCode = null;
		}
	} else if (pt === "MORAL") {
		updates.economicActivityCode = null;
		let commercial = row.commercialActivityCode;
		const economic = row.economicActivityCode;
		if (!commercial?.trim() && typeof economic === "string" && economic.trim()) {
			commercial = economic;
			updates.commercialActivityCode = economic;
		}
		if (typeof commercial === "string" && commercial.trim()) {
			const r = await catalogRepo.resolveStoredActivityCode(
				"business-activities",
				commercial,
			);
			if (r !== commercial) updates.commercialActivityCode = r;
		}
	} else if (pt === "TRUST") {
		if (row.economicActivityCode) {
			updates.economicActivityCode = null;
		}
		if (row.commercialActivityCode) {
			updates.commercialActivityCode = null;
		}
	}

	return updates;
}

async function main(): Promise<void> {
	const orgFilter = (process.env.ORGANIZATION_ID ?? "").trim();
	const configFile =
		process.env.WRANGLER_CONFIG?.trim() || "wrangler.local.jsonc";
	const useRemote = process.env.REMOTE === "true" || process.env.CI === "true";

	console.log(`Normalize clients — config: ${configFile}, remote: ${useRemote}`);
	if (orgFilter) console.log(`Scoped to organization: ${orgFilter}`);

	const { env, dispose } = await getPlatformProxy({
		configPath: resolve(process.cwd(), configFile),
		remoteBindings: useRemote,
	});

	try {
		const db = env.DB as D1Database;
		const prisma = getPrismaClient(db);
		const catalogRepo = new CatalogRepository(prisma);
		const resolver = new CatalogNameResolver(catalogRepo);

		const where = {
			deletedAt: null,
			...(orgFilter ? { organizationId: orgFilter } : {}),
		};

		const rows = await prisma.client.findMany({ where });
		console.log(`Found ${rows.length} active clients`);

		let updated = 0;
		for (const row of rows) {
			const catalogUpdates = await normalizeCatalogFields(catalogRepo, row);
			const merged = mergePatch(
				row as unknown as Record<string, unknown>,
				catalogUpdates as Record<string, unknown>,
			);

			const fields = getClientCatalogFields(String(row.personType));
			const data: Record<string, unknown> = {
				personType: merged.personType,
				nationality: merged.nationality,
				countryCode: merged.countryCode,
				country: merged.country,
				stateCode: merged.stateCode,
				economicActivityCode: merged.economicActivityCode,
				commercialActivityCode: merged.commercialActivityCode,
			};
			const resolvedNames = await resolver.resolveNames(data, fields);
			const resolvedJson =
				Object.keys(resolvedNames).length > 0
					? JSON.stringify(resolvedNames)
					: null;

			const prismaPatch: Prisma.ClientUpdateInput = { ...catalogUpdates };
			const prevResolved = row.resolvedNames ?? null;
			if (resolvedJson !== prevResolved) {
				prismaPatch.resolvedNames = resolvedJson;
			}

			if (Object.keys(prismaPatch).length === 0) continue;

			await prisma.client.update({
				where: { id: row.id },
				data: prismaPatch,
			});
			updated++;
		}

		console.log(`✅ Done. Updated ${updated} client row(s).`);
	} finally {
		await dispose();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
