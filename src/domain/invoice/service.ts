import type { PrismaClient } from "@prisma/client";
import type {
	InvoiceEntity,
	ListResultWithMeta,
	PldHintFromCfdi,
} from "./types";
import type {
	InvoiceCreateInput,
	InvoiceParseXmlInput,
	InvoiceFilters,
} from "./schemas";
import { InvoiceRepository } from "./repository";
import { CfdiV4Parser, cfdiToInvoiceData } from "./parser/cfdi-v4";

export interface InvoiceParseResult {
	invoice: InvoiceEntity;
	pldHints: PldHintFromCfdi;
}

export class InvoiceService {
	private repository: InvoiceRepository;
	private parser: CfdiV4Parser;

	constructor(prisma: PrismaClient) {
		this.repository = new InvoiceRepository(prisma);
		this.parser = new CfdiV4Parser();
	}

	/**
	 * Create invoice from manual input (no XML)
	 */
	async create(
		organizationId: string,
		input: InvoiceCreateInput,
	): Promise<InvoiceEntity> {
		return this.repository.create(organizationId, input);
	}

	/**
	 * Parse CFDI XML and create invoice
	 * Returns the invoice along with PLD hints for operation suggestion
	 */
	async parseAndCreate(
		organizationId: string,
		input: InvoiceParseXmlInput,
	): Promise<InvoiceParseResult> {
		// Parse the XML
		const comprobante = this.parser.parse(input.xmlContent);

		// Check if invoice with same UUID already exists
		if (comprobante.TimbreFiscalDigital?.UUID) {
			const existing = await this.repository.findByUuid(
				organizationId,
				comprobante.TimbreFiscalDigital.UUID,
			);
			if (existing) {
				throw new Error(
					`Invoice with UUID ${comprobante.TimbreFiscalDigital.UUID} already exists`,
				);
			}
		}

		// Convert to invoice data
		const invoiceData = cfdiToInvoiceData(
			comprobante,
			input.xmlContent,
			input.notes || null,
		);

		// Create the invoice
		const invoice = await this.repository.createFromXml(
			organizationId,
			invoiceData,
		);

		// Extract PLD hints
		const pldHints = this.parser.extractPldHints(comprobante);

		return { invoice, pldHints };
	}

	/**
	 * Get invoice by ID
	 */
	async getById(
		organizationId: string,
		id: string,
	): Promise<InvoiceEntity | null> {
		return this.repository.findById(organizationId, id);
	}

	/**
	 * Get invoice by CFDI UUID
	 */
	async getByUuid(
		organizationId: string,
		uuid: string,
	): Promise<InvoiceEntity | null> {
		return this.repository.findByUuid(organizationId, uuid);
	}

	/**
	 * List invoices with filters
	 */
	async list(
		organizationId: string,
		filters: InvoiceFilters,
	): Promise<ListResultWithMeta<InvoiceEntity>> {
		return this.repository.list(organizationId, filters);
	}

	/**
	 * Update invoice notes
	 */
	async updateNotes(
		organizationId: string,
		id: string,
		notes: string | null,
	): Promise<InvoiceEntity | null> {
		return this.repository.update(organizationId, id, notes);
	}

	/**
	 * Get invoice statistics for the organization
	 */
	async getStats(organizationId: string): Promise<{
		totalInvoices: number;
		ingresoInvoices: number;
		egresoInvoices: number;
	}> {
		return this.repository.getStats(organizationId);
	}

	/**
	 * Soft delete invoice
	 */
	async delete(organizationId: string, id: string): Promise<boolean> {
		return this.repository.softDelete(organizationId, id);
	}
}
