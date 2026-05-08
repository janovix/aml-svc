/**
 * Normalize legacy client rows: ISO-3 → ISO-2 for country fields,
 * catalog UUID → SAT 7-digit codes, moral commercial_activity migration,
 * trust clears activity columns, refresh resolved_names.
 *
 * Targets local or remote D1 via REMOTE / WRANGLER_CONFIG (see scripts/lib/d1-database.mjs).
 *
 * Env:
 *   ORGANIZATION_ID — optional filter
 *   REMOTE, WRANGLER_CONFIG — see scripts/lib/d1-database.mjs
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Client, Prisma } from "@prisma/client";
import { openD1Database } from "../lib/d1-database.mjs";
import { getPrismaClient } from "../../src/lib/prisma.ts";
import { CatalogRepository } from "../../src/domain/catalog/repository.ts";
import { CatalogNameResolver } from "../../src/domain/catalog/name-resolver.ts";
import { getClientCatalogFields } from "../../src/domain/client/repository.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const amlSvcRoot = join(__dirname, "..", "..");

function wranglerConfigFromEnv(): string {
	if (process.env.WRANGLER_CONFIG) return process.env.WRANGLER_CONFIG;
	if (
		process.env.CF_PAGES_BRANCH ||
		(process.env.WORKERS_CI_BRANCH &&
			process.env.WORKERS_CI_BRANCH !== "main") ||
		process.env.PREVIEW === "true"
	) {
		return "wrangler.preview.jsonc";
	}
	return "wrangler.jsonc";
}

function resolvedNamesFingerprint(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") {
		try {
			return JSON.stringify(JSON.parse(value));
		} catch {
			return value;
		}
	}
	return JSON.stringify(value);
}

async function normalizeCatalogFields(
	catalogRepo: CatalogRepository,
	resolver: CatalogNameResolver,
	row: Client,
): Promise<Partial<Client>> {
	const out: Record<string, unknown> = { ...row };
	const pt = String(row.personType ?? "PHYSICAL").toUpperCase();

	const normCountry = async (key: keyof Client) => {
		const v = out[key as string];
		if (typeof v !== "string" || !v.trim()) return;
		const resolved = await catalogRepo.resolveStoredCountryCode(v);
		if (resolved) out[key as string] = resolved;
	};

	await normCountry("nationality");
	await normCountry("countryCode");
	await normCountry("country");

	const normAct = async (
		catalogKey: "economic-activities" | "business-activities",
		field: "economicActivityCode" | "commercialActivityCode",
	) => {
		const v = out[field];
		if (typeof v !== "string" || !v.trim()) return;
		const r = await catalogRepo.resolveStoredActivityCode(catalogKey, v);
		out[field] = r ?? null;
	};

	if (pt === "PHYSICAL") {
		await normAct("economic-activities", "economicActivityCode");
		out.commercialActivityCode = null;
	} else if (pt === "MORAL") {
		if (!out.commercialActivityCode && out.economicActivityCode) {
			out.commercialActivityCode = out.economicActivityCode;
		}
		out.economicActivityCode = null;
		await normAct("business-activities", "commercialActivityCode");
	} else {
		out.economicActivityCode = null;
		out.commercialActivityCode = null;
	}

	const ptLower = String(row.personType ?? "physical").toLowerCase();
	const fields = getClientCatalogFields(ptLower);
	const resolvedNames = await resolver.resolveNames(
		out as Record<string, unknown>,
		fields,
	);

	return {
		nationality: (out.nationality as string | null) ?? null,
		countryCode: (out.countryCode as string | null) ?? null,
		country: (out.country as string | null) ?? null,
		economicActivityCode: (out.economicActivityCode as string | null) ?? null,
		commercialActivityCode:
			(out.commercialActivityCode as string | null) ?? null,
		resolvedNames:
			Object.keys(resolvedNames).length > 0
				? JSON.stringify(resolvedNames)
				: null,
	};
}

async function main(): Promise<void> {
	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
	const db = await openD1Database({
		amlSvcRoot,
		resolvedWranglerConfigFile: wranglerConfigFromEnv(),
		isRemote,
	});
	const prisma = getPrismaClient(db);
	const catalogRepo = new CatalogRepository(prisma);
	const resolver = new CatalogNameResolver(catalogRepo);

	const orgId = process.env.ORGANIZATION_ID?.trim();
	const where: Prisma.ClientWhereInput = { deletedAt: null };
	if (orgId) where.organizationId = orgId;

	const rows = await prisma.client.findMany({ where });
	let updated = 0;

	for (const row of rows) {
		const patch = await normalizeCatalogFields(catalogRepo, resolver, row);
		const same =
			row.nationality === patch.nationality &&
			row.countryCode === patch.countryCode &&
			row.country === patch.country &&
			row.economicActivityCode === patch.economicActivityCode &&
			row.commercialActivityCode === patch.commercialActivityCode &&
			resolvedNamesFingerprint(row.resolvedNames) ===
				resolvedNamesFingerprint(patch.resolvedNames);

		if (same) continue;

		await prisma.client.update({
			where: { id: row.id },
			data: patch,
		});
		updated++;
	}

	console.log(
		`✅ normalize:clients — updated ${updated} / ${rows.length} client row(s)`,
	);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
