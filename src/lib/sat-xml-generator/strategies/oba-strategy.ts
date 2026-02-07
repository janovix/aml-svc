/**
 * Art and Antiques (OBA) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/oba.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class ArtXmlStrategy extends BaseActivityStrategy {
	activityCode = "OBA" as const;

	generateDetailXml(operation: OperationEntity): string {
		const a = operation.art;
		if (!a) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_obra_arte>");

		if (a.artworkTypeCode) {
			xml.push(`<tipo_obra>${escapeXml(a.artworkTypeCode)}</tipo_obra>`);
		}
		if (a.title) {
			xml.push(`<titulo>${escapeXml(a.title)}</titulo>`);
		}
		if (a.artist) {
			xml.push(`<artista>${escapeXml(a.artist)}</artista>`);
		}
		if (a.yearCreated) {
			xml.push(`<anio_creacion>${a.yearCreated}</anio_creacion>`);
		}
		if (a.medium) {
			xml.push(`<tecnica>${escapeXml(a.medium)}</tecnica>`);
		}
		if (a.dimensions) {
			xml.push(`<dimensiones>${escapeXml(a.dimensions)}</dimensiones>`);
		}
		if (a.provenance) {
			xml.push(`<procedencia>${escapeXml(a.provenance)}</procedencia>`);
		}
		if (a.certificateAuthenticity) {
			xml.push(
				`<certificado_autenticidad>${escapeXml(a.certificateAuthenticity)}</certificado_autenticidad>`,
			);
		}
		if (a.previousOwner) {
			xml.push(
				`<propietario_anterior>${escapeXml(a.previousOwner)}</propietario_anterior>`,
			);
		}
		if (a.isAntique !== null && a.isAntique !== undefined) {
			xml.push(`<es_antiguedad>${a.isAntique ? "SI" : "NO"}</es_antiguedad>`);
		}
		if (a.auctionHouse) {
			xml.push(`<casa_subasta>${escapeXml(a.auctionHouse)}</casa_subasta>`);
		}
		if (a.lotNumber) {
			xml.push(`<numero_lote>${escapeXml(a.lotNumber)}</numero_lote>`);
		}

		xml.push("</datos_obra_arte>");

		return xml.join("\n");
	}
}
