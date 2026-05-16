/**
 * Watchlist search service for triggering automated screening via watchlist-svc.
 *
 * This service calls watchlist-svc's internal search endpoint via service binding
 * to initiate a watchlist screening when a client or UBO is created/updated.
 */

/**
 * Parameters for triggering a watchlist search
 */
export interface TriggerSearchParams {
	/** Search query (typically the client/BC full name) */
	query: string;
	/** Entity type */
	entityType: "person" | "organization";
	/** Organization ID for the search */
	organizationId: string;
	/** User ID who triggered the search */
	userId: string;
	/** Source of the search (e.g., "aml:client", "aml:bc", "manual") */
	source?: string;
	/** Birth date (optional, for person entities) */
	birthDate?: string;
	/** RFC and other identifiers (optional) */
	identifiers?: string[];
	/** Countries for filtering (optional) */
	countries?: string[];
	/** Links query row to AML client or beneficial controller in watchlist-svc */
	entityId?: string;
	entityKind?: "client" | "beneficial_controller";
	/** watchlist data slice (default production) */
	environment?: string;
}

/**
 * Minimal RPC interface matching `WatchlistEntrypoint.search`.
 * Defined locally to avoid cross-package imports.
 */
interface WatchlistServiceRpc {
	search(
		input: {
			q: string;
			entityType?: string;
			source?: string;
			birthDate?: string;
			countries?: string[];
			identifiers?: string[];
			topK?: number;
			threshold?: number;
			environment?: string;
			entityId?: string;
			entityKind?: "client" | "beneficial_controller";
		},
		organizationId: string,
		userId: string,
	): Promise<{
		queryId: string;
		ofacCount: number;
		unscCount: number;
		sat69bCount: number;
	}>;
}

/**
 * Watchlist search service client
 */
export class WatchlistSearchService {
	constructor(private watchlistService: WatchlistServiceRpc | undefined) {}

	/**
	 * Trigger a watchlist search via service binding RPC.
	 * Returns the queryId and sync match counts if successful, null if the service is unavailable.
	 */
	async triggerSearch(params: TriggerSearchParams): Promise<{
		queryId: string;
		ofacCount: number;
		unscCount: number;
		sat69bCount: number;
	} | null> {
		if (!this.watchlistService) {
			console.warn(
				"[WatchlistSearch] WATCHLIST_SERVICE binding not configured, skipping search",
			);
			return null;
		}

		const {
			query,
			entityType,
			organizationId,
			userId,
			source,
			birthDate,
			identifiers,
			countries,
			entityId,
			entityKind,
			environment,
		} = params;

		try {
			console.log(
				`[WatchlistSearch] Triggering search for "${query}" (orgId: ${organizationId}, userId: ${userId})`,
			);

			const result = await this.watchlistService.search(
				{
					q: query,
					entityType,
					...(source ? { source } : {}),
					birthDate,
					identifiers,
					countries,
					topK: 50,
					threshold: 0.875,
					...(environment ? { environment } : {}),
					...(entityId && entityKind ? { entityId, entityKind } : {}),
				},
				organizationId,
				userId,
			);

			console.log(
				`[WatchlistSearch] Search initiated, queryId: ${result.queryId}, matches: OFAC=${result.ofacCount}, UNSC=${result.unscCount}, SAT 69-B=${result.sat69bCount}`,
			);
			return result;
		} catch (error) {
			console.error(
				"[WatchlistSearch] Failed to trigger watchlist search:",
				error,
			);
			return null;
		}
	}
}

/**
 * Factory function to create a WatchlistSearchService instance
 */
export function createWatchlistSearchService(
	watchlistService: WatchlistServiceRpc | undefined,
): WatchlistSearchService {
	return new WatchlistSearchService(watchlistService);
}
