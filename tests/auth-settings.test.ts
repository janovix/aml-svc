import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	getResolvedSettings,
	getDefaultSettings,
	extractBrowserHints,
	type ResolvedSettings,
	type BrowserHints,
} from "../src/lib/auth-settings";
import type { Bindings } from "../src/index";
import type { AuthSvcRpc } from "../src/types";

// Helper to create a mock AUTH_SERVICE with getResolvedSettings RPC
function createMockAuthService(
	result:
		| ResolvedSettings
		| null
		| (() => ResolvedSettings | null | Promise<ResolvedSettings | null>),
): AuthSvcRpc {
	return {
		fetch: vi.fn(),
		getJwks: vi.fn(),
		getResolvedSettings: vi
			.fn()
			.mockImplementation(async () =>
				typeof result === "function" ? result() : result,
			),
		logAuditEvent: vi.fn(),
		gateUsageRights: vi.fn(),
		meterUsageRights: vi.fn(),
		checkUsageRights: vi.fn(),
	} as unknown as AuthSvcRpc;
}

describe("auth-settings", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getResolvedSettings", () => {
		const mockSettings: ResolvedSettings = {
			theme: "dark",
			timezone: "America/Mexico_City",
			language: "es",
			dateFormat: "DD/MM/YYYY",
			avatarUrl: "https://example.com/avatar.jpg",
			paymentMethods: [
				{
					id: "pm-123",
					type: "card",
					label: "Visa ending in 4242",
					last4: "4242",
					isDefault: true,
				},
			],
			sources: {
				theme: "user",
				timezone: "organization",
				language: "browser",
				dateFormat: "default",
			},
		};

		it("should return null when AUTH_SERVICE binding is not available", async () => {
			const env = { AUTH_SERVICE: undefined } as unknown as Bindings;

			const result = await getResolvedSettings(env, "user-123");

			expect(result).toBeNull();
		});

		it("should return resolved settings on successful request", async () => {
			const mockAuthService = createMockAuthService(mockSettings);
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;

			const result = await getResolvedSettings(env, "user-123");

			expect(result).toEqual(mockSettings);
			expect(mockAuthService.getResolvedSettings).toHaveBeenCalledTimes(1);
			expect(mockAuthService.getResolvedSettings).toHaveBeenCalledWith(
				"user-123",
				undefined,
				undefined,
			);
		});

		it("should include orgId in request when provided", async () => {
			const mockAuthService = createMockAuthService(mockSettings);
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;

			await getResolvedSettings(env, "user-123", "org-456");

			expect(mockAuthService.getResolvedSettings).toHaveBeenCalledWith(
				"user-123",
				"org-456",
				undefined,
			);
		});

		it("should include browser hints as base64 encoded headers param", async () => {
			const mockAuthService = createMockAuthService(mockSettings);
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;
			const browserHints: BrowserHints = {
				"accept-language": "es-MX,es;q=0.9,en;q=0.8",
				"x-timezone": "America/Mexico_City",
				"x-preferred-theme": "dark",
			};

			await getResolvedSettings(env, "user-123", undefined, browserHints);

			expect(mockAuthService.getResolvedSettings).toHaveBeenCalledTimes(1);
			const [, , encodedHints] = vi.mocked(mockAuthService.getResolvedSettings)
				.mock.calls[0];
			expect(encodedHints).toBeDefined();

			// Decode and verify the browser hints
			const decoded = JSON.parse(atob(encodedHints!));
			expect(decoded).toEqual(browserHints);
		});

		it("should not include headers param when browser hints are not provided", async () => {
			const mockAuthService = createMockAuthService(mockSettings);
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;

			await getResolvedSettings(env, "user-123");

			const [, , encodedHints] = vi.mocked(mockAuthService.getResolvedSettings)
				.mock.calls[0];
			expect(encodedHints).toBeUndefined();
		});

		it("should handle wrapped { success: true, data: ... } response", async () => {
			const mockAuthService = createMockAuthService({
				success: true,
				data: mockSettings,
			} as unknown as ResolvedSettings);
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;

			const result = await getResolvedSettings(env, "user-123");

			expect(result).toEqual(mockSettings);
		});

		it("should return null for wrapped { success: false } response", async () => {
			const mockAuthService = createMockAuthService({
				success: false,
			} as unknown as ResolvedSettings);
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;

			const result = await getResolvedSettings(env, "user-123");

			expect(result).toBeNull();
		});

		it("should return null when RPC returns null", async () => {
			const mockAuthService = createMockAuthService(null);
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;

			const result = await getResolvedSettings(env, "user-123");

			expect(result).toBeNull();
		});

		it("should return null on exception", async () => {
			const mockAuthService = createMockAuthService(() => {
				throw new Error("Connection refused");
			});
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;

			const result = await getResolvedSettings(env, "user-123");

			expect(result).toBeNull();
		});

		it("should construct correct RPC call with userId", async () => {
			const mockAuthService = createMockAuthService(mockSettings);
			const env = { AUTH_SERVICE: mockAuthService } as unknown as Bindings;

			await getResolvedSettings(env, "user-123");

			const [userId] = vi.mocked(mockAuthService.getResolvedSettings).mock
				.calls[0];
			expect(userId).toBe("user-123");
		});
	});

	describe("getDefaultSettings", () => {
		it("should return default settings object", () => {
			const defaults = getDefaultSettings();

			expect(defaults).toEqual({
				theme: "system",
				timezone: "UTC",
				language: "en",
				dateFormat: "YYYY-MM-DD",
				avatarUrl: null,
				paymentMethods: [],
				sources: {
					theme: "default",
					timezone: "default",
					language: "default",
					dateFormat: "default",
				},
			});
		});

		it("should return a new object each time (not shared reference)", () => {
			const defaults1 = getDefaultSettings();
			const defaults2 = getDefaultSettings();

			expect(defaults1).not.toBe(defaults2);
			expect(defaults1).toEqual(defaults2);

			// Mutating one should not affect the other
			defaults1.theme = "dark";
			expect(defaults2.theme).toBe("system");
		});
	});

	describe("extractBrowserHints", () => {
		it("should extract all browser hints from headers", () => {
			const headers = new Headers({
				"Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
				"X-Timezone": "America/Mexico_City",
				"X-Preferred-Theme": "dark",
			});

			const hints = extractBrowserHints(headers);

			expect(hints).toEqual({
				"accept-language": "es-MX,es;q=0.9,en;q=0.8",
				"x-timezone": "America/Mexico_City",
				"x-preferred-theme": "dark",
			});
		});

		it("should return undefined for missing headers", () => {
			const headers = new Headers({
				"Accept-Language": "en-US",
			});

			const hints = extractBrowserHints(headers);

			expect(hints).toEqual({
				"accept-language": "en-US",
				"x-timezone": undefined,
				"x-preferred-theme": undefined,
			});
		});

		it("should handle completely empty headers", () => {
			const headers = new Headers();

			const hints = extractBrowserHints(headers);

			expect(hints).toEqual({
				"accept-language": undefined,
				"x-timezone": undefined,
				"x-preferred-theme": undefined,
			});
		});

		it("should handle case-insensitive header names", () => {
			const headers = new Headers({
				"accept-language": "fr-FR",
				"x-timezone": "Europe/Paris",
				"x-preferred-theme": "light",
			});

			const hints = extractBrowserHints(headers);

			expect(hints["accept-language"]).toBe("fr-FR");
			expect(hints["x-timezone"]).toBe("Europe/Paris");
			expect(hints["x-preferred-theme"]).toBe("light");
		});
	});
});
