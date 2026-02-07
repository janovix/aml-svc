import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { RewardExtensionSchema } from "../schemas";

export const rewardHandler: ActivityHandler = {
	code: "TDR",
	name: "Reward Points",
	lfpiropiFraccion: "II-c",
	identificationThresholdUma: 645,
	noticeThresholdUma: 645,

	validateExtension(data: unknown): string | null {
		const result = RewardExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid reward data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const r = operation.reward;
		const riskFactors: string[] = [];

		if (r) {
			// Check for high points value
			const pointsValue = r.pointsValue ? parseFloat(r.pointsValue) : 0;
			if (pointsValue > 100000) {
				riskFactors.push("high_points_value");
			}

			// Check for cash-equivalent redemption
			if (
				r.redemptionType?.toUpperCase().includes("CASH") ||
				r.redemptionType?.toUpperCase().includes("EFECTIVO")
			) {
				riskFactors.push("cash_redemption");
			}

			// Check for transfer type
			if (
				r.redemptionType?.toUpperCase().includes("TRANSFER") ||
				r.redemptionType?.toUpperCase().includes("TRANSFERENCIA")
			) {
				riskFactors.push("points_transfer");
			}
		}

		return {
			subject: r?.programName ?? r?.rewardType ?? "Reward Points",
			attributes: {
				rewardType: r?.rewardType ?? null,
				programName: r?.programName ?? null,
				pointsAmount: r?.pointsAmount ?? null,
				pointsValue: r?.pointsValue ?? null,
				pointsExpiryDate: r?.pointsExpiryDate ?? null,
				redemptionType: r?.redemptionType ?? null,
				redemptionDescription: r?.redemptionDescription ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const r = operation.reward;
		if (!r) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (r.rewardType) {
			elements.push(
				`<TIPO_RECOMPENSA>${escapeXml(r.rewardType)}</TIPO_RECOMPENSA>`,
			);
		}
		if (r.programName) {
			elements.push(
				`<NOMBRE_PROGRAMA>${escapeXml(r.programName)}</NOMBRE_PROGRAMA>`,
			);
		}
		if (r.pointsAmount) {
			elements.push(`<CANTIDAD_PUNTOS>${r.pointsAmount}</CANTIDAD_PUNTOS>`);
		}
		if (r.pointsValue) {
			elements.push(`<VALOR_PUNTOS>${r.pointsValue}</VALOR_PUNTOS>`);
		}
		if (r.pointsExpiryDate) {
			elements.push(
				`<FECHA_EXPIRACION>${r.pointsExpiryDate}</FECHA_EXPIRACION>`,
			);
		}
		if (r.redemptionType) {
			elements.push(`<TIPO_CANJE>${escapeXml(r.redemptionType)}</TIPO_CANJE>`);
		}
		if (r.redemptionDescription) {
			elements.push(
				`<DESCRIPCION_CANJE>${escapeXml(r.redemptionDescription)}</DESCRIPCION_CANJE>`,
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
