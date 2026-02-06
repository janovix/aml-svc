/**
 * Vehicle (VEH) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/veh.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class VehicleXmlStrategy extends BaseActivityStrategy {
	activityCode = "VEH" as const;

	generateDetailXml(operation: OperationEntity): string {
		const vehicle = operation.vehicle;
		if (!vehicle) {
			return "";
		}

		const xml: string[] = [];

		// Determine vehicle type
		const vehicleType = vehicle.vehicleType?.toLowerCase() ?? "land";
		const isLand = vehicleType === "land" || vehicleType === "terrestre";
		const isMarine = vehicleType === "marine" || vehicleType === "maritimo";
		const isAir = vehicleType === "air" || vehicleType === "aereo";

		xml.push("<tipo_vehiculo>");

		if (isLand) {
			xml.push("<datos_vehiculo_terrestre>");
			if (vehicle.brand) {
				xml.push(
					`<marca_fabricante>${escapeXml(vehicle.brand)}</marca_fabricante>`,
				);
			}
			if (vehicle.model) {
				xml.push(`<modelo>${escapeXml(vehicle.model)}</modelo>`);
			}
			if (vehicle.year) {
				xml.push(`<anio>${vehicle.year}</anio>`);
			}
			if (vehicle.vin) {
				xml.push(`<vin>${escapeXml(vehicle.vin)}</vin>`);
			}
			if (vehicle.repuve) {
				xml.push(`<repuve>${escapeXml(vehicle.repuve)}</repuve>`);
			}
			if (vehicle.plates) {
				xml.push(`<placas>${escapeXml(vehicle.plates)}</placas>`);
			}
			if (vehicle.armorLevelCode) {
				xml.push(
					`<nivel_blindaje>${escapeXml(vehicle.armorLevelCode)}</nivel_blindaje>`,
				);
			}
			xml.push("</datos_vehiculo_terrestre>");
		} else if (isMarine) {
			xml.push("<datos_vehiculo_maritimo>");
			if (vehicle.brand) {
				xml.push(
					`<marca_fabricante>${escapeXml(vehicle.brand)}</marca_fabricante>`,
				);
			}
			if (vehicle.model) {
				xml.push(`<modelo>${escapeXml(vehicle.model)}</modelo>`);
			}
			if (vehicle.year) {
				xml.push(`<anio>${vehicle.year}</anio>`);
			}
			if (vehicle.serialNumber) {
				xml.push(
					`<numero_serie>${escapeXml(vehicle.serialNumber)}</numero_serie>`,
				);
			}
			if (vehicle.flagCountryCode) {
				xml.push(`<bandera>${escapeXml(vehicle.flagCountryCode)}</bandera>`);
			}
			if (vehicle.registrationNumber) {
				xml.push(
					`<matricula>${escapeXml(vehicle.registrationNumber)}</matricula>`,
				);
			}
			if (vehicle.armorLevelCode) {
				xml.push(
					`<nivel_blindaje>${escapeXml(vehicle.armorLevelCode)}</nivel_blindaje>`,
				);
			}
			xml.push("</datos_vehiculo_maritimo>");
		} else if (isAir) {
			xml.push("<datos_vehiculo_aereo>");
			if (vehicle.brand) {
				xml.push(
					`<marca_fabricante>${escapeXml(vehicle.brand)}</marca_fabricante>`,
				);
			}
			if (vehicle.model) {
				xml.push(`<modelo>${escapeXml(vehicle.model)}</modelo>`);
			}
			if (vehicle.year) {
				xml.push(`<anio>${vehicle.year}</anio>`);
			}
			if (vehicle.serialNumber) {
				xml.push(
					`<numero_serie>${escapeXml(vehicle.serialNumber)}</numero_serie>`,
				);
			}
			if (vehicle.flagCountryCode) {
				xml.push(`<bandera>${escapeXml(vehicle.flagCountryCode)}</bandera>`);
			}
			if (vehicle.registrationNumber) {
				xml.push(
					`<matricula>${escapeXml(vehicle.registrationNumber)}</matricula>`,
				);
			}
			if (vehicle.armorLevelCode) {
				xml.push(
					`<nivel_blindaje>${escapeXml(vehicle.armorLevelCode)}</nivel_blindaje>`,
				);
			}
			xml.push("</datos_vehiculo_aereo>");
		}

		xml.push("</tipo_vehiculo>");

		return xml.join("\n");
	}
}
