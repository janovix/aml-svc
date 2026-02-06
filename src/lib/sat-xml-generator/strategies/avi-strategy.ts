/**
 * Virtual Assets (AVI) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/avi.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class VirtualAssetXmlStrategy extends BaseActivityStrategy {
	activityCode = "AVI" as const;

	generateDetailXml(operation: OperationEntity): string {
		const va = operation.virtualAsset;
		if (!va) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_activo_virtual>");

		if (va.assetTypeCode) {
			xml.push(`<tipo_activo>${escapeXml(va.assetTypeCode)}</tipo_activo>`);
		}
		if (va.assetName) {
			xml.push(`<nombre_activo>${escapeXml(va.assetName)}</nombre_activo>`);
		}
		if (va.walletAddressOrigin) {
			xml.push(
				`<direccion_origen>${escapeXml(va.walletAddressOrigin)}</direccion_origen>`,
			);
		}
		if (va.walletAddressDestination) {
			xml.push(
				`<direccion_destino>${escapeXml(va.walletAddressDestination)}</direccion_destino>`,
			);
		}
		if (va.exchangeName) {
			xml.push(
				`<nombre_exchange>${escapeXml(va.exchangeName)}</nombre_exchange>`,
			);
		}
		if (va.exchangeCountryCode) {
			xml.push(
				`<pais_exchange>${escapeXml(va.exchangeCountryCode)}</pais_exchange>`,
			);
		}
		if (va.assetQuantity) {
			xml.push(`<cantidad>${va.assetQuantity}</cantidad>`);
		}
		if (va.assetUnitPrice) {
			xml.push(`<precio_unitario>${va.assetUnitPrice}</precio_unitario>`);
		}
		if (va.blockchainTxHash) {
			xml.push(
				`<hash_transaccion>${escapeXml(va.blockchainTxHash)}</hash_transaccion>`,
			);
		}

		xml.push("</datos_activo_virtual>");

		return xml.join("\n");
	}
}
