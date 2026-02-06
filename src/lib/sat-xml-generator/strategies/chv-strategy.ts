/**
 * Traveler Checks (CHV) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/chv.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class TravelerCheckXmlStrategy extends BaseActivityStrategy {
	activityCode = "CHV" as const;

	generateDetailXml(operation: OperationEntity): string {
		const tc = operation.travelerCheck;
		if (!tc) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_cheque_viajero>");

		if (tc.denominationCode) {
			xml.push(
				`<denominacion>${escapeXml(tc.denominationCode)}</denominacion>`,
			);
		}
		if (tc.checkCount) {
			xml.push(`<cantidad_cheques>${tc.checkCount}</cantidad_cheques>`);
		}
		if (tc.serialNumbers) {
			xml.push(`<numeros_serie>${escapeXml(tc.serialNumbers)}</numeros_serie>`);
		}
		if (tc.issuerName) {
			xml.push(`<nombre_emisor>${escapeXml(tc.issuerName)}</nombre_emisor>`);
		}
		if (tc.issuerCountryCode) {
			xml.push(`<pais_emisor>${escapeXml(tc.issuerCountryCode)}</pais_emisor>`);
		}

		xml.push("</datos_cheque_viajero>");

		return xml.join("\n");
	}
}
