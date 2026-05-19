import type { PrismaClient } from "@prisma/client";
import type { TenantContext } from "../../lib/tenant-context";
import type {
	OperationExceptionEntity,
	OperationExceptionEvidenceEntity,
	ExceptionStatus,
	ExceptionType,
	EvidenceType,
} from "./types";
import type {
	OperationExceptionUpsertInput,
	OperationExceptionEvidenceCreateInput,
} from "./schemas";

const exceptionInclude = {
	evidence: true,
} as const;

function mapExceptionToEntity(row: {
	id: string;
	operationId: string;
	organizationId: string;
	environment: string;
	exceptionType: string;
	status: string;
	legalReference: string | null;
	isFirstSale: boolean | null;
	hasDevelopmentBankFunding: boolean | null;
	developmentBankCode: string | null;
	developmentBankName: string | null;
	paidThroughFinancialSystem: boolean | null;
	hasDocumentaryEvidence: boolean | null;
	notes: string | null;
	validatedAt: Date | null;
	validatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	evidence?: Array<{
		id: string;
		exceptionId: string;
		evidenceType: string;
		description: string | null;
		docSvcDocumentId: string | null;
		uploadedBy: string | null;
		createdAt: Date;
	}>;
}): OperationExceptionEntity {
	return {
		id: row.id,
		operationId: row.operationId,
		organizationId: row.organizationId,
		environment: row.environment,
		exceptionType: row.exceptionType as ExceptionType,
		status: row.status as ExceptionStatus,
		legalReference: row.legalReference,
		isFirstSale: row.isFirstSale,
		hasDevelopmentBankFunding: row.hasDevelopmentBankFunding,
		developmentBankCode: row.developmentBankCode,
		developmentBankName: row.developmentBankName,
		paidThroughFinancialSystem: row.paidThroughFinancialSystem,
		hasDocumentaryEvidence: row.hasDocumentaryEvidence,
		notes: row.notes,
		validatedAt: row.validatedAt?.toISOString() ?? null,
		validatedBy: row.validatedBy,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		evidence: (row.evidence ?? []).map(mapEvidenceToEntity),
	};
}

function mapEvidenceToEntity(row: {
	id: string;
	exceptionId: string;
	evidenceType: string;
	description: string | null;
	docSvcDocumentId: string | null;
	uploadedBy: string | null;
	createdAt: Date;
}): OperationExceptionEvidenceEntity {
	return {
		id: row.id,
		exceptionId: row.exceptionId,
		evidenceType: row.evidenceType as EvidenceType,
		description: row.description,
		docSvcDocumentId: row.docSvcDocumentId,
		uploadedBy: row.uploadedBy,
		createdAt: row.createdAt.toISOString(),
	};
}

export class OperationExceptionRepository {
	constructor(private prisma: PrismaClient) {}

	async findByOperationId(
		ctx: TenantContext,
		operationId: string,
	): Promise<OperationExceptionEntity | null> {
		const row = await this.prisma.operationException.findFirst({
			where: {
				operationId,
				organizationId: ctx.organizationId,
				environment: ctx.environment,
			},
			include: exceptionInclude,
		});
		return row ? mapExceptionToEntity(row) : null;
	}

	async upsert(
		ctx: TenantContext,
		operationId: string,
		input: OperationExceptionUpsertInput,
		computedStatus: ExceptionStatus,
		userId?: string,
	): Promise<OperationExceptionEntity> {
		const existing = await this.prisma.operationException.findUnique({
			where: { operationId },
		});

		const isNowValidated =
			computedStatus === "VALIDATED" && existing?.status !== "VALIDATED";

		const data = {
			exceptionType: input.exceptionType ?? "FIRST_SALE_REAL_ESTATE",
			status: computedStatus,
			legalReference:
				input.legalReference ??
				"Art. 27 Bis, Frac. III, Reglas de Carácter General LFPIORPI",
			isFirstSale: input.isFirstSale ?? null,
			hasDevelopmentBankFunding: input.hasDevelopmentBankFunding ?? null,
			developmentBankCode: input.developmentBankCode ?? null,
			developmentBankName: input.developmentBankName ?? null,
			paidThroughFinancialSystem: input.paidThroughFinancialSystem ?? null,
			hasDocumentaryEvidence: input.hasDocumentaryEvidence ?? null,
			notes: input.notes ?? null,
			...(isNowValidated
				? { validatedAt: new Date(), validatedBy: userId ?? null }
				: {}),
		};

		if (existing) {
			const updated = await this.prisma.operationException.update({
				where: { id: existing.id },
				data,
				include: exceptionInclude,
			});
			return mapExceptionToEntity(updated);
		}

		const id = crypto.randomUUID();
		const created = await this.prisma.operationException.create({
			data: {
				id,
				operationId,
				organizationId: ctx.organizationId,
				environment: ctx.environment,
				...data,
			},
			include: exceptionInclude,
		});
		return mapExceptionToEntity(created);
	}

	async deleteByOperationId(
		ctx: TenantContext,
		operationId: string,
	): Promise<boolean> {
		const existing = await this.prisma.operationException.findFirst({
			where: {
				operationId,
				organizationId: ctx.organizationId,
				environment: ctx.environment,
			},
		});
		if (!existing) return false;
		await this.prisma.operationException.delete({
			where: { id: existing.id },
		});
		return true;
	}

	async addEvidence(
		exceptionId: string,
		input: OperationExceptionEvidenceCreateInput,
		uploadedBy?: string,
	): Promise<OperationExceptionEvidenceEntity> {
		const id = crypto.randomUUID();
		const created = await this.prisma.operationExceptionEvidence.create({
			data: {
				id,
				exceptionId,
				evidenceType: input.evidenceType,
				description: input.description ?? null,
				docSvcDocumentId: input.docSvcDocumentId ?? null,
				uploadedBy: uploadedBy ?? null,
			},
		});
		return mapEvidenceToEntity(created);
	}

	async removeEvidence(evidenceId: string): Promise<boolean> {
		const existing = await this.prisma.operationExceptionEvidence.findUnique({
			where: { id: evidenceId },
		});
		if (!existing) return false;
		await this.prisma.operationExceptionEvidence.delete({
			where: { id: evidenceId },
		});
		return true;
	}

	async countEvidence(exceptionId: string): Promise<number> {
		return this.prisma.operationExceptionEvidence.count({
			where: { exceptionId },
		});
	}

	async findExemptedOperationIds(
		ctx: TenantContext,
		operationIds: string[],
	): Promise<Set<string>> {
		if (operationIds.length === 0) return new Set();
		const rows = await this.prisma.operationException.findMany({
			where: {
				organizationId: ctx.organizationId,
				environment: ctx.environment,
				operationId: { in: operationIds },
				status: "VALIDATED",
			},
			select: { operationId: true },
		});
		return new Set(rows.map((r) => r.operationId));
	}

	async listExemptedForPeriod(
		ctx: TenantContext,
		periodStart: Date,
		periodEnd: Date,
	): Promise<OperationExceptionEntity[]> {
		const rows = await this.prisma.operationException.findMany({
			where: {
				organizationId: ctx.organizationId,
				environment: ctx.environment,
				status: "VALIDATED",
				operation: {
					operationDate: { gte: periodStart, lte: periodEnd },
					deletedAt: null,
				},
			},
			include: exceptionInclude,
			orderBy: { createdAt: "desc" },
		});
		return rows.map(mapExceptionToEntity);
	}
}
