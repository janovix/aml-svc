export type OperationType = "purchase" | "sale";
export type VehicleType = "land" | "marine" | "air";

export interface TransactionEntity {
	id: string;
	clientId: string;
	operationDate: string;
	operationType: OperationType;
	branchPostalCode: string;
	vehicleType: VehicleType;
	brandId: string;
	model: string;
	year: number;
	serialNumber: string;
	armorLevel: string | null;
	engineNumber: string | null;
	plates: string | null;
	registrationNumber: string | null;
	flagCountryId: string | null;
	amount: string;
	currency: string;
	paymentMethod: string;
	paymentDate: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
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

export type TransactionListResult = ListResult<TransactionEntity>;
