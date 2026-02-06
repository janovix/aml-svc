/**
 * Notarial Faith (FES) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/fes.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class NotaryXmlStrategy extends BaseActivityStrategy {
	activityCode = "FES" as const;

	generateDetailXml(operation: OperationEntity): string {
		const n = operation.notary;
		if (!n) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_fe_social>");

		if (n.actTypeCode) {
			xml.push(`<tipo_acto>${escapeXml(n.actTypeCode)}</tipo_acto>`);
		}
		if (n.notaryNumber) {
			xml.push(`<numero_notaria>${escapeXml(n.notaryNumber)}</numero_notaria>`);
		}
		if (n.notaryStateCode) {
			xml.push(
				`<estado_notaria>${escapeXml(n.notaryStateCode)}</estado_notaria>`,
			);
		}
		if (n.instrumentNumber) {
			xml.push(
				`<numero_instrumento>${escapeXml(n.instrumentNumber)}</numero_instrumento>`,
			);
		}
		if (n.instrumentDate) {
			xml.push(`<fecha_instrumento>${n.instrumentDate}</fecha_instrumento>`);
		}
		if (n.legalEntityTypeCode) {
			xml.push(
				`<tipo_persona_moral>${escapeXml(n.legalEntityTypeCode)}</tipo_persona_moral>`,
			);
		}
		if (n.personCharacterTypeCode) {
			xml.push(
				`<tipo_persona_caracter>${escapeXml(n.personCharacterTypeCode)}</tipo_persona_caracter>`,
			);
		}
		if (n.incorporationReasonCode) {
			xml.push(
				`<motivo_constitucion>${escapeXml(n.incorporationReasonCode)}</motivo_constitucion>`,
			);
		}
		if (n.patrimonyModificationTypeCode) {
			xml.push(
				`<tipo_modificacion_patrimonio>${escapeXml(n.patrimonyModificationTypeCode)}</tipo_modificacion_patrimonio>`,
			);
		}
		if (n.powerOfAttorneyTypeCode) {
			xml.push(
				`<tipo_poder>${escapeXml(n.powerOfAttorneyTypeCode)}</tipo_poder>`,
			);
		}
		if (n.grantingTypeCode) {
			xml.push(
				`<tipo_otorgamiento>${escapeXml(n.grantingTypeCode)}</tipo_otorgamiento>`,
			);
		}
		if (n.shareholderPositionCode) {
			xml.push(
				`<cargo_accionista>${escapeXml(n.shareholderPositionCode)}</cargo_accionista>`,
			);
		}
		if (n.sharePercentage) {
			xml.push(
				`<porcentaje_acciones>${n.sharePercentage}</porcentaje_acciones>`,
			);
		}

		// Item data
		if (n.itemTypeCode || n.itemDescription || n.appraisalValue) {
			xml.push("<datos_bien>");
			if (n.itemTypeCode) {
				xml.push(`<tipo_bien>${escapeXml(n.itemTypeCode)}</tipo_bien>`);
			}
			if (n.itemDescription) {
				xml.push(
					`<descripcion_bien>${escapeXml(n.itemDescription)}</descripcion_bien>`,
				);
			}
			if (n.appraisalValue) {
				xml.push(`<valor_avaluo>${n.appraisalValue}</valor_avaluo>`);
			}
			xml.push("</datos_bien>");
		}

		if (n.guaranteeTypeCode) {
			xml.push(
				`<tipo_garantia>${escapeXml(n.guaranteeTypeCode)}</tipo_garantia>`,
			);
		}

		xml.push("</datos_fe_social>");

		return xml.join("\n");
	}
}
