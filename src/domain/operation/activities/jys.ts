import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { GamblingExtensionSchema } from "../schemas";

export const gamblingHandler: ActivityHandler = {
	code: "JYS",
	name: "Gambling and Lotteries",
	lfpiropiFraccion: "I",
	identificationThresholdUma: 325,
	noticeThresholdUma: 645,

	validateExtension(data: unknown): string | null {
		const result = GamblingExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid gambling data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const g = operation.gambling;
		const riskFactors: string[] = [];

		if (g) {
			// Check for high-value prize
			const prizeAmount = g.prizeAmount ? parseFloat(g.prizeAmount) : 0;
			if (prizeAmount > 500000) {
				riskFactors.push("high_value_prize");
			}

			// Check for high-value bet
			const betAmount = g.betAmount ? parseFloat(g.betAmount) : 0;
			if (betAmount > 100000) {
				riskFactors.push("high_value_bet");
			}

			// Check for property prizes
			if (g.propertyTypeCode) {
				riskFactors.push("property_prize");
			}
		}

		return {
			subject: g?.eventName ?? g?.gameTypeCode ?? "Gambling Operation",
			attributes: {
				gameType: g?.gameTypeCode ?? null,
				businessLine: g?.businessLineCode ?? null,
				operationMethod: g?.operationMethodCode ?? null,
				prizeAmount: g?.prizeAmount ?? null,
				betAmount: g?.betAmount ?? null,
				ticketNumber: g?.ticketNumber ?? null,
				eventName: g?.eventName ?? null,
				eventDate: g?.eventDate ?? null,
				propertyType: g?.propertyTypeCode ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const g = operation.gambling;
		if (!g) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (g.gameTypeCode) {
			elements.push(`<TIPO_JUEGO>${escapeXml(g.gameTypeCode)}</TIPO_JUEGO>`);
		}
		if (g.businessLineCode) {
			elements.push(
				`<GIRO_NEGOCIO>${escapeXml(g.businessLineCode)}</GIRO_NEGOCIO>`,
			);
		}
		if (g.operationMethodCode) {
			elements.push(
				`<FORMA_REALIZACION>${escapeXml(g.operationMethodCode)}</FORMA_REALIZACION>`,
			);
		}
		if (g.prizeAmount) {
			elements.push(`<MONTO_PREMIO>${g.prizeAmount}</MONTO_PREMIO>`);
		}
		if (g.betAmount) {
			elements.push(`<MONTO_APUESTA>${g.betAmount}</MONTO_APUESTA>`);
		}
		if (g.ticketNumber) {
			elements.push(
				`<NUMERO_BOLETO>${escapeXml(g.ticketNumber)}</NUMERO_BOLETO>`,
			);
		}
		if (g.eventName) {
			elements.push(`<NOMBRE_EVENTO>${escapeXml(g.eventName)}</NOMBRE_EVENTO>`);
		}
		if (g.eventDate) {
			elements.push(`<FECHA_EVENTO>${g.eventDate}</FECHA_EVENTO>`);
		}
		if (g.propertyTypeCode) {
			elements.push(
				`<TIPO_INMUEBLE>${escapeXml(g.propertyTypeCode)}</TIPO_INMUEBLE>`,
			);
		}
		if (g.propertyDescription) {
			elements.push(
				`<DESCRIPCION_INMUEBLE>${escapeXml(g.propertyDescription)}</DESCRIPCION_INMUEBLE>`,
			);
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
