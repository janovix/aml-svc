import type { CatalogRepository } from "./repository";
import type { CatalogListQueryInput } from "./schemas";
import type { PaginatedCatalogResult } from "./types";

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
			},
			data: result.data,
			pagination: result.pagination,
		};
	}
}
