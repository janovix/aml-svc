import { Prisma } from "@prisma/client";
import type { UmaValue as PrismaUmaValueModel } from "@prisma/client";

import { generateId } from "../../lib/id-generator";
import type {
	UmaValueCreateInput,
	UmaValuePatchInput,
	UmaValueUpdateInput,
} from "./schemas";
import type { UmaValueEntity } from "./types";

function mapDateTime(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	if (value instanceof Date) {
		return value.toISOString();
	}
	return value;
}

function toPrismaDecimal(value: number): Prisma.Decimal {
	return new Prisma.Decimal(value);
}

function fromPrismaDecimal(
	value: Prisma.Decimal | number | string | null | undefined,
): string {
	if (!value) return "0";
	if (value instanceof Prisma.Decimal) {
		return value.toString();
	}
	if (typeof value === "number") {
		return value.toString();
	}
	return value;
}

export function mapPrismaUmaValue(prisma: PrismaUmaValueModel): UmaValueEntity {
	return {
		id: prisma.id,
		year: prisma.year,
		dailyValue: fromPrismaDecimal(prisma.dailyValue),
		effectiveDate: mapDateTime(prisma.effectiveDate) ?? "",
		endDate: mapDateTime(prisma.endDate),
		approvedBy: prisma.approvedBy,
		notes: prisma.notes,
		active: Boolean(prisma.active),
		createdAt: mapDateTime(prisma.createdAt) ?? "",
		updatedAt: mapDateTime(prisma.updatedAt) ?? "",
	};
}

export function mapUmaValueCreateInputToPrisma(
	input: UmaValueCreateInput,
): Omit<PrismaUmaValueModel, "createdAt" | "updatedAt"> {
	return {
		id: generateId("UMA_VALUE"),
		year: input.year,
		dailyValue: toPrismaDecimal(input.dailyValue),
		effectiveDate: new Date(input.effectiveDate),
		endDate: input.endDate ? new Date(input.endDate) : null,
		approvedBy: input.approvedBy ?? null,
		notes: input.notes ?? null,
		active: input.active,
	};
}

export function mapUmaValueUpdateInputToPrisma(
	input: UmaValueUpdateInput,
): Partial<Omit<PrismaUmaValueModel, "id" | "createdAt" | "updatedAt">> {
	return {
		year: input.year,
		dailyValue: toPrismaDecimal(input.dailyValue),
		effectiveDate: new Date(input.effectiveDate),
		endDate: input.endDate ? new Date(input.endDate) : null,
		approvedBy: input.approvedBy ?? null,
		notes: input.notes ?? null,
		active: input.active,
	};
}

export function mapUmaValuePatchInputToPrisma(
	input: UmaValuePatchInput,
): Partial<Omit<PrismaUmaValueModel, "id" | "createdAt" | "updatedAt">> {
	const result: Partial<
		Omit<PrismaUmaValueModel, "id" | "createdAt" | "updatedAt">
	> = {};

	if (input.year !== undefined) {
		result.year = input.year;
	}
	if (input.dailyValue !== undefined) {
		result.dailyValue = toPrismaDecimal(input.dailyValue);
	}
	if (input.effectiveDate !== undefined) {
		result.effectiveDate = new Date(input.effectiveDate);
	}
	if (input.endDate !== undefined) {
		result.endDate = input.endDate ? new Date(input.endDate) : null;
	}
	if (input.approvedBy !== undefined) {
		result.approvedBy = input.approvedBy ?? null;
	}
	if (input.notes !== undefined) {
		result.notes = input.notes ?? null;
	}
	if (input.active !== undefined) {
		result.active = input.active;
	}

	return result;
}
