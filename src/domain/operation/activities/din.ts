import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { DevelopmentExtensionSchema } from "../schemas";
import type { CatalogFieldsConfig } from "../../catalog/name-resolver";

export const CATALOG_FIELDS: CatalogFieldsConfig = {
	developmentTypeCode: {
		catalog: "pld-development-types",
		strategy: "BY_CODE",
	},
	creditTypeCode: { catalog: "pld-credit-types", strategy: "BY_CODE" },
	thirdPartyTypeCode: { catalog: "pld-third-party-types", strategy: "BY_CODE" },
	financialInstitutionTypeCode: {
		catalog: "pld-financial-institution-types",
		strategy: "BY_CODE",
	},
};

export const developmentHandler: ActivityHandler = {
	code: "DIN",
	name: "Real Estate Development",
	lfpiropiFraccion: "V Bis",
	identificationThresholdUma: "ALWAYS",
	noticeThresholdUma: 8025,

	validateExtension(data: unknown): string | null {
		const result = DevelopmentExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid development data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const d = operation.development;
		const riskFactors: string[] = [];

		if (d) {
			// Check for high contribution amount
			const contributionAmount = d.contributionAmount
				? parseFloat(d.contributionAmount)
				: 0;
			if (contributionAmount > 1000000) {
				riskFactors.push("high_contribution");
			}

			// Check for third party involvement
			if (d.thirdPartyTypeCode || d.thirdPartyName) {
				riskFactors.push("third_party_involvement");
			}

			// Check for financial institution involvement
			if (d.financialInstitutionTypeCode || d.financialInstitutionName) {
				riskFactors.push("financial_institution");
			}

			// Check for credit arrangements
			if (d.creditTypeCode) {
				riskFactors.push("credit_arrangement");
			}
		}

		return {
			subject:
				d?.projectName ?? d?.developmentTypeCode ?? "Development Project",
			attributes: {
				developmentType: d?.developmentTypeCode ?? null,
				creditType: d?.creditTypeCode ?? null,
				projectName: d?.projectName ?? null,
				projectLocation: d?.projectLocation ?? null,
				contributionType: d?.contributionType ?? null,
				contributionAmount: d?.contributionAmount ?? null,
				thirdPartyType: d?.thirdPartyTypeCode ?? null,
				thirdPartyName: d?.thirdPartyName ?? null,
				financialInstitutionType: d?.financialInstitutionTypeCode ?? null,
				financialInstitutionName: d?.financialInstitutionName ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const d = operation.development;
		if (!d) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (d.developmentTypeCode) {
			elements.push(
				`<TIPO_DESARROLLO>${escapeXml(d.developmentTypeCode)}</TIPO_DESARROLLO>`,
			);
		}
		if (d.creditTypeCode) {
			elements.push(
				`<TIPO_CREDITO>${escapeXml(d.creditTypeCode)}</TIPO_CREDITO>`,
			);
		}
		if (d.projectName) {
			elements.push(
				`<NOMBRE_PROYECTO>${escapeXml(d.projectName)}</NOMBRE_PROYECTO>`,
			);
		}
		if (d.projectLocation) {
			elements.push(
				`<UBICACION_PROYECTO>${escapeXml(d.projectLocation)}</UBICACION_PROYECTO>`,
			);
		}
		if (d.contributionType) {
			elements.push(
				`<TIPO_APORTACION>${escapeXml(d.contributionType)}</TIPO_APORTACION>`,
			);
		}
		if (d.contributionAmount) {
			elements.push(
				`<MONTO_APORTACION>${d.contributionAmount}</MONTO_APORTACION>`,
			);
		}
		if (d.thirdPartyTypeCode) {
			elements.push(
				`<TIPO_TERCERO>${escapeXml(d.thirdPartyTypeCode)}</TIPO_TERCERO>`,
			);
		}
		if (d.thirdPartyName) {
			elements.push(
				`<NOMBRE_TERCERO>${escapeXml(d.thirdPartyName)}</NOMBRE_TERCERO>`,
			);
		}
		if (d.financialInstitutionTypeCode) {
			elements.push(
				`<TIPO_INSTITUCION_FINANCIERA>${escapeXml(d.financialInstitutionTypeCode)}</TIPO_INSTITUCION_FINANCIERA>`,
			);
		}
		if (d.financialInstitutionName) {
			elements.push(
				`<NOMBRE_INSTITUCION_FINANCIERA>${escapeXml(d.financialInstitutionName)}</NOMBRE_INSTITUCION_FINANCIERA>`,
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
