import pkg from "../package.json";
const { version } = pkg;

/**
 * OpenAPI 3.1 Specification for AML Core API
 * This defines the API contract for documentation and client generation
 */
export const openAPISpec = {
	openapi: "3.1.0",
	info: {
		title: "AML Core API",
		version,
		description:
			"KYC/AML core API built with Hono on Cloudflare Workers, using D1 database and Prisma ORM.",
		contact: {
			name: "API Support",
			email: "hostmaster@algenium.systems",
		},
	},
	tags: [
		{
			name: "Health",
			description: "Health check endpoints",
		},
		{
			name: "Admin",
			description:
				"Platform admin endpoints for cross-organization monitoring (requires admin role)",
		},
		{
			name: "Clients",
			description: "Client KYC data management endpoints",
		},
		{
			name: "Catalogs",
			description: "Generic catalog listing endpoints",
		},
		{
			name: "Transactions",
			description: "Vehicle transaction endpoints",
		},
		{
			name: "Alert Rules",
			description: "Dynamic alert rule management endpoints",
		},
		{
			name: "Alerts",
			description: "Alert detection and management endpoints",
		},
		{
			name: "UMA Values",
			description:
				"UMA (Unidad de Medida y Actualización) value management endpoints",
		},
		{
			name: "Organization Settings",
			description:
				"Organization settings management endpoints (RFC and vulnerable activity for compliance officer)",
		},
		{
			name: "Reports",
			description:
				"Report management endpoints for generating PDF analytics reports",
		},
		{
			name: "Notices",
			description:
				"SAT notice management endpoints for generating and submitting XML reports to SAT (17-17 monthly cycle)",
		},
		{
			name: "Imports",
			description:
				"Bulk data import endpoints for uploading CSV/Excel files to import clients and transactions",
		},
	],
	paths: {
		"/healthz": {
			get: {
				tags: ["Health"],
				summary: "Health check",
				description: "Returns the health status of the API",
				responses: {
					"200": {
						description: "Successful response",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										ok: { type: "boolean", example: true },
										status: { type: "string", example: "ok" },
										environment: { type: "string", example: "development" },
										version: { type: "string", example: "1.0.0" },
										timestamp: { type: "string", format: "date-time" },
									},
								},
							},
						},
					},
				},
			},
		},
		"/api/v1/clients": {
			get: {
				tags: ["Clients"],
				summary: "List clients",
				description:
					"Retrieve a paginated list of clients with optional filters for name, RFC, and person type.",
				parameters: [
					{
						name: "page",
						in: "query",
						schema: { type: "integer", minimum: 1, default: 1 },
						description: "Page number to retrieve",
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
						description: "Number of records per page",
					},
					{
						name: "search",
						in: "query",
						schema: { type: "string" },
						description: "Filter by first name, last name, or business name",
					},
					{
						name: "rfc",
						in: "query",
						schema: { type: "string" },
						description: "Filter by RFC",
					},
					{
						name: "personType",
						in: "query",
						schema: {
							type: "string",
							enum: ["physical", "moral", "trust"],
						},
						description: "Filter by person type",
					},
				],
				responses: {
					"200": {
						description: "List of clients",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: { $ref: "#/components/schemas/Client" },
										},
										pagination: { $ref: "#/components/schemas/Pagination" },
									},
								},
							},
						},
					},
				},
			},
			post: {
				tags: ["Clients"],
				summary: "Create client",
				description: "Register a new client.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ClientCreateRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "Client created successfully",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Client" },
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/clients/stats": {
			get: {
				tags: ["Clients"],
				summary: "Get client statistics",
				description:
					"Retrieve aggregate statistics for clients including total count and breakdown by person type.",
				responses: {
					"200": {
						description: "Client statistics",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ClientStats" },
							},
						},
					},
				},
			},
		},
		"/api/v1/clients/{id}": {
			get: {
				tags: ["Clients"],
				summary: "Get client by ID",
				description: "Retrieve a single client.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Client ID",
					},
				],
				responses: {
					"200": {
						description: "Client detail response",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Client" },
							},
						},
					},
					"404": {
						description: "Client not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			put: {
				tags: ["Clients"],
				summary: "Update client",
				description: "Replace the full client payload.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ClientCreateRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Client updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Client" },
							},
						},
					},
					"404": {
						description: "Client not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			patch: {
				tags: ["Clients"],
				summary: "Patch client",
				description: "Apply a partial update to a client.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ClientPatchRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Client updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Client" },
							},
						},
					},
					"404": {
						description: "Client not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			delete: {
				tags: ["Clients"],
				summary: "Delete client",
				description: "Marks a client as deleted.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"204": {
						description: "Client deleted",
					},
					"404": {
						description: "Client not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/clients/{id}/documents": {
			get: {
				tags: ["Clients"],
				summary: "List client documents",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"200": {
						description: "Documents list",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: { $ref: "#/components/schemas/ClientDocument" },
										},
									},
								},
							},
						},
					},
				},
			},
			post: {
				tags: ["Clients"],
				summary: "Create client document",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/ClientDocumentCreateRequest",
							},
						},
					},
				},
				responses: {
					"201": {
						description: "Document created",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ClientDocument" },
							},
						},
					},
				},
			},
		},
		"/api/v1/clients/{clientId}/documents/{documentId}": {
			put: {
				tags: ["Clients"],
				summary: "Replace client document",
				parameters: [
					{
						name: "clientId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
					{
						name: "documentId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/ClientDocumentCreateRequest",
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Document updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ClientDocument" },
							},
						},
					},
				},
			},
			patch: {
				tags: ["Clients"],
				summary: "Patch client document",
				parameters: [
					{
						name: "clientId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
					{
						name: "documentId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/ClientDocumentPatchRequest",
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Document updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ClientDocument" },
							},
						},
					},
				},
			},
			delete: {
				tags: ["Clients"],
				summary: "Delete client document",
				parameters: [
					{
						name: "clientId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
					{
						name: "documentId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "204": { description: "Document deleted" } },
			},
		},
		"/api/v1/clients/{id}/addresses": {
			get: {
				tags: ["Clients"],
				summary: "List client addresses",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"200": {
						description: "Addresses list",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: { $ref: "#/components/schemas/ClientAddress" },
										},
									},
								},
							},
						},
					},
				},
			},
			post: {
				tags: ["Clients"],
				summary: "Create client address",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/ClientAddressCreateRequest",
							},
						},
					},
				},
				responses: {
					"201": {
						description: "Address created",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ClientAddress" },
							},
						},
					},
				},
			},
		},
		"/api/v1/clients/{clientId}/addresses/{addressId}": {
			put: {
				tags: ["Clients"],
				summary: "Replace client address",
				parameters: [
					{
						name: "clientId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
					{
						name: "addressId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/ClientAddressCreateRequest",
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Address updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ClientAddress" },
							},
						},
					},
				},
			},
			patch: {
				tags: ["Clients"],
				summary: "Patch client address",
				parameters: [
					{
						name: "clientId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
					{
						name: "addressId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/ClientAddressPatchRequest",
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Address updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ClientAddress" },
							},
						},
					},
				},
			},
			delete: {
				tags: ["Clients"],
				summary: "Delete client address",
				parameters: [
					{
						name: "clientId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
					{
						name: "addressId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "204": { description: "Address deleted" } },
			},
		},
		"/api/v1/catalogs/{catalogKey}": {
			get: {
				tags: ["Catalogs"],
				summary: "List catalog items",
				description:
					"Retrieve paginated catalog entries for the provided catalog key with optional search and filtering.",
				parameters: [
					{
						name: "catalogKey",
						in: "path",
						required: true,
						schema: {
							type: "string",
							minLength: 3,
							maxLength: 64,
							pattern: "^[a-zA-Z0-9-]+$",
						},
						description:
							"Identifier of the catalog to query (e.g., `car-brands`, `states`).",
					},
					{
						name: "search",
						in: "query",
						schema: {
							type: "string",
							minLength: 2,
							maxLength: 100,
						},
						description:
							"Optional case-insensitive text search across `name` and `normalizedName`. Empty or whitespace-only strings are treated as no filter (returns all items).",
					},
					{
						name: "page",
						in: "query",
						schema: { type: "integer", minimum: 1, default: 1 },
						description: "Page number to retrieve (1-based).",
					},
					{
						name: "pageSize",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
						description: "Number of records per page.",
					},
					{
						name: "active",
						in: "query",
						schema: { type: "boolean" },
						description: "Filter items by their `active` flag (true/false).",
					},
				],
				responses: {
					"200": {
						description: "Paginated catalog items",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/CatalogListResponse" },
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
					"404": {
						description: "Catalog not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/catalogs/{catalogKey}/items/{itemId}": {
			get: {
				tags: ["Catalogs"],
				summary: "Get a catalog item by ID, shortName, or code",
				description:
					"Retrieve a specific catalog item by its ID, metadata.shortName (e.g., 'MXN' for currencies), or metadata.code within a catalog. The endpoint will first try to match by ID, then by shortName, then by code. Returns 404 if the catalog or item is not found.",
				parameters: [
					{
						name: "catalogKey",
						in: "path",
						required: true,
						schema: {
							type: "string",
							minLength: 3,
							maxLength: 64,
							pattern: "^[a-zA-Z0-9-]+$",
						},
						description:
							"Identifier of the catalog (e.g., `car-brands`, `states`, `currencies`).",
					},
					{
						name: "itemId",
						in: "path",
						required: true,
						schema: {
							type: "string",
							minLength: 1,
						},
						description:
							"ID, shortName (metadata.shortName), or code (metadata.code) of the catalog item to retrieve. For example, for currencies catalog, you can use the database ID, 'MXN' (shortName), or '3' (code).",
					},
				],
				responses: {
					"200": {
						description: "Catalog item retrieved successfully",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/CatalogItem" },
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
					"404": {
						description: "Catalog or catalog item not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/catalogs/{catalogKey}/items": {
			post: {
				tags: ["Catalogs"],
				summary: "Create a new catalog item",
				description:
					"Add a new item to an open catalog (one that allows new items to be added). Returns 403 if the catalog is closed.",
				parameters: [
					{
						name: "catalogKey",
						in: "path",
						required: true,
						schema: {
							type: "string",
							minLength: 3,
							maxLength: 64,
							pattern: "^[a-zA-Z0-9-]+$",
						},
						description:
							"Identifier of the catalog to add the item to (e.g., `terrestrial-vehicle-brands`).",
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/CatalogItemCreateRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "Catalog item created successfully",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/CatalogItem" },
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
					"403": {
						description: "Catalog does not allow adding new items",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
					"404": {
						description: "Catalog not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
					"409": {
						description: "An item with this name already exists",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/transactions": {
			get: {
				tags: ["Transactions"],
				summary: "List transactions",
				description:
					"Retrieve a paginated list of transactions filtered by client, operation metadata, vehicle type, or date range.",
				parameters: [
					{
						name: "clientId",
						in: "query",
						schema: {
							type: "string",
							pattern: "^[A-Za-z0-9-]{1,64}$",
						},
						description: "Filter by client identifier.",
					},
					{
						name: "operationType",
						in: "query",
						schema: {
							type: "string",
							enum: ["purchase", "sale"],
						},
						description: "Filter by operation type (`purchase` or `sale`).",
					},
					{
						name: "vehicleType",
						in: "query",
						schema: {
							type: "string",
							enum: ["land", "marine", "air"],
						},
						description: "Filter by vehicle type (`land`, `marine`, or `air`).",
					},
					{
						name: "branchPostalCode",
						in: "query",
						schema: {
							type: "string",
							pattern: "^\\d{4,10}$",
						},
						description: "Filter by branch postal code.",
					},
					{
						name: "startDate",
						in: "query",
						schema: { type: "string", format: "date" },
						description:
							"ISO date for the inclusive range start (`operationDate >= startDate`).",
					},
					{
						name: "endDate",
						in: "query",
						schema: { type: "string", format: "date" },
						description:
							"ISO date for the inclusive range end (`operationDate <= endDate`).",
					},
					{
						name: "page",
						in: "query",
						schema: { type: "integer", minimum: 1, default: 1 },
						description: "Page number to retrieve (1-based).",
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
						description: "Number of records per page.",
					},
				],
				responses: {
					"200": {
						description: "Paginated list of transactions.",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/TransactionListResponse",
								},
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			post: {
				tags: ["Transactions"],
				summary: "Create transaction",
				description:
					"Creates a new vehicle transaction tied to an existing client.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/TransactionCreateRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "Transaction created successfully.",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Transaction" },
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/transactions/stats": {
			get: {
				tags: ["Transactions"],
				summary: "Get transaction statistics",
				description:
					"Retrieve aggregate statistics for transactions including today's count, suspicious transactions, total volume, and unique vehicles.",
				responses: {
					"200": {
						description: "Transaction statistics",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/TransactionStats" },
							},
						},
					},
				},
			},
		},
		"/api/v1/transactions/{id}": {
			get: {
				tags: ["Transactions"],
				summary: "Get transaction by ID",
				description: "Retrieve a single transaction record.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: {
							type: "string",
							pattern: "^[A-Za-z0-9-]{1,64}$",
						},
						description: "Transaction identifier.",
					},
				],
				responses: {
					"200": {
						description: "Transaction detail response.",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Transaction" },
							},
						},
					},
					"404": {
						description: "Transaction not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			put: {
				tags: ["Transactions"],
				summary: "Update transaction",
				description:
					"Replace an existing transaction (client relationship remains immutable).",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: {
							type: "string",
							pattern: "^[A-Za-z0-9-]{1,64}$",
						},
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/TransactionUpdateRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Transaction updated successfully.",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Transaction" },
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
					"404": {
						description: "Transaction not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			delete: {
				tags: ["Transactions"],
				summary: "Delete transaction",
				description: "Soft deletes a transaction by setting `deletedAt`.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: {
							type: "string",
							pattern: "^[A-Za-z0-9-]{1,64}$",
						},
					},
				],
				responses: {
					"204": { description: "Transaction deleted" },
					"404": {
						description: "Transaction not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/alert-rules": {
			get: {
				tags: ["Alert Rules"],
				summary: "List alert rules",
				description:
					"Retrieve a paginated list of alert rules with optional filters for active status and severity.",
				parameters: [
					{
						name: "page",
						in: "query",
						schema: { type: "integer", minimum: 1, default: 1 },
						description: "Page number to retrieve",
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
						description: "Number of records per page",
					},
					{
						name: "search",
						in: "query",
						schema: { type: "string" },
						description: "Filter by name or description",
					},
					{
						name: "active",
						in: "query",
						schema: { type: "boolean" },
						description: "Filter by active status",
					},
					{
						name: "severity",
						in: "query",
						schema: {
							type: "string",
							enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
						},
						description: "Filter by severity level",
					},
				],
				responses: {
					"200": {
						description: "List of alert rules",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: { $ref: "#/components/schemas/AlertRule" },
										},
										pagination: { $ref: "#/components/schemas/Pagination" },
									},
								},
							},
						},
					},
				},
			},
			post: {
				tags: ["Alert Rules"],
				summary: "Create alert rule",
				description: "Create a new dynamic alert rule.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/AlertRuleCreateRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "Alert rule created successfully",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/AlertRule" },
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/alert-rules/active": {
			get: {
				tags: ["Alert Rules"],
				summary: "Get active alert rules for seekers",
				description:
					"Retrieve all active alert rules that can be triggered by seekers (excludes manual-only rules).",
				responses: {
					"200": {
						description: "List of active alert rules for seekers",
						content: {
							"application/json": {
								schema: {
									type: "array",
									items: { $ref: "#/components/schemas/AlertRule" },
								},
							},
						},
					},
				},
			},
		},
		"/api/v1/alert-rules/{id}": {
			get: {
				tags: ["Alert Rules"],
				summary: "Get alert rule by ID",
				description: "Retrieve a single alert rule.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Alert rule identifier",
					},
				],
				responses: {
					"200": {
						description: "Alert rule detail response",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/AlertRule" },
							},
						},
					},
					"404": {
						description: "Alert rule not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			put: {
				tags: ["Alert Rules"],
				summary: "Update alert rule",
				description: "Replace the full alert rule payload.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/AlertRuleCreateRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Alert rule updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/AlertRule" },
							},
						},
					},
					"404": {
						description: "Alert rule not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			patch: {
				tags: ["Alert Rules"],
				summary: "Patch alert rule",
				description: "Apply a partial update to an alert rule.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/AlertRulePatchRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Alert rule updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/AlertRule" },
							},
						},
					},
					"404": {
						description: "Alert rule not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			delete: {
				tags: ["Alert Rules"],
				summary: "Delete alert rule",
				description: "Delete an alert rule.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"204": {
						description: "Alert rule deleted",
					},
					"404": {
						description: "Alert rule not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/alert-rules/{id}/config": {
			get: {
				tags: ["Alert Rules"],
				summary: "List alert rule configs",
				description: "Retrieve all configuration values for an alert rule",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Alert rule identifier",
					},
				],
				responses: {
					"200": {
						description: "List of alert rule configs",
						content: {
							"application/json": {
								schema: {
									type: "array",
									items: { $ref: "#/components/schemas/AlertRuleConfig" },
								},
							},
						},
					},
					"404": {
						description: "Alert rule not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			post: {
				tags: ["Alert Rules"],
				summary: "Create alert rule config",
				description: "Create a new configuration value for an alert rule",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Alert rule identifier",
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/AlertRuleConfigCreateRequest",
							},
						},
					},
				},
				responses: {
					"201": {
						description: "Alert rule config created successfully",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/AlertRuleConfig" },
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
					"404": {
						description: "Alert rule not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/alert-rules/{id}/config/{key}": {
			get: {
				tags: ["Alert Rules"],
				summary: "Get alert rule config by key",
				description:
					"Retrieve a specific configuration value for an alert rule",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Alert rule identifier",
					},
					{
						name: "key",
						in: "path",
						required: true,
						schema: { type: "string", minLength: 1, maxLength: 100 },
						description: "Configuration key",
					},
				],
				responses: {
					"200": {
						description: "Alert rule config",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/AlertRuleConfig" },
							},
						},
					},
					"404": {
						description: "Alert rule config not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			patch: {
				tags: ["Alert Rules"],
				summary: "Update alert rule config",
				description: "Update a configuration value for an alert rule",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Alert rule identifier",
					},
					{
						name: "key",
						in: "path",
						required: true,
						schema: { type: "string", minLength: 1, maxLength: 100 },
						description: "Configuration key",
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/AlertRuleConfigUpdateRequest",
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Alert rule config updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/AlertRuleConfig" },
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
					"403": {
						description: "Cannot modify hardcoded config value",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
					"404": {
						description: "Alert rule config not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			delete: {
				tags: ["Alert Rules"],
				summary: "Delete alert rule config",
				description: "Delete a configuration value for an alert rule",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Alert rule identifier",
					},
					{
						name: "key",
						in: "path",
						required: true,
						schema: { type: "string", minLength: 1, maxLength: 100 },
						description: "Configuration key",
					},
				],
				responses: {
					"204": {
						description: "Alert rule config deleted",
					},
					"403": {
						description: "Cannot delete hardcoded config value",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
					"404": {
						description: "Alert rule config not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/alerts": {
			get: {
				tags: ["Alerts"],
				summary: "List alerts",
				description:
					"Retrieve a paginated list of alerts with optional filters for alert rule, client, status, and severity.",
				parameters: [
					{
						name: "page",
						in: "query",
						schema: { type: "integer", minimum: 1, default: 1 },
						description: "Page number to retrieve",
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
						description: "Number of records per page",
					},
					{
						name: "alertRuleId",
						in: "query",
						schema: { type: "string" },
						description: "Filter by alert rule ID",
					},
					{
						name: "clientId",
						in: "query",
						schema: { type: "string" },
						description: "Filter by client ID",
					},
					{
						name: "status",
						in: "query",
						schema: {
							type: "string",
							enum: [
								"DETECTED",
								"FILE_GENERATED",
								"SUBMITTED",
								"OVERDUE",
								"CANCELLED",
							],
						},
						description: "Filter by alert status",
					},
					{
						name: "severity",
						in: "query",
						schema: {
							type: "string",
							enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
						},
						description: "Filter by severity level",
					},
				],
				responses: {
					"200": {
						description: "List of alerts",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: { $ref: "#/components/schemas/Alert" },
										},
										pagination: { $ref: "#/components/schemas/Pagination" },
									},
								},
							},
						},
					},
				},
			},
			post: {
				tags: ["Alerts"],
				summary: "Create alert",
				description:
					"Create a new alert. The alert creation is idempotent based on the idempotencyKey.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/AlertCreateRequest" },
						},
					},
				},
				responses: {
					"201": {
						description:
							"Alert created successfully (or existing alert returned if idempotencyKey matches)",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Alert" },
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/alerts/{id}": {
			get: {
				tags: ["Alerts"],
				summary: "Get alert by ID",
				description: "Retrieve a single alert.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Alert identifier",
					},
				],
				responses: {
					"200": {
						description: "Alert detail response",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Alert" },
							},
						},
					},
					"404": {
						description: "Alert not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			put: {
				tags: ["Alerts"],
				summary: "Update alert",
				description: "Update alert status and metadata.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/AlertUpdateRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Alert updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Alert" },
							},
						},
					},
					"404": {
						description: "Alert not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			patch: {
				tags: ["Alerts"],
				summary: "Patch alert",
				description: "Apply a partial update to an alert.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/AlertPatchRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Alert updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Alert" },
							},
						},
					},
					"404": {
						description: "Alert not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			delete: {
				tags: ["Alerts"],
				summary: "Delete alert",
				description: "Delete an alert.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"204": {
						description: "Alert deleted",
					},
					"404": {
						description: "Alert not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/alerts/{id}/cancel": {
			post: {
				tags: ["Alerts"],
				summary: "Cancel alert",
				description:
					"Cancel an alert with a reason. Sets the status to CANCELLED and records the cancellation reason and user.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Alert identifier",
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/AlertCancelRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Alert cancelled successfully",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Alert" },
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
					"404": {
						description: "Alert not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/uma-values": {
			get: {
				tags: ["UMA Values"],
				summary: "List UMA values",
				description:
					"Retrieve a paginated list of UMA values with optional filters for year and active status.",
				parameters: [
					{
						name: "page",
						in: "query",
						schema: { type: "integer", minimum: 1, default: 1 },
						description: "Page number to retrieve",
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
						description: "Number of records per page",
					},
					{
						name: "year",
						in: "query",
						schema: { type: "integer", minimum: 2000, maximum: 2100 },
						description: "Filter by year",
					},
					{
						name: "active",
						in: "query",
						schema: { type: "boolean" },
						description: "Filter by active status",
					},
				],
				responses: {
					"200": {
						description: "List of UMA values",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: { $ref: "#/components/schemas/UmaValue" },
										},
										pagination: { $ref: "#/components/schemas/Pagination" },
									},
								},
							},
						},
					},
				},
			},
			post: {
				tags: ["UMA Values"],
				summary: "Create UMA value",
				description:
					"Create a new UMA value for a specific year. Only one UMA value can be active at a time.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/UmaValueCreateRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "UMA value created successfully",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/UmaValue" },
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/uma-values/active": {
			get: {
				tags: ["UMA Values"],
				summary: "Get active UMA value",
				description:
					"Retrieve the currently active UMA value. This is the value used for threshold calculations.",
				responses: {
					"200": {
						description: "Active UMA value",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/UmaValue" },
							},
						},
					},
					"404": {
						description: "No active UMA value found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/uma-values/year/{year}": {
			get: {
				tags: ["UMA Values"],
				summary: "Get UMA value by year",
				description: "Retrieve the UMA value for a specific year.",
				parameters: [
					{
						name: "year",
						in: "path",
						required: true,
						schema: { type: "integer", minimum: 2000, maximum: 2100 },
						description: "Year to retrieve UMA value for",
					},
				],
				responses: {
					"200": {
						description: "UMA value for the specified year",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/UmaValue" },
							},
						},
					},
					"404": {
						description: "UMA value for year not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/uma-values/{id}": {
			get: {
				tags: ["UMA Values"],
				summary: "Get UMA value by ID",
				description: "Retrieve a single UMA value.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "UMA value identifier",
					},
				],
				responses: {
					"200": {
						description: "UMA value detail response",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/UmaValue" },
							},
						},
					},
					"404": {
						description: "UMA value not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			put: {
				tags: ["UMA Values"],
				summary: "Update UMA value",
				description:
					"Replace the full UMA value payload. If setting as active, all other UMA values will be deactivated.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/UmaValueCreateRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "UMA value updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/UmaValue" },
							},
						},
					},
					"404": {
						description: "UMA value not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			patch: {
				tags: ["UMA Values"],
				summary: "Patch UMA value",
				description:
					"Apply a partial update to a UMA value. If setting as active, all other UMA values will be deactivated.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/UmaValuePatchRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "UMA value updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/UmaValue" },
							},
						},
					},
					"404": {
						description: "UMA value not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			delete: {
				tags: ["UMA Values"],
				summary: "Delete UMA value",
				description: "Delete a UMA value.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"204": {
						description: "UMA value deleted",
					},
					"404": {
						description: "UMA value not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/uma-values/{id}/activate": {
			post: {
				tags: ["UMA Values"],
				summary: "Activate UMA value",
				description:
					"Activate a UMA value. This will deactivate all other UMA values and set this one as active.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"200": {
						description: "UMA value activated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/UmaValue" },
							},
						},
					},
					"404": {
						description: "UMA value not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/organization-settings": {
			get: {
				tags: ["Organization Settings"],
				summary: "Get organization settings",
				description:
					"Retrieve the organization settings (RFC and vulnerable activity) for the authenticated user's organization.",
				responses: {
					"200": {
						description: "Organization settings",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/OrganizationSettings",
								},
							},
						},
					},
					"404": {
						description: "Organization settings not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			put: {
				tags: ["Organization Settings"],
				summary: "Create or update organization settings",
				description:
					"Create or update the organization settings (RFC and vulnerable activity) for the authenticated user's organization.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/OrganizationSettingsCreateRequest",
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Organization settings created or updated",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/OrganizationSettings",
								},
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			patch: {
				tags: ["Organization Settings"],
				summary: "Update organization settings",
				description:
					"Partially update the organization settings for the authenticated user's organization.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/OrganizationSettingsUpdateRequest",
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Organization settings updated",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/OrganizationSettings",
								},
							},
						},
					},
					"404": {
						description: "Organization settings not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/reports": {
			get: {
				tags: ["Reports"],
				summary: "List reports",
				description:
					"Retrieve a paginated list of reports with optional filters",
				parameters: [
					{
						name: "page",
						in: "query",
						schema: { type: "integer", minimum: 1, default: 1 },
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
					},
					{
						name: "type",
						in: "query",
						schema: { $ref: "#/components/schemas/ReportType" },
					},
					{
						name: "status",
						in: "query",
						schema: { $ref: "#/components/schemas/ReportStatus" },
					},
				],
				responses: {
					"200": {
						description: "Paginated list of reports",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: { $ref: "#/components/schemas/Report" },
										},
										pagination: { $ref: "#/components/schemas/Pagination" },
									},
								},
							},
						},
					},
				},
			},
			post: {
				tags: ["Reports"],
				summary: "Create a new report",
				description:
					"Create a new report for a specified period. Alerts in the period will be assigned to the report.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ReportCreateRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "Report created successfully",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Report" },
							},
						},
					},
					"409": {
						description: "Report already exists for this period and type",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/reports/preview": {
			get: {
				tags: ["Reports"],
				summary: "Preview report alerts",
				description:
					"Get a preview of alerts that would be included in a report for the given period",
				parameters: [
					{
						name: "type",
						in: "query",
						required: true,
						schema: { $ref: "#/components/schemas/ReportType" },
					},
					{
						name: "periodStart",
						in: "query",
						required: true,
						schema: { type: "string", format: "date-time" },
					},
					{
						name: "periodEnd",
						in: "query",
						required: true,
						schema: { type: "string", format: "date-time" },
					},
				],
				responses: {
					"200": {
						description: "Alert preview for the period",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ReportPreviewResponse" },
							},
						},
					},
				},
			},
		},
		"/api/v1/reports/templates": {
			get: {
				tags: ["Reports"],
				summary: "List available report templates",
				description:
					"Retrieve all available report templates with their configurations",
				responses: {
					"200": {
						description: "List of report templates",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										templates: {
											type: "array",
											items: {
												$ref: "#/components/schemas/ReportTemplateConfig",
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		"/api/v1/reports/aggregate/summary": {
			get: {
				tags: ["Reports"],
				summary: "Get executive summary aggregation",
				description:
					"Get aggregated metrics for alerts, transactions, and clients for a given period",
				parameters: [
					{
						name: "periodStart",
						in: "query",
						required: true,
						schema: { type: "string", format: "date-time" },
						description: "Start of the period",
					},
					{
						name: "periodEnd",
						in: "query",
						required: true,
						schema: { type: "string", format: "date-time" },
						description: "End of the period",
					},
					{
						name: "comparisonPeriodStart",
						in: "query",
						schema: { type: "string", format: "date-time" },
						description: "Start of comparison period (optional)",
					},
					{
						name: "comparisonPeriodEnd",
						in: "query",
						schema: { type: "string", format: "date-time" },
						description: "End of comparison period (optional)",
					},
					{
						name: "clientId",
						in: "query",
						schema: { type: "string" },
						description: "Filter by client ID (optional)",
					},
				],
				responses: {
					"200": {
						description: "Aggregated summary data",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ReportAggregation" },
							},
						},
					},
				},
			},
		},
		"/api/v1/reports/aggregate/alerts": {
			get: {
				tags: ["Reports"],
				summary: "Get alert metrics aggregation",
				description: "Get aggregated alert metrics for a given period",
				parameters: [
					{
						name: "periodStart",
						in: "query",
						required: true,
						schema: { type: "string", format: "date-time" },
						description: "Start of the period",
					},
					{
						name: "periodEnd",
						in: "query",
						required: true,
						schema: { type: "string", format: "date-time" },
						description: "End of the period",
					},
					{
						name: "clientId",
						in: "query",
						schema: { type: "string" },
						description: "Filter by client ID (optional)",
					},
				],
				responses: {
					"200": {
						description: "Aggregated alert metrics",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/AlertAggregation" },
							},
						},
					},
				},
			},
		},
		"/api/v1/reports/aggregate/transactions": {
			get: {
				tags: ["Reports"],
				summary: "Get transaction metrics aggregation",
				description: "Get aggregated transaction metrics for a given period",
				parameters: [
					{
						name: "periodStart",
						in: "query",
						required: true,
						schema: { type: "string", format: "date-time" },
						description: "Start of the period",
					},
					{
						name: "periodEnd",
						in: "query",
						required: true,
						schema: { type: "string", format: "date-time" },
						description: "End of the period",
					},
					{
						name: "clientId",
						in: "query",
						schema: { type: "string" },
						description: "Filter by client ID (optional)",
					},
				],
				responses: {
					"200": {
						description: "Aggregated transaction metrics",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/TransactionAggregation" },
							},
						},
					},
				},
			},
		},
		"/api/v1/reports/aggregate/clients": {
			get: {
				tags: ["Reports"],
				summary: "Get client metrics aggregation",
				description: "Get aggregated client metrics for a given period",
				parameters: [
					{
						name: "periodStart",
						in: "query",
						required: true,
						schema: { type: "string", format: "date-time" },
						description: "Start of the period",
					},
					{
						name: "periodEnd",
						in: "query",
						required: true,
						schema: { type: "string", format: "date-time" },
						description: "End of the period",
					},
					{
						name: "clientId",
						in: "query",
						schema: { type: "string" },
						description: "Filter by client ID (optional)",
					},
				],
				responses: {
					"200": {
						description: "Aggregated client metrics",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ClientAggregation" },
							},
						},
					},
				},
			},
		},
		"/api/v1/reports/{id}": {
			get: {
				tags: ["Reports"],
				summary: "Get a report",
				description: "Get a report by ID with alert summary",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"200": {
						description: "Report with alert summary",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ReportWithAlertSummary" },
							},
						},
					},
					"404": {
						description: "Report not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
			patch: {
				tags: ["Reports"],
				summary: "Update a report",
				description: "Partially update a report",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ReportPatchRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Report updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Report" },
							},
						},
					},
				},
			},
			delete: {
				tags: ["Reports"],
				summary: "Delete a draft report",
				description:
					"Delete a report (only DRAFT status reports can be deleted)",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"204": { description: "Report deleted" },
					"400": {
						description: "Only draft reports can be deleted",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/reports/{id}/generate": {
			post: {
				tags: ["Reports"],
				summary: "Generate report file",
				description:
					"Generate the XML (MONTHLY) or PDF (others) file for the report",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"200": {
						description: "File generation result",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: { type: "string" },
										reportId: { type: "string" },
										alertCount: { type: "integer" },
										type: { type: "string", enum: ["XML", "PDF"] },
									},
								},
							},
						},
					},
				},
			},
		},
		"/api/v1/reports/{id}/download": {
			get: {
				tags: ["Reports"],
				summary: "Get download URL",
				description: "Get the download URL for a generated report file",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"200": {
						description: "Download URL",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										fileUrl: { type: "string" },
									},
								},
							},
						},
					},
				},
			},
		},
		"/api/v1/reports/{id}/aggregation": {
			get: {
				tags: ["Reports"],
				summary: "Get aggregation data for a report",
				description:
					"Get aggregated metrics for a specific report's period and filters",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Report identifier",
					},
				],
				responses: {
					"200": {
						description: "Aggregated data for the report",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ReportAggregation" },
							},
						},
					},
					"404": {
						description: "Report not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Error" },
							},
						},
					},
				},
			},
		},
		"/api/v1/reports/{id}/submit": {
			post: {
				tags: ["Reports"],
				summary: "Submit to SAT",
				description: "Mark a MONTHLY report as submitted to SAT",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									satFolioNumber: { type: "string" },
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Report marked as submitted",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Report" },
							},
						},
					},
				},
			},
		},
		"/api/v1/reports/{id}/acknowledge": {
			post: {
				tags: ["Reports"],
				summary: "Record SAT acknowledgment",
				description: "Mark a MONTHLY report as acknowledged by SAT",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["satFolioNumber"],
								properties: {
									satFolioNumber: { type: "string" },
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Report marked as acknowledged",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Report" },
							},
						},
					},
				},
			},
		},
		// Notices endpoints
		"/api/v1/notices": {
			get: {
				tags: ["Notices"],
				summary: "List notices",
				description:
					"Retrieve a paginated list of SAT notices with optional filters.",
				parameters: [
					{
						name: "page",
						in: "query",
						schema: { type: "integer", minimum: 1, default: 1 },
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
					},
					{
						name: "status",
						in: "query",
						schema: {
							type: "string",
							enum: ["DRAFT", "GENERATED", "SUBMITTED", "ACKNOWLEDGED"],
						},
					},
					{
						name: "year",
						in: "query",
						schema: { type: "integer", minimum: 2020, maximum: 2100 },
					},
				],
				responses: {
					"200": {
						description: "List of notices",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: { $ref: "#/components/schemas/Notice" },
										},
										pagination: { $ref: "#/components/schemas/Pagination" },
									},
								},
							},
						},
					},
				},
			},
			post: {
				tags: ["Notices"],
				summary: "Create a notice",
				description:
					"Create a new SAT notice for a specific month using the 17-17 cycle.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/NoticeCreateRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "Notice created",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Notice" },
							},
						},
					},
					"409": {
						description: "A notice already exists for this period",
					},
				},
			},
		},
		"/api/v1/notices/preview": {
			get: {
				tags: ["Notices"],
				summary: "Preview alerts for a potential notice",
				description:
					"Get a preview of alerts that would be included in a notice for a given month.",
				parameters: [
					{
						name: "year",
						in: "query",
						required: true,
						schema: { type: "integer", minimum: 2020, maximum: 2100 },
					},
					{
						name: "month",
						in: "query",
						required: true,
						schema: { type: "integer", minimum: 1, maximum: 12 },
					},
				],
				responses: {
					"200": {
						description: "Preview data",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/NoticePreviewResponse" },
							},
						},
					},
				},
			},
		},
		"/api/v1/notices/available-months": {
			get: {
				tags: ["Notices"],
				summary: "Get available months for notice creation",
				description:
					"Returns a list of months for which notices can be created (no existing notice).",
				responses: {
					"200": {
						description: "Available months",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										months: {
											type: "array",
											items: {
												type: "object",
												properties: {
													year: { type: "integer" },
													month: { type: "integer" },
													displayName: { type: "string" },
													hasNotice: {
														type: "boolean",
														description:
															"True if a pending notice exists (blocks creation)",
													},
													hasPendingNotice: {
														type: "boolean",
														description:
															"True if there is a DRAFT or GENERATED notice for this period",
													},
													hasSubmittedNotice: {
														type: "boolean",
														description:
															"True if there is a SUBMITTED or ACKNOWLEDGED notice for this period",
													},
													noticeCount: {
														type: "integer",
														description:
															"Total number of notices for this period",
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		"/api/v1/notices/{id}": {
			get: {
				tags: ["Notices"],
				summary: "Get a notice by ID",
				description: "Retrieve a single notice with alert summary.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"200": {
						description: "Notice details",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/NoticeWithAlertSummary" },
							},
						},
					},
					"404": { description: "Notice not found" },
				},
			},
			patch: {
				tags: ["Notices"],
				summary: "Update a notice",
				description: "Update a notice's name, notes, or SAT folio number.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/NoticePatchRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Notice updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Notice" },
							},
						},
					},
				},
			},
			delete: {
				tags: ["Notices"],
				summary: "Delete a draft notice",
				description: "Delete a notice (only allowed for DRAFT status).",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"204": { description: "Notice deleted" },
					"400": { description: "Cannot delete non-draft notice" },
				},
			},
		},
		"/api/v1/notices/{id}/generate": {
			post: {
				tags: ["Notices"],
				summary: "Generate XML file for a notice",
				description:
					"Generate the SAT XML file for a notice, upload it to R2 storage, and mark it as GENERATED. Requires organization settings (RFC and activity code) to be configured.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"200": {
						description: "XML generated and uploaded successfully",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: { type: "string" },
										noticeId: { type: "string" },
										alertCount: { type: "integer" },
										fileSize: {
											type: "integer",
											description: "Size of the generated XML file in bytes",
										},
										xmlFileUrl: {
											type: "string",
											nullable: true,
											description: "R2 storage path of the XML file",
										},
									},
								},
							},
						},
					},
					"400": {
						description:
							"Notice has already been generated, has no alerts, has no valid alerts with transactions, or organization settings not configured",
					},
				},
			},
		},
		"/api/v1/notices/{id}/download": {
			get: {
				tags: ["Notices"],
				summary: "Download the generated SAT XML file",
				description:
					"Download the generated SAT XML file directly from R2 storage. Returns the XML file as a downloadable attachment.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"200": {
						description: "XML file download",
						content: {
							"application/xml": {
								schema: {
									type: "string",
									format: "binary",
									description: "The SAT XML file content",
								},
							},
							"application/json": {
								schema: {
									type: "object",
									description: "Fallback response when R2 is not available",
									properties: {
										fileUrl: { type: "string" },
										fileSize: { type: "integer", nullable: true },
										format: { type: "string", enum: ["xml"] },
									},
								},
							},
						},
					},
					"400": { description: "Notice has not been generated yet" },
					"404": { description: "Notice XML file not found" },
				},
			},
		},
		"/api/v1/notices/{id}/submit": {
			post: {
				tags: ["Notices"],
				summary: "Mark notice as submitted to SAT",
				description:
					"Mark a GENERATED notice as submitted to SAT, optionally with a folio number.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									satFolioNumber: { type: "string", maxLength: 100 },
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Notice marked as submitted",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Notice" },
							},
						},
					},
					"400": {
						description: "Notice must be generated before submission",
					},
				},
			},
		},
		"/api/v1/notices/{id}/acknowledge": {
			post: {
				tags: ["Notices"],
				summary: "Record SAT acknowledgment",
				description:
					"Mark a SUBMITTED notice as acknowledged by SAT with the folio number.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["satFolioNumber"],
								properties: {
									satFolioNumber: {
										type: "string",
										minLength: 1,
										maxLength: 100,
									},
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Acknowledgment recorded",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Notice" },
							},
						},
					},
					"400": {
						description: "Notice must be submitted before acknowledgment",
					},
				},
			},
		},
		"/api/v1/imports": {
			get: {
				tags: ["Imports"],
				summary: "List imports",
				description: "Returns a paginated list of imports for the organization",
				parameters: [
					{
						name: "page",
						in: "query",
						schema: { type: "integer", minimum: 1, default: 1 },
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
					},
					{
						name: "status",
						in: "query",
						schema: { $ref: "#/components/schemas/ImportStatus" },
					},
					{
						name: "entityType",
						in: "query",
						schema: { $ref: "#/components/schemas/ImportEntityType" },
					},
				],
				responses: {
					"200": {
						description: "List of imports",
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["data", "total", "page", "limit", "totalPages"],
									properties: {
										data: {
											type: "array",
											items: { $ref: "#/components/schemas/Import" },
										},
										total: { type: "integer" },
										page: { type: "integer" },
										limit: { type: "integer" },
										totalPages: { type: "integer" },
									},
								},
							},
						},
					},
				},
			},
			post: {
				tags: ["Imports"],
				summary: "Create import",
				description:
					"Upload a CSV or Excel file to create a new import job. The file will be processed asynchronously.",
				requestBody: {
					required: true,
					content: {
						"multipart/form-data": {
							schema: {
								type: "object",
								required: ["file", "entityType"],
								properties: {
									file: {
										type: "string",
										format: "binary",
										description:
											"CSV or Excel file (.csv, .xls, .xlsx). Maximum 50MB.",
									},
									entityType: {
										type: "string",
										enum: ["CLIENT", "TRANSACTION"],
										description: "Type of entities in the file",
									},
								},
							},
						},
					},
				},
				responses: {
					"201": {
						description: "Import created and queued for processing",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										success: { type: "boolean", example: true },
										data: { $ref: "#/components/schemas/Import" },
									},
								},
							},
						},
					},
					"400": {
						description: "Invalid file type or missing required fields",
					},
				},
			},
		},
		"/api/v1/imports/templates/{entityType}": {
			get: {
				tags: ["Imports"],
				summary: "Download import template",
				description:
					"Download a CSV template with example data for the specified entity type. This endpoint is public and does not require authentication.",
				security: [], // Public endpoint - no auth required
				parameters: [
					{
						name: "entityType",
						in: "path",
						required: true,
						schema: {
							type: "string",
							enum: ["client", "transaction"],
						},
						description: "Entity type (case-insensitive)",
					},
				],
				responses: {
					"200": {
						description: "CSV template file",
						content: {
							"text/csv": {
								schema: {
									type: "string",
									format: "binary",
								},
							},
						},
					},
					"400": {
						description: "Invalid entity type",
					},
				},
			},
		},
		"/api/v1/imports/{id}": {
			get: {
				tags: ["Imports"],
				summary: "Get import details",
				description: "Returns import details including paginated row results",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
					{
						name: "rowPage",
						in: "query",
						schema: { type: "integer", minimum: 1, default: 1 },
						description: "Page number for row results",
					},
					{
						name: "rowLimit",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
						description: "Number of row results per page",
					},
					{
						name: "rowStatus",
						in: "query",
						schema: { $ref: "#/components/schemas/ImportRowStatus" },
						description: "Filter row results by status",
					},
				],
				responses: {
					"200": {
						description: "Import details with row results",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ImportWithRows" },
							},
						},
					},
					"404": {
						description: "Import not found",
					},
				},
			},
			delete: {
				tags: ["Imports"],
				summary: "Delete import",
				description: "Delete an import and all its row results",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"204": {
						description: "Import deleted",
					},
					"404": {
						description: "Import not found",
					},
				},
			},
		},
		"/api/v1/imports/{id}/rows": {
			get: {
				tags: ["Imports"],
				summary: "Get import row results",
				description: "Returns paginated row results for an import",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
					{
						name: "page",
						in: "query",
						schema: { type: "integer", minimum: 1, default: 1 },
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
					},
					{
						name: "status",
						in: "query",
						schema: { $ref: "#/components/schemas/ImportRowStatus" },
						description: "Filter by row status",
					},
				],
				responses: {
					"200": {
						description: "Paginated row results",
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["data", "total", "page", "limit", "totalPages"],
									properties: {
										data: {
											type: "array",
											items: { $ref: "#/components/schemas/ImportRowResult" },
										},
										total: { type: "integer" },
										page: { type: "integer" },
										limit: { type: "integer" },
										totalPages: { type: "integer" },
									},
								},
							},
						},
					},
					"404": {
						description: "Import not found",
					},
				},
			},
		},
		"/api/v1/imports/{id}/events": {
			get: {
				tags: ["Imports"],
				summary: "Subscribe to import events (SSE)",
				description:
					"Server-Sent Events stream for real-time import progress updates. Events include: connected, row_update, status_change, completed, ping.",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"200": {
						description: "SSE stream",
						content: {
							"text/event-stream": {
								schema: {
									type: "string",
									description:
										"Server-Sent Events stream with import progress updates",
								},
							},
						},
					},
					"404": {
						description: "Import not found",
					},
				},
			},
		},
	},
	components: {
		schemas: {
			PersonType: {
				type: "string",
				enum: ["physical", "moral", "trust"],
				description: "Discriminator for the client type",
			},
			TransactionOperationType: {
				type: "string",
				enum: ["purchase", "sale"],
				description: "Supported transaction operation types.",
			},
			TransactionVehicleType: {
				type: "string",
				enum: ["land", "marine", "air"],
				description: "Supported transaction vehicle types.",
			},
			Client: {
				type: "object",
				required: [
					"id",
					"personType",
					"rfc",
					"email",
					"phone",
					"country",
					"stateCode",
					"city",
					"municipality",
					"neighborhood",
					"street",
					"externalNumber",
					"postalCode",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "Unique identifier (UUID or deterministic ID)",
					},
					personType: { $ref: "#/components/schemas/PersonType" },
					firstName: { type: "string", nullable: true },
					lastName: { type: "string", nullable: true },
					secondLastName: { type: "string", nullable: true },
					birthDate: { type: "string", format: "date-time", nullable: true },
					curp: { type: "string", nullable: true },
					businessName: { type: "string", nullable: true },
					incorporationDate: {
						type: "string",
						format: "date-time",
						nullable: true,
					},
					rfc: {
						type: "string",
						description:
							"RFC (Registro Federal de Contribuyentes). 13 characters for physical persons, 12 characters for legal entities (moral/trust). Cannot be changed after creation.",
					},
					nationality: { type: "string", nullable: true },
					email: { type: "string", format: "email" },
					phone: { type: "string" },
					country: { type: "string" },
					stateCode: { type: "string" },
					city: { type: "string" },
					municipality: { type: "string" },
					neighborhood: { type: "string" },
					street: { type: "string" },
					externalNumber: { type: "string" },
					internalNumber: { type: "string", nullable: true },
					postalCode: { type: "string" },
					reference: { type: "string", nullable: true },
					notes: { type: "string", nullable: true },
					countryCode: {
						type: "string",
						nullable: true,
						description:
							"Reference to countries catalog (metadata.code) for XML generation",
					},
					economicActivityCode: {
						type: "string",
						nullable: true,
						description:
							"Reference to economic activity catalog (7-digit code) for XML generation",
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
					deletedAt: { type: "string", format: "date-time", nullable: true },
				},
			},
			ClientCreateRequest: {
				oneOf: [
					{ $ref: "#/components/schemas/ClientPhysicalInput" },
					{ $ref: "#/components/schemas/ClientMoralInput" },
					{ $ref: "#/components/schemas/ClientTrustInput" },
				],
			},
			ClientPhysicalInput: {
				type: "object",
				required: [
					"personType",
					"firstName",
					"lastName",
					"birthDate",
					"curp",
					"rfc",
					"email",
					"phone",
					"country",
					"stateCode",
					"city",
					"municipality",
					"neighborhood",
					"street",
					"externalNumber",
					"postalCode",
				],
				properties: {
					personType: { const: "physical" },
					firstName: { type: "string" },
					lastName: { type: "string" },
					secondLastName: { type: "string", nullable: true },
					birthDate: { type: "string", format: "date" },
					curp: { type: "string" },
					rfc: {
						type: "string",
						pattern: "^[A-ZÑ&]{4}\\d{6}[A-Z0-9]{3}$",
						minLength: 13,
						maxLength: 13,
						description:
							"RFC for physical persons - must be exactly 13 characters",
					},
					nationality: { type: "string" },
					email: { type: "string", format: "email" },
					phone: { type: "string" },
					country: { type: "string" },
					stateCode: { type: "string" },
					city: { type: "string" },
					municipality: { type: "string" },
					neighborhood: { type: "string" },
					street: { type: "string" },
					externalNumber: { type: "string" },
					internalNumber: { type: "string", nullable: true },
					postalCode: { type: "string" },
					reference: { type: "string", nullable: true },
					notes: { type: "string", nullable: true },
				},
			},
			ClientMoralInput: {
				type: "object",
				required: [
					"personType",
					"businessName",
					"incorporationDate",
					"rfc",
					"email",
					"phone",
					"country",
					"stateCode",
					"city",
					"municipality",
					"neighborhood",
					"street",
					"externalNumber",
					"postalCode",
				],
				properties: {
					personType: { const: "moral" },
					businessName: { type: "string" },
					incorporationDate: { type: "string", format: "date-time" },
					rfc: {
						type: "string",
						pattern: "^[A-ZÑ&]{3}\\d{6}[A-Z0-9]{3}$",
						minLength: 12,
						maxLength: 12,
						description:
							"RFC for legal entities (moral) - must be exactly 12 characters",
					},
					nationality: { type: "string" },
					email: { type: "string", format: "email" },
					phone: { type: "string" },
					country: { type: "string" },
					stateCode: { type: "string" },
					city: { type: "string" },
					municipality: { type: "string" },
					neighborhood: { type: "string" },
					street: { type: "string" },
					externalNumber: { type: "string" },
					internalNumber: { type: "string", nullable: true },
					postalCode: { type: "string" },
					reference: { type: "string", nullable: true },
					notes: { type: "string", nullable: true },
				},
			},
			ClientTrustInput: {
				type: "object",
				required: [
					"personType",
					"businessName",
					"incorporationDate",
					"rfc",
					"email",
					"phone",
					"country",
					"stateCode",
					"city",
					"municipality",
					"neighborhood",
					"street",
					"externalNumber",
					"postalCode",
				],
				properties: {
					personType: { const: "trust" },
					businessName: { type: "string" },
					incorporationDate: { type: "string", format: "date-time" },
					rfc: {
						type: "string",
						pattern: "^[A-ZÑ&]{3}\\d{6}[A-Z0-9]{3}$",
						minLength: 12,
						maxLength: 12,
						description: "RFC for trusts - must be exactly 12 characters",
					},
					nationality: { type: "string" },
					email: { type: "string", format: "email" },
					phone: { type: "string" },
					country: { type: "string" },
					stateCode: { type: "string" },
					city: { type: "string" },
					municipality: { type: "string" },
					neighborhood: { type: "string" },
					street: { type: "string" },
					externalNumber: { type: "string" },
					internalNumber: { type: "string", nullable: true },
					postalCode: { type: "string" },
					reference: { type: "string", nullable: true },
					notes: { type: "string", nullable: true },
					countryCode: {
						type: "string",
						nullable: true,
						description:
							"Reference to countries catalog (metadata.code) for XML generation",
					},
					economicActivityCode: {
						type: "string",
						nullable: true,
						description:
							"Reference to economic activity catalog (7-digit code) for XML generation",
					},
				},
			},
			ClientPatchRequest: {
				type: "object",
				additionalProperties: false,
				properties: {
					personType: { $ref: "#/components/schemas/PersonType" },
					firstName: { type: "string", nullable: true },
					lastName: { type: "string", nullable: true },
					secondLastName: { type: "string", nullable: true },
					birthDate: { type: "string", format: "date", nullable: true },
					curp: { type: "string", nullable: true },
					businessName: { type: "string", nullable: true },
					incorporationDate: {
						type: "string",
						format: "date-time",
						nullable: true,
					},
					// RFC is intentionally omitted - it cannot be changed after creation
					nationality: { type: "string" },
					email: { type: "string", format: "email" },
					phone: { type: "string" },
					country: { type: "string" },
					stateCode: { type: "string" },
					city: { type: "string" },
					municipality: { type: "string" },
					neighborhood: { type: "string" },
					street: { type: "string" },
					externalNumber: { type: "string" },
					internalNumber: { type: "string", nullable: true },
					postalCode: { type: "string" },
					reference: { type: "string", nullable: true },
					notes: { type: "string", nullable: true },
					countryCode: {
						type: "string",
						nullable: true,
						description:
							"Reference to countries catalog (metadata.code) for XML generation",
					},
					economicActivityCode: {
						type: "string",
						nullable: true,
						description:
							"Reference to economic activity catalog (7-digit code) for XML generation",
					},
				},
			},
			ClientDocument: {
				type: "object",
				required: [
					"id",
					"clientId",
					"documentType",
					"documentNumber",
					"status",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "Unique identifier (UUID or deterministic ID)",
					},
					clientId: {
						type: "string",
						description: "FK to the owning client",
					},
					documentType: {
						type: "string",
						enum: [
							"PASSPORT",
							"NATIONAL_ID",
							"DRIVERS_LICENSE",
							"TAX_ID",
							"PROOF_OF_ADDRESS",
							"OTHER",
						],
					},
					documentNumber: { type: "string" },
					issuingCountry: { type: "string", nullable: true },
					issueDate: { type: "string", format: "date-time", nullable: true },
					expiryDate: { type: "string", format: "date-time", nullable: true },
					status: {
						type: "string",
						enum: ["PENDING", "VERIFIED", "REJECTED", "EXPIRED"],
					},
					fileUrl: { type: "string", nullable: true },
					metadata: {
						type: "object",
						nullable: true,
						additionalProperties: true,
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			ClientDocumentCreateRequest: {
				type: "object",
				required: ["documentType", "documentNumber"],
				properties: {
					documentType: {
						type: "string",
						enum: [
							"PASSPORT",
							"NATIONAL_ID",
							"DRIVERS_LICENSE",
							"TAX_ID",
							"PROOF_OF_ADDRESS",
							"OTHER",
						],
					},
					documentNumber: { type: "string" },
					issuingCountry: { type: "string" },
					issueDate: { type: "string", format: "date-time" },
					expiryDate: { type: "string", format: "date-time" },
					status: {
						type: "string",
						enum: ["PENDING", "VERIFIED", "REJECTED", "EXPIRED"],
					},
					fileUrl: { type: "string" },
					metadata: { type: "object", additionalProperties: true },
				},
			},
			ClientDocumentPatchRequest: {
				type: "object",
				properties: {
					documentType: {
						type: "string",
						enum: [
							"PASSPORT",
							"NATIONAL_ID",
							"DRIVERS_LICENSE",
							"TAX_ID",
							"PROOF_OF_ADDRESS",
							"OTHER",
						],
					},
					documentNumber: { type: "string" },
					issuingCountry: { type: "string" },
					issueDate: { type: "string", format: "date-time" },
					expiryDate: { type: "string", format: "date-time" },
					status: {
						type: "string",
						enum: ["PENDING", "VERIFIED", "REJECTED", "EXPIRED"],
					},
					fileUrl: { type: "string" },
					metadata: { type: "object", additionalProperties: true },
				},
			},
			ClientAddress: {
				type: "object",
				required: [
					"id",
					"clientId",
					"addressType",
					"street1",
					"city",
					"country",
					"isPrimary",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "Unique identifier (UUID or deterministic ID)",
					},
					clientId: {
						type: "string",
						description: "FK to the owning client",
					},
					addressType: {
						type: "string",
						enum: ["RESIDENTIAL", "BUSINESS", "MAILING", "OTHER"],
					},
					street1: { type: "string" },
					street2: { type: "string", nullable: true },
					city: { type: "string" },
					state: { type: "string", nullable: true },
					postalCode: { type: "string", nullable: true },
					country: { type: "string" },
					isPrimary: { type: "boolean" },
					verifiedAt: { type: "string", format: "date-time", nullable: true },
					reference: { type: "string", nullable: true },
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			ClientAddressCreateRequest: {
				type: "object",
				required: ["street1", "city", "country"],
				properties: {
					addressType: {
						type: "string",
						enum: ["RESIDENTIAL", "BUSINESS", "MAILING", "OTHER"],
					},
					street1: { type: "string" },
					street2: { type: "string", nullable: true },
					city: { type: "string" },
					state: { type: "string", nullable: true },
					postalCode: { type: "string", nullable: true },
					country: { type: "string" },
					isPrimary: { type: "boolean" },
					verifiedAt: { type: "string", format: "date-time", nullable: true },
					reference: { type: "string", nullable: true },
				},
			},
			ClientAddressPatchRequest: {
				type: "object",
				properties: {
					addressType: {
						type: "string",
						enum: ["RESIDENTIAL", "BUSINESS", "MAILING", "OTHER"],
					},
					street1: { type: "string" },
					street2: { type: "string", nullable: true },
					city: { type: "string" },
					state: { type: "string", nullable: true },
					postalCode: { type: "string", nullable: true },
					country: { type: "string" },
					isPrimary: { type: "boolean" },
					verifiedAt: { type: "string", format: "date-time", nullable: true },
					reference: { type: "string", nullable: true },
				},
			},
			CatalogItem: {
				type: "object",
				required: [
					"id",
					"catalogId",
					"name",
					"normalizedName",
					"active",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description:
							"Unique identifier for the catalog item (UUID or deterministic ID)",
					},
					catalogId: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "Identifier of the owning catalog",
					},
					name: {
						type: "string",
						description: "Display name shown to end users",
					},
					normalizedName: {
						type: "string",
						description:
							"Lowercased and accent-free version used for search and ordering",
					},
					active: {
						type: "boolean",
						description: "Indicates if the item is available for selection",
					},
					metadata: {
						type: "object",
						nullable: true,
						additionalProperties: true,
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			EnrichedCatalogItem: {
				type: "object",
				description:
					"Catalog item with additional catalogKey field, used when enriching entities with catalog data",
				required: [
					"id",
					"catalogId",
					"name",
					"normalizedName",
					"active",
					"catalogKey",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description:
							"Unique identifier for the catalog item (UUID or deterministic ID)",
					},
					catalogId: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "Identifier of the owning catalog",
					},
					name: {
						type: "string",
						description: "Display name shown to end users",
					},
					normalizedName: {
						type: "string",
						description:
							"Lowercased and accent-free version used for search and ordering",
					},
					active: {
						type: "boolean",
						description: "Indicates if the item is available for selection",
					},
					metadata: {
						type: "object",
						nullable: true,
						additionalProperties: true,
						description:
							"Custom metadata for the catalog item (e.g., code, originCountry, etc.)",
					},
					catalogKey: {
						type: "string",
						description:
							"The key of the catalog this item belongs to (e.g., 'terrestrial-vehicle-brands')",
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			CatalogPagination: {
				type: "object",
				required: ["page", "pageSize", "total", "totalPages"],
				properties: {
					page: { type: "integer", minimum: 1 },
					pageSize: { type: "integer", minimum: 1, maximum: 100 },
					total: { type: "integer", minimum: 0 },
					totalPages: { type: "integer", minimum: 0 },
				},
			},
			CatalogListResponse: {
				type: "object",
				required: ["catalog", "data", "pagination"],
				properties: {
					catalog: {
						type: "object",
						required: ["id", "key", "name", "allowNewItems"],
						properties: {
							id: {
								type: "string",
								pattern: "^[A-Za-z0-9-]{1,64}$",
								description: "Catalog identifier",
							},
							key: {
								type: "string",
								description:
									"Catalog key used in the endpoint path (e.g., `car-brands`)",
							},
							name: {
								type: "string",
								description: "Human readable catalog name",
							},
							allowNewItems: {
								type: "boolean",
								description:
									"When true, users can add new items to this catalog dynamically",
							},
						},
					},
					data: {
						type: "array",
						items: { $ref: "#/components/schemas/CatalogItem" },
					},
					pagination: { $ref: "#/components/schemas/CatalogPagination" },
				},
			},
			CatalogItemCreateRequest: {
				type: "object",
				required: ["name"],
				properties: {
					name: {
						type: "string",
						minLength: 1,
						maxLength: 200,
						description: "The name of the new catalog item",
					},
				},
			},
			PaymentMethod: {
				type: "object",
				required: ["id", "method", "amount", "createdAt", "updatedAt"],
				properties: {
					id: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "Payment method identifier.",
					},
					method: {
						type: "string",
						minLength: 2,
						maxLength: 80,
						description:
							"Payment method name (e.g., 'cash', 'transfer', 'wire').",
					},
					amount: {
						type: "string",
						description:
							'Payment amount for this method, stored as string to preserve precision (e.g., "1500000.50").',
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			Transaction: {
				type: "object",
				required: [
					"id",
					"clientId",
					"operationDate",
					"operationType",
					"branchPostalCode",
					"vehicleType",
					"brand",
					"model",
					"year",
					"amount",
					"currency",
					"paymentMethods",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "Transaction identifier.",
					},
					clientId: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "Client identifier.",
					},
					operationDate: { type: "string", format: "date" },
					operationType: {
						$ref: "#/components/schemas/TransactionOperationType",
					},
					branchPostalCode: {
						type: "string",
						pattern: "^\\d{4,10}$",
					},
					vehicleType: { $ref: "#/components/schemas/TransactionVehicleType" },
					brand: {
						type: "string",
						minLength: 1,
						maxLength: 120,
						description: "Vehicle brand name.",
					},
					model: { type: "string" },
					year: { type: "integer" },
					armorLevel: { type: "string", nullable: true },
					engineNumber: { type: "string", nullable: true },
					plates: { type: "string", nullable: true },
					registrationNumber: { type: "string", nullable: true },
					flagCountryId: { type: "string", nullable: true },
					amount: { type: "string" },
					currency: { type: "string" },
					operationTypeCode: {
						type: "string",
						nullable: true,
						description:
							"Reference to veh-operation-types catalog (metadata.code, e.g., '802') for XML generation",
					},
					currencyCode: {
						type: "string",
						nullable: true,
						description:
							"Reference to currencies catalog (metadata.code, e.g., '3' for MXN) for XML generation",
					},
					umaValue: {
						type: "string",
						nullable: true,
						description:
							"Calculated UMA value: amount / umaDailyValue for the transaction date (automatically calculated)",
					},
					paymentMethods: {
						type: "array",
						items: { $ref: "#/components/schemas/PaymentMethod" },
						description:
							"Array of payment methods used for this transaction. The sum of amounts must equal the transaction amount.",
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
					deletedAt: { type: "string", format: "date-time", nullable: true },
					brandCatalog: {
						allOf: [{ $ref: "#/components/schemas/EnrichedCatalogItem" }],
						nullable: true,
						description:
							"Enriched catalog item for the vehicle brand, including full metadata",
					},
					flagCountryCatalog: {
						allOf: [{ $ref: "#/components/schemas/EnrichedCatalogItem" }],
						nullable: true,
						description:
							"Enriched catalog item for the flag country (for marine/air vehicles)",
					},
					operationTypeCatalog: {
						allOf: [{ $ref: "#/components/schemas/EnrichedCatalogItem" }],
						nullable: true,
						description:
							"Enriched catalog item for the operation type (looked up by operationTypeCode)",
					},
					currencyCatalog: {
						allOf: [{ $ref: "#/components/schemas/EnrichedCatalogItem" }],
						nullable: true,
						description:
							"Enriched catalog item for the currency (looked up by currencyCode)",
					},
				},
			},
			PaymentMethodInput: {
				type: "object",
				required: ["method", "amount"],
				properties: {
					method: {
						type: "string",
						minLength: 2,
						maxLength: 80,
						description:
							"Payment method name (e.g., 'cash', 'transfer', 'wire').",
					},
					amount: {
						type: "string",
						description:
							'Payment amount for this method, stored as string to preserve precision (e.g., "1500000.50").',
					},
				},
			},
			TransactionCreateRequest: {
				type: "object",
				required: [
					"clientId",
					"operationDate",
					"operationType",
					"branchPostalCode",
					"vehicleType",
					"brand",
					"model",
					"year",
					"amount",
					"currency",
					"paymentMethods",
				],
				properties: {
					clientId: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
					},
					operationDate: { type: "string", format: "date" },
					operationType: {
						$ref: "#/components/schemas/TransactionOperationType",
					},
					branchPostalCode: {
						type: "string",
						pattern: "^\\d{4,10}$",
					},
					vehicleType: { $ref: "#/components/schemas/TransactionVehicleType" },
					brand: {
						type: "string",
						minLength: 1,
						maxLength: 120,
						description: "Vehicle brand name.",
					},
					model: { type: "string" },
					year: { type: "integer", minimum: 1900, maximum: 2100 },
					armorLevel: { type: "string", nullable: true },
					engineNumber: { type: "string", nullable: true },
					plates: { type: "string", nullable: true },
					registrationNumber: { type: "string", nullable: true },
					flagCountryId: { type: "string", nullable: true },
					amount: {
						type: "string",
						description:
							'Total transaction amount, stored as a string to preserve precision (e.g., "3500000.75").',
					},
					currency: {
						type: "string",
						minLength: 3,
						maxLength: 3,
						description: "ISO 4217 currency code.",
					},
					operationTypeCode: {
						type: "string",
						nullable: true,
						description:
							"Reference to veh-operation-types catalog (metadata.code, e.g., '802') for XML generation",
					},
					currencyCode: {
						type: "string",
						nullable: true,
						description:
							"Reference to currencies catalog (metadata.code, e.g., '3' for MXN) for XML generation",
					},
					paymentMethods: {
						type: "array",
						items: { $ref: "#/components/schemas/PaymentMethodInput" },
						minItems: 1,
						description:
							"Array of payment methods. The sum of payment method amounts must equal the transaction amount.",
					},
				},
			},
			TransactionUpdateRequest: {
				type: "object",
				required: [
					"operationDate",
					"operationType",
					"branchPostalCode",
					"vehicleType",
					"brand",
					"model",
					"year",
					"amount",
					"currency",
					"paymentMethods",
				],
				properties: {
					operationDate: { type: "string", format: "date" },
					operationType: {
						$ref: "#/components/schemas/TransactionOperationType",
					},
					branchPostalCode: {
						type: "string",
						pattern: "^\\d{4,10}$",
					},
					vehicleType: { $ref: "#/components/schemas/TransactionVehicleType" },
					brand: {
						type: "string",
						minLength: 1,
						maxLength: 120,
						description: "Vehicle brand name.",
					},
					model: { type: "string" },
					year: { type: "integer", minimum: 1900, maximum: 2100 },
					armorLevel: { type: "string", nullable: true },
					engineNumber: { type: "string", nullable: true },
					plates: { type: "string", nullable: true },
					registrationNumber: { type: "string", nullable: true },
					flagCountryId: { type: "string", nullable: true },
					amount: {
						type: "string",
						description:
							'Total transaction amount, stored as a string to preserve precision (e.g., "3500000.75").',
					},
					currency: {
						type: "string",
						minLength: 3,
						maxLength: 3,
						description: "ISO 4217 currency code.",
					},
					operationTypeCode: {
						type: "string",
						nullable: true,
						description:
							"Reference to veh-operation-types catalog (metadata.code, e.g., '802') for XML generation",
					},
					currencyCode: {
						type: "string",
						nullable: true,
						description:
							"Reference to currencies catalog (metadata.code, e.g., '3' for MXN) for XML generation",
					},
					paymentMethods: {
						type: "array",
						items: { $ref: "#/components/schemas/PaymentMethodInput" },
						minItems: 1,
						description:
							"Array of payment methods. The sum of payment method amounts must equal the transaction amount.",
					},
				},
			},
			TransactionPagination: {
				type: "object",
				required: ["page", "limit", "total", "totalPages"],
				properties: {
					page: { type: "integer", minimum: 1 },
					limit: { type: "integer", minimum: 1, maximum: 100 },
					total: { type: "integer", minimum: 0 },
					totalPages: { type: "integer", minimum: 0 },
				},
			},
			TransactionListResponse: {
				type: "object",
				required: ["data", "pagination"],
				properties: {
					data: {
						type: "array",
						items: { $ref: "#/components/schemas/Transaction" },
					},
					pagination: { $ref: "#/components/schemas/TransactionPagination" },
				},
			},
			Pagination: {
				type: "object",
				properties: {
					page: { type: "integer" },
					limit: { type: "integer" },
					total: { type: "integer" },
					totalPages: { type: "integer" },
				},
			},
			ClientStats: {
				type: "object",
				required: ["totalClients", "physicalClients", "moralClients"],
				properties: {
					totalClients: {
						type: "integer",
						description: "Total number of active clients",
						example: 150,
					},
					physicalClients: {
						type: "integer",
						description: "Number of individual/physical person clients",
						example: 100,
					},
					moralClients: {
						type: "integer",
						description: "Number of legal entity/moral person clients",
						example: 50,
					},
				},
			},
			TransactionStats: {
				type: "object",
				required: [
					"transactionsToday",
					"suspiciousTransactions",
					"totalVolume",
					"totalVehicles",
				],
				properties: {
					transactionsToday: {
						type: "integer",
						description: "Number of transactions created today",
						example: 25,
					},
					suspiciousTransactions: {
						type: "integer",
						description:
							"Number of alerts with DETECTED or FILE_GENERATED status",
						example: 3,
					},
					totalVolume: {
						type: "string",
						description:
							"Total sum of all transaction amounts (string to preserve precision)",
						example: "15000000.50",
					},
					totalVehicles: {
						type: "integer",
						description: "Number of unique vehicles (brand + model + year)",
						example: 120,
					},
				},
			},
			Error: {
				type: "object",
				required: ["error", "message"],
				properties: {
					error: { type: "string" },
					message: { type: "string" },
					details: { type: "object" },
				},
			},
			AlertSeverity: {
				type: "string",
				enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
				description: "Alert severity levels",
			},
			AlertStatus: {
				type: "string",
				enum: [
					"DETECTED",
					"FILE_GENERATED",
					"SUBMITTED",
					"OVERDUE",
					"CANCELLED",
				],
				description:
					"Alert status: DETECTED (alert detected, awaiting file generation), FILE_GENERATED (file generated for SAT submission), SUBMITTED (successfully submitted to SAT with acknowledgment), OVERDUE (submission deadline has passed - worst case, penalties may apply), CANCELLED (alert was cancelled/dismissed)",
			},
			AlertRule: {
				type: "object",
				required: [
					"id",
					"name",
					"active",
					"severity",
					"isManualOnly",
					"activityCode",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: {
						type: "string",
						pattern: "^[A-Za-z0-9-_]{1,64}$",
						description:
							"Alert rule identifier/code (e.g., '2501', 'AUTO_UMA')",
					},
					name: { type: "string", minLength: 1, maxLength: 200 },
					description: { type: "string", maxLength: 1000, nullable: true },
					active: { type: "boolean" },
					severity: { $ref: "#/components/schemas/AlertSeverity" },
					ruleType: {
						type: "string",
						maxLength: 100,
						nullable: true,
						description:
							"Matches seeker's ruleType (null for manual-only rules)",
					},
					isManualOnly: {
						type: "boolean",
						description: "True if this rule can only be triggered manually",
					},
					activityCode: {
						type: "string",
						maxLength: 10,
						description: "Vulnerable activity code: VEH, JYS, INM, JOY, ART",
					},
					metadata: {
						type: "object",
						nullable: true,
						description:
							"Additional metadata as JSON (legal basis, category, etc.)",
						additionalProperties: true,
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			AlertRuleConfig: {
				type: "object",
				required: ["id", "alertRuleId", "key", "value", "isHardcoded"],
				properties: {
					id: { type: "string" },
					alertRuleId: { type: "string" },
					key: { type: "string", maxLength: 100 },
					value: { type: "string", description: "JSON string value" },
					isHardcoded: {
						type: "boolean",
						description: "True if this config cannot be updated via API",
					},
					description: { type: "string", maxLength: 500, nullable: true },
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			AlertRuleCreateRequest: {
				type: "object",
				required: ["name", "severity"],
				properties: {
					id: {
						type: "string",
						maxLength: 64,
						description: "Alert code (e.g., '2501', 'AUTO_UMA')",
					},
					name: { type: "string", minLength: 1, maxLength: 200 },
					description: { type: "string", maxLength: 1000, nullable: true },
					active: { type: "boolean", default: true },
					severity: {
						$ref: "#/components/schemas/AlertSeverity",
						default: "MEDIUM",
					},
					ruleType: { type: "string", maxLength: 100, nullable: true },
					isManualOnly: { type: "boolean", default: false },
					activityCode: { type: "string", maxLength: 10, default: "VEH" },
					metadata: {
						type: "object",
						nullable: true,
						additionalProperties: true,
					},
				},
			},
			AlertRulePatchRequest: {
				type: "object",
				properties: {
					name: { type: "string", minLength: 1, maxLength: 200 },
					description: { type: "string", maxLength: 1000, nullable: true },
					active: { type: "boolean" },
					severity: { $ref: "#/components/schemas/AlertSeverity" },
					ruleType: { type: "string", maxLength: 100, nullable: true },
					isManualOnly: { type: "boolean" },
					activityCode: { type: "string", maxLength: 10 },
					metadata: {
						type: "object",
						nullable: true,
						additionalProperties: true,
					},
				},
			},
			AlertRuleConfigCreateRequest: {
				type: "object",
				required: ["key", "value"],
				properties: {
					key: { type: "string", minLength: 1, maxLength: 100 },
					value: { type: "string", description: "JSON string value" },
					isHardcoded: { type: "boolean", default: false },
					description: { type: "string", maxLength: 500, nullable: true },
				},
			},
			AlertRuleConfigUpdateRequest: {
				type: "object",
				properties: {
					value: { type: "string" },
					description: { type: "string", maxLength: 500, nullable: true },
				},
			},
			Alert: {
				type: "object",
				required: [
					"id",
					"alertRuleId",
					"clientId",
					"status",
					"severity",
					"idempotencyKey",
					"contextHash",
					"metadata",
					"isManual",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "Alert identifier",
					},
					alertRuleId: {
						type: "string",
						description:
							"Reference to the alert rule that triggered this alert",
					},
					clientId: {
						type: "string",
						description: "Client ID for which this alert was generated",
					},
					status: { $ref: "#/components/schemas/AlertStatus" },
					severity: { $ref: "#/components/schemas/AlertSeverity" },
					idempotencyKey: {
						type: "string",
						maxLength: 255,
						description:
							"Unique key ensuring idempotent alert creation. Hash of (clientId + alertRuleId + contextHash)",
					},
					contextHash: {
						type: "string",
						maxLength: 255,
						description:
							"Hash of the specific data that triggered this alert (transaction IDs, amounts, dates, etc.)",
					},
					metadata: {
						type: "object",
						description:
							"Alert-specific data stored as JSON (transaction IDs, amounts, dates, etc.)",
						additionalProperties: true,
					},
					transactionId: {
						type: "string",
						nullable: true,
						description:
							"Optional reference to the transaction that triggered the alert",
					},
					isManual: {
						type: "boolean",
						description: "True if the alert was manually created",
					},
					submissionDeadline: {
						type: "string",
						format: "date-time",
						nullable: true,
						description:
							"Deadline for SAT submission (day 17 of following month for avisos, 24h for suspicion avisos)",
					},
					fileGeneratedAt: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "When the SAT file was generated",
					},
					submittedAt: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "When submitted to SAT",
					},
					satAcknowledgmentReceipt: {
						type: "string",
						maxLength: 500,
						nullable: true,
						description:
							"File URL or reference to SAT acknowledgment (PDF/XML)",
					},
					satFolioNumber: {
						type: "string",
						maxLength: 100,
						nullable: true,
						description: "Folio number from SAT acknowledgment",
					},
					isOverdue: {
						type: "boolean",
						description:
							"Computed: true if submissionDeadline has passed and status != SUBMITTED",
					},
					notes: { type: "string", maxLength: 1000, nullable: true },
					reviewedAt: { type: "string", format: "date-time", nullable: true },
					reviewedBy: { type: "string", maxLength: 100, nullable: true },
					cancelledAt: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "When the alert was cancelled",
					},
					cancelledBy: {
						type: "string",
						maxLength: 100,
						nullable: true,
						description: "User who cancelled the alert",
					},
					cancellationReason: {
						type: "string",
						maxLength: 1000,
						nullable: true,
						description: "Reason for cancellation",
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
					alertRule: {
						$ref: "#/components/schemas/AlertRule",
						nullable: true,
						description:
							"Alert rule details (included when fetching alert with relations)",
					},
				},
			},
			AlertCreateRequest: {
				type: "object",
				required: [
					"alertRuleId",
					"clientId",
					"severity",
					"idempotencyKey",
					"contextHash",
					"metadata",
				],
				properties: {
					alertRuleId: { type: "string" },
					clientId: { type: "string" },
					severity: { $ref: "#/components/schemas/AlertSeverity" },
					idempotencyKey: {
						type: "string",
						minLength: 1,
						maxLength: 255,
						description:
							"Unique key ensuring idempotent alert creation. Must be hash of (clientId + alertRuleId + contextHash)",
					},
					contextHash: {
						type: "string",
						minLength: 1,
						maxLength: 255,
						description:
							"Hash of the specific data that triggered this alert (transaction IDs, amounts, dates, etc.)",
					},
					metadata: {
						type: "object",
						description:
							"Alert-specific data stored as JSON (transaction IDs, amounts, dates, etc.)",
						additionalProperties: true,
					},
					transactionId: { type: "string", nullable: true },
					isManual: {
						type: "boolean",
						default: false,
						description: "True if manually created",
					},
					submissionDeadline: {
						type: "string",
						format: "date-time",
						nullable: true,
						description:
							"Deadline for SAT submission (will be calculated based on alert type if not provided)",
					},
					notes: { type: "string", maxLength: 1000, nullable: true },
				},
			},
			AlertUpdateRequest: {
				type: "object",
				required: ["status"],
				properties: {
					status: { $ref: "#/components/schemas/AlertStatus" },
					notes: { type: "string", maxLength: 1000, nullable: true },
					reviewedBy: { type: "string", maxLength: 100, nullable: true },
					fileGeneratedAt: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "When the SAT file was generated",
					},
					submittedAt: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "When submitted to SAT",
					},
					satAcknowledgmentReceipt: {
						type: "string",
						maxLength: 500,
						nullable: true,
						description: "File URL or reference to SAT acknowledgment",
					},
					satFolioNumber: {
						type: "string",
						maxLength: 100,
						nullable: true,
						description: "Folio number from SAT acknowledgment",
					},
					cancelledBy: {
						type: "string",
						maxLength: 100,
						nullable: true,
						description: "User who cancelled the alert",
					},
					cancellationReason: {
						type: "string",
						maxLength: 1000,
						nullable: true,
						description: "Reason for cancellation",
					},
				},
			},
			AlertPatchRequest: {
				type: "object",
				properties: {
					status: { $ref: "#/components/schemas/AlertStatus" },
					notes: { type: "string", maxLength: 1000, nullable: true },
					reviewedBy: { type: "string", maxLength: 100, nullable: true },
					fileGeneratedAt: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "When the SAT file was generated",
					},
					submittedAt: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "When submitted to SAT",
					},
					satAcknowledgmentReceipt: {
						type: "string",
						maxLength: 500,
						nullable: true,
						description: "File URL or reference to SAT acknowledgment",
					},
					satFolioNumber: {
						type: "string",
						maxLength: 100,
						nullable: true,
						description: "Folio number from SAT acknowledgment",
					},
					cancelledBy: {
						type: "string",
						maxLength: 100,
						nullable: true,
						description: "User who cancelled the alert",
					},
					cancellationReason: {
						type: "string",
						maxLength: 1000,
						nullable: true,
						description: "Reason for cancellation",
					},
				},
			},
			AlertCancelRequest: {
				type: "object",
				required: ["reason"],
				properties: {
					reason: {
						type: "string",
						minLength: 1,
						maxLength: 1000,
						description: "Reason for cancelling the alert",
					},
				},
			},
			UmaValue: {
				type: "object",
				required: [
					"id",
					"year",
					"dailyValue",
					"effectiveDate",
					"active",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "UMA value identifier",
					},
					year: {
						type: "integer",
						minimum: 2000,
						maximum: 2100,
						description: "Year this UMA value applies to",
					},
					dailyValue: {
						type: "string",
						description:
							"UMA daily value for the year, stored as string to preserve precision",
					},
					effectiveDate: {
						type: "string",
						format: "date-time",
						description: "Date when this UMA value becomes effective",
					},
					endDate: {
						type: "string",
						format: "date-time",
						nullable: true,
						description:
							"Optional date when this UMA value expires (usually end of year)",
					},
					approvedBy: {
						type: "string",
						maxLength: 100,
						nullable: true,
						description:
							"User who approved/configured this value (Compliance Officer)",
					},
					notes: {
						type: "string",
						maxLength: 1000,
						nullable: true,
						description: "Optional notes about the UMA value",
					},
					active: {
						type: "boolean",
						description:
							"Whether this is the current active UMA value (only one can be active at a time)",
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			UmaValueCreateRequest: {
				type: "object",
				required: ["year", "dailyValue", "effectiveDate"],
				properties: {
					year: {
						type: "integer",
						minimum: 2000,
						maximum: 2100,
						description: "Year this UMA value applies to",
					},
					dailyValue: {
						type: "number",
						description: "UMA daily value for the year",
					},
					effectiveDate: {
						type: "string",
						format: "date-time",
						description: "Date when this UMA value becomes effective",
					},
					endDate: {
						type: "string",
						format: "date-time",
						nullable: true,
						description:
							"Optional date when this UMA value expires (usually end of year)",
					},
					approvedBy: {
						type: "string",
						maxLength: 100,
						nullable: true,
						description:
							"User who approved/configured this value (Compliance Officer)",
					},
					notes: {
						type: "string",
						maxLength: 1000,
						nullable: true,
						description: "Optional notes about the UMA value",
					},
					active: {
						type: "boolean",
						default: false,
						description:
							"Whether to set this as active (will deactivate all others). Usually set to false initially and activated manually.",
					},
				},
			},
			UmaValuePatchRequest: {
				type: "object",
				properties: {
					year: {
						type: "integer",
						minimum: 2000,
						maximum: 2100,
					},
					dailyValue: {
						type: "number",
					},
					effectiveDate: {
						type: "string",
						format: "date-time",
					},
					endDate: {
						type: "string",
						format: "date-time",
						nullable: true,
					},
					approvedBy: {
						type: "string",
						maxLength: 100,
						nullable: true,
					},
					notes: {
						type: "string",
						maxLength: 1000,
						nullable: true,
					},
					active: {
						type: "boolean",
						description:
							"If set to true, will deactivate all other UMA values and activate this one",
					},
				},
			},
			OrganizationSettings: {
				type: "object",
				required: [
					"id",
					"organizationId",
					"obligatedSubjectKey",
					"activityKey",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "Organization settings identifier",
					},
					organizationId: {
						type: "string",
						description:
							"Organization ID from auth-svc (better-auth organization plugin)",
					},
					obligatedSubjectKey: {
						type: "string",
						pattern: "^[A-ZÑ&]{3}\\d{6}[A-Z0-9]{3}$",
						minLength: 12,
						maxLength: 12,
						description:
							"RFC (clave_sujeto_obligado) - 12 characters for legal entities",
					},
					activityKey: {
						type: "string",
						minLength: 1,
						maxLength: 10,
						description:
							"Vulnerable activity code (e.g., 'VEH') - reference to vulnerable-activities catalog",
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			OrganizationSettingsCreateRequest: {
				type: "object",
				required: ["obligatedSubjectKey", "activityKey"],
				properties: {
					obligatedSubjectKey: {
						type: "string",
						pattern: "^[A-ZÑ&]{3}\\d{6}[A-Z0-9]{3}$",
						minLength: 12,
						maxLength: 12,
						description:
							"RFC (clave_sujeto_obligado) - 12 characters for legal entities",
					},
					activityKey: {
						type: "string",
						minLength: 1,
						maxLength: 10,
						description:
							"Vulnerable activity code (e.g., 'VEH') - reference to vulnerable-activities catalog",
					},
				},
			},
			OrganizationSettingsUpdateRequest: {
				type: "object",
				properties: {
					obligatedSubjectKey: {
						type: "string",
						pattern: "^[A-ZÑ&]{3}\\d{6}[A-Z0-9]{3}$",
						minLength: 12,
						maxLength: 12,
						description:
							"RFC (clave_sujeto_obligado) - 12 characters for legal entities",
					},
					activityKey: {
						type: "string",
						minLength: 1,
						maxLength: 10,
						description:
							"Vulnerable activity code (e.g., 'VEH') - reference to vulnerable-activities catalog",
					},
				},
			},
			ReportType: {
				type: "string",
				enum: ["MONTHLY", "QUARTERLY", "ANNUAL", "CUSTOM"],
				description:
					"Report type: MONTHLY generates SAT XML, others generate PDF",
			},
			ReportStatus: {
				type: "string",
				enum: ["DRAFT", "GENERATED", "SUBMITTED", "ACKNOWLEDGED"],
				description: "Report lifecycle status",
			},
			Report: {
				type: "object",
				required: [
					"id",
					"organizationId",
					"name",
					"type",
					"status",
					"periodStart",
					"periodEnd",
					"reportedMonth",
					"recordCount",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: {
						type: "string",
						pattern: "^RPT[A-Za-z0-9]{9}$",
						description: "Report identifier",
					},
					organizationId: { type: "string" },
					name: { type: "string", maxLength: 200 },
					type: { $ref: "#/components/schemas/ReportType" },
					status: { $ref: "#/components/schemas/ReportStatus" },
					periodStart: { type: "string", format: "date-time" },
					periodEnd: { type: "string", format: "date-time" },
					reportedMonth: {
						type: "string",
						pattern: "^\\d{4}(0[1-9]|1[0-2]|Q[1-4])?$",
						description:
							"YYYYMM for monthly, YYYYQ# for quarterly, YYYY for annual",
					},
					recordCount: { type: "integer", minimum: 0 },
					xmlFileUrl: {
						type: "string",
						nullable: true,
						description: "R2 URL of SAT XML file (MONTHLY only)",
					},
					pdfFileUrl: {
						type: "string",
						nullable: true,
						description: "R2 URL of PDF report (QUARTERLY/ANNUAL/CUSTOM)",
					},
					fileSize: { type: "integer", nullable: true },
					generatedAt: {
						type: "string",
						format: "date-time",
						nullable: true,
					},
					submittedAt: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "SAT submission date (MONTHLY only)",
					},
					satFolioNumber: {
						type: "string",
						nullable: true,
						description: "SAT acknowledgment folio (MONTHLY only)",
					},
					createdBy: { type: "string", nullable: true },
					notes: { type: "string", maxLength: 1000, nullable: true },
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			ReportWithAlertSummary: {
				allOf: [
					{ $ref: "#/components/schemas/Report" },
					{
						type: "object",
						properties: {
							alertSummary: {
								type: "object",
								properties: {
									total: { type: "integer" },
									bySeverity: {
										type: "object",
										additionalProperties: { type: "integer" },
									},
									byStatus: {
										type: "object",
										additionalProperties: { type: "integer" },
									},
									byRule: {
										type: "array",
										items: {
											type: "object",
											properties: {
												ruleId: { type: "string" },
												ruleName: { type: "string" },
												count: { type: "integer" },
											},
										},
									},
								},
							},
						},
					},
				],
			},
			ReportCreateRequest: {
				type: "object",
				required: ["name", "periodStart", "periodEnd", "reportedMonth"],
				properties: {
					name: { type: "string", minLength: 1, maxLength: 200 },
					type: { $ref: "#/components/schemas/ReportType" },
					periodStart: { type: "string", format: "date-time" },
					periodEnd: { type: "string", format: "date-time" },
					reportedMonth: {
						type: "string",
						pattern: "^\\d{4}(0[1-9]|1[0-2])$",
						description: "YYYYMM format",
					},
					notes: { type: "string", maxLength: 1000, nullable: true },
				},
			},
			ReportPatchRequest: {
				type: "object",
				properties: {
					name: { type: "string", minLength: 1, maxLength: 200 },
					status: { $ref: "#/components/schemas/ReportStatus" },
					notes: { type: "string", maxLength: 1000, nullable: true },
					satFolioNumber: { type: "string", maxLength: 100, nullable: true },
					submittedAt: {
						type: "string",
						format: "date-time",
						nullable: true,
					},
				},
			},
			ReportPreviewResponse: {
				type: "object",
				properties: {
					total: { type: "integer" },
					bySeverity: {
						type: "object",
						additionalProperties: { type: "integer" },
					},
					byStatus: {
						type: "object",
						additionalProperties: { type: "integer" },
					},
					periodStart: { type: "string", format: "date-time" },
					periodEnd: { type: "string", format: "date-time" },
				},
			},
			// Notice schemas
			NoticeStatus: {
				type: "string",
				enum: ["DRAFT", "GENERATED", "SUBMITTED", "ACKNOWLEDGED"],
				description: "Status of a SAT notice",
			},
			Notice: {
				type: "object",
				required: [
					"id",
					"organizationId",
					"name",
					"status",
					"periodStart",
					"periodEnd",
					"reportedMonth",
					"recordCount",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: { type: "string" },
					organizationId: { type: "string" },
					name: { type: "string" },
					status: { $ref: "#/components/schemas/NoticeStatus" },
					periodStart: { type: "string", format: "date-time" },
					periodEnd: { type: "string", format: "date-time" },
					reportedMonth: {
						type: "string",
						pattern: "^\\d{6}$",
						description: "YYYYMM format for the SAT reporting month",
					},
					recordCount: { type: "integer" },
					xmlFileUrl: { type: "string", nullable: true },
					fileSize: { type: "integer", nullable: true },
					generatedAt: { type: "string", format: "date-time", nullable: true },
					submittedAt: { type: "string", format: "date-time", nullable: true },
					satFolioNumber: { type: "string", nullable: true },
					createdBy: { type: "string", nullable: true },
					notes: { type: "string", nullable: true },
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			NoticeWithAlertSummary: {
				allOf: [
					{ $ref: "#/components/schemas/Notice" },
					{
						type: "object",
						properties: {
							alertSummary: {
								type: "object",
								properties: {
									total: { type: "integer" },
									bySeverity: {
										type: "object",
										additionalProperties: { type: "integer" },
									},
									byStatus: {
										type: "object",
										additionalProperties: { type: "integer" },
									},
									byRule: {
										type: "array",
										items: {
											type: "object",
											properties: {
												ruleId: { type: "string" },
												ruleName: { type: "string" },
												count: { type: "integer" },
											},
										},
									},
								},
							},
						},
					},
				],
			},
			NoticeCreateRequest: {
				type: "object",
				required: ["name", "year", "month"],
				properties: {
					name: { type: "string", minLength: 1, maxLength: 200 },
					year: { type: "integer", minimum: 2020, maximum: 2100 },
					month: { type: "integer", minimum: 1, maximum: 12 },
					notes: { type: "string", maxLength: 1000, nullable: true },
				},
			},
			NoticePatchRequest: {
				type: "object",
				properties: {
					name: { type: "string", minLength: 1, maxLength: 200 },
					notes: { type: "string", maxLength: 1000, nullable: true },
					satFolioNumber: { type: "string", maxLength: 100, nullable: true },
				},
			},
			NoticePreviewResponse: {
				type: "object",
				properties: {
					total: { type: "integer" },
					bySeverity: {
						type: "object",
						additionalProperties: { type: "integer" },
					},
					byStatus: {
						type: "object",
						additionalProperties: { type: "integer" },
					},
					periodStart: { type: "string", format: "date-time" },
					periodEnd: { type: "string", format: "date-time" },
					reportedMonth: { type: "string" },
					displayName: { type: "string" },
					submissionDeadline: { type: "string", format: "date-time" },
				},
			},
			ReportTemplateConfig: {
				type: "object",
				required: [
					"template",
					"name",
					"description",
					"dataSources",
					"defaultCharts",
					"requiresClientId",
				],
				properties: {
					template: {
						type: "string",
						enum: [
							"EXECUTIVE_SUMMARY",
							"COMPLIANCE_STATUS",
							"TRANSACTION_ANALYSIS",
							"CLIENT_RISK_PROFILE",
							"ALERT_BREAKDOWN",
							"PERIOD_COMPARISON",
							"CUSTOM",
						],
					},
					name: { type: "string" },
					description: { type: "string" },
					dataSources: {
						type: "array",
						items: {
							type: "string",
							enum: ["ALERTS", "TRANSACTIONS", "CLIENTS"],
						},
					},
					defaultCharts: {
						type: "array",
						items: { $ref: "#/components/schemas/ReportChartConfig" },
					},
					requiresClientId: { type: "boolean" },
				},
			},
			ReportChartConfig: {
				type: "object",
				required: ["type", "title", "dataKey"],
				properties: {
					type: {
						type: "string",
						enum: ["PIE", "BAR", "LINE", "DONUT", "STACKED_BAR"],
					},
					title: { type: "string", minLength: 1, maxLength: 100 },
					dataKey: { type: "string", minLength: 1, maxLength: 50 },
					showLegend: { type: "boolean", default: true },
				},
			},
			AlertAggregation: {
				type: "object",
				required: [
					"total",
					"bySeverity",
					"byStatus",
					"byRule",
					"byMonth",
					"avgResolutionDays",
					"overdueCount",
				],
				properties: {
					total: { type: "integer" },
					bySeverity: {
						type: "object",
						additionalProperties: { type: "integer" },
					},
					byStatus: {
						type: "object",
						additionalProperties: { type: "integer" },
					},
					byRule: {
						type: "array",
						items: {
							type: "object",
							required: ["ruleId", "ruleName", "count"],
							properties: {
								ruleId: { type: "string" },
								ruleName: { type: "string" },
								count: { type: "integer" },
							},
						},
					},
					byMonth: {
						type: "array",
						items: {
							type: "object",
							required: ["month", "count"],
							properties: {
								month: { type: "string" },
								count: { type: "integer" },
							},
						},
					},
					avgResolutionDays: { type: "number" },
					overdueCount: { type: "integer" },
				},
			},
			TransactionAggregation: {
				type: "object",
				required: [
					"total",
					"totalAmount",
					"avgAmount",
					"byOperationType",
					"byVehicleType",
					"byCurrency",
					"byMonth",
					"topClients",
				],
				properties: {
					total: { type: "integer" },
					totalAmount: { type: "number" },
					avgAmount: { type: "number" },
					byOperationType: {
						type: "object",
						additionalProperties: {
							type: "object",
							required: ["count", "amount"],
							properties: {
								count: { type: "integer" },
								amount: { type: "number" },
							},
						},
					},
					byVehicleType: {
						type: "object",
						additionalProperties: {
							type: "object",
							required: ["count", "amount"],
							properties: {
								count: { type: "integer" },
								amount: { type: "number" },
							},
						},
					},
					byCurrency: {
						type: "object",
						additionalProperties: {
							type: "object",
							required: ["count", "amount"],
							properties: {
								count: { type: "integer" },
								amount: { type: "number" },
							},
						},
					},
					byMonth: {
						type: "array",
						items: {
							type: "object",
							required: ["month", "count", "amount"],
							properties: {
								month: { type: "string" },
								count: { type: "integer" },
								amount: { type: "number" },
							},
						},
					},
					topClients: {
						type: "array",
						items: {
							type: "object",
							required: ["clientId", "clientName", "count", "amount"],
							properties: {
								clientId: { type: "string" },
								clientName: { type: "string" },
								count: { type: "integer" },
								amount: { type: "number" },
							},
						},
					},
				},
			},
			ClientAggregation: {
				type: "object",
				required: [
					"total",
					"byPersonType",
					"byCountry",
					"withAlerts",
					"newInPeriod",
				],
				properties: {
					total: { type: "integer" },
					byPersonType: {
						type: "object",
						additionalProperties: { type: "integer" },
					},
					byCountry: {
						type: "object",
						additionalProperties: { type: "integer" },
					},
					withAlerts: { type: "integer" },
					newInPeriod: { type: "integer" },
				},
			},
			ComparisonMetrics: {
				type: "object",
				properties: {
					alertsChange: { type: "number", description: "Percentage change" },
					transactionsChange: {
						type: "number",
						description: "Percentage change",
					},
					amountChange: { type: "number", description: "Percentage change" },
					clientsChange: { type: "number", description: "Percentage change" },
				},
			},
			RiskIndicators: {
				type: "object",
				required: [
					"highRiskClients",
					"criticalAlerts",
					"overdueSubmissions",
					"complianceScore",
				],
				properties: {
					highRiskClients: { type: "integer" },
					criticalAlerts: { type: "integer" },
					overdueSubmissions: { type: "integer" },
					complianceScore: { type: "number", minimum: 0, maximum: 100 },
				},
			},
			ReportAggregation: {
				type: "object",
				required: ["alerts", "transactions", "clients", "riskIndicators"],
				properties: {
					alerts: { $ref: "#/components/schemas/AlertAggregation" },
					transactions: { $ref: "#/components/schemas/TransactionAggregation" },
					clients: { $ref: "#/components/schemas/ClientAggregation" },
					comparison: { $ref: "#/components/schemas/ComparisonMetrics" },
					riskIndicators: { $ref: "#/components/schemas/RiskIndicators" },
				},
			},
			ImportStatus: {
				type: "string",
				enum: ["PENDING", "VALIDATING", "PROCESSING", "COMPLETED", "FAILED"],
				description: "Current status of the import job",
			},
			ImportEntityType: {
				type: "string",
				enum: ["CLIENT", "TRANSACTION"],
				description: "Type of entities being imported",
			},
			ImportRowStatus: {
				type: "string",
				enum: ["PENDING", "SUCCESS", "WARNING", "ERROR", "SKIPPED"],
				description: "Status of an individual row in the import",
			},
			Import: {
				type: "object",
				required: [
					"id",
					"organizationId",
					"entityType",
					"fileName",
					"fileUrl",
					"fileSize",
					"status",
					"totalRows",
					"processedRows",
					"successCount",
					"warningCount",
					"errorCount",
					"createdBy",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: { type: "string", description: "Unique import identifier" },
					organizationId: { type: "string" },
					entityType: { $ref: "#/components/schemas/ImportEntityType" },
					fileName: { type: "string", description: "Original file name" },
					fileUrl: { type: "string", description: "R2 storage key" },
					fileSize: { type: "integer", description: "File size in bytes" },
					status: { $ref: "#/components/schemas/ImportStatus" },
					totalRows: {
						type: "integer",
						description: "Total number of data rows in the file",
					},
					processedRows: {
						type: "integer",
						description: "Number of rows processed so far",
					},
					successCount: {
						type: "integer",
						description: "Number of rows successfully imported",
					},
					warningCount: {
						type: "integer",
						description: "Number of rows imported with warnings",
					},
					errorCount: {
						type: "integer",
						description: "Number of rows that failed to import",
					},
					errorMessage: {
						type: "string",
						nullable: true,
						description: "Error message if the import failed",
					},
					createdBy: {
						type: "string",
						description: "User ID who initiated the import",
					},
					startedAt: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "When processing started",
					},
					completedAt: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "When processing completed",
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			ImportRowResult: {
				type: "object",
				required: [
					"id",
					"importId",
					"rowNumber",
					"status",
					"rawData",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: { type: "string" },
					importId: { type: "string" },
					rowNumber: {
						type: "integer",
						description: "1-based row number in the source file",
					},
					status: { $ref: "#/components/schemas/ImportRowStatus" },
					rawData: {
						type: "string",
						description: "JSON string of the original row data",
					},
					entityId: {
						type: "string",
						nullable: true,
						description: "ID of the created entity (client or transaction)",
					},
					message: {
						type: "string",
						nullable: true,
						description: "Success or warning message",
					},
					errors: {
						type: "string",
						nullable: true,
						description: "JSON string of validation errors",
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			ImportWithRows: {
				allOf: [
					{ $ref: "#/components/schemas/Import" },
					{
						type: "object",
						required: ["rowResults"],
						properties: {
							rowResults: {
								type: "object",
								required: ["data", "total", "page", "limit", "totalPages"],
								properties: {
									data: {
										type: "array",
										items: { $ref: "#/components/schemas/ImportRowResult" },
									},
									total: { type: "integer" },
									page: { type: "integer" },
									limit: { type: "integer" },
									totalPages: { type: "integer" },
								},
							},
						},
					},
				],
			},
		},
	},
};
