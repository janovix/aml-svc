import type {
	Catalog as PrismaCatalog,
	CatalogItem as PrismaCatalogItem,
	Prisma,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import type {
	CatalogEntity,
	CatalogItemEntity,
	CatalogListQuery,
	CatalogPagination,
} from "./types";

function normalizeSearchTerm(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function toIsoString(date: Date): string {
	return date.toISOString();
}

function mapCatalog(record: PrismaCatalog): CatalogEntity {
	return {
		id: record.id,
		key: record.key,
		name: record.name,
		active: record.active,
		allowNewItems: record.allowNewItems,
		createdAt: toIsoString(record.createdAt),
		updatedAt: toIsoString(record.updatedAt),
	};
}

function normalizeName(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function mapCatalogItem(record: PrismaCatalogItem): CatalogItemEntity {
	const metadata = parseMetadata(record.metadata);

	return {
		id: record.id,
		catalogId: record.catalogId,
		name: record.name,
		normalizedName: record.normalizedName,
		active: record.active,
		metadata,
		createdAt: toIsoString(record.createdAt),
		updatedAt: toIsoString(record.updatedAt),
	};
}

function parseMetadata(raw: unknown): Record<string, unknown> | null {
	if (raw === null || raw === undefined) {
		return null;
	}

	if (typeof raw === "string") {
		try {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === "object") {
				return parsed as Record<string, unknown>;
			}
			return null;
		} catch {
			console.warn("Invalid catalog item metadata JSON, returning null");
			return null;
		}
	}

	if (typeof raw === "object") {
		return raw as Record<string, unknown>;
	}

	return null;
}

function buildPagination({
	page,
	pageSize,
	total,
}: {
	page: number;
	pageSize: number;
	total: number;
}): CatalogPagination {
	return {
		page,
		pageSize,
		total,
		totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
	};
}

export class CatalogRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async findByKey(key: string): Promise<CatalogEntity | null> {
		const catalog = await this.prisma.catalog.findUnique({
			where: { key },
		});

		return catalog ? mapCatalog(catalog) : null;
	}

	async listItems(
		catalogId: string,
		query: CatalogListQuery,
		sort: Prisma.CatalogItemOrderByWithRelationInput = { name: "asc" },
	): Promise<{ data: CatalogItemEntity[]; pagination: CatalogPagination }> {
		const { page, pageSize, search, active } = query;

		const where: Prisma.CatalogItemWhereInput = {
			catalogId,
		};

		if (typeof active === "boolean") {
			where.active = active;
		}

		if (search) {
			const normalized = normalizeSearchTerm(search);
			where.OR = [
				{
					name: {
						contains: search,
					},
				},
				{
					normalizedName: {
						contains: normalized,
					},
				},
			];
		}

		const [total, records] = await Promise.all([
			this.prisma.catalogItem.count({ where }),
			this.prisma.catalogItem.findMany({
				where,
				orderBy: sort,
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
		]);

		return {
			data: records.map(mapCatalogItem),
			pagination: buildPagination({ page, pageSize, total }),
		};
	}

	async findItemByNormalizedName(
		catalogId: string,
		normalizedName: string,
	): Promise<CatalogItemEntity | null> {
		const item = await this.prisma.catalogItem.findFirst({
			where: {
				catalogId,
				normalizedName,
			},
		});

		return item ? mapCatalogItem(item) : null;
	}

	async createItem(
		catalogId: string,
		name: string,
	): Promise<CatalogItemEntity> {
		const normalizedName = normalizeName(name);

		const item = await this.prisma.catalogItem.create({
			data: {
				catalogId,
				name: name.trim(),
				normalizedName,
				active: true,
			},
		});

		return mapCatalogItem(item);
	}
}
