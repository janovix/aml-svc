import type {
	Client as PrismaClientModel,
	ClientAddress as PrismaClientAddressModel,
	ClientDocument as PrismaClientDocumentModel,
	PersonType as PrismaPersonType,
} from "@prisma/client";

import { generateId } from "../../lib/id-generator";
import type {
	ClientAddressCreateInput,
	ClientAddressPatchInput,
	ClientAddressUpdateInput,
	ClientCreateInput,
	ClientDocumentCreateInput,
	ClientDocumentPatchInput,
	ClientDocumentUpdateInput,
	ClientPatchInput,
	ClientUpdateInput,
	PersonType,
} from "./schemas";
import type {
	ClientAddressEntity,
	ClientDocumentEntity,
	ClientEntity,
} from "./types";

const PERSON_TYPE_TO_PRISMA: Record<PersonType, PrismaPersonType> = {
	physical: "PHYSICAL",
	moral: "MORAL",
	trust: "TRUST",
};

const PERSON_TYPE_FROM_PRISMA: Record<PrismaPersonType, PersonType> = {
	PHYSICAL: "physical",
	MORAL: "moral",
	TRUST: "trust",
};

function mapDateTime(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	if (value instanceof Date) {
		return value.toISOString();
	}
	return value;
}

export function toPrismaPersonType(personType: PersonType): PrismaPersonType {
	return PERSON_TYPE_TO_PRISMA[personType];
}

export function fromPrismaPersonType(personType: PrismaPersonType): PersonType {
	return PERSON_TYPE_FROM_PRISMA[personType];
}

function normalizeOptional<T>(value: T | null | undefined) {
	return value === undefined ? null : value;
}

function normalizeDateValue(
	value: Date | string | null | undefined,
): string | null {
	if (value === undefined || value === null) {
		return null;
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	const trimmed = value.trim();
	const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/i;
	if (isoPattern.test(trimmed)) {
		return trimmed;
	}

	const legacyMatch =
		/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?(?:\s*\+00:00)?$/i.exec(
			trimmed,
		);
	if (legacyMatch) {
		return `${legacyMatch[1]}T${legacyMatch[2]}Z`;
	}

	return trimmed;
}

function toPrismaDate(value: string | null | undefined): Date | null {
	if (value === undefined || value === null) {
		return value ?? null;
	}

	const normalized = normalizeDateValue(value);
	return normalized ? new Date(normalized) : null;
}

function serializeMetadata(value: Record<string, unknown> | null | undefined) {
	if (!value) return null;
	return JSON.stringify(value);
}

function parseMetadata(value: string | null | undefined) {
	if (!value) return null;
	try {
		return JSON.parse(value) as Record<string, unknown>;
	} catch {
		return null;
	}
}

function basePrismaPayload(input: ClientCreateInput | ClientUpdateInput) {
	return {
		personType: toPrismaPersonType(input.personType as PersonType),
		firstName: normalizeOptional(input.firstName),
		lastName: normalizeOptional(input.lastName),
		secondLastName: normalizeOptional(input.secondLastName),
		birthDate: toPrismaDate(input.birthDate),
		curp: normalizeOptional(input.curp),
		businessName: normalizeOptional(input.businessName),
		incorporationDate: toPrismaDate(input.incorporationDate),
		rfc: "rfc" in input ? input.rfc.toUpperCase() : undefined,
		nationality: normalizeOptional(input.nationality),
		email: input.email,
		phone: input.phone,
		country: input.country,
		stateCode: input.stateCode,
		city: input.city,
		municipality: input.municipality,
		neighborhood: input.neighborhood,
		street: input.street,
		externalNumber: input.externalNumber,
		internalNumber: normalizeOptional(input.internalNumber),
		postalCode: input.postalCode,
		reference: normalizeOptional(input.reference),
		notes: normalizeOptional(input.notes),
		countryCode:
			"countryCode" in input ? normalizeOptional(input.countryCode) : undefined,
		economicActivityCode:
			"economicActivityCode" in input
				? normalizeOptional(input.economicActivityCode)
				: undefined,
	};
}

export function mapCreateInputToPrisma(input: ClientCreateInput) {
	const payload = basePrismaPayload(input);
	return {
		id: generateId("CLIENT"),
		...payload,
		rfc: input.rfc.toUpperCase(),
	};
}

export function mapUpdateInputToPrisma(input: ClientUpdateInput) {
	// RFC is not in update input (cannot be changed), so we use base payload without RFC
	const payload = basePrismaPayload(input as ClientCreateInput);
	// Remove RFC from update payload since it's the primary key and cannot be changed
	const { rfc: _rfc, ...rest } = payload;
	return rest;
}

export function mapPatchInputToPrisma(input: ClientPatchInput) {
	const payload: Record<string, unknown> = {};

	if (input.personType) {
		payload.personType = toPrismaPersonType(input.personType);
	}

	// RFC is intentionally omitted - it cannot be changed after creation
	const passthroughKeys: (keyof ClientPatchInput)[] = [
		"firstName",
		"lastName",
		"secondLastName",
		"curp",
		"businessName",
		"nationality",
		"email",
		"phone",
		"country",
		"stateCode",
		"city",
		"municipality",
		"neighborhood",
		"street",
		"externalNumber",
		"internalNumber",
		"postalCode",
		"reference",
		"notes",
		"countryCode",
		"economicActivityCode",
	];

	for (const key of passthroughKeys) {
		const value = input[key];
		if (value !== undefined) {
			payload[key as string] = value;
		}
	}

	if (input.birthDate !== undefined) {
		payload.birthDate = toPrismaDate(input.birthDate);
	}

	if (input.incorporationDate !== undefined) {
		payload.incorporationDate = toPrismaDate(input.incorporationDate);
	}

	return payload;
}

export function mapPrismaClient(
	record: PrismaClientModel & {
		documents?: PrismaClientDocumentModel[];
		addresses?: PrismaClientAddressModel[];
	},
): ClientEntity {
	return {
		id: record.id,
		rfc: record.rfc,
		organizationId: record.organizationId,
		personType: fromPrismaPersonType(record.personType),
		firstName: record.firstName ?? undefined,
		lastName: record.lastName ?? undefined,
		secondLastName: record.secondLastName ?? null,
		birthDate: mapDateTime(record.birthDate),
		curp: record.curp ?? null,
		businessName: record.businessName ?? null,
		incorporationDate: mapDateTime(record.incorporationDate),
		nationality: record.nationality ?? null,
		email: record.email,
		phone: record.phone,
		country: record.country,
		stateCode: record.stateCode,
		city: record.city,
		municipality: record.municipality,
		neighborhood: record.neighborhood,
		street: record.street,
		externalNumber: record.externalNumber,
		internalNumber: record.internalNumber ?? null,
		postalCode: record.postalCode,
		reference: record.reference ?? null,
		notes: record.notes ?? null,
		countryCode: record.countryCode ?? null,
		economicActivityCode: record.economicActivityCode ?? null,
		createdAt: mapDateTime(record.createdAt) ?? new Date().toISOString(),
		updatedAt: mapDateTime(record.updatedAt) ?? new Date().toISOString(),
		deletedAt: mapDateTime(record.deletedAt) ?? null,
		documents: record.documents?.map(mapPrismaDocument),
		addresses: record.addresses?.map(mapPrismaAddress),
	} as ClientEntity;
}

export function mapDocumentCreateInputToPrisma(
	input: ClientDocumentCreateInput,
) {
	return {
		id: generateId("CLIENT_DOCUMENT"),
		clientId: input.clientId,
		documentType: input.documentType,
		documentNumber: input.documentNumber,
		issuingCountry: normalizeOptional(input.issuingCountry),
		issueDate: toPrismaDate(input.issueDate),
		expiryDate: toPrismaDate(input.expiryDate),
		status: input.status ?? "PENDING",
		fileUrl: normalizeOptional(input.fileUrl),
		metadata: serializeMetadata(input.metadata),
	};
}

export function mapDocumentUpdateInputToPrisma(
	input: ClientDocumentUpdateInput,
) {
	return {
		documentType: input.documentType,
		documentNumber: input.documentNumber,
		issuingCountry: normalizeOptional(input.issuingCountry),
		issueDate: toPrismaDate(input.issueDate),
		expiryDate: toPrismaDate(input.expiryDate),
		status: input.status ?? "PENDING",
		fileUrl: normalizeOptional(input.fileUrl),
		metadata: serializeMetadata(input.metadata),
	};
}

export function mapDocumentPatchInputToPrisma(input: ClientDocumentPatchInput) {
	const payload: Record<string, unknown> = {};
	if (input.documentType) payload.documentType = input.documentType;
	if (input.documentNumber !== undefined)
		payload.documentNumber = input.documentNumber;
	if (input.issuingCountry !== undefined)
		payload.issuingCountry = normalizeOptional(input.issuingCountry);
	if (input.issueDate !== undefined)
		payload.issueDate = toPrismaDate(input.issueDate);
	if (input.expiryDate !== undefined)
		payload.expiryDate = toPrismaDate(input.expiryDate);
	if (input.status !== undefined) payload.status = input.status;
	if (input.fileUrl !== undefined)
		payload.fileUrl = normalizeOptional(input.fileUrl);
	if (input.metadata !== undefined)
		payload.metadata = serializeMetadata(input.metadata);
	return payload;
}

export function mapPrismaDocument(
	record: PrismaClientDocumentModel,
): ClientDocumentEntity {
	return {
		id: record.id,
		clientId: record.clientId,
		documentType: record.documentType,
		documentNumber: record.documentNumber,
		issuingCountry: record.issuingCountry ?? null,
		issueDate: mapDateTime(record.issueDate),
		expiryDate: mapDateTime(record.expiryDate),
		status: record.status,
		fileUrl: record.fileUrl ?? null,
		metadata: parseMetadata(record.metadata),
		createdAt: mapDateTime(record.createdAt) ?? new Date().toISOString(),
		updatedAt: mapDateTime(record.updatedAt) ?? new Date().toISOString(),
	};
}

export function mapAddressCreateInputToPrisma(input: ClientAddressCreateInput) {
	return {
		id: generateId("CLIENT_ADDRESS"),
		clientId: input.clientId,
		addressType: input.addressType ?? "RESIDENTIAL",
		street1: input.street1,
		street2: normalizeOptional(input.street2),
		city: input.city,
		state: normalizeOptional(input.state),
		postalCode: normalizeOptional(input.postalCode),
		country: input.country,
		isPrimary: input.isPrimary ?? false,
		verifiedAt: toPrismaDate(input.verifiedAt),
		reference: normalizeOptional(input.reference),
	};
}

export function mapAddressUpdateInputToPrisma(input: ClientAddressUpdateInput) {
	return {
		addressType: input.addressType ?? "RESIDENTIAL",
		street1: input.street1,
		street2: normalizeOptional(input.street2),
		city: input.city,
		state: normalizeOptional(input.state),
		postalCode: normalizeOptional(input.postalCode),
		country: input.country,
		isPrimary: input.isPrimary ?? false,
		verifiedAt: toPrismaDate(input.verifiedAt),
		reference: normalizeOptional(input.reference),
	};
}

export function mapAddressPatchInputToPrisma(input: ClientAddressPatchInput) {
	const payload: Record<string, unknown> = {};
	const set = (key: string, value: unknown) => {
		payload[key] = value;
	};

	if (input.addressType) set("addressType", input.addressType);
	if (input.street1 !== undefined) set("street1", input.street1);
	if (input.street2 !== undefined)
		set("street2", normalizeOptional(input.street2));
	if (input.city !== undefined) set("city", input.city);
	if (input.state !== undefined) set("state", normalizeOptional(input.state));
	if (input.postalCode !== undefined)
		set("postalCode", normalizeOptional(input.postalCode));
	if (input.country !== undefined) set("country", input.country);
	if (input.isPrimary !== undefined) set("isPrimary", input.isPrimary);
	if (input.verifiedAt !== undefined)
		set("verifiedAt", toPrismaDate(input.verifiedAt));
	if (input.reference !== undefined)
		set("reference", normalizeOptional(input.reference));

	return payload;
}

export function mapPrismaAddress(
	record: PrismaClientAddressModel,
): ClientAddressEntity {
	return {
		id: record.id,
		clientId: record.clientId,
		addressType: record.addressType,
		street1: record.street1,
		street2: record.street2 ?? null,
		city: record.city,
		state: record.state ?? null,
		postalCode: record.postalCode ?? null,
		country: record.country,
		isPrimary: Boolean(record.isPrimary),
		verifiedAt: mapDateTime(record.verifiedAt),
		reference: record.reference ?? null,
		createdAt: mapDateTime(record.createdAt) ?? new Date().toISOString(),
		updatedAt: mapDateTime(record.updatedAt) ?? new Date().toISOString(),
	};
}
