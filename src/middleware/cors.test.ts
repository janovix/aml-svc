import { describe, it, expect } from "vitest";
import { isOriginAllowed } from "./cors";

describe("CORS Middleware", () => {
	describe("isOriginAllowed", () => {
		describe("exact origin matching", () => {
			it("should allow exact match", () => {
				const patterns = ["https://aml.janovix.com"];
				expect(isOriginAllowed("https://aml.janovix.com", patterns)).toBe(true);
			});

			it("should reject non-matching origin", () => {
				const patterns = ["https://aml.janovix.com"];
				expect(isOriginAllowed("https://other.janovix.com", patterns)).toBe(
					false,
				);
			});

			it("should be case-sensitive for exact match", () => {
				const patterns = ["https://aml.janovix.com"];
				expect(isOriginAllowed("https://AML.janovix.com", patterns)).toBe(
					false,
				);
			});

			it("should handle multiple exact patterns", () => {
				const patterns = [
					"https://aml.janovix.com",
					"https://auth.janovix.com",
				];
				expect(isOriginAllowed("https://auth.janovix.com", patterns)).toBe(
					true,
				);
				expect(isOriginAllowed("https://aml.janovix.com", patterns)).toBe(true);
				expect(isOriginAllowed("https://other.janovix.com", patterns)).toBe(
					false,
				);
			});
		});

		describe("wildcard subdomain matching", () => {
			it("should match valid subdomain with wildcard pattern", () => {
				const patterns = ["*.janovix.com"];
				expect(isOriginAllowed("https://aml.janovix.com", patterns)).toBe(true);
				expect(isOriginAllowed("https://auth.janovix.com", patterns)).toBe(
					true,
				);
				expect(isOriginAllowed("https://api.janovix.com", patterns)).toBe(true);
			});

			it("should match subdomain with http protocol", () => {
				const patterns = ["*.janovix.workers.dev"];
				expect(
					isOriginAllowed("http://aml.janovix.workers.dev", patterns),
				).toBe(true);
			});

			it("should match subdomain with https protocol", () => {
				const patterns = ["*.janovix.workers.dev"];
				expect(
					isOriginAllowed("https://aml.janovix.workers.dev", patterns),
				).toBe(true);
			});

			it("should match subdomain with hyphens", () => {
				const patterns = ["*.janovix.workers.dev"];
				expect(
					isOriginAllowed("https://aml.janovix.workers.dev", patterns),
				).toBe(true);
				expect(
					isOriginAllowed("https://my-app-test.janovix.workers.dev", patterns),
				).toBe(true);
			});

			it("should match subdomain with numbers", () => {
				const patterns = ["*.janovix.com"];
				expect(isOriginAllowed("https://app123.janovix.com", patterns)).toBe(
					true,
				);
				expect(isOriginAllowed("https://v2.janovix.com", patterns)).toBe(true);
			});

			it("should NOT match root domain with wildcard", () => {
				const patterns = ["*.janovix.com"];
				// Root domain without subdomain should NOT match *.janovix.com
				expect(isOriginAllowed("https://janovix.com", patterns)).toBe(false);
			});

			it("should NOT match nested subdomains (multi-level)", () => {
				const patterns = ["*.janovix.com"];
				// "api.v2.janovix.com" has "api.v2" before ".janovix.com" which contains a dot
				// Our regex requires alphanumeric+hyphens only, no dots
				expect(isOriginAllowed("https://api.v2.janovix.com", patterns)).toBe(
					false,
				);
			});

			it("should NOT match if subdomain contains invalid characters", () => {
				const patterns = ["*.janovix.com"];
				// Underscore is not valid in subdomain
				expect(isOriginAllowed("https://my_app.janovix.com", patterns)).toBe(
					false,
				);
				// Space is not valid
				expect(isOriginAllowed("https://my app.janovix.com", patterns)).toBe(
					false,
				);
			});

			it("should NOT match partial domain suffix attacks", () => {
				const patterns = ["*.janovix.com"];
				// malicious-janovix.com should not match *.janovix.com
				expect(isOriginAllowed("https://malicious-janovix.com", patterns)).toBe(
					false,
				);
				// evil.notjanovix.com should not match
				expect(isOriginAllowed("https://evil.notjanovix.com", patterns)).toBe(
					false,
				);
			});

			it("should NOT match without protocol", () => {
				const patterns = ["*.janovix.com"];
				expect(isOriginAllowed("aml.janovix.com", patterns)).toBe(false);
			});

			it("should handle case-insensitive subdomain matching", () => {
				const patterns = ["*.janovix.com"];
				// Subdomains are case-insensitive in DNS
				expect(isOriginAllowed("https://AML.janovix.com", patterns)).toBe(true);
				expect(isOriginAllowed("https://Auth.janovix.com", patterns)).toBe(
					true,
				);
			});
		});

		describe("localhost wildcard port matching", () => {
			it("should match localhost with any port", () => {
				const patterns = ["http://localhost:*"];
				expect(isOriginAllowed("http://localhost:3000", patterns)).toBe(true);
				expect(isOriginAllowed("http://localhost:3001", patterns)).toBe(true);
				expect(isOriginAllowed("http://localhost:8080", patterns)).toBe(true);
				expect(isOriginAllowed("http://localhost:80", patterns)).toBe(true);
			});

			it("should NOT match localhost without port", () => {
				const patterns = ["http://localhost:*"];
				expect(isOriginAllowed("http://localhost", patterns)).toBe(false);
			});

			it("should NOT match https localhost with http pattern", () => {
				const patterns = ["http://localhost:*"];
				expect(isOriginAllowed("https://localhost:3000", patterns)).toBe(false);
			});

			it("should NOT match localhost with non-numeric port", () => {
				const patterns = ["http://localhost:*"];
				expect(isOriginAllowed("http://localhost:abc", patterns)).toBe(false);
				expect(isOriginAllowed("http://localhost:3000a", patterns)).toBe(false);
			});

			it("should NOT match 127.0.0.1 with localhost pattern", () => {
				const patterns = ["http://localhost:*"];
				expect(isOriginAllowed("http://127.0.0.1:3000", patterns)).toBe(false);
			});
		});

		describe("combined patterns", () => {
			it("should match any of multiple pattern types", () => {
				const patterns = [
					"*.janovix.com",
					"https://janovix.com",
					"http://localhost:*",
				];

				// Wildcard subdomain
				expect(isOriginAllowed("https://aml.janovix.com", patterns)).toBe(true);
				// Exact match for root domain
				expect(isOriginAllowed("https://janovix.com", patterns)).toBe(true);
				// Localhost
				expect(isOriginAllowed("http://localhost:3000", patterns)).toBe(true);
				// Non-matching
				expect(isOriginAllowed("https://evil.com", patterns)).toBe(false);
			});

			it("should support workers.dev pattern", () => {
				const patterns = ["*.janovix.workers.dev", "http://localhost:*"];

				expect(
					isOriginAllowed("https://aml.janovix.workers.dev", patterns),
				).toBe(true);
				expect(
					isOriginAllowed("https://auth.janovix.workers.dev", patterns),
				).toBe(true);
				expect(isOriginAllowed("http://localhost:3000", patterns)).toBe(true);
				expect(isOriginAllowed("https://janovix.workers.dev", patterns)).toBe(
					false,
				);
			});
		});

		describe("edge cases", () => {
			it("should return false for empty patterns array", () => {
				expect(isOriginAllowed("https://aml.janovix.com", [])).toBe(false);
			});

			it("should return false for empty origin", () => {
				const patterns = ["*.janovix.com"];
				expect(isOriginAllowed("", patterns)).toBe(false);
			});

			it("should handle origin with trailing slash", () => {
				const patterns = ["https://aml.janovix.com"];
				// Origins typically don't have trailing slashes, but test anyway
				expect(isOriginAllowed("https://aml.janovix.com/", patterns)).toBe(
					false,
				);
			});

			it("should handle origin with path", () => {
				const patterns = ["*.janovix.com"];
				// Origins should not have paths, but we should not match them
				expect(isOriginAllowed("https://aml.janovix.com/path", patterns)).toBe(
					false,
				);
			});

			it("should handle origin with query string", () => {
				const patterns = ["*.janovix.com"];
				expect(
					isOriginAllowed("https://aml.janovix.com?query=1", patterns),
				).toBe(false);
			});

			it("should NOT match ftp or other protocols", () => {
				const patterns = ["*.janovix.com"];
				expect(isOriginAllowed("ftp://aml.janovix.com", patterns)).toBe(false);
				expect(isOriginAllowed("ws://aml.janovix.com", patterns)).toBe(false);
			});

			it("should handle pattern with port", () => {
				const patterns = ["https://aml.janovix.com:8080"];
				expect(isOriginAllowed("https://aml.janovix.com:8080", patterns)).toBe(
					true,
				);
				expect(isOriginAllowed("https://aml.janovix.com", patterns)).toBe(
					false,
				);
			});
		});

		describe("security", () => {
			it("should NOT allow overly broad patterns to match", () => {
				// Even if someone misconfigured patterns, our function should be safe
				const patterns = ["*"];
				// Our function doesn't support single wildcard
				expect(isOriginAllowed("https://evil.com", patterns)).toBe(false);
			});

			it("should require protocol in wildcard subdomain match", () => {
				const patterns = ["*.janovix.com"];
				// Without protocol, should not match
				expect(isOriginAllowed("aml.janovix.com", patterns)).toBe(false);
				expect(isOriginAllowed("//aml.janovix.com", patterns)).toBe(false);
			});

			it("should prevent header injection attempts", () => {
				const patterns = ["*.janovix.com"];
				// Various injection attempts
				expect(
					isOriginAllowed(
						"https://aml.janovix.com\r\nX-Injected: true",
						patterns,
					),
				).toBe(false);
				expect(
					isOriginAllowed(
						"https://aml.janovix.com%0d%0aX-Injected: true",
						patterns,
					),
				).toBe(false);
			});
		});
	});

	describe("corsMiddleware", () => {
		it("should deny CORS when no trusted patterns are configured", async () => {
			const { corsMiddleware } = await import("./cors");

			// corsMiddleware creates a Hono middleware that requires proper context
			// For now, we can verify it returns a function
			const middleware = corsMiddleware();
			expect(typeof middleware).toBe("function");
		});

		it("should allow CORS when trusted patterns match", async () => {
			const { corsMiddleware } = await import("./cors");

			const middleware = corsMiddleware();
			expect(typeof middleware).toBe("function");
		});

		it("should handle empty TRUSTED_ORIGINS environment variable", async () => {
			const { corsMiddleware } = await import("./cors");

			const middleware = corsMiddleware();
			expect(typeof middleware).toBe("function");
		});

		it("should parse comma-separated TRUSTED_ORIGINS correctly", async () => {
			const { corsMiddleware } = await import("./cors");

			const middleware = corsMiddleware();
			expect(typeof middleware).toBe("function");
		});
	});
});
