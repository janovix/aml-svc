import type { LanguageCode } from "./i18n";
import { normalizeLanguage } from "./i18n";
import type { Bindings } from "../types";

/**
 * Resolves organization default language via auth-svc RPC.
 */
export async function getOrganizationLanguageForTenant(
	env: Bindings,
	organizationId: string,
): Promise<LanguageCode> {
	const auth = env.AUTH_SERVICE;
	if (!auth || typeof auth.getOrganizationLanguage !== "function") {
		return "en";
	}
	try {
		const lang = await auth.getOrganizationLanguage(organizationId);
		return normalizeLanguage(lang as string);
	} catch {
		return "en";
	}
}
