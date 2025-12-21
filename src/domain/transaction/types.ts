export type OperationType = "purchase" | "sale";
export type VehicleType = "land" | "marine" | "air";

export interface PaymentMethod {
	id: string;
	method: string;
	amount: string;
	createdAt: string;
	updatedAt: string;
}

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
	armorLevel: string | null;
	engineNumber: string | null;
	plates: string | null;
	registrationNumber: string | null;
	flagCountryId: string | null;
	amount: string;
	currency: string;
	operationTypeCode: string | null; // Reference to operation-types catalog (metadata.code)
	currencyCode: string | null; // Reference to currencies catalog (metadata.code)
	umaValue: string | null; // Calculated: amount / umaDailyValue for the transaction date
	paymentMethods: PaymentMethod[];
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
