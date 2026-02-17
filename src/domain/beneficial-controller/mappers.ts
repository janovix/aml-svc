/**
 * Beneficial Controller Domain Mappers
 * Maps between Prisma/D1 and domain entities
 */

import type { BeneficialController as PrismaBC } from "@prisma/client";
import type { BeneficialControllerEntity } from "./types.js";
import type {
	BeneficialControllerCreateInput,
	BeneficialControllerUpdateInput,
	BeneficialControllerPatchInput,
} from "./schemas.js";

export function mapPrismaBC(prisma: PrismaBC): BeneficialControllerEntity {
	return {
		id: prisma.id,
		clientId: prisma.clientId,
		shareholderId: prisma.shareholderId,
		// BC classification
		bcType: prisma.bcType as BeneficialControllerEntity["bcType"],
		identificationCriteria:
			prisma.identificationCriteria as BeneficialControllerEntity["identificationCriteria"],
		controlMechanism: prisma.controlMechanism,
		isLegalRepresentative: prisma.isLegalRepresentative,
		// Anexo 3: personal data
		firstName: prisma.firstName,
		lastName: prisma.lastName,
		secondLastName: prisma.secondLastName,
		birthDate: prisma.birthDate?.toISOString() ?? null,
		birthCountry: prisma.birthCountry,
		nationality: prisma.nationality,
		occupation: prisma.occupation,
		curp: prisma.curp,
		rfc: prisma.rfc,
		// Anexo 3: identification document
		idDocumentType: prisma.idDocumentType,
		idDocumentNumber: prisma.idDocumentNumber,
		idDocumentAuthority: prisma.idDocumentAuthority,
		// Anexo 3: document copy references
		idCopyDocId: prisma.idCopyDocId,
		curpCopyDocId: prisma.curpCopyDocId,
		cedulaFiscalDocId: prisma.cedulaFiscalDocId,
		addressProofDocId: prisma.addressProofDocId,
		constanciaBcDocId: prisma.constanciaBcDocId,
		powerOfAttorneyDocId: prisma.powerOfAttorneyDocId,
		// Contact
		email: prisma.email,
		phone: prisma.phone,
		// Address
		country: prisma.country,
		stateCode: prisma.stateCode,
		city: prisma.city,
		street: prisma.street,
		postalCode: prisma.postalCode,
		// Watchlist screening
		isPEP: prisma.isPEP,
		watchlistQueryId: prisma.watchlistQueryId,
		ofacSanctioned: prisma.ofacSanctioned,
		unscSanctioned: prisma.unscSanctioned,
		sat69bListed: prisma.sat69bListed,
		adverseMediaFlagged: prisma.adverseMediaFlagged,
		screeningResult: prisma.screeningResult,
		screenedAt: prisma.screenedAt?.toISOString() ?? null,
		// Verification
		verifiedAt: prisma.verifiedAt?.toISOString() ?? null,
		verifiedBy: prisma.verifiedBy,
		notes: prisma.notes,
		// Timestamps
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	};
}

export function mapCreateInputToPrisma(
	input: BeneficialControllerCreateInput,
): Omit<PrismaBC, "id" | "clientId" | "createdAt" | "updatedAt"> {
	return {
		shareholderId: input.shareholderId ?? null,
		// BC classification
		bcType: input.bcType,
		identificationCriteria: input.identificationCriteria,
		controlMechanism: input.controlMechanism ?? null,
		isLegalRepresentative: input.isLegalRepresentative ?? false,
		// Anexo 3: personal data
		firstName: input.firstName,
		lastName: input.lastName,
		secondLastName: input.secondLastName ?? null,
		birthDate: input.birthDate ? new Date(input.birthDate) : null,
		birthCountry: input.birthCountry ?? null,
		nationality: input.nationality ?? null,
		occupation: input.occupation ?? null,
		curp: input.curp ?? null,
		rfc: input.rfc ?? null,
		// Anexo 3: identification document
		idDocumentType: input.idDocumentType ?? null,
		idDocumentNumber: input.idDocumentNumber ?? null,
		idDocumentAuthority: input.idDocumentAuthority ?? null,
		// Anexo 3: document copy references
		idCopyDocId: input.idCopyDocId ?? null,
		curpCopyDocId: input.curpCopyDocId ?? null,
		cedulaFiscalDocId: input.cedulaFiscalDocId ?? null,
		addressProofDocId: input.addressProofDocId ?? null,
		constanciaBcDocId: input.constanciaBcDocId ?? null,
		powerOfAttorneyDocId: input.powerOfAttorneyDocId ?? null,
		// Contact
		email: input.email ?? null,
		phone: input.phone ?? null,
		// Address
		country: input.country ?? null,
		stateCode: input.stateCode ?? null,
		city: input.city ?? null,
		street: input.street ?? null,
		postalCode: input.postalCode ?? null,
		// Watchlist screening (defaults)
		isPEP: false,
		watchlistQueryId: null,
		ofacSanctioned: false,
		unscSanctioned: false,
		sat69bListed: false,
		adverseMediaFlagged: false,
		screeningResult: "pending",
		screenedAt: null,
		// Verification
		verifiedAt: input.verifiedAt ? new Date(input.verifiedAt) : null,
		verifiedBy: input.verifiedBy ?? null,
		notes: input.notes ?? null,
	};
}

export function mapUpdateInputToPrisma(
	input: BeneficialControllerUpdateInput,
): Partial<Omit<PrismaBC, "id" | "clientId" | "createdAt" | "updatedAt">> {
	return mapCreateInputToPrisma(input);
}

export function mapPatchInputToPrisma(
	input: BeneficialControllerPatchInput,
): Partial<Omit<PrismaBC, "id" | "clientId" | "createdAt" | "updatedAt">> {
	const partial: Partial<
		Omit<PrismaBC, "id" | "clientId" | "createdAt" | "updatedAt">
	> = {};

	if ("shareholderId" in input) {
		partial.shareholderId = input.shareholderId ?? null;
	}
	if ("bcType" in input && input.bcType !== undefined) {
		partial.bcType = input.bcType;
	}
	if (
		"identificationCriteria" in input &&
		input.identificationCriteria !== undefined
	) {
		partial.identificationCriteria = input.identificationCriteria;
	}
	if ("controlMechanism" in input) {
		partial.controlMechanism = input.controlMechanism ?? null;
	}
	if (
		"isLegalRepresentative" in input &&
		input.isLegalRepresentative !== undefined
	) {
		partial.isLegalRepresentative = input.isLegalRepresentative;
	}
	// Personal data
	if ("firstName" in input && input.firstName !== undefined) {
		partial.firstName = input.firstName;
	}
	if ("lastName" in input && input.lastName !== undefined) {
		partial.lastName = input.lastName;
	}
	if ("secondLastName" in input) {
		partial.secondLastName = input.secondLastName ?? null;
	}
	if ("birthDate" in input) {
		partial.birthDate = input.birthDate ? new Date(input.birthDate) : null;
	}
	if ("birthCountry" in input) {
		partial.birthCountry = input.birthCountry ?? null;
	}
	if ("nationality" in input) {
		partial.nationality = input.nationality ?? null;
	}
	if ("occupation" in input) {
		partial.occupation = input.occupation ?? null;
	}
	if ("curp" in input) {
		partial.curp = input.curp ?? null;
	}
	if ("rfc" in input) {
		partial.rfc = input.rfc ?? null;
	}
	// ID document
	if ("idDocumentType" in input) {
		partial.idDocumentType = input.idDocumentType ?? null;
	}
	if ("idDocumentNumber" in input) {
		partial.idDocumentNumber = input.idDocumentNumber ?? null;
	}
	if ("idDocumentAuthority" in input) {
		partial.idDocumentAuthority = input.idDocumentAuthority ?? null;
	}
	// Document references
	if ("idCopyDocId" in input) {
		partial.idCopyDocId = input.idCopyDocId ?? null;
	}
	if ("curpCopyDocId" in input) {
		partial.curpCopyDocId = input.curpCopyDocId ?? null;
	}
	if ("cedulaFiscalDocId" in input) {
		partial.cedulaFiscalDocId = input.cedulaFiscalDocId ?? null;
	}
	if ("addressProofDocId" in input) {
		partial.addressProofDocId = input.addressProofDocId ?? null;
	}
	if ("constanciaBcDocId" in input) {
		partial.constanciaBcDocId = input.constanciaBcDocId ?? null;
	}
	if ("powerOfAttorneyDocId" in input) {
		partial.powerOfAttorneyDocId = input.powerOfAttorneyDocId ?? null;
	}
	// Contact
	if ("email" in input) {
		partial.email = input.email ?? null;
	}
	if ("phone" in input) {
		partial.phone = input.phone ?? null;
	}
	// Address
	if ("country" in input) {
		partial.country = input.country ?? null;
	}
	if ("stateCode" in input) {
		partial.stateCode = input.stateCode ?? null;
	}
	if ("city" in input) {
		partial.city = input.city ?? null;
	}
	if ("street" in input) {
		partial.street = input.street ?? null;
	}
	if ("postalCode" in input) {
		partial.postalCode = input.postalCode ?? null;
	}
	// Verification
	if ("verifiedAt" in input) {
		partial.verifiedAt = input.verifiedAt ? new Date(input.verifiedAt) : null;
	}
	if ("verifiedBy" in input) {
		partial.verifiedBy = input.verifiedBy ?? null;
	}
	if ("notes" in input) {
		partial.notes = input.notes ?? null;
	}

	return partial;
}
