import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { ValuableExtensionSchema } from "../schemas";
import type { CatalogFieldsConfig } from "../../catalog/name-resolver";

export const CATALOG_FIELDS: CatalogFieldsConfig = {
	valueTypeCode: { catalog: "pld-value-types", strategy: "BY_CODE" },
	serviceTypeCode: { catalog: "pld-service-types", strategy: "BY_CODE" },
};

export const valuableHandler: ActivityHandler = {
	code: "TCV",
	name: "Valuable Custody and Transport",
	lfpiropiFraccion: "X",
	identificationThresholdUma: "ALWAYS",
	noticeThresholdUma: 3210,

	validateExtension(data: unknown): string | null {
		const result = ValuableExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid valuable custody data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const v = operation.valuable;
		const riskFactors: string[] = [];

		if (v) {
			// Check for high declared value
			const declaredValue = v.declaredValue ? parseFloat(v.declaredValue) : 0;
			if (declaredValue > 1000000) {
				riskFactors.push("high_declared_value");
			}

			// Check for underinsurance
			const insuredValue = v.insuredValue ? parseFloat(v.insuredValue) : 0;
			if (insuredValue < declaredValue * 0.5) {
				riskFactors.push("underinsured");
			}

			// Check for long custody period
			if (v.custodyStartDate && v.custodyEndDate) {
				const start = new Date(v.custodyStartDate);
				const end = new Date(v.custodyEndDate);
				const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
				if (days > 365) {
					riskFactors.push("extended_custody");
				}
			}
		}

		return {
			subject: v?.valueTypeCode ?? v?.description ?? "Valuable Item",
			attributes: {
				valueType: v?.valueTypeCode ?? null,
				serviceType: v?.serviceTypeCode ?? null,
				transportMethod: v?.transportMethod ?? null,
				originAddress: v?.originAddress ?? null,
				destinationAddress: v?.destinationAddress ?? null,
				custodyStartDate: v?.custodyStartDate ?? null,
				custodyEndDate: v?.custodyEndDate ?? null,
				storageLocation: v?.storageLocation ?? null,
				declaredValue: v?.declaredValue ?? null,
				insuredValue: v?.insuredValue ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const v = operation.valuable;
		if (!v) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (v.valueTypeCode) {
			elements.push(`<TIPO_VALOR>${escapeXml(v.valueTypeCode)}</TIPO_VALOR>`);
		}
		if (v.serviceTypeCode) {
			elements.push(
				`<TIPO_SERVICIO>${escapeXml(v.serviceTypeCode)}</TIPO_SERVICIO>`,
			);
		}
		if (v.transportMethod) {
			elements.push(
				`<METODO_TRANSPORTE>${escapeXml(v.transportMethod)}</METODO_TRANSPORTE>`,
			);
		}
		if (v.originAddress) {
			elements.push(
				`<DIRECCION_ORIGEN>${escapeXml(v.originAddress)}</DIRECCION_ORIGEN>`,
			);
		}
		if (v.destinationAddress) {
			elements.push(
				`<DIRECCION_DESTINO>${escapeXml(v.destinationAddress)}</DIRECCION_DESTINO>`,
			);
		}
		if (v.custodyStartDate) {
			elements.push(
				`<FECHA_INICIO_CUSTODIA>${v.custodyStartDate}</FECHA_INICIO_CUSTODIA>`,
			);
		}
		if (v.custodyEndDate) {
			elements.push(
				`<FECHA_FIN_CUSTODIA>${v.custodyEndDate}</FECHA_FIN_CUSTODIA>`,
			);
		}
		if (v.storageLocation) {
			elements.push(
				`<UBICACION_ALMACENAMIENTO>${escapeXml(v.storageLocation)}</UBICACION_ALMACENAMIENTO>`,
			);
		}
		if (v.declaredValue) {
			elements.push(`<VALOR_DECLARADO>${v.declaredValue}</VALOR_DECLARADO>`);
		}
		if (v.insuredValue) {
			elements.push(`<VALOR_ASEGURADO>${v.insuredValue}</VALOR_ASEGURADO>`);
		}
		if (v.description) {
			elements.push(`<DESCRIPCION>${escapeXml(v.description)}</DESCRIPCION>`);
		}

		return `<DETALLE_OPERACIONES>\n  ${elements.join("\n  ")}\n</DETALLE_OPERACIONES>`;
	},
};

function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
