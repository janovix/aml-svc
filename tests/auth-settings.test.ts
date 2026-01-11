import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	getResolvedSettings,
	getDefaultSettings,
	extractBrowserHints,
	type ResolvedSettings,
	type BrowserHints,
} from "../src/lib/auth-settings";
import type { Bindings } from "../src/index";

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
			const env = { AUTH_SERVICE: undefined } as Bindings;

			const result = await getResolvedSettings(env, "user-123");

			expect(result).toBeNull();
		});

		it("should return resolved settings on successful request", async () => {
			const mockFetcher = createMockFetcher(
				new Response(JSON.stringify({ success: true, data: mockSettings }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;

			const result = await getResolvedSettings(env, "user-123");

			expect(result).toEqual(mockSettings);
			expect(mockFetcher.fetch).toHaveBeenCalledTimes(1);

			// Verify the request URL contains userId
			const fetchCall = vi.mocked(mockFetcher.fetch).mock.calls[0];
			const request = fetchCall[0] as Request;

			expect(request.url).toContain("userId=user-123");
			expect(request.headers.get("Accept")).toBe("application/json");
		});

		it("should include orgId in request when provided", async () => {
			const mockFetcher = createMockFetcher(
				new Response(JSON.stringify({ success: true, data: mockSettings }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;

			await getResolvedSettings(env, "user-123", "org-456");

			const fetchCall = vi.mocked(mockFetcher.fetch).mock.calls[0];
			const request = fetchCall[0] as Request;
			const url = new URL(request.url);

			expect(url.searchParams.get("userId")).toBe("user-123");
			expect(url.searchParams.get("orgId")).toBe("org-456");
		});

		it("should include browser hints as base64 encoded headers param", async () => {
			const mockFetcher = createMockFetcher(
				new Response(JSON.stringify({ success: true, data: mockSettings }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;
			const browserHints: BrowserHints = {
				"accept-language": "es-MX,es;q=0.9,en;q=0.8",
				"x-timezone": "America/Mexico_City",
				"x-preferred-theme": "dark",
			};

			await getResolvedSettings(env, "user-123", undefined, browserHints);

			const fetchCall = vi.mocked(mockFetcher.fetch).mock.calls[0];
			const request = fetchCall[0] as Request;
			const url = new URL(request.url);

			const headersParam = url.searchParams.get("headers");
			expect(headersParam).not.toBeNull();

			// Decode and verify the browser hints
			const decoded = JSON.parse(atob(headersParam!));
			expect(decoded).toEqual(browserHints);
		});

		it("should not include headers param when browser hints are not provided", async () => {
			const mockFetcher = createMockFetcher(
				new Response(JSON.stringify({ success: true, data: mockSettings }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;

			await getResolvedSettings(env, "user-123");

			const fetchCall = vi.mocked(mockFetcher.fetch).mock.calls[0];
			const request = fetchCall[0] as Request;
			const url = new URL(request.url);

			expect(url.searchParams.has("headers")).toBe(false);
		});

		it("should return null on non-OK response", async () => {
			const mockFetcher = createMockFetcher(
				new Response("Not Found", { status: 404, statusText: "Not Found" }),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;

			const result = await getResolvedSettings(env, "user-123");

			expect(result).toBeNull();
		});

		it("should return null when response indicates failure", async () => {
			const mockFetcher = createMockFetcher(
				new Response(JSON.stringify({ success: false }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;

			const result = await getResolvedSettings(env, "user-123");

			expect(result).toBeNull();
		});

		it("should return null on fetch exception", async () => {
			const mockFetcher: Fetcher = {
				fetch: vi.fn().mockRejectedValue(new Error("Connection refused")),
				connect: vi.fn(),
			};

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;

			const result = await getResolvedSettings(env, "user-123");

			expect(result).toBeNull();
		});

		it("should construct correct base URL for auth-svc internal endpoint", async () => {
			const mockFetcher = createMockFetcher(
				new Response(JSON.stringify({ success: true, data: mockSettings }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);

			const env = { AUTH_SERVICE: mockFetcher } as Bindings;

			await getResolvedSettings(env, "user-123");

			const fetchCall = vi.mocked(mockFetcher.fetch).mock.calls[0];
			const request = fetchCall[0] as Request;
			const url = new URL(request.url);

			expect(url.origin).toBe("https://auth-svc.internal");
			expect(url.pathname).toBe("/internal/settings/resolved");
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
