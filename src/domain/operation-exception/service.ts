import type { PrismaClient } from "@prisma/client";
import type { TenantContext } from "../../lib/tenant-context";
import type {
	OperationExceptionEntity,
	OperationExceptionEvidenceEntity,
	ExceptionStatus,
} from "./types";
import { EXCEPTION_ELIGIBLE_ACTIVITIES } from "./types";
import type {
	OperationExceptionUpsertInput,
	OperationExceptionEvidenceCreateInput,
} from "./schemas";
import { OperationExceptionRepository } from "./repository";

export class ExceptionNotAllowedError extends Error {
	constructor(activityCode: string) {
		super(
			`Exceptions are only allowed for activities: ${EXCEPTION_ELIGIBLE_ACTIVITIES.join(", ")}. Got: ${activityCode}`,
		);
		this.name = "ExceptionNotAllowedError";
	}
}

export class ExceptionNotFoundError extends Error {
	constructor(operationId: string) {
		super(`No exception found for operation ${operationId}`);
		this.name = "ExceptionNotFoundError";
	}
}

export class OperationExceptionService {
	private repository: OperationExceptionRepository;

	constructor(private prisma: PrismaClient) {
		this.repository = new OperationExceptionRepository(prisma);
	}

	async getByOperationId(
		ctx: TenantContext,
		operationId: string,
	): Promise<OperationExceptionEntity | null> {
		return this.repository.findByOperationId(ctx, operationId);
	}

	async upsert(
		ctx: TenantContext,
		operationId: string,
		input: OperationExceptionUpsertInput,
		userId?: string,
	): Promise<OperationExceptionEntity> {
		const operation = await this.prisma.operation.findFirst({
			where: {
				id: operationId,
				organizationId: ctx.organizationId,
				environment: ctx.environment,
				deletedAt: null,
			},
		});
		if (!operation) {
			throw new ExceptionNotFoundError(operationId);
		}

		if (
			!EXCEPTION_ELIGIBLE_ACTIVITIES.includes(
				operation.activityCode as (typeof EXCEPTION_ELIGIBLE_ACTIVITIES)[number],
			)
		) {
			throw new ExceptionNotAllowedError(operation.activityCode);
		}

		const existing = await this.repository.findByOperationId(ctx, operationId);
		const evidenceCount = existing
			? await this.repository.countEvidence(existing.id)
			: 0;

		const status = computeStatus(input, evidenceCount);

		const result = await this.repository.upsert(
			ctx,
			operationId,
			input,
			status,
			userId,
		);

		if (status === "VALIDATED") {
			await this.cancelDetectedAlerts(operationId);
		}

		return result;
	}

	async deleteException(
		ctx: TenantContext,
		operationId: string,
	): Promise<boolean> {
		return this.repository.deleteByOperationId(ctx, operationId);
	}

	async addEvidence(
		ctx: TenantContext,
		operationId: string,
		input: OperationExceptionEvidenceCreateInput,
		uploadedBy?: string,
	): Promise<OperationExceptionEvidenceEntity> {
		const exception = await this.repository.findByOperationId(ctx, operationId);
		if (!exception) {
			throw new ExceptionNotFoundError(operationId);
		}

		const evidence = await this.repository.addEvidence(
			exception.id,
			input,
			uploadedBy,
		);

		await this.recomputeStatus(ctx, operationId);

		return evidence;
	}

	async removeEvidence(
		ctx: TenantContext,
		operationId: string,
		evidenceId: string,
	): Promise<boolean> {
		const exception = await this.repository.findByOperationId(ctx, operationId);
		if (!exception) {
			throw new ExceptionNotFoundError(operationId);
		}

		const removed = await this.repository.removeEvidence(evidenceId);
		if (removed) {
			await this.recomputeStatus(ctx, operationId);
		}
		return removed;
	}

	async listExemptedForPeriod(
		ctx: TenantContext,
		periodStart: Date,
		periodEnd: Date,
	): Promise<OperationExceptionEntity[]> {
		return this.repository.listExemptedForPeriod(ctx, periodStart, periodEnd);
	}

	private async recomputeStatus(
		ctx: TenantContext,
		operationId: string,
	): Promise<void> {
		const exception = await this.repository.findByOperationId(ctx, operationId);
		if (!exception) return;

		const evidenceCount = await this.repository.countEvidence(exception.id);
		const input: OperationExceptionUpsertInput = {
			exceptionType:
				exception.exceptionType as OperationExceptionUpsertInput["exceptionType"],
			legalReference: exception.legalReference,
			isFirstSale: exception.isFirstSale,
			hasDevelopmentBankFunding: exception.hasDevelopmentBankFunding,
			developmentBankCode:
				exception.developmentBankCode as OperationExceptionUpsertInput["developmentBankCode"],
			developmentBankName: exception.developmentBankName,
			paidThroughFinancialSystem: exception.paidThroughFinancialSystem,
			hasDocumentaryEvidence: exception.hasDocumentaryEvidence,
			notes: exception.notes,
		};

		const newStatus = computeStatus(input, evidenceCount);

		if (newStatus !== exception.status) {
			await this.repository.upsert(ctx, operationId, input, newStatus);
			if (newStatus === "VALIDATED") {
				await this.cancelDetectedAlerts(operationId);
			}
		}
	}

	private async cancelDetectedAlerts(operationId: string): Promise<void> {
		await this.prisma.alert.updateMany({
			where: {
				operationId,
				status: "DETECTED",
			},
			data: {
				status: "CANCELLED",
				cancellationReason: "exception_validated",
				cancelledAt: new Date(),
			},
		});
	}
}

export function computeStatus(
	input: OperationExceptionUpsertInput,
	evidenceCount: number,
): ExceptionStatus {
	const allQuestionsAnswered =
		input.isFirstSale !== null &&
		input.isFirstSale !== undefined &&
		input.hasDevelopmentBankFunding !== null &&
		input.hasDevelopmentBankFunding !== undefined &&
		input.paidThroughFinancialSystem !== null &&
		input.paidThroughFinancialSystem !== undefined &&
		input.hasDocumentaryEvidence !== null &&
		input.hasDocumentaryEvidence !== undefined;

	if (!allQuestionsAnswered) return "INCOMPLETE";

	const anyConditionFailed =
		!input.isFirstSale ||
		!input.hasDevelopmentBankFunding ||
		!input.paidThroughFinancialSystem ||
		!input.hasDocumentaryEvidence;

	if (anyConditionFailed) return "INVALIDATED";

	if (evidenceCount === 0) return "INCOMPLETE";

	return "VALIDATED";
}

export function isOperationExempted(
	exception: OperationExceptionEntity | null | undefined,
): boolean {
	return exception?.status === "VALIDATED";
}
