/**
 * Reward Points (TDR) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/tdr.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class RewardXmlStrategy extends BaseActivityStrategy {
	activityCode = "TDR" as const;

	generateDetailXml(operation: OperationEntity): string {
		const r = operation.reward;
		if (!r) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_recompensa>");

		if (r.rewardType) {
			xml.push(`<tipo_recompensa>${escapeXml(r.rewardType)}</tipo_recompensa>`);
		}
		if (r.programName) {
			xml.push(
				`<nombre_programa>${escapeXml(r.programName)}</nombre_programa>`,
			);
		}
		if (r.pointsAmount) {
			xml.push(`<cantidad_puntos>${r.pointsAmount}</cantidad_puntos>`);
		}
		if (r.pointsValue) {
			xml.push(`<valor_puntos>${r.pointsValue}</valor_puntos>`);
		}
		if (r.pointsExpiryDate) {
			xml.push(`<fecha_expiracion>${r.pointsExpiryDate}</fecha_expiracion>`);
		}
		if (r.redemptionType) {
			xml.push(`<tipo_canje>${escapeXml(r.redemptionType)}</tipo_canje>`);
		}
		if (r.redemptionDescription) {
			xml.push(
				`<descripcion_canje>${escapeXml(r.redemptionDescription)}</descripcion_canje>`,
			);
		}

		xml.push("</datos_recompensa>");

		return xml.join("\n");
	}
}
