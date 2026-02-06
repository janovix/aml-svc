/**
 * Credit and Debit Cards (TSC) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/tsc.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class CardXmlStrategy extends BaseActivityStrategy {
	activityCode = "TSC" as const;

	generateDetailXml(operation: OperationEntity): string {
		const c = operation.card;
		if (!c) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_tarjeta>");

		if (c.cardTypeCode) {
			xml.push(`<tipo_tarjeta>${escapeXml(c.cardTypeCode)}</tipo_tarjeta>`);
		}
		if (c.cardNumberMasked) {
			xml.push(
				`<numero_tarjeta>${escapeXml(c.cardNumberMasked)}</numero_tarjeta>`,
			);
		}
		if (c.cardBrand) {
			xml.push(`<marca_tarjeta>${escapeXml(c.cardBrand)}</marca_tarjeta>`);
		}
		if (c.issuerName) {
			xml.push(`<nombre_emisor>${escapeXml(c.issuerName)}</nombre_emisor>`);
		}
		if (c.creditLimit) {
			xml.push(`<limite_credito>${c.creditLimit}</limite_credito>`);
		}
		if (c.transactionType) {
			xml.push(
				`<tipo_operacion>${escapeXml(c.transactionType)}</tipo_operacion>`,
			);
		}

		xml.push("</datos_tarjeta>");

		return xml.join("\n");
	}
}
