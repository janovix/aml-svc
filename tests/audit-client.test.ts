import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	AuditClient,
	createAuditClient,
	type AuditLogInput,
	type AuditLogResult,
} from "../src/lib/audit-client";
import type { Bindings } from "../src/index";
import type { AuthSvcRpc } from "../src/types";

// Helper to create a mock AUTH_SERVICE with logAuditEvent RPC
function createMockAuthService(
	result:
		| AuditLogResult
		| null
		| (() => AuditLogResult | null | Promise<AuditLogResult | null>),
): AuthSvcRpc {
	return {
		fetch: vi.fn(),
		getJwks: vi.fn(),
		getResolvedSettings: vi.fn(),
		logAuditEvent: vi
			.fn()
			.mockImplementation(async () =>
				typeof result === "function" ? result() : result,
			),
		gateUsageRights: vi.fn(),
		meterUsageRights: vi.fn(),
		checkUsageRights: vi.fn(),
	} as unknown as AuthSvcRpc;
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
			const env = { AUTH_SERVICE: undefined } as unknown as Bindings;
			const client = new AuditClient(env);

			const input: AuditLogInput = {
				eventType: "CREATE",
				entityType: "operation",
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

			const mockAuthService = createMockAuthService(mockResult);
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;
			const client = new AuditClient(env);

			const input: AuditLogInput = {
				eventType: "CREATE",
				entityType: "operation",
				entityId: "tx-123",
				actorUserId: "user-456",
				actorOrganizationId: "org-789",
				newState: { amount: 1000 },
				metadata: { source: "manual_entry" },
			};

			const result = await client.log(input);

			expect(result).toEqual(mockResult);
			expect(mockAuthService.logAuditEvent).toHaveBeenCalledTimes(1);
			expect(mockAuthService.logAuditEvent).toHaveBeenCalledWith({
				...input,
				sourceService: "aml-svc",
			});
		});

		it("should return null when logAuditEvent returns null", async () => {
			const mockAuthService = createMockAuthService(null);
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;
			const client = new AuditClient(env);

			const result = await client.log({
				eventType: "CREATE",
				entityType: "tx",
			});

			expect(result).toBeNull();
		});

		it("should use custom source service in request body", async () => {
			const mockAuthService = createMockAuthService({
				id: "audit-123",
				signature: "sig",
			});
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;
			const client = new AuditClient(env, "import-svc");

			await client.log({
				eventType: "IMPORT",
				entityType: "batch",
			});

			expect(mockAuthService.logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ sourceService: "import-svc" }),
			);
		});

		it("should return null on exception", async () => {
			const mockAuthService = createMockAuthService(() => {
				throw new Error("Network error");
			});
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;
			const client = new AuditClient(env);

			const result = await client.log({
				eventType: "CREATE",
				entityType: "operation",
			});

			expect(result).toBeNull();
		});
	});

	describe("logCreate", () => {
		it("should work without options (uses default empty options)", async () => {
			const mockAuthService = createMockAuthService({
				id: "audit-1",
				signature: "s",
			});
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;
			const client = new AuditClient(env);
			await client.logCreate("client", "c-1", { name: "Test" });
			expect(mockAuthService.logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: "CREATE" }),
			);
		});

		it("should call log with CREATE event type", async () => {
			const mockAuthService = createMockAuthService({
				id: "audit-123",
				signature: "sig",
			});
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;
			const client = new AuditClient(env);

			const newState = { name: "Test Operation", amount: 500 };

			await client.logCreate("operation", "tx-123", newState, {
				actorUserId: "user-456",
			});

			expect(mockAuthService.logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: "CREATE",
					entityType: "operation",
					entityId: "tx-123",
					newState,
					actorUserId: "user-456",
				}),
			);
		});
	});

	describe("logUpdate", () => {
		it("should work without options (uses default empty options)", async () => {
			const mockAuthService = createMockAuthService({
				id: "audit-1",
				signature: "s",
			});
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;
			const client = new AuditClient(env);
			await client.logUpdate("client", "c-1", { old: true }, { new: true });
			expect(mockAuthService.logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: "UPDATE" }),
			);
		});

		it("should call log with UPDATE event type and both states", async () => {
			const mockAuthService = createMockAuthService({
				id: "audit-123",
				signature: "sig",
			});
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;
			const client = new AuditClient(env);

			const previousState = { status: "DRAFT" };
			const newState = { status: "SUBMITTED" };

			await client.logUpdate("alert", "alert-123", previousState, newState, {
				metadata: { reason: "review_complete" },
			});

			expect(mockAuthService.logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: "UPDATE",
					entityType: "alert",
					entityId: "alert-123",
					previousState,
					newState,
					metadata: { reason: "review_complete" },
				}),
			);
		});
	});

	describe("logDelete", () => {
		it("should call log with DELETE event type", async () => {
			const mockAuthService = createMockAuthService({
				id: "audit-123",
				signature: "sig",
			});
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;
			const client = new AuditClient(env);

			const previousState = { id: "notice-123", name: "January 2024 Notice" };

			await client.logDelete("notice", "notice-123", previousState);

			expect(mockAuthService.logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: "DELETE",
					entityType: "notice",
					entityId: "notice-123",
					previousState,
				}),
			);
		});
	});

	describe("logExport", () => {
		it("should work without options (uses default empty options)", async () => {
			const mockAuthService = createMockAuthService({
				id: "audit-1",
				signature: "s",
			});
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;
			const client = new AuditClient(env);
			await client.logExport("client", { format: "csv" });
			expect(mockAuthService.logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: "EXPORT" }),
			);
		});

		it("should call log with EXPORT event type", async () => {
			const mockAuthService = createMockAuthService({
				id: "audit-123",
				signature: "sig",
			});
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;
			const client = new AuditClient(env);

			const metadata = { format: "xml", recordCount: 150 };

			await client.logExport("notice", metadata, {
				actorOrganizationId: "org-789",
			});

			expect(mockAuthService.logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: "EXPORT",
					entityType: "notice",
					metadata,
					actorOrganizationId: "org-789",
				}),
			);
		});
	});

	describe("logImport", () => {
		it("should call log with IMPORT event type", async () => {
			const mockAuthService = createMockAuthService({
				id: "audit-123",
				signature: "sig",
			});
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;
			const client = new AuditClient(env);

			const metadata = { source: "csv_upload", rowCount: 500, errors: 3 };

			await client.logImport("operations", metadata);

			expect(mockAuthService.logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: "IMPORT",
					entityType: "operations",
					metadata,
				}),
			);
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
