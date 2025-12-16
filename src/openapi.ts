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
						description: "Client identifier",
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
						schema: { type: "string", format: "date-time" },
						description:
							"ISO date-time for the inclusive range start (`operationDate >= startDate`).",
					},
					{
						name: "endDate",
						in: "query",
						schema: { type: "string", format: "date-time" },
						description:
							"ISO date-time for the inclusive range end (`operationDate <= endDate`).",
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
					rfc: { type: "string" },
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
					rfc: { type: "string" },
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
					rfc: { type: "string" },
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
					rfc: { type: "string" },
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
					rfc: { type: "string" },
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
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "FK to the owning client (UUID or deterministic ID)",
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
						pattern: "^[A-Za-z0-9-]{1,64}$",
						description: "FK to the owning client (UUID or deterministic ID)",
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
						required: ["id", "key", "name"],
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
						},
					},
					data: {
						type: "array",
						items: { $ref: "#/components/schemas/CatalogItem" },
					},
					pagination: { $ref: "#/components/schemas/CatalogPagination" },
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
					"brandId",
					"model",
					"year",
					"serialNumber",
					"amount",
					"currency",
					"paymentMethod",
					"paymentDate",
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
					operationDate: { type: "string", format: "date-time" },
					operationType: {
						$ref: "#/components/schemas/TransactionOperationType",
					},
					branchPostalCode: {
						type: "string",
						pattern: "^\\d{4,10}$",
					},
					vehicleType: { $ref: "#/components/schemas/TransactionVehicleType" },
					brandId: { type: "string" },
					model: { type: "string" },
					year: { type: "integer" },
					serialNumber: { type: "string" },
					armorLevel: { type: "string", nullable: true },
					engineNumber: { type: "string", nullable: true },
					plates: { type: "string", nullable: true },
					registrationNumber: { type: "string", nullable: true },
					flagCountryId: { type: "string", nullable: true },
					amount: { type: "string" },
					currency: { type: "string" },
					paymentMethod: { type: "string" },
					paymentDate: { type: "string", format: "date-time" },
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
					deletedAt: { type: "string", format: "date-time", nullable: true },
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
					"brandId",
					"model",
					"year",
					"serialNumber",
					"amount",
					"currency",
					"paymentMethod",
					"paymentDate",
				],
				properties: {
					clientId: {
						type: "string",
						pattern: "^[A-Za-z0-9-]{1,64}$",
					},
					operationDate: { type: "string", format: "date-time" },
					operationType: {
						$ref: "#/components/schemas/TransactionOperationType",
					},
					branchPostalCode: {
						type: "string",
						pattern: "^\\d{4,10}$",
					},
					vehicleType: { $ref: "#/components/schemas/TransactionVehicleType" },
					brandId: { type: "string" },
					model: { type: "string" },
					year: { type: "integer", minimum: 1900, maximum: 2100 },
					serialNumber: { type: "string" },
					armorLevel: { type: "string", nullable: true },
					engineNumber: { type: "string", nullable: true },
					plates: { type: "string", nullable: true },
					registrationNumber: { type: "string", nullable: true },
					flagCountryId: { type: "string", nullable: true },
					amount: {
						type: "string",
						description:
							'Stored as a string to preserve precision (e.g., "3500000.75").',
					},
					currency: {
						type: "string",
						minLength: 3,
						maxLength: 3,
						description: "ISO 4217 currency code.",
					},
					paymentMethod: { type: "string" },
					paymentDate: { type: "string", format: "date-time" },
				},
			},
			TransactionUpdateRequest: {
				type: "object",
				required: [
					"operationDate",
					"operationType",
					"branchPostalCode",
					"vehicleType",
					"brandId",
					"model",
					"year",
					"serialNumber",
					"amount",
					"currency",
					"paymentMethod",
					"paymentDate",
				],
				properties: {
					operationDate: { type: "string", format: "date-time" },
					operationType: {
						$ref: "#/components/schemas/TransactionOperationType",
					},
					branchPostalCode: {
						type: "string",
						pattern: "^\\d{4,10}$",
					},
					vehicleType: { $ref: "#/components/schemas/TransactionVehicleType" },
					brandId: { type: "string" },
					model: { type: "string" },
					year: { type: "integer", minimum: 1900, maximum: 2100 },
					serialNumber: { type: "string" },
					armorLevel: { type: "string", nullable: true },
					engineNumber: { type: "string", nullable: true },
					plates: { type: "string", nullable: true },
					registrationNumber: { type: "string", nullable: true },
					flagCountryId: { type: "string", nullable: true },
					amount: {
						type: "string",
						description:
							'Stored as a string to preserve precision (e.g., "3500000.75").',
					},
					currency: {
						type: "string",
						minLength: 3,
						maxLength: 3,
						description: "ISO 4217 currency code.",
					},
					paymentMethod: { type: "string" },
					paymentDate: { type: "string", format: "date-time" },
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
			Error: {
				type: "object",
				required: ["error", "message"],
				properties: {
					error: { type: "string" },
					message: { type: "string" },
					details: { type: "object" },
				},
			},
		},
	},
};
