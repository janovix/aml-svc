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
}

/**
 * Watchlist search service client
 */
export class WatchlistSearchService {
	constructor(private watchlistService: Fetcher | undefined) {}

	/**
	 * Trigger a watchlist search via service binding.
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
		} = params;

		try {
			console.log(
				`[WatchlistSearch] Triggering search for "${query}" (orgId: ${organizationId}, userId: ${userId})`,
			);

			const response = await this.watchlistService.fetch(
				"http://watchlist-svc/internal/search",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Organization-Id": organizationId,
						"X-User-Id": userId,
					},
					body: JSON.stringify({
						q: query,
						entityType,
						...(source ? { source } : {}),
						birthDate,
						identifiers,
						countries,
						topK: 20,
						threshold: 0.7,
					}),
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error(
					`[WatchlistSearch] Search request failed: ${response.status} ${errorText}`,
				);
				return null;
			}

			const result = (await response.json()) as {
				success: boolean;
				result?: {
					queryId: string;
					ofac: { count: number };
					unsc: { count: number };
					sat69b: { count: number };
				};
			};

			if (result.success && result.result?.queryId) {
				const { queryId, ofac, unsc, sat69b } = result.result;
				console.log(
					`[WatchlistSearch] Search initiated successfully, queryId: ${queryId}, matches: OFAC=${ofac.count}, UNSC=${unsc.count}, SAT 69-B=${sat69b.count}`,
				);
				return {
					queryId,
					ofacCount: ofac.count,
					unscCount: unsc.count,
					sat69bCount: sat69b.count,
				};
			}

			console.error("[WatchlistSearch] Unexpected response format:", result);
			return null;
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
	watchlistService: Fetcher | undefined,
): WatchlistSearchService {
	return new WatchlistSearchService(watchlistService);
}
