/**
 * Gambling and Lotteries (JYS) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/jys.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class GamblingXmlStrategy extends BaseActivityStrategy {
	activityCode = "JYS" as const;

	generateDetailXml(operation: OperationEntity): string {
		const g = operation.gambling;
		if (!g) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_juego>");

		if (g.gameTypeCode) {
			xml.push(`<tipo_juego>${escapeXml(g.gameTypeCode)}</tipo_juego>`);
		}
		if (g.businessLineCode) {
			xml.push(`<giro_negocio>${escapeXml(g.businessLineCode)}</giro_negocio>`);
		}
		if (g.operationMethodCode) {
			xml.push(
				`<forma_realizacion>${escapeXml(g.operationMethodCode)}</forma_realizacion>`,
			);
		}
		if (g.prizeAmount) {
			xml.push(`<monto_premio>${g.prizeAmount}</monto_premio>`);
		}
		if (g.betAmount) {
			xml.push(`<monto_apuesta>${g.betAmount}</monto_apuesta>`);
		}
		if (g.ticketNumber) {
			xml.push(`<numero_boleto>${escapeXml(g.ticketNumber)}</numero_boleto>`);
		}
		if (g.eventName) {
			xml.push(`<nombre_evento>${escapeXml(g.eventName)}</nombre_evento>`);
		}
		if (g.eventDate) {
			xml.push(`<fecha_evento>${g.eventDate}</fecha_evento>`);
		}
		if (g.propertyTypeCode) {
			xml.push(
				`<tipo_inmueble>${escapeXml(g.propertyTypeCode)}</tipo_inmueble>`,
			);
		}
		if (g.propertyDescription) {
			xml.push(
				`<descripcion_inmueble>${escapeXml(g.propertyDescription)}</descripcion_inmueble>`,
			);
		}

		xml.push("</datos_juego>");

		return xml.join("\n");
	}
}
