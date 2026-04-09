import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
	ActivityRiskLookupImpl,
	GeoRiskLookupImpl,
	JurisdictionRiskLookupImpl,
	loadRiskLookups,
} from "./lookups";

describe("GeoRiskLookupImpl", () => {
	it("returns risk score for known state code", () => {
		const geo = new GeoRiskLookupImpl([{ stateCode: "BCN", riskScore: 7 }]);
		expect(geo.getByStateCode("BCN")).toEqual({ riskScore: 7 });
	});

	it("returns null for unknown state code", () => {
		const geo = new GeoRiskLookupImpl([{ stateCode: "BCN", riskScore: 7 }]);
		expect(geo.getByStateCode("UNK")).toBeNull();
	});
});

describe("JurisdictionRiskLookupImpl", () => {
	it("returns risk score for known country code", () => {
		const j = new JurisdictionRiskLookupImpl([
			{ countryCode: "USA", riskScore: 4 },
		]);
		expect(j.getByCountryCode("USA")).toEqual({ riskScore: 4 });
	});

	it("returns null for unknown country", () => {
		const j = new JurisdictionRiskLookupImpl([
			{ countryCode: "USA", riskScore: 4 },
		]);
		expect(j.getByCountryCode("MEX")).toBeNull();
	});
});

describe("ActivityRiskLookupImpl", () => {
	it("returns risk score for known activity key", () => {
		const a = new ActivityRiskLookupImpl([
			{ activityKey: "VEH", riskScore: 6 },
		]);
		expect(a.getByKey("VEH")).toEqual({ riskScore: 6 });
	});

	it("returns null for unknown activity", () => {
		const a = new ActivityRiskLookupImpl([
			{ activityKey: "VEH", riskScore: 6 },
		]);
		expect(a.getByKey("ZZZ")).toBeNull();
	});
});

describe("loadRiskLookups", () => {
	it("loads parallel tables and builds lookup maps", async () => {
		const prisma = {
			geographicRiskZone: {
				findMany: vi
					.fn()
					.mockResolvedValue([{ stateCode: "SON", riskScore: 5 }]),
			},
			jurisdictionRisk: {
				findMany: vi
					.fn()
					.mockResolvedValue([{ countryCode: "VEN", riskScore: 8 }]),
			},
			activityRiskProfile: {
				findMany: vi
					.fn()
					.mockResolvedValue([{ activityKey: "INM", riskScore: 7 }]),
			},
		} as unknown as PrismaClient;

		const lookups = await loadRiskLookups(prisma);

		expect(lookups.geo.getByStateCode("SON")).toEqual({ riskScore: 5 });
		expect(lookups.jurisdiction.getByCountryCode("VEN")).toEqual({
			riskScore: 8,
		});
		expect(lookups.activity.getByKey("INM")).toEqual({ riskScore: 7 });
		expect(prisma.geographicRiskZone.findMany).toHaveBeenCalled();
		expect(prisma.jurisdictionRisk.findMany).toHaveBeenCalled();
		expect(prisma.activityRiskProfile.findMany).toHaveBeenCalled();
	});
});
