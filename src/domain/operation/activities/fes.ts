import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { NotaryExtensionSchema } from "../schemas";
import type { CatalogFieldsConfig } from "../../catalog/name-resolver";

export const CATALOG_FIELDS: CatalogFieldsConfig = {
	actTypeCode: { catalog: "pld-act-types", strategy: "BY_CODE" },
	notaryStateCode: { catalog: "states", strategy: "BY_CODE" },
	legalEntityTypeCode: {
		catalog: "pld-legal-entity-types",
		strategy: "BY_CODE",
	},
	personCharacterTypeCode: {
		catalog: "pld-person-character-types",
		strategy: "BY_CODE",
	},
	incorporationReasonCode: {
		catalog: "pld-incorporation-reasons",
		strategy: "BY_CODE",
	},
	patrimonyModificationTypeCode: {
		catalog: "pld-patrimony-modification-types",
		strategy: "BY_CODE",
	},
	powerOfAttorneyTypeCode: {
		catalog: "pld-power-of-attorney-types",
		strategy: "BY_CODE",
	},
	grantingTypeCode: { catalog: "pld-granting-types", strategy: "BY_CODE" },
	shareholderPositionCode: {
		catalog: "pld-shareholder-positions",
		strategy: "BY_CODE",
	},
	itemTypeCode: { catalog: "pld-item-types", strategy: "BY_CODE" },
	guaranteeTypeCode: { catalog: "pld-guarantee-types", strategy: "BY_CODE" },
};

export const notaryHandler: ActivityHandler = {
	code: "FES",
	name: "Notarial Faith",
	lfpiropiFraccion: "XII-B",
	identificationThresholdUma: "ALWAYS",
	noticeThresholdUma: "ALWAYS",

	validateExtension(data: unknown): string | null {
		const result = NotaryExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid notary data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const n = operation.notary;
		const riskFactors: string[] = [];

		if (n) {
			// Check for power of attorney
			if (n.powerOfAttorneyTypeCode) {
				riskFactors.push("power_of_attorney");
			}

			// Check for high ownership percentage
			const sharePercentage = n.sharePercentage
				? parseFloat(n.sharePercentage)
				: 0;
			if (sharePercentage > 50) {
				riskFactors.push("majority_ownership");
			}

			// Check for high appraisal value
			const appraisalValue = n.appraisalValue
				? parseFloat(n.appraisalValue)
				: 0;
			if (appraisalValue > 1000000) {
				riskFactors.push("high_appraisal_value");
			}

			// Check for corporate changes
			if (n.incorporationReasonCode || n.patrimonyModificationTypeCode) {
				riskFactors.push("corporate_change");
			}
		}

		const subject =
			n && (n.notaryNumber || n.actTypeCode)
				? `Notary ${[n.notaryNumber, n.actTypeCode]
						.filter(Boolean)
						.join(" - ")}`
				: "Notarial Act";

		return {
			subject,
			attributes: {
				actType: n?.actTypeCode ?? null,
				notaryNumber: n?.notaryNumber ?? null,
				notaryState: n?.notaryStateCode ?? null,
				instrumentNumber: n?.instrumentNumber ?? null,
				instrumentDate: n?.instrumentDate ?? null,
				legalEntityType: n?.legalEntityTypeCode ?? null,
				personCharacterType: n?.personCharacterTypeCode ?? null,
				incorporationReason: n?.incorporationReasonCode ?? null,
				powerOfAttorneyType: n?.powerOfAttorneyTypeCode ?? null,
				sharePercentage: n?.sharePercentage ?? null,
				appraisalValue: n?.appraisalValue ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const n = operation.notary;
		if (!n) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (n.actTypeCode) {
			elements.push(`<TIPO_ACTO>${escapeXml(n.actTypeCode)}</TIPO_ACTO>`);
		}
		if (n.notaryNumber) {
			elements.push(
				`<NUMERO_NOTARIA>${escapeXml(n.notaryNumber)}</NUMERO_NOTARIA>`,
			);
		}
		if (n.notaryStateCode) {
			elements.push(
				`<ESTADO_NOTARIA>${escapeXml(n.notaryStateCode)}</ESTADO_NOTARIA>`,
			);
		}
		if (n.instrumentNumber) {
			elements.push(
				`<NUMERO_INSTRUMENTO>${escapeXml(n.instrumentNumber)}</NUMERO_INSTRUMENTO>`,
			);
		}
		if (n.instrumentDate) {
			elements.push(
				`<FECHA_INSTRUMENTO>${n.instrumentDate}</FECHA_INSTRUMENTO>`,
			);
		}
		if (n.legalEntityTypeCode) {
			elements.push(
				`<TIPO_PERSONA_MORAL>${escapeXml(n.legalEntityTypeCode)}</TIPO_PERSONA_MORAL>`,
			);
		}
		if (n.personCharacterTypeCode) {
			elements.push(
				`<TIPO_PERSONA_CARACTER>${escapeXml(n.personCharacterTypeCode)}</TIPO_PERSONA_CARACTER>`,
			);
		}
		if (n.incorporationReasonCode) {
			elements.push(
				`<MOTIVO_CONSTITUCION>${escapeXml(n.incorporationReasonCode)}</MOTIVO_CONSTITUCION>`,
			);
		}
		if (n.patrimonyModificationTypeCode) {
			elements.push(
				`<TIPO_MODIFICACION_PATRIMONIO>${escapeXml(n.patrimonyModificationTypeCode)}</TIPO_MODIFICACION_PATRIMONIO>`,
			);
		}
		if (n.powerOfAttorneyTypeCode) {
			elements.push(
				`<TIPO_PODER>${escapeXml(n.powerOfAttorneyTypeCode)}</TIPO_PODER>`,
			);
		}
		if (n.grantingTypeCode) {
			elements.push(
				`<TIPO_OTORGAMIENTO>${escapeXml(n.grantingTypeCode)}</TIPO_OTORGAMIENTO>`,
			);
		}
		if (n.shareholderPositionCode) {
			elements.push(
				`<CARGO_ACCIONISTA>${escapeXml(n.shareholderPositionCode)}</CARGO_ACCIONISTA>`,
			);
		}
		if (n.sharePercentage) {
			elements.push(
				`<PORCENTAJE_ACCIONES>${n.sharePercentage}</PORCENTAJE_ACCIONES>`,
			);
		}
		if (n.itemTypeCode) {
			elements.push(`<TIPO_BIEN>${escapeXml(n.itemTypeCode)}</TIPO_BIEN>`);
		}
		if (n.itemDescription) {
			elements.push(
				`<DESCRIPCION_BIEN>${escapeXml(n.itemDescription)}</DESCRIPCION_BIEN>`,
			);
		}
		if (n.appraisalValue) {
			elements.push(`<VALOR_AVALUO>${n.appraisalValue}</VALOR_AVALUO>`);
		}
		if (n.guaranteeTypeCode) {
			elements.push(
				`<TIPO_GARANTIA>${escapeXml(n.guaranteeTypeCode)}</TIPO_GARANTIA>`,
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
