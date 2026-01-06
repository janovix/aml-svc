#!/usr/bin/env node

/**
 * Migration script: Migrate existing MONTHLY reports with SAT data to Notices
 *
 * This script:
 * 1. Finds all MONTHLY reports that have been submitted or acknowledged (SAT workflow)
 * 2. Creates corresponding Notice records
 * 3. Migrates the alert associations from reportId to noticeId
 * 4. Preserves the original reports for reference
 *
 * Run with: node scripts/migrate-monthly-to-notices.mjs
 *
 * Prerequisites:
 * - The 0004_add_notices_enhance_reports.sql migration must be applied
 * - Run in dry-run mode first to verify: node scripts/migrate-monthly-to-notices.mjs --dry-run
 */

import { createClient } from "@libsql/client";

// Configuration
const DB_URL = process.env.DATABASE_URL || "file:./local.db";
const DRY_RUN = process.argv.includes("--dry-run");

console.log("=".repeat(60));
console.log("Migration: MONTHLY Reports → Notices");
console.log("=".repeat(60));
console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE"}`);
console.log(`Database: ${DB_URL}`);
console.log("");

const client = createClient({
	url: DB_URL,
});

/**
 * Generate a unique ID for notices
 */
function generateNoticeId() {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let id = "NOTICE_";
	for (let i = 0; i < 16; i++) {
		id += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return id;
}

/**
 * Map report status to notice status
 */
function mapReportStatusToNoticeStatus(reportStatus) {
	switch (reportStatus) {
		case "SUBMITTED":
			return "SUBMITTED";
		case "ACKNOWLEDGED":
			return "ACKNOWLEDGED";
		case "GENERATED":
			return "GENERATED";
		default:
			return "DRAFT";
	}
}

async function migrate() {
	try {
		// 1. Find MONTHLY reports that have SAT workflow data (SUBMITTED or ACKNOWLEDGED)
		console.log("Finding MONTHLY reports with SAT workflow...");
		const reportsResult = await client.execute(`
			SELECT
				id,
				organizationId,
				name,
				status,
				periodStart,
				periodEnd,
				reportedMonth,
				recordCount,
				xmlFileUrl,
				fileSize,
				generatedAt,
				submittedAt,
				satFolioNumber,
				createdBy,
				notes,
				createdAt,
				updatedAt
			FROM reports
			WHERE type = 'MONTHLY'
				AND (status = 'SUBMITTED' OR status = 'ACKNOWLEDGED')
			ORDER BY createdAt DESC
		`);

		const reports = reportsResult.rows;
		console.log(`Found ${reports.length} MONTHLY reports to migrate`);

		if (reports.length === 0) {
			console.log("No reports to migrate. Exiting.");
			return;
		}

		// 2. For each report, create a Notice and migrate alerts
		let migratedCount = 0;
		let errorCount = 0;

		for (const report of reports) {
			console.log(`\nProcessing report: ${report.id}`);
			console.log(`  Name: ${report.name}`);
			console.log(`  Period: ${report.reportedMonth}`);
			console.log(`  Status: ${report.status}`);
			console.log(`  Alerts: ${report.recordCount}`);

			const noticeId = generateNoticeId();
			const noticeStatus = mapReportStatusToNoticeStatus(report.status);

			if (DRY_RUN) {
				console.log(`  [DRY RUN] Would create Notice: ${noticeId}`);
				console.log(`  [DRY RUN] Would migrate ${report.recordCount} alerts`);
				migratedCount++;
				continue;
			}

			try {
				// Create the Notice
				await client.execute({
					sql: `
						INSERT INTO notices (
							id,
							organizationId,
							name,
							status,
							periodStart,
							periodEnd,
							reportedMonth,
							recordCount,
							xmlFileUrl,
							fileSize,
							generatedAt,
							submittedAt,
							satFolioNumber,
							createdBy,
							notes,
							createdAt,
							updatedAt
						) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					`,
					args: [
						noticeId,
						report.organizationId,
						report.name,
						noticeStatus,
						report.periodStart,
						report.periodEnd,
						report.reportedMonth,
						report.recordCount,
						report.xmlFileUrl,
						report.fileSize,
						report.generatedAt,
						report.submittedAt,
						report.satFolioNumber,
						report.createdBy,
						report.notes,
						report.createdAt,
						report.updatedAt,
					],
				});

				console.log(`  ✓ Created Notice: ${noticeId}`);

				// Migrate alerts from reportId to noticeId
				const alertUpdateResult = await client.execute({
					sql: `
						UPDATE alerts
						SET noticeId = ?, reportId = NULL
						WHERE reportId = ?
					`,
					args: [noticeId, report.id],
				});

				console.log(`  ✓ Migrated ${alertUpdateResult.rowsAffected} alerts`);

				// Optionally, update the original report to indicate it's been migrated
				await client.execute({
					sql: `
					UPDATE reports
					SET notes = COALESCE(notes || '\n', '') || '[MIGRATED TO NOTICE: ' || ? || ']',
						type = 'CUSTOM'
					WHERE id = ?
				`,
					args: [noticeId, report.id],
				});

				console.log(`  ✓ Marked original report as migrated`);

				migratedCount++;
			} catch (error) {
				console.error(`  ✗ Error migrating report: ${error.message}`);
				errorCount++;
			}
		}

		console.log("\n" + "=".repeat(60));
		console.log("Migration Summary");
		console.log("=".repeat(60));
		console.log(`Total reports found: ${reports.length}`);
		console.log(`Successfully migrated: ${migratedCount}`);
		console.log(`Errors: ${errorCount}`);

		if (DRY_RUN) {
			console.log("\nThis was a DRY RUN. No changes were made.");
			console.log("Run without --dry-run to apply changes.");
		}
	} catch (error) {
		console.error("Migration failed:", error);
		process.exit(1);
	} finally {
		client.close();
	}
}

migrate();
