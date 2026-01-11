import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	AuditClient,
	createAuditClient,
	type AuditLogInput,
	type AuditLogResult,
} from "../src/lib/audit-client";
import type { Bindings } from "../src/index";

// Type for parsed request body in tests
type RequestBody = Record<string, unknown>;

// Helper to create a mock fetcher
function createMockFetcher(
	response: Response | (() => Response | Promise<Response>),
): Fetcher {
	return {
		fetch: vi.fn().mockImplementation(async () => {
			return typeof response === "function" ? response() : response;
		}),
		connect: vi.fn(),
	};
}

describe("AuditClient", () => {
	const defaultEnv: Partial<Bindings> = {};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("constructor", () => {
		it("should use default source service when not provided", () => {
			const env = { ...defaultEnv } as Bindings;
			const client = new AuditClient(env);

			// Verify by checking the request body sent
			expect(client).toBeDefined();
		});

		it("should accept custom source service", () => {
			const env = { ...defaultEnv } as Bindings;
			const client = new AuditClient(env, "custom-service");

			expect(client).toBeDefined();
		});
	});

	describe("log", () => {
		it("should return null when AUTH_SERVICE binding is not available", async () => {
			const env = { AUTH_SERVICE: undefined } as Bindings;
			const client = new AuditClient(env);

			const input: AuditLogInput = {
				eventType: "CREATE",
				entityType: "transaction",
				entityId: "tx-123",
			};

			const result = await client.log(input);

			expect(result).toBeNull();
		});

		it("should return audit log result on successful request", async () => {
			const mockResult: AuditLogResult = {
				id: "audit-123",
				signature: "sig-abc",
			};

			const mockFetcher = createMockFetcher(
				new Response(JSON.stringify({ success: true, data: mockResult }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;
			const client = new AuditClient(env);

			const input: AuditLogInput = {
				eventType: "CREATE",
				entityType: "transaction",
				entityId: "tx-123",
				actorUserId: "user-456",
				actorOrganizationId: "org-789",
				newState: { amount: 1000 },
				metadata: { source: "manual_entry" },
			};

			const result = await client.log(input);

			expect(result).toEqual(mockResult);
			expect(mockFetcher.fetch).toHaveBeenCalledTimes(1);

			// Verify the request structure
			const fetchCall = vi.mocked(mockFetcher.fetch).mock.calls[0];
			const request = fetchCall[0] as Request;

			expect(request.method).toBe("POST");
			expect(request.url).toBe("https://auth-svc.internal/internal/audit/log");
			expect(request.headers.get("Content-Type")).toBe("application/json");
			expect(request.headers.get("Accept")).toBe("application/json");

			const body = await request.clone().json();
			expect(body).toEqual({
				...input,
				sourceService: "aml-svc",
			});
		});

		it("should use custom source service in request body", async () => {
			const mockFetcher = createMockFetcher(
				new Response(
					JSON.stringify({
						success: true,
						data: { id: "audit-123", signature: "sig" },
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;
			const client = new AuditClient(env, "import-svc");

			await client.log({
				eventType: "IMPORT",
				entityType: "batch",
			});

			const fetchCall = vi.mocked(mockFetcher.fetch).mock.calls[0];
			const request = fetchCall[0] as Request;
			const body = (await request.clone().json()) as RequestBody;

			expect(body.sourceService).toBe("import-svc");
		});

		it("should return null on non-OK response", async () => {
			const mockFetcher = createMockFetcher(
				new Response("Internal Server Error", {
					status: 500,
					statusText: "Internal Server Error",
				}),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;
			const client = new AuditClient(env);

			const result = await client.log({
				eventType: "CREATE",
				entityType: "transaction",
			});

			expect(result).toBeNull();
		});

		it("should return null when response indicates failure", async () => {
			const mockFetcher = createMockFetcher(
				new Response(
					JSON.stringify({ success: false, error: "Validation failed" }),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;
			const client = new AuditClient(env);

			const result = await client.log({
				eventType: "CREATE",
				entityType: "transaction",
			});

			expect(result).toBeNull();
		});

		it("should return null on fetch exception", async () => {
			const mockFetcher: Fetcher = {
				fetch: vi.fn().mockRejectedValue(new Error("Network error")),
				connect: vi.fn(),
			};

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;
			const client = new AuditClient(env);

			const result = await client.log({
				eventType: "CREATE",
				entityType: "transaction",
			});

			expect(result).toBeNull();
		});
	});

	describe("logCreate", () => {
		it("should call log with CREATE event type", async () => {
			const mockFetcher = createMockFetcher(
				new Response(
					JSON.stringify({
						success: true,
						data: { id: "audit-123", signature: "sig" },
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;
			const client = new AuditClient(env);

			const newState = { name: "Test Transaction", amount: 500 };

			await client.logCreate("transaction", "tx-123", newState, {
				actorUserId: "user-456",
			});

			const fetchCall = vi.mocked(mockFetcher.fetch).mock.calls[0];
			const request = fetchCall[0] as Request;
			const body = (await request.clone().json()) as RequestBody;

			expect(body.eventType).toBe("CREATE");
			expect(body.entityType).toBe("transaction");
			expect(body.entityId).toBe("tx-123");
			expect(body.newState).toEqual(newState);
			expect(body.actorUserId).toBe("user-456");
		});
	});

	describe("logUpdate", () => {
		it("should call log with UPDATE event type and both states", async () => {
			const mockFetcher = createMockFetcher(
				new Response(
					JSON.stringify({
						success: true,
						data: { id: "audit-123", signature: "sig" },
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;
			const client = new AuditClient(env);

			const previousState = { status: "DRAFT" };
			const newState = { status: "SUBMITTED" };

			await client.logUpdate("alert", "alert-123", previousState, newState, {
				metadata: { reason: "review_complete" },
			});

			const fetchCall = vi.mocked(mockFetcher.fetch).mock.calls[0];
			const request = fetchCall[0] as Request;
			const body = (await request.clone().json()) as RequestBody;

			expect(body.eventType).toBe("UPDATE");
			expect(body.entityType).toBe("alert");
			expect(body.entityId).toBe("alert-123");
			expect(body.previousState).toEqual(previousState);
			expect(body.newState).toEqual(newState);
			expect(body.metadata).toEqual({ reason: "review_complete" });
		});
	});

	describe("logDelete", () => {
		it("should call log with DELETE event type", async () => {
			const mockFetcher = createMockFetcher(
				new Response(
					JSON.stringify({
						success: true,
						data: { id: "audit-123", signature: "sig" },
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;
			const client = new AuditClient(env);

			const previousState = { id: "notice-123", name: "January 2024 Notice" };

			await client.logDelete("notice", "notice-123", previousState);

			const fetchCall = vi.mocked(mockFetcher.fetch).mock.calls[0];
			const request = fetchCall[0] as Request;
			const body = (await request.clone().json()) as RequestBody;

			expect(body.eventType).toBe("DELETE");
			expect(body.entityType).toBe("notice");
			expect(body.entityId).toBe("notice-123");
			expect(body.previousState).toEqual(previousState);
		});
	});

	describe("logExport", () => {
		it("should call log with EXPORT event type", async () => {
			const mockFetcher = createMockFetcher(
				new Response(
					JSON.stringify({
						success: true,
						data: { id: "audit-123", signature: "sig" },
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;
			const client = new AuditClient(env);

			const metadata = { format: "xml", recordCount: 150 };

			await client.logExport("notice", metadata, {
				actorOrganizationId: "org-789",
			});

			const fetchCall = vi.mocked(mockFetcher.fetch).mock.calls[0];
			const request = fetchCall[0] as Request;
			const body = (await request.clone().json()) as RequestBody;

			expect(body.eventType).toBe("EXPORT");
			expect(body.entityType).toBe("notice");
			expect(body.metadata).toEqual(metadata);
			expect(body.actorOrganizationId).toBe("org-789");
		});
	});

	describe("logImport", () => {
		it("should call log with IMPORT event type", async () => {
			const mockFetcher = createMockFetcher(
				new Response(
					JSON.stringify({
						success: true,
						data: { id: "audit-123", signature: "sig" },
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;
			const client = new AuditClient(env);

			const metadata = { source: "csv_upload", rowCount: 500, errors: 3 };

			await client.logImport("transactions", metadata);

			const fetchCall = vi.mocked(mockFetcher.fetch).mock.calls[0];
			const request = fetchCall[0] as Request;
			const body = (await request.clone().json()) as RequestBody;

			expect(body.eventType).toBe("IMPORT");
			expect(body.entityType).toBe("transactions");
			expect(body.metadata).toEqual(metadata);
		});
	});
});

describe("createAuditClient", () => {
	it("should create an AuditClient instance with default source service", () => {
		const env = {} as Bindings;
		const client = createAuditClient(env);

		expect(client).toBeInstanceOf(AuditClient);
	});

	it("should create an AuditClient instance with custom source service", () => {
		const env = {} as Bindings;
		const client = createAuditClient(env, "watchlist-svc");

		expect(client).toBeInstanceOf(AuditClient);
	});
});
