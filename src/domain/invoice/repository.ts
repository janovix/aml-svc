import type { PrismaClient, Prisma } from "@prisma/client";
import type { InvoiceEntity, InvoiceListResult } from "./types";
import type { InvoiceFilters, InvoiceCreateInput } from "./schemas";
import { mapInvoiceToEntity } from "./mappers";

export class InvoiceRepository {
	constructor(private prisma: PrismaClient) {}

	async create(
		organizationId: string,
		input: InvoiceCreateInput,
	): Promise<InvoiceEntity> {
		const invoice = await this.prisma.invoice.create({
			data: {
				id: crypto.randomUUID(),
				organizationId,
				uuid: input.uuid,
				version: input.version,
				series: input.series,
				folio: input.folio,
				issuerRfc: input.issuerRfc,
				issuerName: input.issuerName,
				issuerTaxRegimeCode: input.issuerTaxRegimeCode,
				receiverRfc: input.receiverRfc,
				receiverName: input.receiverName,
				receiverUsageCode: input.receiverUsageCode,
				receiverTaxRegimeCode: input.receiverTaxRegimeCode,
				receiverPostalCode: input.receiverPostalCode,
				subtotal: input.subtotal,
				discount: input.discount,
				total: input.total,
				currencyCode: input.currencyCode,
				exchangeRate: input.exchangeRate,
				paymentFormCode: input.paymentFormCode,
				paymentMethodCode: input.paymentMethodCode,
				voucherTypeCode: input.voucherTypeCode,
				issueDate: new Date(input.issueDate),
				certificationDate: input.certificationDate
					? new Date(input.certificationDate)
					: null,
				exportCode: input.exportCode,
				notes: input.notes,
				items: {
					create: input.items.map((item) => ({
						id: crypto.randomUUID(),
						productServiceCode: item.productServiceCode,
						productServiceId: item.productServiceId,
						quantity: item.quantity,
						unitCode: item.unitCode,
						unitName: item.unitName,
						description: item.description,
						unitPrice: item.unitPrice,
						amount: item.amount,
						discount: item.discount,
						taxObjectCode: item.taxObjectCode,
						transferredTaxAmount: item.transferredTaxAmount,
						withheldTaxAmount: item.withheldTaxAmount,
						metadata: item.metadata ? JSON.stringify(item.metadata) : null,
					})),
				},
			},
			include: { items: true },
		});

		return mapInvoiceToEntity(invoice);
	}

	async createFromXml(
		organizationId: string,
		data: {
			uuid: string | null;
			version: string;
			series: string | null;
			folio: string | null;
			issuerRfc: string;
			issuerName: string;
			issuerTaxRegimeCode: string;
			receiverRfc: string;
			receiverName: string;
			receiverUsageCode: string | null;
			receiverTaxRegimeCode: string | null;
			receiverPostalCode: string | null;
			subtotal: string;
			discount: string | null;
			total: string;
			currencyCode: string;
			exchangeRate: string | null;
			paymentFormCode: string | null;
			paymentMethodCode: string | null;
			voucherTypeCode: string;
			issueDate: Date;
			certificationDate: Date | null;
			exportCode: string | null;
			tfdUuid: string | null;
			tfdSatCertificate: string | null;
			tfdSignature: string | null;
			tfdStampDate: Date | null;
			xmlContent: string;
			notes: string | null;
			items: Array<{
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
				metadata: string | null;
			}>;
		},
	): Promise<InvoiceEntity> {
		const invoice = await this.prisma.invoice.create({
			data: {
				id: crypto.randomUUID(),
				organizationId,
				uuid: data.uuid,
				version: data.version,
				series: data.series,
				folio: data.folio,
				issuerRfc: data.issuerRfc,
				issuerName: data.issuerName,
				issuerTaxRegimeCode: data.issuerTaxRegimeCode,
				receiverRfc: data.receiverRfc,
				receiverName: data.receiverName,
				receiverUsageCode: data.receiverUsageCode,
				receiverTaxRegimeCode: data.receiverTaxRegimeCode,
				receiverPostalCode: data.receiverPostalCode,
				subtotal: data.subtotal,
				discount: data.discount,
				total: data.total,
				currencyCode: data.currencyCode,
				exchangeRate: data.exchangeRate,
				paymentFormCode: data.paymentFormCode,
				paymentMethodCode: data.paymentMethodCode,
				voucherTypeCode: data.voucherTypeCode,
				issueDate: data.issueDate,
				certificationDate: data.certificationDate,
				exportCode: data.exportCode,
				tfdUuid: data.tfdUuid,
				tfdSatCertificate: data.tfdSatCertificate,
				tfdSignature: data.tfdSignature,
				tfdStampDate: data.tfdStampDate,
				xmlContent: data.xmlContent,
				notes: data.notes,
				items: {
					create: data.items.map((item) => ({
						id: crypto.randomUUID(),
						...item,
					})),
				},
			},
			include: { items: true },
		});

		return mapInvoiceToEntity(invoice);
	}

	async findById(
		organizationId: string,
		id: string,
	): Promise<InvoiceEntity | null> {
		const invoice = await this.prisma.invoice.findFirst({
			where: {
				id,
				organizationId,
				deletedAt: null,
			},
			include: { items: true },
		});

		return invoice ? mapInvoiceToEntity(invoice) : null;
	}

	async findByUuid(
		organizationId: string,
		uuid: string,
	): Promise<InvoiceEntity | null> {
		const invoice = await this.prisma.invoice.findFirst({
			where: {
				uuid,
				organizationId,
				deletedAt: null,
			},
			include: { items: true },
		});

		return invoice ? mapInvoiceToEntity(invoice) : null;
	}

	async list(
		organizationId: string,
		filters: InvoiceFilters,
	): Promise<InvoiceListResult> {
		const where: Prisma.InvoiceWhereInput = {
			organizationId,
			deletedAt: null,
		};

		if (filters.issuerRfc) {
			where.issuerRfc = filters.issuerRfc;
		}

		if (filters.receiverRfc) {
			where.receiverRfc = filters.receiverRfc;
		}

		if (filters.uuid) {
			where.uuid = filters.uuid;
		}

		if (filters.voucherTypeCode) {
			where.voucherTypeCode = filters.voucherTypeCode;
		}

		if (filters.currencyCode) {
			where.currencyCode = filters.currencyCode;
		}

		if (filters.startDate || filters.endDate) {
			where.issueDate = {};
			if (filters.startDate) {
				where.issueDate.gte = new Date(filters.startDate);
			}
			if (filters.endDate) {
				where.issueDate.lte = new Date(filters.endDate);
			}
		}

		if (filters.minAmount || filters.maxAmount) {
			where.total = {};
			if (filters.minAmount) {
				where.total.gte = parseFloat(filters.minAmount);
			}
			if (filters.maxAmount) {
				where.total.lte = parseFloat(filters.maxAmount);
			}
		}

		const [invoices, total] = await Promise.all([
			this.prisma.invoice.findMany({
				where,
				include: { items: true },
				orderBy: { issueDate: "desc" },
				skip: (filters.page - 1) * filters.limit,
				take: filters.limit,
			}),
			this.prisma.invoice.count({ where }),
		]);

		return {
			data: invoices.map(mapInvoiceToEntity),
			pagination: {
				page: filters.page,
				limit: filters.limit,
				total,
				totalPages: Math.ceil(total / filters.limit),
			},
		};
	}

	async update(
		organizationId: string,
		id: string,
		notes: string | null,
	): Promise<InvoiceEntity | null> {
		// Use updateMany to atomically update only if conditions match
		const result = await this.prisma.invoice.updateMany({
			where: { id, organizationId, deletedAt: null },
			data: { notes },
		});

		if (result.count === 0) {
			return null;
		}

		const invoice = await this.prisma.invoice.findFirst({
			where: { id },
			include: { items: true },
		});

		return invoice ? mapInvoiceToEntity(invoice) : null;
	}

	async getStats(organizationId: string): Promise<{
		totalInvoices: number;
		ingresoInvoices: number;
		egresoInvoices: number;
	}> {
		const [totalInvoices, ingresoInvoices, egresoInvoices] = await Promise.all([
			this.prisma.invoice.count({
				where: { organizationId, deletedAt: null },
			}),
			this.prisma.invoice.count({
				where: { organizationId, deletedAt: null, voucherTypeCode: "I" },
			}),
			this.prisma.invoice.count({
				where: { organizationId, deletedAt: null, voucherTypeCode: "E" },
			}),
		]);

		return { totalInvoices, ingresoInvoices, egresoInvoices };
	}

	async softDelete(organizationId: string, id: string): Promise<boolean> {
		const existing = await this.prisma.invoice.findFirst({
			where: { id, organizationId, deletedAt: null },
		});

		if (!existing) {
			return false;
		}

		await this.prisma.invoice.update({
			where: { id },
			data: { deletedAt: new Date() },
		});

		return true;
	}
}
