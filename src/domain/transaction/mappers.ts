import { Prisma } from "@prisma/client";
import type {
	Transaction as PrismaTransaction,
	TransactionOperationType as PrismaOperationType,
	TransactionVehicleType as PrismaVehicleType,
	TransactionPaymentMethod as PrismaPaymentMethod,
} from "@prisma/client";

import type { TransactionCreateInput, TransactionUpdateInput } from "./schemas";
import type {
	OperationType,
	PaymentMethod,
	TransactionEntity,
	VehicleType,
} from "./types";

const OPERATION_TYPE_TO_PRISMA: Record<OperationType, PrismaOperationType> = {
	purchase: "PURCHASE",
	sale: "SALE",
};

const OPERATION_TYPE_FROM_PRISMA: Record<PrismaOperationType, OperationType> = {
	PURCHASE: "purchase",
	SALE: "sale",
};

const VEHICLE_TYPE_TO_PRISMA: Record<VehicleType, PrismaVehicleType> = {
	land: "LAND",
	marine: "MARINE",
	air: "AIR",
};

const VEHICLE_TYPE_FROM_PRISMA: Record<PrismaVehicleType, VehicleType> = {
	LAND: "land",
	MARINE: "marine",
	AIR: "air",
};

export function toPrismaOperationType(
	value: OperationType,
): PrismaOperationType {
	return OPERATION_TYPE_TO_PRISMA[value];
}

export function fromPrismaOperationType(
	value: PrismaOperationType,
): OperationType {
	return OPERATION_TYPE_FROM_PRISMA[value];
}

export function toPrismaVehicleType(value: VehicleType): PrismaVehicleType {
	return VEHICLE_TYPE_TO_PRISMA[value];
}

export function fromPrismaVehicleType(value: PrismaVehicleType): VehicleType {
	return VEHICLE_TYPE_FROM_PRISMA[value];
}

function normalizeNullable(value?: string | null): string | null {
	if (value === undefined) {
		return null;
	}
	return value ?? null;
}

function toPrismaDate(value: string | Date): Date {
	if (value instanceof Date) {
		return value;
	}
	return new Date(value);
}

function mapDate(value: Date | string | null | undefined): string {
	if (!value) {
		return new Date().toISOString();
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	return value;
}

function mapNullableDate(
	value: Date | string | null | undefined,
): string | null {
	if (!value) {
		return null;
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	return value;
}

function toPrismaDecimal(value: string | number): Prisma.Decimal {
	return new Prisma.Decimal(value);
}

export function mapCreateInputToPrisma(input: TransactionCreateInput) {
	return {
		clientId: input.clientId,
		operationDate: toPrismaDate(input.operationDate),
		operationType: toPrismaOperationType(input.operationType),
		branchPostalCode: input.branchPostalCode,
		vehicleType: toPrismaVehicleType(input.vehicleType),
		brandId: input.brandId,
		model: input.model,
		year: input.year,
		armorLevel: normalizeNullable(input.armorLevel),
		engineNumber: normalizeNullable(input.engineNumber),
		plates: normalizeNullable(input.plates),
		registrationNumber: normalizeNullable(input.registrationNumber),
		flagCountryId: normalizeNullable(input.flagCountryId),
		amount: toPrismaDecimal(input.amount),
		currency: input.currency,
		paymentDate: toPrismaDate(input.paymentDate),
		paymentMethods: {
			create: input.paymentMethods.map((pm) => ({
				method: pm.method,
				amount: toPrismaDecimal(pm.amount),
			})),
		},
	};
}

export function mapUpdateInputToPrisma(input: TransactionUpdateInput) {
	return {
		operationDate: toPrismaDate(input.operationDate),
		operationType: toPrismaOperationType(input.operationType),
		branchPostalCode: input.branchPostalCode,
		vehicleType: toPrismaVehicleType(input.vehicleType),
		brandId: input.brandId,
		model: input.model,
		year: input.year,
		armorLevel: normalizeNullable(input.armorLevel),
		engineNumber: normalizeNullable(input.engineNumber),
		plates: normalizeNullable(input.plates),
		registrationNumber: normalizeNullable(input.registrationNumber),
		flagCountryId: normalizeNullable(input.flagCountryId),
		amount: toPrismaDecimal(input.amount),
		currency: input.currency,
		paymentDate: toPrismaDate(input.paymentDate),
		paymentMethods: {
			deleteMany: {},
			create: input.paymentMethods.map((pm) => ({
				method: pm.method,
				amount: toPrismaDecimal(pm.amount),
			})),
		},
	};
}

function mapPrismaPaymentMethod(record: PrismaPaymentMethod): PaymentMethod {
	return {
		id: record.id,
		method: record.method,
		amount: record.amount.toFixed(2),
		createdAt: mapDate(record.createdAt),
		updatedAt: mapDate(record.updatedAt),
	};
}

export function mapPrismaTransaction(
	record: PrismaTransaction & {
		paymentMethods?: PrismaPaymentMethod[];
	},
): TransactionEntity {
	return {
		id: record.id,
		clientId: record.clientId,
		operationDate: mapDate(record.operationDate),
		operationType: fromPrismaOperationType(record.operationType),
		branchPostalCode: record.branchPostalCode,
		vehicleType: fromPrismaVehicleType(record.vehicleType),
		brandId: record.brandId,
		model: record.model,
		year: record.year,
		armorLevel: record.armorLevel ?? null,
		engineNumber: record.engineNumber ?? null,
		plates: record.plates ?? null,
		registrationNumber: record.registrationNumber ?? null,
		flagCountryId: record.flagCountryId ?? null,
		amount: record.amount.toFixed(2),
		currency: record.currency,
		paymentDate: mapDate(record.paymentDate),
		paymentMethods: record.paymentMethods?.map(mapPrismaPaymentMethod) ?? [],
		createdAt: mapDate(record.createdAt),
		updatedAt: mapDate(record.updatedAt),
		deletedAt: mapNullableDate(record.deletedAt),
	};
}
