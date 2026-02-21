/**
 * Shareholder Domain Mappers
 * Maps between Prisma/D1 and domain entities
 */

import { Prisma, type Shareholder as PrismaShareholder } from "@prisma/client";
import type { ShareholderEntity } from "./types.js";
import type {
	ShareholderCreateInput,
	ShareholderUpdateInput,
	ShareholderPatchInput,
} from "./schemas.js";

export function mapPrismaShareholder(
	prisma: PrismaShareholder,
): ShareholderEntity {
	return {
		id: prisma.id,
		clientId: prisma.clientId,
		parentShareholderId: prisma.parentShareholderId,
		entityType: prisma.entityType,
		// PERSON fields
		firstName: prisma.firstName,
		lastName: prisma.lastName,
		secondLastName: prisma.secondLastName,
		rfc: prisma.rfc,
		// COMPANY fields
		businessName: prisma.businessName,
		taxId: prisma.taxId,
		incorporationDate: prisma.incorporationDate?.toISOString() ?? null,
		nationality: prisma.nationality,
		// Anexo 4: representative
		representativeName: prisma.representativeName,
		representativeCurp: prisma.representativeCurp,
		representativeRfc: prisma.representativeRfc,
		// Anexo 4: document references
		actaConstitutivaDocId: prisma.actaConstitutivaDocId,
		cedulaFiscalDocId: prisma.cedulaFiscalDocId,
		addressProofDocId: prisma.addressProofDocId,
		powerOfAttorneyDocId: prisma.powerOfAttorneyDocId,
		// Ownership
		ownershipPercentage: Number(prisma.ownershipPercentage),
		// Contact
		email: prisma.email,
		phone: prisma.phone,
		// Timestamps
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	};
}

export function mapCreateInputToPrisma(input: ShareholderCreateInput): Omit<
	PrismaShareholder,
	"id" | "createdAt" | "updatedAt"
> & {
	clientId: string;
} {
	const base = {
		clientId: "", // Will be set by service
		parentShareholderId: input.parentShareholderId ?? null,
		entityType: input.entityType,
		ownershipPercentage: new Prisma.Decimal(input.ownershipPercentage),
		email: input.email ?? null,
		phone: input.phone ?? null,
		// Initialize all optional fields as null
		firstName: null,
		lastName: null,
		secondLastName: null,
		rfc: null,
		businessName: null,
		taxId: null,
		incorporationDate: null,
		nationality: null,
		representativeName: null,
		representativeCurp: null,
		representativeRfc: null,
		actaConstitutivaDocId: null,
		cedulaFiscalDocId: null,
		addressProofDocId: null,
		powerOfAttorneyDocId: null,
	};

	if (input.entityType === "PERSON") {
		return {
			...base,
			firstName: input.firstName,
			lastName: input.lastName,
			secondLastName: input.secondLastName ?? null,
			rfc: input.rfc ?? null,
		};
	} else {
		return {
			...base,
			businessName: input.businessName,
			taxId: input.taxId,
			incorporationDate: input.incorporationDate
				? new Date(input.incorporationDate)
				: null,
			nationality: input.nationality ?? null,
			representativeName: input.representativeName ?? null,
			representativeCurp: input.representativeCurp ?? null,
			representativeRfc: input.representativeRfc ?? null,
			actaConstitutivaDocId: input.actaConstitutivaDocId ?? null,
			cedulaFiscalDocId: input.cedulaFiscalDocId ?? null,
			addressProofDocId: input.addressProofDocId ?? null,
			powerOfAttorneyDocId: input.powerOfAttorneyDocId ?? null,
		};
	}
}

export function mapUpdateInputToPrisma(
	input: ShareholderUpdateInput,
): Partial<
	Omit<PrismaShareholder, "id" | "clientId" | "createdAt" | "updatedAt">
> {
	return mapCreateInputToPrisma(input as ShareholderCreateInput);
}

export function mapPatchInputToPrisma(
	input: ShareholderPatchInput,
): Partial<
	Omit<PrismaShareholder, "id" | "clientId" | "createdAt" | "updatedAt">
> {
	const partial: Partial<
		Omit<PrismaShareholder, "id" | "clientId" | "createdAt" | "updatedAt">
	> = {
		entityType: input.entityType,
	};

	if ("parentShareholderId" in input) {
		partial.parentShareholderId = input.parentShareholderId ?? null;
	}
	if (
		"ownershipPercentage" in input &&
		input.ownershipPercentage !== undefined
	) {
		partial.ownershipPercentage = new Prisma.Decimal(input.ownershipPercentage);
	}
	if ("email" in input) {
		partial.email = input.email ?? null;
	}
	if ("phone" in input) {
		partial.phone = input.phone ?? null;
	}

	if (input.entityType === "PERSON") {
		if ("firstName" in input && input.firstName !== undefined) {
			partial.firstName = input.firstName;
		}
		if ("lastName" in input && input.lastName !== undefined) {
			partial.lastName = input.lastName;
		}
		if ("secondLastName" in input) {
			partial.secondLastName = input.secondLastName ?? null;
		}
		if ("rfc" in input) {
			partial.rfc = input.rfc ?? null;
		}
	} else {
		if ("businessName" in input && input.businessName !== undefined) {
			partial.businessName = input.businessName;
		}
		if ("taxId" in input && input.taxId !== undefined) {
			partial.taxId = input.taxId;
		}
		if ("incorporationDate" in input) {
			partial.incorporationDate = input.incorporationDate
				? new Date(input.incorporationDate)
				: null;
		}
		if ("nationality" in input) {
			partial.nationality = input.nationality ?? null;
		}
		if ("representativeName" in input) {
			partial.representativeName = input.representativeName ?? null;
		}
		if ("representativeCurp" in input) {
			partial.representativeCurp = input.representativeCurp ?? null;
		}
		if ("representativeRfc" in input) {
			partial.representativeRfc = input.representativeRfc ?? null;
		}
		if ("actaConstitutivaDocId" in input) {
			partial.actaConstitutivaDocId = input.actaConstitutivaDocId ?? null;
		}
		if ("cedulaFiscalDocId" in input) {
			partial.cedulaFiscalDocId = input.cedulaFiscalDocId ?? null;
		}
		if ("addressProofDocId" in input) {
			partial.addressProofDocId = input.addressProofDocId ?? null;
		}
		if ("powerOfAttorneyDocId" in input) {
			partial.powerOfAttorneyDocId = input.powerOfAttorneyDocId ?? null;
		}
	}

	return partial;
}
