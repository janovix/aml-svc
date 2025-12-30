import type { CatalogRepository } from "./repository";
import type { CatalogListQueryInput } from "./schemas";
import type { CatalogItemEntity, PaginatedCatalogResult } from "./types";

export class CatalogQueryService {
	constructor(private readonly repository: CatalogRepository) {}

	async list(
		catalogKey: string,
		query: CatalogListQueryInput,
	): Promise<PaginatedCatalogResult> {
		const catalog = await this.repository.findByKey(catalogKey);

		if (!catalog || !catalog.active) {
			throw new Error("CATALOG_NOT_FOUND");
		}

		const result = await this.repository.listItems(catalog.id, query);

		return {
			catalog: {
				id: catalog.id,
				key: catalog.key,
				name: catalog.name,
				allowNewItems: catalog.allowNewItems,
			},
			data: result.data,
			pagination: result.pagination,
		};
	}

	async createItem(
		catalogKey: string,
		name: string,
	): Promise<CatalogItemEntity> {
		const catalog = await this.repository.findByKey(catalogKey);

		if (!catalog || !catalog.active) {
			throw new Error("CATALOG_NOT_FOUND");
		}

		if (!catalog.allowNewItems) {
			throw new Error("CATALOG_NOT_OPEN");
		}

		// Normalize the name and check for duplicates
		const normalizedName = name
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.trim();

		const existingItem = await this.repository.findItemByNormalizedName(
			catalog.id,
			normalizedName,
		);

		if (existingItem) {
			throw new Error("CATALOG_ITEM_ALREADY_EXISTS");
		}

		return this.repository.createItem(catalog.id, name);
	}
}
