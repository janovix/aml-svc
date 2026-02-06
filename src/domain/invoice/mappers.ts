import type { Invoice, InvoiceItem } from "@prisma/client";
import type { InvoiceEntity, InvoiceItemEntity } from "./types";

/**
 * Safely parses JSON, returning null on parse errors instead of throwing.
 */
function safeJsonParse(json: string): Record<string, unknown> | null {
	try {
		return JSON.parse(json);
	} catch {
		return null;
	}
}

export function mapInvoiceItemToEntity(item: InvoiceItem): InvoiceItemEntity {
	return {
		id: item.id,
		invoiceId: item.invoiceId,
		productServiceCode: item.productServiceCode,
		productServiceId: item.productServiceId,
		quantity: item.quantity.toString(),
		unitCode: item.unitCode,
		unitName: item.unitName,
		description: item.description,
		unitPrice: item.unitPrice.toString(),
		amount: item.amount.toString(),
		discount: item.discount?.toString() ?? null,
		taxObjectCode: item.taxObjectCode,
		transferredTaxAmount: item.transferredTaxAmount?.toString() ?? null,
		withheldTaxAmount: item.withheldTaxAmount?.toString() ?? null,
		metadata: item.metadata ? safeJsonParse(item.metadata) : null,
		createdAt: item.createdAt.toISOString(),
		updatedAt: item.updatedAt.toISOString(),
	};
}

export function mapInvoiceToEntity(
	invoice: Invoice & { items?: InvoiceItem[] },
): InvoiceEntity {
	return {
		id: invoice.id,
		organizationId: invoice.organizationId,
		uuid: invoice.uuid,
		version: invoice.version,
		series: invoice.series,
		folio: invoice.folio,
		issuerRfc: invoice.issuerRfc,
		issuerName: invoice.issuerName,
		issuerTaxRegimeCode: invoice.issuerTaxRegimeCode,
		receiverRfc: invoice.receiverRfc,
		receiverName: invoice.receiverName,
		receiverUsageCode: invoice.receiverUsageCode,
		receiverTaxRegimeCode: invoice.receiverTaxRegimeCode,
		receiverPostalCode: invoice.receiverPostalCode,
		subtotal: invoice.subtotal.toString(),
		discount: invoice.discount?.toString() ?? null,
		total: invoice.total.toString(),
		currencyCode: invoice.currencyCode,
		exchangeRate: invoice.exchangeRate?.toString() ?? null,
		paymentFormCode: invoice.paymentFormCode,
		paymentMethodCode: invoice.paymentMethodCode,
		voucherTypeCode: invoice.voucherTypeCode,
		issueDate: invoice.issueDate.toISOString().split("T")[0],
		certificationDate: invoice.certificationDate?.toISOString() ?? null,
		exportCode: invoice.exportCode,
		tfdUuid: invoice.tfdUuid,
		tfdSatCertificate: invoice.tfdSatCertificate,
		tfdSignature: invoice.tfdSignature,
		tfdStampDate: invoice.tfdStampDate?.toISOString() ?? null,
		xmlContent: invoice.xmlContent,
		notes: invoice.notes,
		createdAt: invoice.createdAt.toISOString(),
		updatedAt: invoice.updatedAt.toISOString(),
		deletedAt: invoice.deletedAt?.toISOString() ?? null,
		items: invoice.items?.map(mapInvoiceItemToEntity) ?? [],
	};
}
