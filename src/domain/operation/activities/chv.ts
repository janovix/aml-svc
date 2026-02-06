import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { TravelerCheckExtensionSchema } from "../schemas";

export const travelerCheckHandler: ActivityHandler = {
	code: "CHV",
	name: "Traveler Checks",
	lfpiropiFraccion: "III",
	identificationThresholdUma: "ALWAYS",
	noticeThresholdUma: 645,

	validateExtension(data: unknown): string | null {
		const result = TravelerCheckExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid traveler check data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const tc = operation.travelerCheck;
		const riskFactors: string[] = [];

		if (tc) {
			// Check for high count
			if (tc.checkCount && tc.checkCount > 20) {
				riskFactors.push("high_check_count");
			}

			// Check for foreign issuer
			if (tc.issuerCountryCode && tc.issuerCountryCode !== "MEX") {
				riskFactors.push("foreign_issuer");
			}

			// Check for high-risk countries
			const highRiskCountries = ["KP", "IR", "SY", "CU"];
			if (
				tc.issuerCountryCode &&
				highRiskCountries.includes(tc.issuerCountryCode)
			) {
				riskFactors.push("high_risk_country");
			}
		}

		return {
			subject: tc?.issuerName ?? "Traveler Check",
			attributes: {
				denomination: tc?.denominationCode ?? null,
				checkCount: tc?.checkCount ?? null,
				serialNumbers: tc?.serialNumbers ?? null,
				issuerName: tc?.issuerName ?? null,
				issuerCountry: tc?.issuerCountryCode ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const tc = operation.travelerCheck;
		if (!tc) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (tc.denominationCode) {
			elements.push(
				`<DENOMINACION>${escapeXml(tc.denominationCode)}</DENOMINACION>`,
			);
		}
		if (tc.checkCount) {
			elements.push(`<CANTIDAD_CHEQUES>${tc.checkCount}</CANTIDAD_CHEQUES>`);
		}
		if (tc.serialNumbers) {
			elements.push(
				`<NUMEROS_SERIE>${escapeXml(tc.serialNumbers)}</NUMEROS_SERIE>`,
			);
		}
		if (tc.issuerName) {
			elements.push(
				`<NOMBRE_EMISOR>${escapeXml(tc.issuerName)}</NOMBRE_EMISOR>`,
			);
		}
		if (tc.issuerCountryCode) {
			elements.push(
				`<PAIS_EMISOR>${escapeXml(tc.issuerCountryCode)}</PAIS_EMISOR>`,
			);
		}

		return `<DETALLE_OPERACIONES>\n  ${elements.join("\n  ")}\n</DETALLE_OPERACIONES>`;
	},
};

function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
