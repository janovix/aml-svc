/**
 * Reference data lookup services for risk calculations.
 * Loads geographic, jurisdiction, and activity risk data from D1.
 */

import type { PrismaClient } from "@prisma/client";
import type {
	ActivityRiskLookup,
	GeoRiskLookup,
	JurisdictionRiskLookup,
} from "./client/factors";
import type { RiskLookups } from "./client/engine";

export class GeoRiskLookupImpl implements GeoRiskLookup {
	private cache = new Map<string, { riskScore: number }>();

	constructor(data: Array<{ stateCode: string; riskScore: number }>) {
		for (const d of data) {
			this.cache.set(d.stateCode, { riskScore: d.riskScore });
		}
	}

	getByStateCode(code: string): { riskScore: number } | null {
		return this.cache.get(code) ?? null;
	}
}

export class JurisdictionRiskLookupImpl implements JurisdictionRiskLookup {
	private cache = new Map<string, { riskScore: number }>();

	constructor(data: Array<{ countryCode: string; riskScore: number }>) {
		for (const d of data) {
			this.cache.set(d.countryCode, { riskScore: d.riskScore });
		}
	}

	getByCountryCode(code: string): { riskScore: number } | null {
		return this.cache.get(code) ?? null;
	}
}

export class ActivityRiskLookupImpl implements ActivityRiskLookup {
	private cache = new Map<string, { riskScore: number }>();

	constructor(data: Array<{ activityKey: string; riskScore: number }>) {
		for (const d of data) {
			this.cache.set(d.activityKey, { riskScore: d.riskScore });
		}
	}

	getByKey(key: string): { riskScore: number } | null {
		return this.cache.get(key) ?? null;
	}
}

export async function loadRiskLookups(
	prisma: PrismaClient,
): Promise<RiskLookups> {
	const [geoData, jurisdictionData, activityData] = await Promise.all([
		prisma.geographicRiskZone.findMany({
			select: { stateCode: true, riskScore: true },
		}),
		prisma.jurisdictionRisk.findMany({
			select: { countryCode: true, riskScore: true },
		}),
		prisma.activityRiskProfile.findMany({
			select: { activityKey: true, riskScore: true },
		}),
	]);

	return {
		geo: new GeoRiskLookupImpl(geoData),
		jurisdiction: new JurisdictionRiskLookupImpl(jurisdictionData),
		activity: new ActivityRiskLookupImpl(activityData),
	};
}
