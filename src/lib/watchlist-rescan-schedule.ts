/**
 * Watchlist rescan runs on a dedicated weekly cron (see aml-svc `scheduled` handler).
 * Keep the expression in one place for tests and docs.
 */
export const WATCHLIST_RESCAN_CRON = "0 3 * * 0" as const;

export function isWatchlistRescanCron(cron: string): boolean {
	return cron === WATCHLIST_RESCAN_CRON;
}
