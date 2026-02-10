import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { LoanExtensionSchema } from "../schemas";
import type { CatalogFieldsConfig } from "../../catalog/name-resolver";

export const CATALOG_FIELDS: CatalogFieldsConfig = {
	loanTypeCode: { catalog: "pld-loan-types", strategy: "BY_CODE" },
	guaranteeTypeCode: { catalog: "pld-guarantee-types", strategy: "BY_CODE" },
};

export const loanHandler: ActivityHandler = {
	code: "MPC",
	name: "Loans Between Individuals",
	lfpiropiFraccion: "IV",
	identificationThresholdUma: "ALWAYS",
	noticeThresholdUma: 1605,

	validateExtension(data: unknown): string | null {
		const result = LoanExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid loan data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const l = operation.loan;
		const riskFactors: string[] = [];

		if (l) {
			// Check for high principal
			const principal = parseFloat(l.principalAmount);
			if (principal > 1000000) {
				riskFactors.push("high_principal");
			}

			// Check for high interest rate
			const interestRate = l.interestRate ? parseFloat(l.interestRate) : 0;
			if (interestRate > 30) {
				riskFactors.push("high_interest_rate");
			}

			// Check for short term high value
			if (l.termMonths && l.termMonths < 12 && principal > 500000) {
				riskFactors.push("short_term_high_value");
			}

			// Check for insufficient collateral
			const collateralValue = l.guaranteeValue
				? parseFloat(l.guaranteeValue)
				: 0;
			if (principal > collateralValue * 1.5) {
				riskFactors.push("insufficient_collateral");
			}
		}

		return {
			subject: l?.loanTypeCode ?? "Loan",
			attributes: {
				loanType: l?.loanTypeCode ?? null,
				guaranteeType: l?.guaranteeTypeCode ?? null,
				principalAmount: l?.principalAmount ?? null,
				interestRate: l?.interestRate ?? null,
				termMonths: l?.termMonths ?? null,
				monthlyPayment: l?.monthlyPayment ?? null,
				disbursementDate: l?.disbursementDate ?? null,
				maturityDate: l?.maturityDate ?? null,
				guaranteeValue: l?.guaranteeValue ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const l = operation.loan;
		if (!l) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (l.loanTypeCode) {
			elements.push(
				`<TIPO_CREDITO>${escapeXml(l.loanTypeCode)}</TIPO_CREDITO>`,
			);
		}
		if (l.guaranteeTypeCode) {
			elements.push(
				`<TIPO_GARANTIA>${escapeXml(l.guaranteeTypeCode)}</TIPO_GARANTIA>`,
			);
		}
		if (l.principalAmount) {
			elements.push(`<MONTO_PRINCIPAL>${l.principalAmount}</MONTO_PRINCIPAL>`);
		}
		if (l.interestRate) {
			elements.push(`<TASA_INTERES>${l.interestRate}</TASA_INTERES>`);
		}
		if (l.termMonths) {
			elements.push(`<PLAZO_MESES>${l.termMonths}</PLAZO_MESES>`);
		}
		if (l.monthlyPayment) {
			elements.push(`<PAGO_MENSUAL>${l.monthlyPayment}</PAGO_MENSUAL>`);
		}
		if (l.disbursementDate) {
			elements.push(
				`<FECHA_DESEMBOLSO>${l.disbursementDate}</FECHA_DESEMBOLSO>`,
			);
		}
		if (l.maturityDate) {
			elements.push(`<FECHA_VENCIMIENTO>${l.maturityDate}</FECHA_VENCIMIENTO>`);
		}
		if (l.guaranteeDescription) {
			elements.push(
				`<DESCRIPCION_GARANTIA>${escapeXml(l.guaranteeDescription)}</DESCRIPCION_GARANTIA>`,
			);
		}
		if (l.guaranteeValue) {
			elements.push(`<VALOR_GARANTIA>${l.guaranteeValue}</VALOR_GARANTIA>`);
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
