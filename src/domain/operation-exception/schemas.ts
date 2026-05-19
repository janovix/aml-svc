import { z } from "zod";
import {
	EXCEPTION_TYPES,
	DEVELOPMENT_BANK_CODES,
	EVIDENCE_TYPES,
} from "./types";

export const ExceptionTypeSchema = z.enum(
	EXCEPTION_TYPES as unknown as [string, ...string[]],
);

export const DevelopmentBankCodeSchema = z.enum(
	DEVELOPMENT_BANK_CODES as unknown as [string, ...string[]],
);

export const EvidenceTypeSchema = z.enum(
	EVIDENCE_TYPES as unknown as [string, ...string[]],
);

export const OperationExceptionUpsertSchema = z.object({
	exceptionType: ExceptionTypeSchema.default("FIRST_SALE_REAL_ESTATE"),
	legalReference: z.string().max(500).optional().nullable(),
	isFirstSale: z.boolean().optional().nullable(),
	hasDevelopmentBankFunding: z.boolean().optional().nullable(),
	developmentBankCode: DevelopmentBankCodeSchema.optional().nullable(),
	developmentBankName: z.string().max(200).optional().nullable(),
	paidThroughFinancialSystem: z.boolean().optional().nullable(),
	hasDocumentaryEvidence: z.boolean().optional().nullable(),
	notes: z.string().max(2000).optional().nullable(),
});

export const OperationExceptionEvidenceCreateSchema = z.object({
	evidenceType: EvidenceTypeSchema,
	description: z.string().max(500).optional().nullable(),
	docSvcDocumentId: z.string().max(100).optional().nullable(),
});

export type OperationExceptionUpsertInput = z.infer<
	typeof OperationExceptionUpsertSchema
>;
export type OperationExceptionEvidenceCreateInput = z.infer<
	typeof OperationExceptionEvidenceCreateSchema
>;
