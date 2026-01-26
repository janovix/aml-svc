import type { UltimateBeneficialOwner, Prisma } from "@prisma/client";
import { generateId } from "../../lib/id-generator";
import type { UBOEntity, UBORelationshipType, PEPStatus } from "./types";
import type { UBOCreateInput, UBOUpdateInput, UBOPatchInput } from "./schemas";

/**
 * Maps Prisma UBO record to domain entity
 */
export function mapPrismaUBO(record: UltimateBeneficialOwner): UBOEntity {
	return {
		id: record.id,
		clientId: record.clientId,
		firstName: record.firstName,
		lastName: record.lastName,
		secondLastName: record.secondLastName,
		birthDate: record.birthDate?.toISOString() ?? null,
		nationality: record.nationality,
		curp: record.curp,
		rfc: record.rfc,
		ownershipPercentage:
			record.ownershipPercentage !== null &&
			record.ownershipPercentage !== undefined
				? Number(record.ownershipPercentage)
				: null,
		relationshipType: record.relationshipType as UBORelationshipType,
		position: record.position,
		email: record.email,
		phone: record.phone,
		country: record.country,
		stateCode: record.stateCode,
		city: record.city,
		street: record.street,
		postalCode: record.postalCode,
		idDocumentId: record.idDocumentId,
		addressProofId: record.addressProofId,
		isPEP: record.isPEP,
		pepStatus: record.pepStatus as PEPStatus,
		pepDetails: record.pepDetails,
		pepMatchConfidence: record.pepMatchConfidence,
		pepCheckedAt: record.pepCheckedAt?.toISOString() ?? null,
		verifiedAt: record.verifiedAt?.toISOString() ?? null,
		verifiedBy: record.verifiedBy,
		notes: record.notes,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}

/**
 * Maps UBO create input to Prisma create data
 */
export function mapCreateInputToPrisma(
	input: UBOCreateInput,
): Prisma.UltimateBeneficialOwnerCreateInput {
	return {
		id: generateId("UBO"),
		client: { connect: { id: input.clientId } },
		firstName: input.firstName,
		lastName: input.lastName,
		secondLastName: input.secondLastName ?? null,
		birthDate: input.birthDate ? new Date(input.birthDate) : null,
		nationality: input.nationality ?? null,
		curp: input.curp ?? null,
		rfc: input.rfc ?? null,
		ownershipPercentage: input.ownershipPercentage ?? null,
		relationshipType: input.relationshipType,
		position: input.position ?? null,
		email: input.email ?? null,
		phone: input.phone ?? null,
		country: input.country ?? null,
		stateCode: input.stateCode ?? null,
		city: input.city ?? null,
		street: input.street ?? null,
		postalCode: input.postalCode ?? null,
		idDocument: input.idDocumentId
			? { connect: { id: input.idDocumentId } }
			: undefined,
		addressProof: input.addressProofId
			? { connect: { id: input.addressProofId } }
			: undefined,
		notes: input.notes ?? null,
		// PEP defaults
		isPEP: false,
		pepStatus: "PENDING",
	};
}

/**
 * Maps UBO update input to Prisma update data
 */
export function mapUpdateInputToPrisma(
	input: UBOUpdateInput,
): Prisma.UltimateBeneficialOwnerUpdateInput {
	return {
		firstName: input.firstName,
		lastName: input.lastName,
		secondLastName: input.secondLastName ?? null,
		birthDate: input.birthDate ? new Date(input.birthDate) : null,
		nationality: input.nationality ?? null,
		curp: input.curp ?? null,
		rfc: input.rfc ?? null,
		ownershipPercentage: input.ownershipPercentage ?? null,
		relationshipType: input.relationshipType,
		position: input.position ?? null,
		email: input.email ?? null,
		phone: input.phone ?? null,
		country: input.country ?? null,
		stateCode: input.stateCode ?? null,
		city: input.city ?? null,
		street: input.street ?? null,
		postalCode: input.postalCode ?? null,
		idDocument: input.idDocumentId
			? { connect: { id: input.idDocumentId } }
			: { disconnect: true },
		addressProof: input.addressProofId
			? { connect: { id: input.addressProofId } }
			: { disconnect: true },
		notes: input.notes ?? null,
	};
}

/**
 * Maps UBO patch input to Prisma update data
 */
export function mapPatchInputToPrisma(
	input: UBOPatchInput,
): Prisma.UltimateBeneficialOwnerUpdateInput {
	const data: Prisma.UltimateBeneficialOwnerUpdateInput = {};

	if (input.firstName !== undefined) data.firstName = input.firstName;
	if (input.lastName !== undefined) data.lastName = input.lastName;
	if (input.secondLastName !== undefined)
		data.secondLastName = input.secondLastName;
	if (input.birthDate !== undefined)
		data.birthDate = input.birthDate ? new Date(input.birthDate) : null;
	if (input.nationality !== undefined) data.nationality = input.nationality;
	if (input.curp !== undefined) data.curp = input.curp;
	if (input.rfc !== undefined) data.rfc = input.rfc;
	if (input.ownershipPercentage !== undefined)
		data.ownershipPercentage = input.ownershipPercentage;
	if (input.relationshipType !== undefined)
		data.relationshipType = input.relationshipType;
	if (input.position !== undefined) data.position = input.position;
	if (input.email !== undefined) data.email = input.email;
	if (input.phone !== undefined) data.phone = input.phone;
	if (input.country !== undefined) data.country = input.country;
	if (input.stateCode !== undefined) data.stateCode = input.stateCode;
	if (input.city !== undefined) data.city = input.city;
	if (input.street !== undefined) data.street = input.street;
	if (input.postalCode !== undefined) data.postalCode = input.postalCode;
	if (input.idDocumentId !== undefined) {
		data.idDocument = input.idDocumentId
			? { connect: { id: input.idDocumentId } }
			: { disconnect: true };
	}
	if (input.addressProofId !== undefined) {
		data.addressProof = input.addressProofId
			? { connect: { id: input.addressProofId } }
			: { disconnect: true };
	}
	if (input.notes !== undefined) data.notes = input.notes;
	if (input.isPEP !== undefined) data.isPEP = input.isPEP;
	if (input.pepStatus !== undefined) data.pepStatus = input.pepStatus;
	if (input.pepDetails !== undefined) data.pepDetails = input.pepDetails;
	if (input.pepMatchConfidence !== undefined)
		data.pepMatchConfidence = input.pepMatchConfidence;
	if (input.pepCheckedAt !== undefined)
		data.pepCheckedAt = input.pepCheckedAt
			? new Date(input.pepCheckedAt)
			: null;
	if (input.verifiedAt !== undefined)
		data.verifiedAt = input.verifiedAt ? new Date(input.verifiedAt) : null;
	if (input.verifiedBy !== undefined) data.verifiedBy = input.verifiedBy;

	return data;
}
