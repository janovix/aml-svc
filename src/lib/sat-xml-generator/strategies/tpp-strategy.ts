/**
 * Prepaid Cards (TPP) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/tpp.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class PrepaidXmlStrategy extends BaseActivityStrategy {
	activityCode = "TPP" as const;

	generateDetailXml(operation: OperationEntity): string {
		const p = operation.prepaid;
		if (!p) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_tarjeta_prepago>");

		if (p.cardType) {
			xml.push(`<tipo_tarjeta>${escapeXml(p.cardType)}</tipo_tarjeta>`);
		}
		if (p.cardNumberMasked) {
			xml.push(
				`<numero_tarjeta>${escapeXml(p.cardNumberMasked)}</numero_tarjeta>`,
			);
		}
		if (p.isInitialLoad !== null && p.isInitialLoad !== undefined) {
			xml.push(
				`<es_carga_inicial>${p.isInitialLoad ? "SI" : "NO"}</es_carga_inicial>`,
			);
		}
		if (p.reloadAmount) {
			xml.push(`<monto_recarga>${p.reloadAmount}</monto_recarga>`);
		}
		if (p.currentBalance) {
			xml.push(`<saldo_actual>${p.currentBalance}</saldo_actual>`);
		}
		if (p.issuerName) {
			xml.push(`<nombre_emisor>${escapeXml(p.issuerName)}</nombre_emisor>`);
		}

		xml.push("</datos_tarjeta_prepago>");

		return xml.join("\n");
	}
}
