import type { PrismaClient, Prisma } from "@prisma/client";
import type { InvoiceEntity, ListResultWithMeta } from "./types";
import type { InvoiceFilters, InvoiceCreateInput } from "./schemas";
import type { TenantContext } from "../../lib/tenant-context";
import { mapInvoiceToEntity } from "./mappers";
import {
	buildEnumFilterMeta,
	buildRangeFilterMeta,
	fromPrismaGroupBy,
} from "../../lib/filter-metadata";

export class InvoiceRepository {
	constructor(private prisma: PrismaClient) {}

	async create(
		tenant: TenantContext,
		input: InvoiceCreateInput,
	): Promise<InvoiceEntity> {
		const { organizationId, environment } = tenant;
		const invoice = await this.prisma.invoice.create({
			data: {
				id: crypto.randomUUID(),
				organizationId,
				environment,
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
		tenant: TenantContext,
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
		const { organizationId, environment } = tenant;
		const invoice = await this.prisma.invoice.create({
			data: {
				id: crypto.randomUUID(),
				organizationId,
				environment,
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
		tenant: TenantContext,
		id: string,
	): Promise<InvoiceEntity | null> {
		const { organizationId, environment } = tenant;
		const invoice = await this.prisma.invoice.findFirst({
			where: {
				id,
				organizationId,
				environment,
				deletedAt: null,
			},
			include: { items: true },
		});

		return invoice ? mapInvoiceToEntity(invoice) : null;
	}

	async findByUuid(
		tenant: TenantContext,
		uuid: string,
	): Promise<InvoiceEntity | null> {
		const { organizationId, environment } = tenant;
		const invoice = await this.prisma.invoice.findFirst({
			where: {
				uuid,
				organizationId,
				environment,
				deletedAt: null,
			},
			include: { items: true },
		});

		return invoice ? mapInvoiceToEntity(invoice) : null;
	}

	async list(
		tenant: TenantContext,
		filters: InvoiceFilters,
	): Promise<ListResultWithMeta<InvoiceEntity>> {
		const { organizationId, environment } = tenant;
		// Base conditions (not modified by enum filters)
		const baseWhere: Prisma.InvoiceWhereInput = {
			organizationId,
			environment,
			deletedAt: null,
		};

		if (filters.issuerRfc) baseWhere.issuerRfc = filters.issuerRfc;
		if (filters.receiverRfc) baseWhere.receiverRfc = filters.receiverRfc;
		if (filters.uuid) baseWhere.uuid = filters.uuid;

		if (filters.startDate || filters.endDate) {
			baseWhere.issueDate = {};
			if (filters.startDate)
				(baseWhere.issueDate as Prisma.DateTimeFilter).gte = new Date(
					filters.startDate,
				);
			if (filters.endDate)
				(baseWhere.issueDate as Prisma.DateTimeFilter).lte = new Date(
					filters.endDate,
				);
		}

		if (filters.minAmount || filters.maxAmount) {
			baseWhere.total = {};
			if (filters.minAmount)
				(baseWhere.total as Prisma.DecimalFilter).gte = parseFloat(
					filters.minAmount,
				);
			if (filters.maxAmount)
				(baseWhere.total as Prisma.DecimalFilter).lte = parseFloat(
					filters.maxAmount,
				);
		}

		const where: Prisma.InvoiceWhereInput = { ...baseWhere };
		if (filters.voucherTypeCode?.length)
			where.voucherTypeCode = { in: filters.voucherTypeCode };
		if (filters.currencyCode?.length)
			where.currencyCode = { in: filters.currencyCode };

		// voucherType counts: apply currencyCode but not voucherType
		const voucherCountWhere: Prisma.InvoiceWhereInput = { ...baseWhere };
		if (filters.currencyCode?.length)
			voucherCountWhere.currencyCode = { in: filters.currencyCode };

		// currency counts: apply voucherType but not currency
		const currencyCountWhere: Prisma.InvoiceWhereInput = { ...baseWhere };
		if (filters.voucherTypeCode?.length)
			currencyCountWhere.voucherTypeCode = { in: filters.voucherTypeCode };

		const [invoices, total, voucherGroups, currencyGroups, amountAgg] =
			await Promise.all([
				this.prisma.invoice.findMany({
					where,
					include: { items: true },
					orderBy: { issueDate: "desc" },
					skip: (filters.page - 1) * filters.limit,
					take: filters.limit,
				}),
				this.prisma.invoice.count({ where }),
				this.prisma.invoice.groupBy({
					by: ["voucherTypeCode"],
					where: voucherCountWhere,
					_count: { voucherTypeCode: true },
				}),
				this.prisma.invoice.groupBy({
					by: ["currencyCode"],
					where: currencyCountWhere,
					_count: { currencyCode: true },
				}),
				this.prisma.invoice.aggregate({
					where: baseWhere,
					_min: { total: true, issueDate: true },
					_max: { total: true, issueDate: true },
				}),
			]);

		return {
			data: invoices.map(mapInvoiceToEntity),
			pagination: {
				page: filters.page,
				limit: filters.limit,
				total,
				totalPages: Math.ceil(total / filters.limit),
			},
			filterMeta: [
				buildEnumFilterMeta(
					{ id: "voucherTypeCode", label: "Tipo de comprobante" },
					fromPrismaGroupBy(
						voucherGroups,
						"voucherTypeCode",
						"voucherTypeCode",
					),
				),
				buildEnumFilterMeta(
					{ id: "currencyCode", label: "Moneda" },
					fromPrismaGroupBy(currencyGroups, "currencyCode", "currencyCode"),
				),
				buildRangeFilterMeta(
					{ id: "total", label: "Total", type: "number-range" },
					{
						min:
							amountAgg._min.total != null
								? String(amountAgg._min.total)
								: null,
						max:
							amountAgg._max.total != null
								? String(amountAgg._max.total)
								: null,
					},
				),
				buildRangeFilterMeta(
					{ id: "issueDate", label: "Fecha de emisión", type: "date-range" },
					{
						min:
							amountAgg._min.issueDate != null
								? amountAgg._min.issueDate.toISOString()
								: null,
						max:
							amountAgg._max.issueDate != null
								? amountAgg._max.issueDate.toISOString()
								: null,
					},
				),
			],
		};
	}

	async update(
		tenant: TenantContext,
		id: string,
		notes: string | null,
	): Promise<InvoiceEntity | null> {
		const { organizationId, environment } = tenant;
		// Use updateMany to atomically update only if conditions match
		const result = await this.prisma.invoice.updateMany({
			where: { id, organizationId, environment, deletedAt: null },
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

	async getStats(tenant: TenantContext): Promise<{
		totalInvoices: number;
		ingresoInvoices: number;
		egresoInvoices: number;
	}> {
		const { organizationId, environment } = tenant;
		const [totalInvoices, ingresoInvoices, egresoInvoices] = await Promise.all([
			this.prisma.invoice.count({
				where: { organizationId, environment, deletedAt: null },
			}),
			this.prisma.invoice.count({
				where: {
					organizationId,
					environment,
					deletedAt: null,
					voucherTypeCode: "I",
				},
			}),
			this.prisma.invoice.count({
				where: {
					organizationId,
					environment,
					deletedAt: null,
					voucherTypeCode: "E",
				},
			}),
		]);

		return { totalInvoices, ingresoInvoices, egresoInvoices };
	}

	async softDelete(tenant: TenantContext, id: string): Promise<boolean> {
		const { organizationId, environment } = tenant;
		const existing = await this.prisma.invoice.findFirst({
			where: { id, organizationId, environment, deletedAt: null },
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
