/**
 * Donations (DON) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/don.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class DonationXmlStrategy extends BaseActivityStrategy {
	activityCode = "DON" as const;

	generateDetailXml(operation: OperationEntity): string {
		const d = operation.donation;
		if (!d) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_donativo>");

		if (d.donationType) {
			xml.push(`<tipo_donativo>${escapeXml(d.donationType)}</tipo_donativo>`);
		}
		if (d.purpose) {
			xml.push(`<finalidad>${escapeXml(d.purpose)}</finalidad>`);
		}
		if (d.itemTypeCode) {
			xml.push(`<tipo_bien>${escapeXml(d.itemTypeCode)}</tipo_bien>`);
		}
		if (d.itemDescription) {
			xml.push(
				`<descripcion_bien>${escapeXml(d.itemDescription)}</descripcion_bien>`,
			);
		}
		if (d.itemValue) {
			xml.push(`<valor_bien>${d.itemValue}</valor_bien>`);
		}
		if (d.isAnonymous !== null && d.isAnonymous !== undefined) {
			xml.push(`<es_anonimo>${d.isAnonymous ? "SI" : "NO"}</es_anonimo>`);
		}
		if (d.campaignName) {
			xml.push(`<nombre_campana>${escapeXml(d.campaignName)}</nombre_campana>`);
		}

		xml.push("</datos_donativo>");

		return xml.join("\n");
	}
}
