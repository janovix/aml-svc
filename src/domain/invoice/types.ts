import type { EnrichedCatalogItem } from "../catalog/enrichment";

export interface InvoiceItemEntity {
	id: string;
	invoiceId: string;
	productServiceCode: string;
	productServiceId: string | null;
	quantity: string;
	unitCode: string;
	unitName: string | null;
	description: string;
	unitPrice: string;
	amount: string;
	discount: string | null;
	taxObjectCode: string;
	transferredTaxAmount: string | null;
	withheldTaxAmount: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: string;
	updatedAt: string;
}

export interface InvoiceEntity {
	id: string;
	organizationId: string;
	// CFDI Core
	uuid: string | null;
	version: string;
	series: string | null;
	folio: string | null;
	// Issuer
	issuerRfc: string;
	issuerName: string;
	issuerTaxRegimeCode: string;
	// Receiver
	receiverRfc: string;
	receiverName: string;
	receiverUsageCode: string | null;
	receiverTaxRegimeCode: string | null;
	receiverPostalCode: string | null;
	// Financial
	subtotal: string;
	discount: string | null;
	total: string;
	currencyCode: string;
	exchangeRate: string | null;
	// Payment
	paymentFormCode: string | null;
	paymentMethodCode: string | null;
	// Type and dates
	voucherTypeCode: string;
	issueDate: string;
	certificationDate: string | null;
	// Export
	exportCode: string | null;
	// TFD
	tfdUuid: string | null;
	tfdSatCertificate: string | null;
	tfdSignature: string | null;
	tfdStampDate: string | null;
	// XML
	xmlContent: string | null;
	// Metadata
	notes: string | null;
	// Timestamps
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	// Relations
	items: InvoiceItemEntity[];
	// Enriched catalog items
	paymentFormCatalog?: EnrichedCatalogItem | null;
	paymentMethodCatalog?: EnrichedCatalogItem | null;
	currencyCatalog?: EnrichedCatalogItem | null;
	taxRegimeCatalog?: EnrichedCatalogItem | null;
	usageCatalog?: EnrichedCatalogItem | null;
}

import type { ListResult } from "../../lib/list-result";
export type {
	Pagination,
	ListResult,
	ListResultWithMeta,
	FilterMetaDef,
	FilterMetaOption,
	FilterType,
} from "../../lib/list-result";

export type InvoiceListResult = ListResult<InvoiceEntity>;

// CFDI XML parsing types
export interface CfdiComprobante {
	Version: string;
	Serie?: string;
	Folio?: string;
	Fecha: string;
	FormaPago?: string;
	MetodoPago?: string;
	SubTotal: string;
	Descuento?: string;
	Moneda: string;
	TipoCambio?: string;
	Total: string;
	TipoDeComprobante: string;
	Exportacion?: string;
	LugarExpedicion: string;
	Emisor: CfdiEmisor;
	Receptor: CfdiReceptor;
	Conceptos: CfdiConcepto[];
	TimbreFiscalDigital?: CfdiTfd;
}

export interface CfdiEmisor {
	Rfc: string;
	Nombre: string;
	RegimenFiscal: string;
}

export interface CfdiReceptor {
	Rfc: string;
	Nombre: string;
	DomicilioFiscalReceptor?: string;
	RegimenFiscalReceptor?: string;
	UsoCFDI?: string;
}

export interface CfdiConcepto {
	ClaveProdServ: string;
	NoIdentificacion?: string;
	Cantidad: string;
	ClaveUnidad: string;
	Unidad?: string;
	Descripcion: string;
	ValorUnitario: string;
	Importe: string;
	Descuento?: string;
	ObjetoImp?: string;
	// Nested taxes
	Impuestos?: {
		Traslados?: Array<{
			Base: string;
			Impuesto: string;
			TipoFactor: string;
			TasaOCuota?: string;
			Importe?: string;
		}>;
		Retenciones?: Array<{
			Base: string;
			Impuesto: string;
			TipoFactor: string;
			TasaOCuota: string;
			Importe: string;
		}>;
	};
}

export interface CfdiTfd {
	UUID: string;
	FechaTimbrado: string;
	SelloCFD: string;
	NoCertificadoSAT: string;
	SelloSAT: string;
}

// PLD extraction hints from CFDI
export interface PldHintFromCfdi {
	suggestedActivityCode?: string;
	paymentFormCode?: string;
	monetaryInstrumentCode?: string;
	itemHints: Array<{
		productServiceCode: string;
		description: string;
		amount: string;
		metadata?: Record<string, unknown>;
	}>;
}
