-- Watchlist re-scan settings, per-org screen caps, and screening history snapshots

ALTER TABLE "organization_settings" ADD COLUMN "watchlist_rescan_enabled" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "organization_settings" ADD COLUMN "watchlist_rescan_interval_days" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "organization_settings" ADD COLUMN "watchlist_rescan_include_bcs" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "organization_settings" ADD COLUMN "watchlist_rescan_notify_on_status_change" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "organization_settings" ADD COLUMN "watchlist_rescan_daily_cap" INTEGER NOT NULL DEFAULT 500;
ALTER TABLE "organization_settings" ADD COLUMN "watchlist_rescan_notify_channels" TEXT NOT NULL DEFAULT '["in_app"]';
ALTER TABLE "organization_settings" ADD COLUMN "watchlist_rescan_sources" TEXT NOT NULL DEFAULT '["ofac","un","sat69b","pep","adverse_media"]';

CREATE TABLE "client_watchlist_screening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "watchlist_query_id" TEXT,
    "screened_at" DATETIME NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "screening_result" TEXT NOT NULL,
    "ofac_sanctioned" INTEGER NOT NULL DEFAULT 0,
    "unsc_sanctioned" INTEGER NOT NULL DEFAULT 0,
    "sat69b_listed" INTEGER NOT NULL DEFAULT 0,
    "is_pep" INTEGER NOT NULL DEFAULT 0,
    "adverse_media_flagged" INTEGER NOT NULL DEFAULT 0,
    "change_flags" TEXT,
    "prev_snapshot_id" TEXT,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_watchlist_screening_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "client_watchlist_screening_prev_snapshot_id_fkey" FOREIGN KEY ("prev_snapshot_id") REFERENCES "client_watchlist_screening"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "idx_cws_client_screened_at" ON "client_watchlist_screening"("client_id", "screened_at" DESC);
CREATE INDEX "idx_cws_org_screened_at" ON "client_watchlist_screening"("organization_id", "screened_at" DESC);
CREATE INDEX "idx_cws_organization_id" ON "client_watchlist_screening"("organization_id");

CREATE TABLE "beneficial_controller_watchlist_screening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "beneficial_controller_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "watchlist_query_id" TEXT,
    "screened_at" DATETIME NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "screening_result" TEXT NOT NULL,
    "ofac_sanctioned" INTEGER NOT NULL DEFAULT 0,
    "unsc_sanctioned" INTEGER NOT NULL DEFAULT 0,
    "sat69b_listed" INTEGER NOT NULL DEFAULT 0,
    "is_pep" INTEGER NOT NULL DEFAULT 0,
    "adverse_media_flagged" INTEGER NOT NULL DEFAULT 0,
    "change_flags" TEXT,
    "prev_snapshot_id" TEXT,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bc_watchlist_screening_bc_id_fkey" FOREIGN KEY ("beneficial_controller_id") REFERENCES "beneficial_controllers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bc_watchlist_screening_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bc_watchlist_screening_prev_fkey" FOREIGN KEY ("prev_snapshot_id") REFERENCES "beneficial_controller_watchlist_screening"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "idx_bcwss_bc_screened_at" ON "beneficial_controller_watchlist_screening"("beneficial_controller_id", "screened_at" DESC);
CREATE INDEX "idx_bcwss_org_screened_at" ON "beneficial_controller_watchlist_screening"("organization_id", "screened_at" DESC);
CREATE INDEX "idx_bcwss_client" ON "beneficial_controller_watchlist_screening"("client_id", "screened_at" DESC);
