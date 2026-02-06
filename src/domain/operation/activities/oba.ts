import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { ArtExtensionSchema } from "../schemas";

export const artHandler: ActivityHandler = {
	code: "OBA",
	name: "Art and Antiques",
	lfpiropiFraccion: "VII",
	identificationThresholdUma: 2410,
	noticeThresholdUma: 4815,

	validateExtension(data: unknown): string | null {
		const result = ArtExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid art data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const a = operation.art;
		const riskFactors: string[] = [];

		if (a) {
			// Check for antique items
			if (a.isAntique) {
				riskFactors.push("antique_item");
			}

			// Check for missing authentication
			if (!a.certificateAuthenticity) {
				riskFactors.push("no_certificate");
			}

			// Check for missing provenance
			if (!a.provenance) {
				riskFactors.push("no_provenance");
			}

			// Check for auction purchases
			if (a.auctionHouse) {
				riskFactors.push("auction_purchase");
			}

			// Check for old artwork
			if (a.yearCreated && a.yearCreated < 1900) {
				riskFactors.push("pre_1900");
			}
		}

		const subject = a
			? `${a.title ?? ""} by ${a.artist ?? "Unknown"}`.trim()
			: "Art/Antique";

		return {
			subject,
			attributes: {
				artworkType: a?.artworkTypeCode ?? null,
				title: a?.title ?? null,
				artist: a?.artist ?? null,
				yearCreated: a?.yearCreated ?? null,
				medium: a?.medium ?? null,
				dimensions: a?.dimensions ?? null,
				provenance: a?.provenance ?? null,
				certificateAuthenticity: a?.certificateAuthenticity ?? null,
				previousOwner: a?.previousOwner ?? null,
				isAntique: a?.isAntique ?? null,
				auctionHouse: a?.auctionHouse ?? null,
				lotNumber: a?.lotNumber ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const a = operation.art;
		if (!a) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (a.artworkTypeCode) {
			elements.push(`<TIPO_OBRA>${escapeXml(a.artworkTypeCode)}</TIPO_OBRA>`);
		}
		if (a.title) {
			elements.push(`<TITULO>${escapeXml(a.title)}</TITULO>`);
		}
		if (a.artist) {
			elements.push(`<ARTISTA>${escapeXml(a.artist)}</ARTISTA>`);
		}
		if (a.yearCreated) {
			elements.push(`<ANIO_CREACION>${a.yearCreated}</ANIO_CREACION>`);
		}
		if (a.medium) {
			elements.push(`<TECNICA>${escapeXml(a.medium)}</TECNICA>`);
		}
		if (a.dimensions) {
			elements.push(`<DIMENSIONES>${escapeXml(a.dimensions)}</DIMENSIONES>`);
		}
		if (a.provenance) {
			elements.push(`<PROCEDENCIA>${escapeXml(a.provenance)}</PROCEDENCIA>`);
		}
		if (a.certificateAuthenticity) {
			elements.push(
				`<CERTIFICADO_AUTENTICIDAD>${escapeXml(a.certificateAuthenticity)}</CERTIFICADO_AUTENTICIDAD>`,
			);
		}
		if (a.previousOwner) {
			elements.push(
				`<PROPIETARIO_ANTERIOR>${escapeXml(a.previousOwner)}</PROPIETARIO_ANTERIOR>`,
			);
		}
		if (a.isAntique !== null && a.isAntique !== undefined) {
			elements.push(
				`<ES_ANTIGUEDAD>${a.isAntique ? "SI" : "NO"}</ES_ANTIGUEDAD>`,
			);
		}
		if (a.auctionHouse) {
			elements.push(
				`<CASA_SUBASTA>${escapeXml(a.auctionHouse)}</CASA_SUBASTA>`,
			);
		}
		if (a.lotNumber) {
			elements.push(`<NUMERO_LOTE>${escapeXml(a.lotNumber)}</NUMERO_LOTE>`);
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
