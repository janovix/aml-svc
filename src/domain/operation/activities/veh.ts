import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { VehicleExtensionSchema } from "../schemas";

export const vehicleHandler: ActivityHandler = {
	code: "VEH",
	name: "Vehicles",
	lfpiropiFraccion: "VIII",
	identificationThresholdUma: 3210,
	noticeThresholdUma: 6420,

	validateExtension(data: unknown): string | null {
		const result = VehicleExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid vehicle data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const vehicle = operation.vehicle;
		const riskFactors: string[] = [];

		if (vehicle) {
			// Check for armored vehicles
			if (vehicle.armorLevelCode) {
				riskFactors.push("armored_vehicle");
			}

			// Check for foreign flagged vehicles
			if (vehicle.flagCountryCode && vehicle.flagCountryCode !== "MEX") {
				riskFactors.push("foreign_flag");
			}

			// Check for high-value vehicles (luxury brands)
			const luxuryBrands = [
				"FERRARI",
				"LAMBORGHINI",
				"BENTLEY",
				"ROLLS-ROYCE",
				"MASERATI",
				"ASTON MARTIN",
			];
			if (
				vehicle.brand &&
				luxuryBrands.some((b) => vehicle.brand?.toUpperCase().includes(b))
			) {
				riskFactors.push("luxury_vehicle");
			}
		}

		return {
			subject: vehicle
				? `${vehicle.brand ?? ""} ${vehicle.model ?? ""} ${vehicle.year ?? ""}`.trim()
				: "Vehicle",
			attributes: {
				vehicleType: vehicle?.vehicleType ?? null,
				brand: vehicle?.brand ?? null,
				model: vehicle?.model ?? null,
				year: vehicle?.year ?? null,
				vin: vehicle?.vin ?? null,
				plates: vehicle?.plates ?? null,
				armorLevel: vehicle?.armorLevelCode ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const vehicle = operation.vehicle;
		if (!vehicle) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (vehicle.vehicleType) {
			elements.push(
				`<TIPO_VEHICULO>${escapeXml(vehicle.vehicleType)}</TIPO_VEHICULO>`,
			);
		}
		if (vehicle.brand) {
			elements.push(`<MARCA>${escapeXml(vehicle.brand)}</MARCA>`);
		}
		if (vehicle.model) {
			elements.push(`<MODELO>${escapeXml(vehicle.model)}</MODELO>`);
		}
		if (vehicle.year) {
			elements.push(`<ANIO>${vehicle.year}</ANIO>`);
		}
		if (vehicle.vin) {
			elements.push(`<NUMERO_SERIE>${escapeXml(vehicle.vin)}</NUMERO_SERIE>`);
		}
		if (vehicle.repuve) {
			elements.push(`<REPUVE>${escapeXml(vehicle.repuve)}</REPUVE>`);
		}
		if (vehicle.plates) {
			elements.push(`<PLACAS>${escapeXml(vehicle.plates)}</PLACAS>`);
		}
		if (vehicle.armorLevelCode) {
			elements.push(
				`<NIVEL_BLINDAJE>${escapeXml(vehicle.armorLevelCode)}</NIVEL_BLINDAJE>`,
			);
		}
		if (vehicle.engineNumber) {
			elements.push(
				`<NUMERO_MOTOR>${escapeXml(vehicle.engineNumber)}</NUMERO_MOTOR>`,
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
