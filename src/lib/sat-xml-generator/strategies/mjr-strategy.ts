/**
 * Jewelry and Precious Metals (MJR) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/mjr.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class JewelryXmlStrategy extends BaseActivityStrategy {
	activityCode = "MJR" as const;

	generateDetailXml(operation: OperationEntity): string {
		const j = operation.jewelry;
		if (!j) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_bien>");

		if (j.itemTypeCode) {
			xml.push(`<tipo_bien>${escapeXml(j.itemTypeCode)}</tipo_bien>`);
		}
		if (j.metalType) {
			xml.push(`<tipo_metal>${escapeXml(j.metalType)}</tipo_metal>`);
		}
		if (j.weightGrams) {
			xml.push(`<peso_gramos>${j.weightGrams}</peso_gramos>`);
		}
		if (j.purity) {
			xml.push(`<pureza>${escapeXml(j.purity)}</pureza>`);
		}
		if (j.jewelryDescription) {
			xml.push(`<descripcion>${escapeXml(j.jewelryDescription)}</descripcion>`);
		}
		if (j.brand) {
			xml.push(`<marca>${escapeXml(j.brand)}</marca>`);
		}
		if (j.serialNumber) {
			xml.push(`<numero_serie>${escapeXml(j.serialNumber)}</numero_serie>`);
		}
		if (j.tradeUnitCode) {
			xml.push(
				`<unidad_comercializacion>${escapeXml(j.tradeUnitCode)}</unidad_comercializacion>`,
			);
		}
		if (j.quantity) {
			xml.push(`<cantidad>${j.quantity}</cantidad>`);
		}
		if (j.unitPrice) {
			xml.push(`<precio_unitario>${j.unitPrice}</precio_unitario>`);
		}

		xml.push("</datos_bien>");

		return xml.join("\n");
	}
}
