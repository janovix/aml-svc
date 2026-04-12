import { describe, expect, it } from "vitest";
import {
	generateEbrResultsHtml,
	generateManualPoliticasHtml,
} from "./ebr-report-generator";

const baseOrgAssessment = {
	riskLevel: "MEDIUM",
	residualRiskScore: 5.2,
	inherentRiskScore: 6.0,
	requiredAuditType: "INTERNAL",
	fpRiskLevel: "LOW",
	fpRiskJustification: "Screening coverage: 95%",
	periodStartDate: "2024-01-01",
	periodEndDate: "2024-12-31",
	assessedBy: "system",
	version: 1,
	elements: [
		{
			elementType: "CLIENTS",
			weight: 0.3,
			riskScore: 4,
			riskLevel: "MEDIUM_LOW",
			factorBreakdown: { pep_concentration: 1 },
		},
	],
	mitigants: [
		{
			mitigantName: "KYC",
			exists: true,
			effectivenessScore: 0.9,
			riskEffect: 0.5,
		},
	],
};

describe("generateEbrResultsHtml", () => {
	it("includes organization name and client distribution", () => {
		const html = generateEbrResultsHtml({
			organizationName: "Test Org",
			orgAssessment: baseOrgAssessment,
			clientDistribution: {
				total: 10,
				distribution: { LOW: 8, HIGH: 2 },
			},
			generatedAt: "2025-01-01T00:00:00Z",
		});
		expect(html).toContain("Test Org");
		expect(html).toContain("Evaluación con Enfoque Basado en Riesgo");
		expect(html).toContain("Distribución de Riesgo de Clientes");
		expect(html).toContain("HIGH");
	});

	it("renders without org assessment", () => {
		const html = generateEbrResultsHtml({
			organizationName: "Solo",
			orgAssessment: null,
			clientDistribution: { total: 0, distribution: {} },
			generatedAt: "2025-01-01T00:00:00Z",
		});
		expect(html).toContain("No se ha realizado una evaluación organizacional");
	});
});

describe("generateManualPoliticasHtml", () => {
	it("includes activity name and org assessment audit branch", () => {
		const html = generateManualPoliticasHtml({
			organizationName: "ACME",
			activityName: "VEH",
			orgAssessment: {
				...baseOrgAssessment,
				requiredAuditType: "EXTERNAL_INDEPENDENT",
			},
			clientDistribution: { total: 1, distribution: { LOW: 1 } },
			generatedAt: "2025-06-01",
		});
		expect(html).toContain("Manual de Políticas Internas");
		expect(html).toContain("ACME");
		expect(html).toContain("VEH");
		expect(html).toContain("Externa Independiente");
	});

	it("uses fallback when orgAssessment is null", () => {
		const html = generateManualPoliticasHtml({
			organizationName: "Beta",
			activityName: "INM",
			orgAssessment: null,
			clientDistribution: { total: 0, distribution: {} },
			generatedAt: "2025-06-01",
		});
		expect(html).toContain("tras completar la evaluación organizacional");
	});
});
