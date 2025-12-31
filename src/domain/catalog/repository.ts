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
import type { EnrichedCatalogItem } from "./enrichment";

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

function mapCatalogItemWithKey(
	record: PrismaCatalogItem & { catalog?: { key: string } },
	catalogKey?: string,
): EnrichedCatalogItem {
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
		catalogKey: catalogKey ?? record.catalog?.key ?? "",
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

	/**
	 * Batch lookup catalog items by their IDs
	 * Optionally filter by catalog keys
	 * @param ids - Array of catalog item IDs to look up
	 * @param catalogKeys - Optional array of catalog keys to filter by
	 * @param includeInactive - Whether to include inactive items (default: false)
	 * @returns Map of ID to EnrichedCatalogItem
	 */
	async findItemsByIds(
		ids: string[],
		catalogKeys?: string[],
		includeInactive = false,
	): Promise<Map<string, EnrichedCatalogItem>> {
		if (ids.length === 0) {
			return new Map();
		}

		// Remove duplicates
		const uniqueIds = [...new Set(ids)];

		const where: Prisma.CatalogItemWhereInput = {
			id: { in: uniqueIds },
		};

		if (!includeInactive) {
			where.active = true;
		}

		if (catalogKeys && catalogKeys.length > 0) {
			where.catalog = {
				key: { in: catalogKeys },
			};
		}

		const items = await this.prisma.catalogItem.findMany({
			where,
			include: {
				catalog: {
					select: { key: true },
				},
			},
		});

		const resultMap = new Map<string, EnrichedCatalogItem>();
		for (const item of items) {
			resultMap.set(item.id, mapCatalogItemWithKey(item));
		}

		return resultMap;
	}

	/**
	 * Batch lookup catalog items by their metadata.code values within a specific catalog
	 * @param catalogKey - The catalog key to search in
	 * @param codes - Array of codes to look up (from metadata.code)
	 * @param includeInactive - Whether to include inactive items (default: false)
	 * @returns Map of code to EnrichedCatalogItem
	 */
	async findItemsByCodes(
		catalogKey: string,
		codes: string[],
		includeInactive = false,
	): Promise<Map<string, EnrichedCatalogItem>> {
		if (codes.length === 0) {
			return new Map();
		}

		// Remove duplicates
		const uniqueCodes = [...new Set(codes)];

		// First, find the catalog
		const catalog = await this.prisma.catalog.findUnique({
			where: { key: catalogKey },
		});

		if (!catalog) {
			return new Map();
		}

		const where: Prisma.CatalogItemWhereInput = {
			catalogId: catalog.id,
		};

		if (!includeInactive) {
			where.active = true;
		}

		// Fetch all items from this catalog
		// Note: We fetch all items because D1/SQLite JSON queries are limited
		// For large catalogs, consider adding a 'code' column for direct indexing
		const items = await this.prisma.catalogItem.findMany({
			where,
		});

		const resultMap = new Map<string, EnrichedCatalogItem>();
		for (const item of items) {
			const metadata = parseMetadata(item.metadata);
			if (metadata && typeof metadata.code === "string") {
				if (uniqueCodes.includes(metadata.code)) {
					resultMap.set(metadata.code, mapCatalogItemWithKey(item, catalogKey));
				}
			}
		}

		return resultMap;
	}

	/**
	 * Batch lookup catalog items by their metadata.code values across multiple catalogs
	 * @param catalogKeys - Array of catalog keys to search in
	 * @param codes - Array of codes to look up (from metadata.code)
	 * @param includeInactive - Whether to include inactive items (default: false)
	 * @returns Map of code to EnrichedCatalogItem
	 */
	async findItemsByCodesMultipleCatalogs(
		catalogKeys: string[],
		codes: string[],
		includeInactive = false,
	): Promise<Map<string, EnrichedCatalogItem>> {
		if (codes.length === 0 || catalogKeys.length === 0) {
			return new Map();
		}

		const uniqueCodes = [...new Set(codes)];

		// Find all matching catalogs
		const catalogs = await this.prisma.catalog.findMany({
			where: { key: { in: catalogKeys } },
		});

		if (catalogs.length === 0) {
			return new Map();
		}

		const catalogIdToKey = new Map(catalogs.map((c) => [c.id, c.key]));
		const catalogIds = catalogs.map((c) => c.id);

		const where: Prisma.CatalogItemWhereInput = {
			catalogId: { in: catalogIds },
		};

		if (!includeInactive) {
			where.active = true;
		}

		const items = await this.prisma.catalogItem.findMany({
			where,
		});

		const resultMap = new Map<string, EnrichedCatalogItem>();
		for (const item of items) {
			const metadata = parseMetadata(item.metadata);
			if (metadata && typeof metadata.code === "string") {
				if (uniqueCodes.includes(metadata.code)) {
					const catalogKey = catalogIdToKey.get(item.catalogId) ?? "";
					resultMap.set(metadata.code, mapCatalogItemWithKey(item, catalogKey));
				}
			}
		}

		return resultMap;
	}
}
