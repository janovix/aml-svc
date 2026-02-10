import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { OfficialExtensionSchema } from "../schemas";
import type { CatalogFieldsConfig } from "../../catalog/name-resolver";

export const CATALOG_FIELDS: CatalogFieldsConfig = {
	actTypeCode: { catalog: "pld-act-types", strategy: "BY_CODE" },
	trustTypeCode: { catalog: "pld-trust-types", strategy: "BY_CODE" },
	movementTypeCode: { catalog: "pld-movement-types", strategy: "BY_CODE" },
	assignmentTypeCode: { catalog: "pld-assignment-types", strategy: "BY_CODE" },
	mergerTypeCode: { catalog: "pld-merger-types", strategy: "BY_CODE" },
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
};

export const officialHandler: ActivityHandler = {
	code: "FEP",
	name: "Public Official Faith",
	lfpiropiFraccion: "XII-A",
	identificationThresholdUma: "ALWAYS",
	noticeThresholdUma: 8000,

	validateExtension(data: unknown): string | null {
		const result = OfficialExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid official faith data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const o = operation.official;
		const riskFactors: string[] = [];

		if (o) {
			// Check for trust operations
			if (o.trustTypeCode || o.trustIdentifier) {
				riskFactors.push("trust_operation");
			}

			// Check for high ownership percentage
			const sharePercentage = o.sharePercentage
				? parseFloat(o.sharePercentage)
				: 0;
			if (sharePercentage > 50) {
				riskFactors.push("majority_ownership");
			}

			// Check for high-value items
			const itemValue = o.itemValue ? parseFloat(o.itemValue) : 0;
			if (itemValue > 1000000) {
				riskFactors.push("high_value_item");
			}

			// Check for corporate changes
			if (o.mergerTypeCode || o.incorporationReasonCode) {
				riskFactors.push("corporate_restructuring");
			}
		}

		return {
			subject: o?.actTypeCode ?? "Official Act",
			attributes: {
				actType: o?.actTypeCode ?? null,
				instrumentNumber: o?.instrumentNumber ?? null,
				instrumentDate: o?.instrumentDate ?? null,
				trustType: o?.trustTypeCode ?? null,
				trustIdentifier: o?.trustIdentifier ?? null,
				movementType: o?.movementTypeCode ?? null,
				assignmentType: o?.assignmentTypeCode ?? null,
				mergerType: o?.mergerTypeCode ?? null,
				incorporationReason: o?.incorporationReasonCode ?? null,
				sharePercentage: o?.sharePercentage ?? null,
				itemValue: o?.itemValue ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const o = operation.official;
		if (!o) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (o.actTypeCode) {
			elements.push(`<TIPO_ACTO>${escapeXml(o.actTypeCode)}</TIPO_ACTO>`);
		}
		if (o.instrumentNumber) {
			elements.push(
				`<NUMERO_INSTRUMENTO>${escapeXml(o.instrumentNumber)}</NUMERO_INSTRUMENTO>`,
			);
		}
		if (o.instrumentDate) {
			elements.push(
				`<FECHA_INSTRUMENTO>${o.instrumentDate}</FECHA_INSTRUMENTO>`,
			);
		}
		if (o.trustTypeCode) {
			elements.push(
				`<TIPO_FIDEICOMISO>${escapeXml(o.trustTypeCode)}</TIPO_FIDEICOMISO>`,
			);
		}
		if (o.trustIdentifier) {
			elements.push(
				`<IDENTIFICADOR_FIDEICOMISO>${escapeXml(o.trustIdentifier)}</IDENTIFICADOR_FIDEICOMISO>`,
			);
		}
		if (o.trustPurpose) {
			elements.push(
				`<FINALIDAD_FIDEICOMISO>${escapeXml(o.trustPurpose)}</FINALIDAD_FIDEICOMISO>`,
			);
		}
		if (o.movementTypeCode) {
			elements.push(
				`<TIPO_MOVIMIENTO>${escapeXml(o.movementTypeCode)}</TIPO_MOVIMIENTO>`,
			);
		}
		if (o.assignmentTypeCode) {
			elements.push(
				`<TIPO_CESION>${escapeXml(o.assignmentTypeCode)}</TIPO_CESION>`,
			);
		}
		if (o.mergerTypeCode) {
			elements.push(
				`<TIPO_FUSION>${escapeXml(o.mergerTypeCode)}</TIPO_FUSION>`,
			);
		}
		if (o.incorporationReasonCode) {
			elements.push(
				`<MOTIVO_CONSTITUCION>${escapeXml(o.incorporationReasonCode)}</MOTIVO_CONSTITUCION>`,
			);
		}
		if (o.shareholderPositionCode) {
			elements.push(
				`<CARGO_ACCIONISTA>${escapeXml(o.shareholderPositionCode)}</CARGO_ACCIONISTA>`,
			);
		}
		if (o.sharePercentage) {
			elements.push(
				`<PORCENTAJE_ACCIONES>${o.sharePercentage}</PORCENTAJE_ACCIONES>`,
			);
		}
		if (o.itemTypeCode) {
			elements.push(`<TIPO_BIEN>${escapeXml(o.itemTypeCode)}</TIPO_BIEN>`);
		}
		if (o.itemDescription) {
			elements.push(
				`<DESCRIPCION_BIEN>${escapeXml(o.itemDescription)}</DESCRIPCION_BIEN>`,
			);
		}
		if (o.itemValue) {
			elements.push(`<VALOR_BIEN>${o.itemValue}</VALOR_BIEN>`);
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
