import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { CardExtensionSchema } from "../schemas";

export const cardHandler: ActivityHandler = {
	code: "TSC",
	name: "Credit and Debit Cards",
	lfpiropiFraccion: "II-a",
	identificationThresholdUma: 805,
	noticeThresholdUma: 1285,

	validateExtension(data: unknown): string | null {
		const result = CardExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid card data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const c = operation.card;
		const riskFactors: string[] = [];

		if (c) {
			// Check for high credit limit
			const creditLimit = c.creditLimit ? parseFloat(c.creditLimit) : 0;
			if (creditLimit > 500000) {
				riskFactors.push("high_credit_limit");
			}

			// Check for cash advance transactions
			if (
				c.transactionType?.toUpperCase().includes("CASH") ||
				c.transactionType?.toUpperCase().includes("EFECTIVO")
			) {
				riskFactors.push("cash_advance");
			}

			// Check for premium card brands
			const premiumBrands = [
				"AMEX",
				"CENTURION",
				"BLACK",
				"INFINITE",
				"WORLD ELITE",
			];
			if (
				c.cardBrand &&
				premiumBrands.some((b) => c.cardBrand?.toUpperCase().includes(b))
			) {
				riskFactors.push("premium_card");
			}
		}

		return {
			subject: c
				? `${c.cardBrand ?? ""} ${c.cardTypeCode ?? ""}`.trim()
				: "Card",
			attributes: {
				cardType: c?.cardTypeCode ?? null,
				cardBrand: c?.cardBrand ?? null,
				cardNumberMasked: c?.cardNumberMasked ?? null,
				issuerName: c?.issuerName ?? null,
				creditLimit: c?.creditLimit ?? null,
				transactionType: c?.transactionType ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const c = operation.card;
		if (!c) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (c.cardTypeCode) {
			elements.push(
				`<TIPO_TARJETA>${escapeXml(c.cardTypeCode)}</TIPO_TARJETA>`,
			);
		}
		if (c.cardNumberMasked) {
			elements.push(
				`<NUMERO_TARJETA>${escapeXml(c.cardNumberMasked)}</NUMERO_TARJETA>`,
			);
		}
		if (c.cardBrand) {
			elements.push(`<MARCA_TARJETA>${escapeXml(c.cardBrand)}</MARCA_TARJETA>`);
		}
		if (c.issuerName) {
			elements.push(
				`<NOMBRE_EMISOR>${escapeXml(c.issuerName)}</NOMBRE_EMISOR>`,
			);
		}
		if (c.creditLimit) {
			elements.push(`<LIMITE_CREDITO>${c.creditLimit}</LIMITE_CREDITO>`);
		}
		if (c.transactionType) {
			elements.push(
				`<TIPO_OPERACION>${escapeXml(c.transactionType)}</TIPO_OPERACION>`,
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
