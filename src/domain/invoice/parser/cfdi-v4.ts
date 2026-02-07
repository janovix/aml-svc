import type {
	CfdiComprobante,
	CfdiEmisor,
	CfdiReceptor,
	CfdiConcepto,
	CfdiTfd,
	PldHintFromCfdi,
} from "../types";

/**
 * Parse CFDI v4.0 XML into structured data
 * This parser handles the official SAT CFDI XML format
 */
export class CfdiV4Parser {
	/**
	 * Parse CFDI XML string into structured data
	 */
	parse(xmlContent: string): CfdiComprobante {
		// Use regex-based parsing since we're in a Workers environment
		// This is simpler and doesn't require a full XML parser library

		const comprobante = this.parseComprobante(xmlContent);

		return comprobante;
	}

	/**
	 * Extract PLD hints from parsed CFDI for operation suggestion
	 */
	extractPldHints(comprobante: CfdiComprobante): PldHintFromCfdi {
		const hints: PldHintFromCfdi = {
			paymentFormCode: comprobante.FormaPago,
			itemHints: [],
		};

		// Map CFDI payment form to PLD monetary instrument
		if (comprobante.FormaPago) {
			hints.monetaryInstrumentCode = this.mapPaymentFormToMonetaryInstrument(
				comprobante.FormaPago,
			);
		}

		// Analyze product/service codes to suggest activity
		for (const concepto of comprobante.Conceptos) {
			const suggestedActivity = this.suggestActivityFromProductCode(
				concepto.ClaveProdServ,
			);

			if (suggestedActivity && !hints.suggestedActivityCode) {
				hints.suggestedActivityCode = suggestedActivity;
			}

			hints.itemHints.push({
				productServiceCode: concepto.ClaveProdServ,
				description: concepto.Descripcion,
				amount: concepto.Importe,
				metadata: this.extractMetadataFromDescription(concepto.Descripcion),
			});
		}

		return hints;
	}

	private parseComprobante(xml: string): CfdiComprobante {
		// Extract main comprobante attributes
		const comprobanteMatch = xml.match(
			/<cfdi:Comprobante([^>]*)>([\s\S]*?)<\/cfdi:Comprobante>/i,
		);

		if (!comprobanteMatch) {
			throw new Error("Invalid CFDI XML: Missing Comprobante element");
		}

		const attrs = comprobanteMatch[1];
		const content = comprobanteMatch[2];

		const comprobante: CfdiComprobante = {
			Version: this.extractAttr(attrs, "Version") || "4.0",
			Serie: this.extractAttr(attrs, "Serie") || undefined,
			Folio: this.extractAttr(attrs, "Folio") || undefined,
			Fecha: this.extractAttr(attrs, "Fecha") || "",
			FormaPago: this.extractAttr(attrs, "FormaPago") || undefined,
			MetodoPago: this.extractAttr(attrs, "MetodoPago") || undefined,
			SubTotal: this.extractAttr(attrs, "SubTotal") || "0",
			Descuento: this.extractAttr(attrs, "Descuento") || undefined,
			Moneda: this.extractAttr(attrs, "Moneda") || "MXN",
			TipoCambio: this.extractAttr(attrs, "TipoCambio") || undefined,
			Total: this.extractAttr(attrs, "Total") || "0",
			TipoDeComprobante: this.extractAttr(attrs, "TipoDeComprobante") || "I",
			Exportacion: this.extractAttr(attrs, "Exportacion") || undefined,
			LugarExpedicion: this.extractAttr(attrs, "LugarExpedicion") || "",
			Emisor: this.parseEmisor(content),
			Receptor: this.parseReceptor(content),
			Conceptos: this.parseConceptos(content),
			TimbreFiscalDigital: this.parseTfd(content),
		};

		return comprobante;
	}

	private parseEmisor(xml: string): CfdiEmisor {
		const emisorMatch = xml.match(/<cfdi:Emisor([^>]*)\/?\s*>/i);

		if (!emisorMatch) {
			throw new Error("Invalid CFDI XML: Missing Emisor element");
		}

		const attrs = emisorMatch[1];

		return {
			Rfc: this.extractAttr(attrs, "Rfc") || "",
			Nombre: this.extractAttr(attrs, "Nombre") || "",
			RegimenFiscal: this.extractAttr(attrs, "RegimenFiscal") || "",
		};
	}

	private parseReceptor(xml: string): CfdiReceptor {
		const receptorMatch = xml.match(/<cfdi:Receptor([^>]*)\/?\s*>/i);

		if (!receptorMatch) {
			throw new Error("Invalid CFDI XML: Missing Receptor element");
		}

		const attrs = receptorMatch[1];

		return {
			Rfc: this.extractAttr(attrs, "Rfc") || "",
			Nombre: this.extractAttr(attrs, "Nombre") || "",
			DomicilioFiscalReceptor:
				this.extractAttr(attrs, "DomicilioFiscalReceptor") || undefined,
			RegimenFiscalReceptor:
				this.extractAttr(attrs, "RegimenFiscalReceptor") || undefined,
			UsoCFDI: this.extractAttr(attrs, "UsoCFDI") || undefined,
		};
	}

	private parseConceptos(xml: string): CfdiConcepto[] {
		const conceptos: CfdiConcepto[] = [];

		// Match all Concepto elements
		const conceptoRegex =
			/<cfdi:Concepto([^>]*)(?:\/>|>([\s\S]*?)<\/cfdi:Concepto>)/gi;
		let match: RegExpExecArray | null;

		while ((match = conceptoRegex.exec(xml)) !== null) {
			const attrs = match[1];
			const _innerContent = match[2] || "";

			conceptos.push({
				ClaveProdServ: this.extractAttr(attrs, "ClaveProdServ") || "",
				NoIdentificacion:
					this.extractAttr(attrs, "NoIdentificacion") || undefined,
				Cantidad: this.extractAttr(attrs, "Cantidad") || "1",
				ClaveUnidad: this.extractAttr(attrs, "ClaveUnidad") || "",
				Unidad: this.extractAttr(attrs, "Unidad") || undefined,
				Descripcion: this.extractAttr(attrs, "Descripcion") || "",
				ValorUnitario: this.extractAttr(attrs, "ValorUnitario") || "0",
				Importe: this.extractAttr(attrs, "Importe") || "0",
				Descuento: this.extractAttr(attrs, "Descuento") || undefined,
				ObjetoImp: this.extractAttr(attrs, "ObjetoImp") || "02",
				// TODO: Parse nested Impuestos if needed
			});
		}

		if (conceptos.length === 0) {
			throw new Error("Invalid CFDI XML: No Concepto elements found");
		}

		return conceptos;
	}

	private parseTfd(xml: string): CfdiTfd | undefined {
		const tfdMatch = xml.match(/<tfd:TimbreFiscalDigital([^>]*)\/?\s*>/i);

		if (!tfdMatch) {
			return undefined;
		}

		const attrs = tfdMatch[1];

		return {
			UUID: this.extractAttr(attrs, "UUID") || "",
			FechaTimbrado: this.extractAttr(attrs, "FechaTimbrado") || "",
			SelloCFD: this.extractAttr(attrs, "SelloCFD") || "",
			NoCertificadoSAT: this.extractAttr(attrs, "NoCertificadoSAT") || "",
			SelloSAT: this.extractAttr(attrs, "SelloSAT") || "",
		};
	}

	private extractAttr(attrs: string, name: string): string | undefined {
		// Handle both single and double quotes
		const regex = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
		const match = attrs.match(regex);
		return match ? this.decodeXmlEntities(match[1]) : undefined;
	}

	private decodeXmlEntities(str: string): string {
		return str
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&apos;/g, "'");
	}

	/**
	 * Map CFDI FormaPago code to PLD monetary instrument code
	 */
	private mapPaymentFormToMonetaryInstrument(
		formaPago: string,
	): string | undefined {
		// CFDI FormaPago -> PLD Instrumento Monetario
		const mapping: Record<string, string> = {
			"01": "1", // Efectivo -> Efectivo
			"02": "2", // Cheque nominativo -> Cheque
			"03": "3", // Transferencia electrónica -> Transferencia
			"04": "4", // Tarjeta de crédito -> Tarjeta de crédito
			"28": "5", // Tarjeta de débito -> Tarjeta de débito
			"05": "6", // Monedero electrónico -> Monedero electrónico
			// Add more mappings as needed
		};

		return mapping[formaPago];
	}

	/**
	 * Suggest vulnerable activity based on product/service code
	 * SAT c_ClaveProdServ codes can hint at the type of operation
	 */
	private suggestActivityFromProductCode(
		productCode: string,
	): string | undefined {
		// Product code prefixes that suggest specific activities
		// Based on SAT c_ClaveProdServ catalog
		const prefixMappings: Record<string, string> = {
			// VEH: Vehicles
			"25": "VEH", // Vehículos, partes, accesorios
			"251": "VEH", // Vehículos terrestres
			"252": "VEH", // Vehículos aéreos
			"253": "VEH", // Vehículos marítimos
			// INM: Real estate
			"80141": "INM", // Servicios inmobiliarios
			"72151": "INM", // Servicios de construcción
			"72101": "INM", // Servicios de edificación
			// ARI: Rentals
			"80131": "ARI", // Arrendamiento de inmuebles
			// MJR: Jewelry & precious metals
			"71151": "MJR", // Joyería
			"11101": "MJR", // Minerales, piedras preciosas
			// AVI: Virtual assets
			"84111": "AVI", // Servicios financieros (crypto exchange)
			// JYS: Gambling
			"93141": "JYS", // Servicios de entretenimiento/apuestas
			"90101": "JYS", // Entretenimiento/recreación
			// BLI: Armoring
			"46171": "BLI", // Servicios de seguridad/blindaje
			// DON: Donations
			"93151": "DON", // Servicios de filantropía/donativos
			// OBA: Art & antiques
			"60101": "OBA", // Arte/artesanías
			"60121": "OBA", // Antigüedades
		};

		for (const [prefix, activity] of Object.entries(prefixMappings)) {
			if (productCode.startsWith(prefix)) {
				return activity;
			}
		}

		return undefined;
	}

	/**
	 * Extract metadata from description for PLD purposes.
	 * Uses VA-aware heuristics to pull VINs, plates, addresses,
	 * registry references, metal types, wallet addresses, and more.
	 */
	extractMetadataFromDescription(
		description: string,
	): Record<string, unknown> | undefined {
		const metadata: Record<string, unknown> = {};
		const desc = description || "";

		// ── VEH: Vehicle data ────────────────────────────────────
		// VIN (17 characters, excluding I, O, Q)
		const vinMatch = desc.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
		if (vinMatch) {
			metadata.vin = vinMatch[1].toUpperCase();
		}

		// License plates (Mexican format: AAA-1234 / ABC-123-A)
		const platesMatch = desc.match(
			/\b([A-Z]{2,3}[-\s]?\d{2,4}[-\s]?[A-Z]{0,2})\b/i,
		);
		if (platesMatch && platesMatch[1].length >= 5) {
			metadata.plates = platesMatch[1].replace(/\s/g, "-").toUpperCase();
		}

		// Model year (4 digits between 1970-2030)
		const yearMatch = desc.match(/\b(19[7-9]\d|20[0-3]\d)\b/);
		if (yearMatch) {
			metadata.year = parseInt(yearMatch[1], 10);
		}

		// Vehicle brand (common in Mexico)
		const brands = [
			"NISSAN",
			"VOLKSWAGEN",
			"CHEVROLET",
			"TOYOTA",
			"HONDA",
			"FORD",
			"BMW",
			"MERCEDES",
			"AUDI",
			"HYUNDAI",
			"KIA",
			"MAZDA",
			"SUZUKI",
			"MITSUBISHI",
			"DODGE",
			"JEEP",
			"PORSCHE",
			"FERRARI",
			"LAMBORGHINI",
			"VOLVO",
			"RENAULT",
			"PEUGEOT",
			"SEAT",
			"FIAT",
			"RAM",
			"GMC",
			"CADILLAC",
			"LINCOLN",
			"CHRYSLER",
			"SUBARU",
			"MINI",
			"LEXUS",
			"ACURA",
			"INFINITI",
			"BUICK",
			"JAC",
			"MG",
			"CHANGAN",
		];
		const descUpper = desc.toUpperCase();
		for (const brand of brands) {
			if (descUpper.includes(brand)) {
				metadata.vehicleBrand = brand;
				break;
			}
		}

		// Engine number (pattern: alphanumeric 6-15 chars often after "MOTOR" or "ENGINE")
		const engineMatch = desc.match(
			/(?:motor|engine|no\.?\s*motor)\s*:?\s*([A-Z0-9]{6,15})\b/i,
		);
		if (engineMatch) {
			metadata.engineNumber = engineMatch[1].toUpperCase();
		}

		// ── INM: Real estate data ────────────────────────────────
		// Registry folio (folio real, folio electrónico)
		const folioMatch = desc.match(
			/(?:folio\s*(?:real|electr[oó]nico)?)\s*:?\s*([A-Z0-9-]{4,30})/i,
		);
		if (folioMatch) {
			metadata.registryFolio = folioMatch[1];
		}

		// Postal code (5 digits)
		const cpMatch = desc.match(/(?:C\.?P\.?|postal)\s*:?\s*(\d{5})\b/i);
		if (cpMatch) {
			metadata.postalCode = cpMatch[1];
		}

		// Land area in m²
		const areaMatch = desc.match(
			/(\d{1,6}(?:\.\d{1,2})?)\s*m(?:²|2|ts?\.?\s*2?)\b/i,
		);
		if (areaMatch) {
			metadata.areaM2 = parseFloat(areaMatch[1]);
		}

		// ── MJR: Jewelry / precious metals data ──────────────────
		// Weight in grams or karats
		const weightMatch = desc.match(
			/(\d{1,6}(?:\.\d{1,3})?)\s*(?:gr?(?:amos)?|oz|onzas?|kg|kilogramos?)\b/i,
		);
		if (weightMatch) {
			metadata.weight = parseFloat(weightMatch[1]);
			metadata.weightUnit = desc.match(/kg|kilogramos?/i) ? "kg" : "g";
		}

		const purityMatch = desc.match(
			/(\d{1,2})\s*(?:k|kt|kilates?|quilates?)\b/i,
		);
		if (purityMatch) {
			metadata.purity = `${purityMatch[1]}K`;
		}

		// Metal type
		const metals = [
			"ORO",
			"PLATA",
			"PLATINO",
			"PALADIO",
			"GOLD",
			"SILVER",
			"PLATINUM",
		];
		for (const metal of metals) {
			if (descUpper.includes(metal)) {
				metadata.metalType = metal;
				break;
			}
		}

		// ── AVI: Virtual assets ──────────────────────────────────
		// Wallet address (common crypto formats)
		const walletMatch = desc.match(
			/\b(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})\b/,
		);
		if (walletMatch) {
			metadata.walletAddress = walletMatch[1];
		}

		// Blockchain transaction hash
		const txHashMatch = desc.match(/\b(0x[a-fA-F0-9]{64}|[a-f0-9]{64})\b/);
		if (txHashMatch) {
			metadata.blockchainTxHash = txHashMatch[1];
		}

		// Crypto asset names
		const cryptoAssets = [
			"BITCOIN",
			"BTC",
			"ETHEREUM",
			"ETH",
			"USDT",
			"USDC",
			"XRP",
			"LITECOIN",
			"LTC",
		];
		for (const asset of cryptoAssets) {
			if (descUpper.includes(asset)) {
				metadata.cryptoAsset = asset;
				break;
			}
		}

		// ── ARI: Rental ──────────────────────────────────────────
		// Rental period in months
		const rentalMatch = desc.match(/(\d{1,3})\s*(?:meses?|months?)\b/i);
		if (rentalMatch) {
			metadata.rentalPeriodMonths = parseInt(rentalMatch[1], 10);
		}

		// ── General: Reference number / contract ─────────────────
		const contractMatch = desc.match(
			/(?:contrato|contract|ref(?:erencia)?)\s*:?\s*#?\s*([A-Z0-9-]{3,30})\b/i,
		);
		if (contractMatch) {
			metadata.referenceNumber = contractMatch[1];
		}

		return Object.keys(metadata).length > 0 ? metadata : undefined;
	}
}

/**
 * Convert parsed CFDI to invoice repository input format
 */
export function cfdiToInvoiceData(
	comprobante: CfdiComprobante,
	xmlContent: string,
	notes: string | null,
) {
	const tfd = comprobante.TimbreFiscalDigital;

	return {
		uuid: tfd?.UUID || null,
		version: comprobante.Version,
		series: comprobante.Serie || null,
		folio: comprobante.Folio || null,
		issuerRfc: comprobante.Emisor.Rfc,
		issuerName: comprobante.Emisor.Nombre,
		issuerTaxRegimeCode: comprobante.Emisor.RegimenFiscal,
		receiverRfc: comprobante.Receptor.Rfc,
		receiverName: comprobante.Receptor.Nombre,
		receiverUsageCode: comprobante.Receptor.UsoCFDI || null,
		receiverTaxRegimeCode: comprobante.Receptor.RegimenFiscalReceptor || null,
		receiverPostalCode: comprobante.Receptor.DomicilioFiscalReceptor || null,
		subtotal: comprobante.SubTotal,
		discount: comprobante.Descuento || null,
		total: comprobante.Total,
		currencyCode: comprobante.Moneda,
		exchangeRate: comprobante.TipoCambio || null,
		paymentFormCode: comprobante.FormaPago || null,
		paymentMethodCode: comprobante.MetodoPago || null,
		voucherTypeCode: comprobante.TipoDeComprobante,
		issueDate: parseIsoDate(comprobante.Fecha),
		certificationDate: tfd?.FechaTimbrado
			? parseIsoDate(tfd.FechaTimbrado)
			: null,
		exportCode: comprobante.Exportacion || null,
		tfdUuid: tfd?.UUID || null,
		tfdSatCertificate: tfd?.NoCertificadoSAT || null,
		tfdSignature: tfd?.SelloSAT || null,
		tfdStampDate: tfd?.FechaTimbrado ? parseIsoDate(tfd.FechaTimbrado) : null,
		xmlContent,
		notes,
		items: comprobante.Conceptos.map((concepto) => ({
			productServiceCode: concepto.ClaveProdServ,
			productServiceId: concepto.NoIdentificacion || null,
			quantity: concepto.Cantidad,
			unitCode: concepto.ClaveUnidad,
			unitName: concepto.Unidad || null,
			description: concepto.Descripcion,
			unitPrice: concepto.ValorUnitario,
			amount: concepto.Importe,
			discount: concepto.Descuento || null,
			taxObjectCode: concepto.ObjetoImp || "02",
			transferredTaxAmount: null, // TODO: Sum from nested taxes
			withheldTaxAmount: null, // TODO: Sum from nested taxes
			metadata: null,
		})),
	};
}

function parseIsoDate(dateStr: string): Date {
	// CFDI dates are in ISO format: 2024-01-15T10:30:00
	return new Date(dateStr);
}
