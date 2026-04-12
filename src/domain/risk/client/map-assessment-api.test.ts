import { describe, expect, it } from "vitest";
import {
	mapPrismaAssessmentToApi,
	type ClientRiskAssessmentRow,
} from "./map-assessment-api";

function row(
	overrides: Partial<ClientRiskAssessmentRow> = {},
): ClientRiskAssessmentRow {
	const clientFactors = JSON.stringify({
		elementType: "CLIENTS",
		score: 2.5,
		level: "MEDIUM_LOW",
		factors: [
			{ name: "pep_status", score: 0, weight: 0.25 },
			{ name: "nationality_risk", score: 2, weight: 0.15 },
		],
		ddProfile: {
			overall: "STANDARD",
			acceptance: "STANDARD",
			ongoingMonitoring: "ENHANCED",
			reviewFrequency: "STANDARD",
			reporting: "STANDARD",
		},
	});
	const el = (type: string, score: number, level: string) =>
		JSON.stringify({
			elementType: type,
			score,
			level,
			factors: [{ name: "f1", score: 1, weight: 0.5 }],
		});

	return {
		id: "assess-1",
		clientId: "cli-1",
		organizationId: "org-1",
		methodologyId: null,
		inherentRiskScore: 4,
		residualRiskScore: 3.5,
		riskLevel: "MEDIUM",
		dueDiligenceLevel: "STANDARD",
		clientFactors,
		geographicFactors: el("GEOGRAPHY", 2, "LOW"),
		activityFactors: el("PRODUCTS", 3, "MEDIUM"),
		transactionFactors: el("TRANSACTIONS", 1, "LOW"),
		mitigantFactors: JSON.stringify({
			effect: 0.5,
			factors: [{ name: "kyc_completeness", score: 0, weight: 0.3 }],
		}),
		assessedAt: new Date("2024-06-01T12:00:00Z"),
		nextReviewAt: new Date("2025-06-01T12:00:00Z"),
		assessedBy: "SYSTEM",
		triggerReason: "manual",
		version: 1,
		createdAt: new Date("2024-06-01T12:00:00Z"),
		updatedAt: new Date("2024-06-01T12:00:00Z"),
		...overrides,
	};
}

describe("mapPrismaAssessmentToApi", () => {
	it("wraps shape for aml ClientRiskAssessment", () => {
		const out = mapPrismaAssessmentToApi(row());
		expect(out.id).toBe("assess-1");
		expect(out.clientId).toBe("cli-1");
		expect(out.organizationId).toBe("org-1");
		expect(out.riskScore).toBe(3.5);
		expect(out.residualRiskScore).toBe(3.5);
		expect(out.inherentRiskScore).toBe(4);
		expect(out.mitigantEffect).toBe(0.5);
		expect(out.ddLevel).toBe("STANDARD");
		expect(out.triggerReason).toBe("manual");
		expect(out.createdAt).toBe("2024-06-01T12:00:00.000Z");
		expect(out.elements).toHaveLength(4);
		expect(out.elements[0].elementType).toBe("CLIENT");
		expect(out.elements[0].rawScore).toBe(2.5);
		expect(out.elements[0].riskLevel).toBe("MEDIUM_LOW");
		expect(out.elements[0].factors[0].weightedScore).toBe(0);
		expect(out.ddProfile.clientAcceptance).toBe("STANDARD");
		expect(out.ddProfile.identificationVerification).toBe("STANDARD");
		expect(out.ddProfile.transactionScrutiny).toBe("STANDARD");
		expect(out.ddProfile.reportingObligations).toBe("STANDARD");
	});

	it("falls back ddProfile when missing", () => {
		const r = row({
			clientFactors: JSON.stringify({
				elementType: "CLIENTS",
				score: 1,
				level: "LOW",
				factors: [],
			}),
		});
		const out = mapPrismaAssessmentToApi(r);
		expect(out.ddProfile.clientAcceptance).toBe("STANDARD");
	});
});
