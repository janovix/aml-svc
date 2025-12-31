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
					"Retrieve aggregate statistics for clients including total count, open alerts, and urgent reviews.",
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
						description:
							"Client RFC (Registro Federal de Contribuyentes) - Primary key",
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
							"Optional case-insensitive text search across `name` and `normalizedName`.",
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
						description: "Filter by client ID (RFC)",
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
						description: "FK to the owning client (RFC - Primary key)",
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
						description: "FK to the owning client (RFC - Primary key)",
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
				required: ["totalClients", "openAlerts", "urgentReviews"],
				properties: {
					totalClients: {
						type: "integer",
						description: "Total number of active clients",
						example: 150,
					},
					openAlerts: {
						type: "integer",
						description: "Number of alerts with DETECTED status",
						example: 5,
					},
					urgentReviews: {
						type: "integer",
						description:
							"Number of CRITICAL severity alerts with DETECTED or FILE_GENERATED status",
						example: 2,
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
					"ruleConfig",
					"createdAt",
					"updatedAt",
				],
				properties: {
					id: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "Alert rule identifier",
					},
					name: { type: "string", minLength: 1, maxLength: 200 },
					description: { type: "string", maxLength: 1000, nullable: true },
					active: { type: "boolean" },
					severity: { $ref: "#/components/schemas/AlertSeverity" },
					ruleConfig: {
						type: "object",
						description:
							"Dynamic rule configuration stored as JSON. Structure depends on rule type.",
						additionalProperties: true,
					},
					metadata: {
						type: "object",
						nullable: true,
						description: "Additional metadata as JSON",
						additionalProperties: true,
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			AlertRuleCreateRequest: {
				type: "object",
				required: ["name", "severity", "ruleConfig"],
				properties: {
					name: { type: "string", minLength: 1, maxLength: 200 },
					description: { type: "string", maxLength: 1000, nullable: true },
					active: { type: "boolean", default: true },
					severity: {
						$ref: "#/components/schemas/AlertSeverity",
						default: "MEDIUM",
					},
					ruleConfig: {
						type: "object",
						description:
							"Dynamic rule configuration. Examples: transaction_amount, transaction_count, aggregate_amount, custom",
						additionalProperties: true,
					},
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
					ruleConfig: {
						type: "object",
						additionalProperties: true,
					},
					metadata: {
						type: "object",
						nullable: true,
						additionalProperties: true,
					},
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
					"alertData",
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
						description: "Client ID (RFC) for which this alert was generated",
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
					alertData: {
						type: "object",
						description:
							"Alert-specific data stored as JSON (transaction IDs, amounts, dates, etc.)",
						additionalProperties: true,
					},
					triggerTransactionId: {
						type: "string",
						nullable: true,
						description:
							"Optional reference to the transaction that triggered the alert",
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
					"alertData",
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
					alertData: {
						type: "object",
						description:
							"Alert-specific data stored as JSON (transaction IDs, amounts, dates, etc.)",
						additionalProperties: true,
					},
					triggerTransactionId: { type: "string", nullable: true },
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
		},
	},
};
