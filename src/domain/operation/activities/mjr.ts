import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { JewelryExtensionSchema } from "../schemas";
import type { CatalogFieldsConfig } from "../../catalog/name-resolver";

export const CATALOG_FIELDS: CatalogFieldsConfig = {
	itemTypeCode: { catalog: "pld-item-types", strategy: "BY_CODE" },
	tradeUnitCode: { catalog: "cfdi-units", strategy: "BY_CODE" },
	brand: { catalog: "jewelry-brands", strategy: "BY_ID" },
};

export const jewelryHandler: ActivityHandler = {
	code: "MJR",
	name: "Jewelry and Precious Metals",
	lfpiropiFraccion: "VI",
	identificationThresholdUma: 805,
	noticeThresholdUma: 1605,

	validateExtension(data: unknown): string | null {
		const result = JewelryExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid jewelry data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const jewelry = operation.jewelry;
		const riskFactors: string[] = [];

		if (jewelry) {
			// Check for high-value precious metals
			const preciousMetals = ["ORO", "GOLD", "PLATINO", "PLATINUM"];
			if (
				jewelry.metalType &&
				preciousMetals.some((m) => jewelry.metalType?.toUpperCase().includes(m))
			) {
				riskFactors.push("precious_metal");
			}

			// Check for high weight
			const weight = jewelry.weightGrams ? parseFloat(jewelry.weightGrams) : 0;
			if (weight > 1000) {
				riskFactors.push("high_weight");
			}

			// Check for high quantity
			const quantity = jewelry.quantity ? parseFloat(jewelry.quantity) : 0;
			if (quantity > 10) {
				riskFactors.push("high_quantity");
			}
		}

		return {
			subject:
				jewelry?.jewelryDescription ?? jewelry?.itemTypeCode ?? "Jewelry/Metal",
			attributes: {
				itemType: jewelry?.itemTypeCode ?? null,
				metalType: jewelry?.metalType ?? null,
				weightGrams: jewelry?.weightGrams ?? null,
				purity: jewelry?.purity ?? null,
				brand: jewelry?.brand ?? null,
				serialNumber: jewelry?.serialNumber ?? null,
				quantity: jewelry?.quantity ?? null,
				unitPrice: jewelry?.unitPrice ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const j = operation.jewelry;
		if (!j) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (j.itemTypeCode) {
			elements.push(`<TIPO_BIEN>${escapeXml(j.itemTypeCode)}</TIPO_BIEN>`);
		}
		if (j.metalType) {
			elements.push(`<TIPO_METAL>${escapeXml(j.metalType)}</TIPO_METAL>`);
		}
		if (j.weightGrams) {
			elements.push(`<PESO_GRAMOS>${j.weightGrams}</PESO_GRAMOS>`);
		}
		if (j.purity) {
			elements.push(`<PUREZA>${escapeXml(j.purity)}</PUREZA>`);
		}
		if (j.jewelryDescription) {
			elements.push(
				`<DESCRIPCION>${escapeXml(j.jewelryDescription)}</DESCRIPCION>`,
			);
		}
		if (j.brand) {
			elements.push(`<MARCA>${escapeXml(j.brand)}</MARCA>`);
		}
		if (j.serialNumber) {
			elements.push(
				`<NUMERO_SERIE>${escapeXml(j.serialNumber)}</NUMERO_SERIE>`,
			);
		}
		if (j.tradeUnitCode) {
			elements.push(
				`<UNIDAD_COMERCIALIZACION>${escapeXml(j.tradeUnitCode)}</UNIDAD_COMERCIALIZACION>`,
			);
		}
		if (j.quantity) {
			elements.push(`<CANTIDAD>${j.quantity}</CANTIDAD>`);
		}
		if (j.unitPrice) {
			elements.push(`<PRECIO_UNITARIO>${j.unitPrice}</PRECIO_UNITARIO>`);
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
