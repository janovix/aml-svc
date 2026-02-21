import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { ArmoringExtensionSchema } from "../schemas";
import type { CatalogFieldsConfig } from "../../catalog/name-resolver";

export const CATALOG_FIELDS: CatalogFieldsConfig = {
	armorLevelCode: { catalog: "armor-levels", strategy: "BY_CODE" },
	itemStatusCode: { catalog: "pld-item-status", strategy: "BY_CODE" },
	armoredPartCode: { catalog: "pld-armored-parts", strategy: "BY_CODE" },
};

export const armoringHandler: ActivityHandler = {
	code: "BLI",
	name: "Armoring Services",
	lfpiropiFraccion: "IX",
	identificationThresholdUma: 2410,
	noticeThresholdUma: 4815,

	validateExtension(data: unknown): string | null {
		const result = ArmoringExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid armoring data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const a = operation.armoring;
		const riskFactors: string[] = [];

		if (a) {
			// Check for high protection levels using exact match
			const armorLevel = a.armorLevelCode?.toUpperCase().replace(/\s+/g, "");
			const highLevels = new Set(["V", "VI", "VII", "B6", "B7"]);
			if (armorLevel && highLevels.has(armorLevel)) {
				riskFactors.push("high_protection_level");
			}

			// Check for luxury vehicle armoring
			const luxuryBrands = [
				"FERRARI",
				"LAMBORGHINI",
				"BENTLEY",
				"ROLLS-ROYCE",
				"MAYBACH",
			];
			if (
				a.vehicleBrand &&
				luxuryBrands.some((b) => a.vehicleBrand?.toUpperCase().includes(b))
			) {
				riskFactors.push("luxury_vehicle");
			}
		}

		const subject = a
			? `${a.vehicleBrand ?? ""} ${a.vehicleModel ?? ""} - ${a.armorLevelCode ?? ""}`.trim()
			: "Armoring Service";

		return {
			subject,
			attributes: {
				itemType: a?.itemType ?? null,
				itemStatus: a?.itemStatusCode ?? null,
				armorLevel: a?.armorLevelCode ?? null,
				armoredPart: a?.armoredPartCode ?? null,
				vehicleType: a?.vehicleType ?? null,
				vehicleBrand: a?.vehicleBrand ?? null,
				vehicleModel: a?.vehicleModel ?? null,
				vehicleYear: a?.vehicleYear ?? null,
				vehicleVin: a?.vehicleVin ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const a = operation.armoring;
		if (!a) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (a.itemType) {
			elements.push(`<TIPO_BIEN>${escapeXml(a.itemType)}</TIPO_BIEN>`);
		}
		if (a.itemStatusCode) {
			elements.push(
				`<ESTADO_BIEN>${escapeXml(a.itemStatusCode)}</ESTADO_BIEN>`,
			);
		}
		if (a.armorLevelCode) {
			elements.push(
				`<NIVEL_BLINDAJE>${escapeXml(a.armorLevelCode)}</NIVEL_BLINDAJE>`,
			);
		}
		if (a.armoredPartCode) {
			elements.push(
				`<PARTE_BLINDADA>${escapeXml(a.armoredPartCode)}</PARTE_BLINDADA>`,
			);
		}
		if (a.vehicleType) {
			elements.push(
				`<TIPO_VEHICULO>${escapeXml(a.vehicleType)}</TIPO_VEHICULO>`,
			);
		}
		if (a.vehicleBrand) {
			elements.push(
				`<MARCA_VEHICULO>${escapeXml(a.vehicleBrand)}</MARCA_VEHICULO>`,
			);
		}
		if (a.vehicleModel) {
			elements.push(
				`<MODELO_VEHICULO>${escapeXml(a.vehicleModel)}</MODELO_VEHICULO>`,
			);
		}
		if (a.vehicleYear) {
			elements.push(`<ANIO_VEHICULO>${a.vehicleYear}</ANIO_VEHICULO>`);
		}
		if (a.vehicleVin) {
			elements.push(`<NUMERO_SERIE>${escapeXml(a.vehicleVin)}</NUMERO_SERIE>`);
		}
		if (a.vehiclePlates) {
			elements.push(`<PLACAS>${escapeXml(a.vehiclePlates)}</PLACAS>`);
		}
		if (a.serviceDescription) {
			elements.push(
				`<DESCRIPCION_SERVICIO>${escapeXml(a.serviceDescription)}</DESCRIPCION_SERVICIO>`,
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
