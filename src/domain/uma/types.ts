export interface UmaValueEntity {
	id: string;
	year: number;
	dailyValue: string; // Decimal as string to preserve precision
	effectiveDate: string;
	endDate?: string | null;
	approvedBy?: string | null;
	notes?: string | null;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface ListResult<T> {
	data: T[];
	pagination: Pagination;
}
