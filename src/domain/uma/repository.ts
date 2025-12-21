import type { Prisma, PrismaClient } from "@prisma/client";

import {
	mapUmaValueCreateInputToPrisma,
	mapUmaValuePatchInputToPrisma,
	mapUmaValueUpdateInputToPrisma,
	mapPrismaUmaValue,
} from "./mappers";
import type {
	UmaValueCreateInput,
	UmaValueFilters,
	UmaValuePatchInput,
	UmaValueUpdateInput,
} from "./schemas";
import type { UmaValueEntity, ListResult } from "./types";

export class UmaValueRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async list(filters: UmaValueFilters): Promise<ListResult<UmaValueEntity>> {
		const { page, limit, year, active } = filters;

		const where: Prisma.UmaValueWhereInput = {};

		if (year !== undefined) {
			where.year = year;
		}

		if (active !== undefined) {
			where.active = active;
		}

		const [total, records] = await Promise.all([
			this.prisma.umaValue.count({ where }),
			this.prisma.umaValue.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { year: "desc" },
			}),
		]);

		const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

		return {
			data: records.map(mapPrismaUmaValue),
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		};
	}

	async getById(id: string): Promise<UmaValueEntity | null> {
		const record = await this.prisma.umaValue.findUnique({
			where: { id },
		});
		return record ? mapPrismaUmaValue(record) : null;
	}

	async getByYear(year: number): Promise<UmaValueEntity | null> {
		const record = await this.prisma.umaValue.findUnique({
			where: { year },
		});
		return record ? mapPrismaUmaValue(record) : null;
	}

	async getActive(): Promise<UmaValueEntity | null> {
		const record = await this.prisma.umaValue.findFirst({
			where: { active: true },
			orderBy: { year: "desc" },
		});
		return record ? mapPrismaUmaValue(record) : null;
	}

	async create(input: UmaValueCreateInput): Promise<UmaValueEntity> {
		// If setting as active, deactivate all others
		if (input.active) {
			await this.prisma.umaValue.updateMany({
				where: { active: true },
				data: { active: false },
			});
		}

		const created = await this.prisma.umaValue.create({
			data: mapUmaValueCreateInputToPrisma(input),
		});
		return mapPrismaUmaValue(created);
	}

	async update(
		id: string,
		input: UmaValueUpdateInput,
	): Promise<UmaValueEntity> {
		await this.ensureExists(id);

		// If setting as active, deactivate all others
		if (input.active) {
			await this.prisma.umaValue.updateMany({
				where: { active: true, id: { not: id } },
				data: { active: false },
			});
		}

		const updated = await this.prisma.umaValue.update({
			where: { id },
			data: mapUmaValueUpdateInputToPrisma(input),
		});

		return mapPrismaUmaValue(updated);
	}

	async patch(id: string, input: UmaValuePatchInput): Promise<UmaValueEntity> {
		await this.ensureExists(id);

		// If setting as active, deactivate all others
		if (input.active === true) {
			await this.prisma.umaValue.updateMany({
				where: { active: true, id: { not: id } },
				data: { active: false },
			});
		}

		const payload = mapUmaValuePatchInputToPrisma(
			input,
		) as Prisma.UmaValueUpdateInput;

		const updated = await this.prisma.umaValue.update({
			where: { id },
			data: payload,
		});

		return mapPrismaUmaValue(updated);
	}

	async delete(id: string): Promise<void> {
		await this.ensureExists(id);
		await this.prisma.umaValue.delete({ where: { id } });
	}

	async activate(id: string): Promise<UmaValueEntity> {
		await this.ensureExists(id);

		// Deactivate all others
		await this.prisma.umaValue.updateMany({
			where: { active: true },
			data: { active: false },
		});

		// Activate this one
		const updated = await this.prisma.umaValue.update({
			where: { id },
			data: { active: true },
		});

		return mapPrismaUmaValue(updated);
	}

	private async ensureExists(id: string): Promise<void> {
		const exists = await this.prisma.umaValue.findUnique({
			where: { id },
			select: { id: true },
		});

		if (!exists) {
			throw new Error("UMA_VALUE_NOT_FOUND");
		}
	}
}
