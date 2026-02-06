/**
 * Armoring Services (BLI) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/bli.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class ArmoringXmlStrategy extends BaseActivityStrategy {
	activityCode = "BLI" as const;

	generateDetailXml(operation: OperationEntity): string {
		const a = operation.armoring;
		if (!a) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_blindaje>");

		if (a.itemType) {
			xml.push(`<tipo_bien>${escapeXml(a.itemType)}</tipo_bien>`);
		}
		if (a.itemStatusCode) {
			xml.push(`<estado_bien>${escapeXml(a.itemStatusCode)}</estado_bien>`);
		}
		if (a.armorLevelCode) {
			xml.push(
				`<nivel_blindaje>${escapeXml(a.armorLevelCode)}</nivel_blindaje>`,
			);
		}
		if (a.armoredPartCode) {
			xml.push(
				`<parte_blindada>${escapeXml(a.armoredPartCode)}</parte_blindada>`,
			);
		}

		// Vehicle data
		if (a.vehicleType || a.vehicleBrand || a.vehicleModel) {
			xml.push("<datos_vehiculo>");
			if (a.vehicleType) {
				xml.push(`<tipo_vehiculo>${escapeXml(a.vehicleType)}</tipo_vehiculo>`);
			}
			if (a.vehicleBrand) {
				xml.push(`<marca>${escapeXml(a.vehicleBrand)}</marca>`);
			}
			if (a.vehicleModel) {
				xml.push(`<modelo>${escapeXml(a.vehicleModel)}</modelo>`);
			}
			if (a.vehicleYear) {
				xml.push(`<anio>${a.vehicleYear}</anio>`);
			}
			if (a.vehicleVin) {
				xml.push(`<numero_serie>${escapeXml(a.vehicleVin)}</numero_serie>`);
			}
			if (a.vehiclePlates) {
				xml.push(`<placas>${escapeXml(a.vehiclePlates)}</placas>`);
			}
			xml.push("</datos_vehiculo>");
		}

		if (a.serviceDescription) {
			xml.push(
				`<descripcion_servicio>${escapeXml(a.serviceDescription)}</descripcion_servicio>`,
			);
		}

		xml.push("</datos_blindaje>");

		return xml.join("\n");
	}
}
