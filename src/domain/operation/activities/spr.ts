import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { ProfessionalExtensionSchema } from "../schemas";
import type { CatalogFieldsConfig } from "../../catalog/name-resolver";

export const CATALOG_FIELDS: CatalogFieldsConfig = {
	serviceTypeCode: { catalog: "pld-service-types", strategy: "BY_CODE" },
	serviceAreaCode: { catalog: "pld-service-areas", strategy: "BY_CODE" },
	clientFigureCode: { catalog: "pld-client-figures", strategy: "BY_CODE" },
	contributionReasonCode: {
		catalog: "pld-contribution-reasons",
		strategy: "BY_CODE",
	},
	assignmentTypeCode: { catalog: "pld-assignment-types", strategy: "BY_CODE" },
	mergerTypeCode: { catalog: "pld-merger-types", strategy: "BY_CODE" },
	incorporationReasonCode: {
		catalog: "pld-incorporation-reasons",
		strategy: "BY_CODE",
	},
	shareholderPositionCode: {
		catalog: "pld-shareholder-positions",
		strategy: "BY_CODE",
	},
	managedAssetTypeCode: {
		catalog: "pld-managed-asset-types",
		strategy: "BY_CODE",
	},
	managementStatusCode: {
		catalog: "pld-management-statuses",
		strategy: "BY_CODE",
	},
	financialInstitutionTypeCode: {
		catalog: "pld-financial-institution-types",
		strategy: "BY_CODE",
	},
	occupationCode: { catalog: "pld-occupations", strategy: "BY_CODE" },
};

export const professionalHandler: ActivityHandler = {
	code: "SPR",
	name: "Professional Services",
	lfpiropiFraccion: "XI",
	identificationThresholdUma: "ALWAYS",
	noticeThresholdUma: "ALWAYS",

	validateExtension(data: unknown): string | null {
		const result = ProfessionalExtensionSchema.safeParse(data);
		if (!result.success) {
			return (
				result.error.errors[0]?.message ?? "Invalid professional service data"
			);
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const p = operation.professional;
		const riskFactors: string[] = [];

		if (p) {
			// Check for asset management
			if (p.managedAssetTypeCode) {
				riskFactors.push("asset_management");
			}

			// Check for high ownership percentage
			const sharePercentage = p.sharePercentage
				? parseFloat(p.sharePercentage)
				: 0;
			if (sharePercentage > 50) {
				riskFactors.push("majority_ownership");
			}

			// Check for financial institution involvement
			if (p.financialInstitutionTypeCode || p.financialInstitutionName) {
				riskFactors.push("financial_institution");
			}

			// Check for corporate restructuring
			if (
				p.mergerTypeCode ||
				p.incorporationReasonCode ||
				p.assignmentTypeCode
			) {
				riskFactors.push("corporate_restructuring");
			}
		}

		return {
			subject: p?.serviceTypeCode ?? "Professional Service",
			attributes: {
				serviceType: p?.serviceTypeCode ?? null,
				serviceArea: p?.serviceAreaCode ?? null,
				clientFigure: p?.clientFigureCode ?? null,
				contributionReason: p?.contributionReasonCode ?? null,
				assignmentType: p?.assignmentTypeCode ?? null,
				mergerType: p?.mergerTypeCode ?? null,
				incorporationReason: p?.incorporationReasonCode ?? null,
				shareholderPosition: p?.shareholderPositionCode ?? null,
				sharePercentage: p?.sharePercentage ?? null,
				managedAssetType: p?.managedAssetTypeCode ?? null,
				financialInstitution: p?.financialInstitutionName ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const p = operation.professional;
		if (!p) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (p.serviceTypeCode) {
			elements.push(
				`<TIPO_SERVICIO>${escapeXml(p.serviceTypeCode)}</TIPO_SERVICIO>`,
			);
		}
		if (p.serviceAreaCode) {
			elements.push(
				`<AREA_SERVICIO>${escapeXml(p.serviceAreaCode)}</AREA_SERVICIO>`,
			);
		}
		if (p.clientFigureCode) {
			elements.push(
				`<FIGURA_CLIENTE>${escapeXml(p.clientFigureCode)}</FIGURA_CLIENTE>`,
			);
		}
		if (p.contributionReasonCode) {
			elements.push(
				`<MOTIVO_APORTACION>${escapeXml(p.contributionReasonCode)}</MOTIVO_APORTACION>`,
			);
		}
		if (p.assignmentTypeCode) {
			elements.push(
				`<TIPO_CESION>${escapeXml(p.assignmentTypeCode)}</TIPO_CESION>`,
			);
		}
		if (p.mergerTypeCode) {
			elements.push(
				`<TIPO_FUSION>${escapeXml(p.mergerTypeCode)}</TIPO_FUSION>`,
			);
		}
		if (p.incorporationReasonCode) {
			elements.push(
				`<MOTIVO_CONSTITUCION>${escapeXml(p.incorporationReasonCode)}</MOTIVO_CONSTITUCION>`,
			);
		}
		if (p.shareholderPositionCode) {
			elements.push(
				`<CARGO_ACCIONISTA>${escapeXml(p.shareholderPositionCode)}</CARGO_ACCIONISTA>`,
			);
		}
		if (p.sharePercentage) {
			elements.push(
				`<PORCENTAJE_ACCIONES>${p.sharePercentage}</PORCENTAJE_ACCIONES>`,
			);
		}
		if (p.managedAssetTypeCode) {
			elements.push(
				`<TIPO_ACTIVO_ADMINISTRADO>${escapeXml(p.managedAssetTypeCode)}</TIPO_ACTIVO_ADMINISTRADO>`,
			);
		}
		if (p.managementStatusCode) {
			elements.push(
				`<ESTADO_ADMINISTRACION>${escapeXml(p.managementStatusCode)}</ESTADO_ADMINISTRACION>`,
			);
		}
		if (p.financialInstitutionTypeCode) {
			elements.push(
				`<TIPO_INSTITUCION_FINANCIERA>${escapeXml(p.financialInstitutionTypeCode)}</TIPO_INSTITUCION_FINANCIERA>`,
			);
		}
		if (p.financialInstitutionName) {
			elements.push(
				`<NOMBRE_INSTITUCION_FINANCIERA>${escapeXml(p.financialInstitutionName)}</NOMBRE_INSTITUCION_FINANCIERA>`,
			);
		}
		if (p.occupationCode) {
			elements.push(`<OCUPACION>${escapeXml(p.occupationCode)}</OCUPACION>`);
		}
		if (p.serviceDescription) {
			elements.push(
				`<DESCRIPCION_SERVICIO>${escapeXml(p.serviceDescription)}</DESCRIPCION_SERVICIO>`,
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
