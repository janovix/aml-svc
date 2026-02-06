/**
 * Public Official Faith (FEP) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/fep.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class OfficialXmlStrategy extends BaseActivityStrategy {
	activityCode = "FEP" as const;

	generateDetailXml(operation: OperationEntity): string {
		const o = operation.official;
		if (!o) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_fe_publica>");

		if (o.actTypeCode) {
			xml.push(`<tipo_acto>${escapeXml(o.actTypeCode)}</tipo_acto>`);
		}
		if (o.instrumentNumber) {
			xml.push(
				`<numero_instrumento>${escapeXml(o.instrumentNumber)}</numero_instrumento>`,
			);
		}
		if (o.instrumentDate) {
			xml.push(`<fecha_instrumento>${o.instrumentDate}</fecha_instrumento>`);
		}

		// Trust data
		if (o.trustTypeCode || o.trustIdentifier) {
			xml.push("<datos_fideicomiso>");
			if (o.trustTypeCode) {
				xml.push(
					`<tipo_fideicomiso>${escapeXml(o.trustTypeCode)}</tipo_fideicomiso>`,
				);
			}
			if (o.trustIdentifier) {
				xml.push(
					`<identificador_fideicomiso>${escapeXml(o.trustIdentifier)}</identificador_fideicomiso>`,
				);
			}
			if (o.trustPurpose) {
				xml.push(
					`<finalidad_fideicomiso>${escapeXml(o.trustPurpose)}</finalidad_fideicomiso>`,
				);
			}
			xml.push("</datos_fideicomiso>");
		}

		if (o.movementTypeCode) {
			xml.push(
				`<tipo_movimiento>${escapeXml(o.movementTypeCode)}</tipo_movimiento>`,
			);
		}
		if (o.assignmentTypeCode) {
			xml.push(`<tipo_cesion>${escapeXml(o.assignmentTypeCode)}</tipo_cesion>`);
		}
		if (o.mergerTypeCode) {
			xml.push(`<tipo_fusion>${escapeXml(o.mergerTypeCode)}</tipo_fusion>`);
		}
		if (o.incorporationReasonCode) {
			xml.push(
				`<motivo_constitucion>${escapeXml(o.incorporationReasonCode)}</motivo_constitucion>`,
			);
		}
		if (o.patrimonyModificationTypeCode) {
			xml.push(
				`<tipo_modificacion_patrimonio>${escapeXml(o.patrimonyModificationTypeCode)}</tipo_modificacion_patrimonio>`,
			);
		}
		if (o.powerOfAttorneyTypeCode) {
			xml.push(
				`<tipo_poder>${escapeXml(o.powerOfAttorneyTypeCode)}</tipo_poder>`,
			);
		}
		if (o.grantingTypeCode) {
			xml.push(
				`<tipo_otorgamiento>${escapeXml(o.grantingTypeCode)}</tipo_otorgamiento>`,
			);
		}
		if (o.shareholderPositionCode) {
			xml.push(
				`<cargo_accionista>${escapeXml(o.shareholderPositionCode)}</cargo_accionista>`,
			);
		}
		if (o.sharePercentage) {
			xml.push(
				`<porcentaje_acciones>${o.sharePercentage}</porcentaje_acciones>`,
			);
		}

		// Item data
		if (o.itemTypeCode || o.itemDescription || o.itemValue) {
			xml.push("<datos_bien>");
			if (o.itemTypeCode) {
				xml.push(`<tipo_bien>${escapeXml(o.itemTypeCode)}</tipo_bien>`);
			}
			if (o.itemDescription) {
				xml.push(
					`<descripcion_bien>${escapeXml(o.itemDescription)}</descripcion_bien>`,
				);
			}
			if (o.itemValue) {
				xml.push(`<valor_bien>${o.itemValue}</valor_bien>`);
			}
			xml.push("</datos_bien>");
		}

		xml.push("</datos_fe_publica>");

		return xml.join("\n");
	}
}
