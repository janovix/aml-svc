#!/usr/bin/env node
/**
 * Recalculate KYC Progress for All Clients
 *
 * Calls the internal maintenance endpoint in a pagination loop until all
 * clients have been processed. Designed to be run from CI/CD (GitHub Actions)
 * or locally against any environment.
 *
 * Required env vars:
 *   API_URL                  Base URL of the aml-svc worker
 *                            (e.g. https://aml-svc.example.workers.dev)
 *   INTERNAL_SERVICE_SECRET  Bearer token accepted by /internal/maintenance/*
 *
 * Optional env vars:
 *   ORGANIZATION_ID          Restrict to a single organization (optional)
 *   BATCH_SIZE               Clients per request (default: 20, max: 50)
 */

const API_BASE_URL = process.env.API_URL;
const SECRET = process.env.INTERNAL_SERVICE_SECRET;
const ORGANIZATION_ID = process.env.ORGANIZATION_ID || "";
const BATCH_SIZE = Math.min(
	50,
	Math.max(1, parseInt(process.env.BATCH_SIZE || "20", 10)),
);

if (!API_BASE_URL) {
	console.error("❌ API_URL environment variable is required");
	process.exit(1);
}

if (!SECRET) {
	console.error("❌ INTERNAL_SERVICE_SECRET environment variable is required");
	process.exit(1);
}

async function recalculateBatch(offset) {
	const url = new URL(
		`${API_BASE_URL}/api/v1/internal/maintenance/recalculate-kyc`,
	);
	url.searchParams.set("offset", String(offset));
	url.searchParams.set("limit", String(BATCH_SIZE));
	if (ORGANIZATION_ID) {
		url.searchParams.set("organizationId", ORGANIZATION_ID);
	}

	const response = await fetch(url.toString(), {
		method: "POST",
		headers: {
			Authorization: `Bearer ${SECRET}`,
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`HTTP ${response.status}: ${text}`);
	}

	return response.json();
}

async function main() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║           KYC Progress Recalculation                       ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	console.log(`🔗 Target:       ${API_BASE_URL}`);
	console.log(`📦 Batch size:   ${BATCH_SIZE}`);
	console.log(
		`🏢 Org filter:   ${ORGANIZATION_ID ? ORGANIZATION_ID : "all organizations"}\n`,
	);

	const globalStart = Date.now();

	let offset = 0;
	let totalProcessed = 0;
	let totalErrors = 0;
	let grandTotal = null;
	let batchNumber = 0;

	while (true) {
		batchNumber++;
		process.stdout.write(`Batch #${batchNumber} (offset ${offset})… `);

		let result;
		try {
			result = await recalculateBatch(offset);
		} catch (err) {
			console.error(`\n❌ Batch #${batchNumber} failed: ${err.message}`);
			process.exit(1);
		}

		const { data } = result;
		grandTotal ??= data.total;

		totalProcessed += data.processed;
		totalErrors += data.errors;

		const pct =
			grandTotal > 0 ? Math.round((totalProcessed / grandTotal) * 100) : 100;
		console.log(
			`✓ processed ${data.processed}, errors ${data.errors}  [${totalProcessed}/${grandTotal} — ${pct}%  ${data.duration_ms}ms]`,
		);

		if (data.errorDetails?.length) {
			for (const e of data.errorDetails) {
				console.warn(`  ⚠ Client ${e.clientId}: ${e.error}`);
			}
		}

		if (data.nextOffset === null) {
			break;
		}

		offset = data.nextOffset;
	}

	const elapsed = Date.now() - globalStart;

	console.log(
		"\n╔════════════════════════════════════════════════════════════╗",
	);
	console.log("║                     Complete!                              ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	console.log(`✅ Total clients : ${grandTotal ?? 0}`);
	console.log(`   Processed     : ${totalProcessed}`);
	console.log(`   Errors        : ${totalErrors}`);
	console.log(`   Wall time     : ${(elapsed / 1000).toFixed(1)}s`);

	if (totalErrors > 0) {
		console.error(
			"\n⚠️  Some clients failed — review the error details above.",
		);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
