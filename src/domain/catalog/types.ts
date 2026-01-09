export interface CatalogEntity {
	id: string;
	key: string;
	name: string;
	active: boolean;
	allowNewItems: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CatalogItemEntity {
	id: string;
	catalogId: string;
	name: string;
	normalizedName: string;
	active: boolean;
	metadata: Record<string, unknown> | null;
	createdAt: string;
	updatedAt: string;
}

export interface CatalogListQuery {
	search?: string | undefined;
	page: number;
	pageSize: number;
	active?: boolean | undefined;
}

export interface CatalogPagination {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
}

export interface PaginatedCatalogResult {
	catalog: Pick<CatalogEntity, "id" | "key" | "name" | "allowNewItems">;
	data: CatalogItemEntity[];
	pagination: CatalogPagination;
}
