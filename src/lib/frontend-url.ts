import type { Bindings } from "../types";

/**
 * Public AML app origin for notification callback links (must be absolute URL with scheme).
 * Never derive this from TRUSTED_ORIGINS — that list includes CORS wildcards like *.janovix.com.
 */
export function getAmlFrontendUrl(env: Bindings): string {
	const url = env.AML_FRONTEND_URL?.trim();
	if (url) return url.replace(/\/$/, "");
	return "https://aml.janovix.workers.dev";
}
