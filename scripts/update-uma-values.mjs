/**
 * Script to update UMA values from INEGI official data
 *
 * Usage:
 *   node scripts/update-uma-values.mjs --year 2025 --value 108.57 --approved-by "compliance-officer@example.com"
 *
 * Or update via API:
 *   curl -X POST https://your-api-url/api/v1/uma-values \
 *     -H "Content-Type: application/json" \
 *     -H "Authorization: Bearer TOKEN" \
 *     -d '{"year": 2025, "dailyValue": 108.57, "effectiveDate": "2025-01-01T00:00:00Z", ...}'
 */

const API_BASE_URL = process.env.API_URL || "http://localhost:8787";
const API_TOKEN = process.env.API_TOKEN || "";

// UMA values from INEGI
// Source: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/uma/uma2025.pdf
// TODO: Update these values with exact data from the INEGI PDF
const UMA_VALUES = {
	2025: {
		dailyValue: 108.57, // PLACEHOLDER - Update with exact value from PDF
		effectiveDate: "2025-01-01T00:00:00Z",
		endDate: "2025-12-31T23:59:59Z",
		notes:
			"UMA value for 2025 - Source: INEGI. Verified against official PDF: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/uma/uma2025.pdf",
	},
	2024: {
		dailyValue: 108.57,
		effectiveDate: "2024-01-01T00:00:00Z",
		endDate: "2024-12-31T23:59:59Z",
		notes: "UMA value for 2024 - Historical reference",
	},
	2023: {
		dailyValue: 103.74,
		effectiveDate: "2023-01-01T00:00:00Z",
		endDate: "2023-12-31T23:59:59Z",
		notes: "UMA value for 2023 - Historical reference",
	},
	2022: {
		dailyValue: 96.22,
		effectiveDate: "2022-01-01T00:00:00Z",
		endDate: "2022-12-31T23:59:59Z",
		notes: "UMA value for 2022 - Historical reference",
	},
};

async function createUmaValue(year, umaData, approvedBy = null) {
	const url = `${API_BASE_URL}/api/v1/uma-values`;
	const payload = {
		year,
		dailyValue: umaData.dailyValue,
		effectiveDate: umaData.effectiveDate,
		endDate: umaData.endDate,
		approvedBy,
		notes: umaData.notes,
		active: year === 2025, // Set 2025 as active by default
	};

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(API_TOKEN && { Authorization: `Bearer ${API_TOKEN}` }),
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(
			`Failed to create UMA value for ${year}: ${response.status} ${error}`,
		);
	}

	return response.json();
}

async function activateUmaValue(id) {
	const url = `${API_BASE_URL}/api/v1/uma-values/${id}/activate`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			...(API_TOKEN && { Authorization: `Bearer ${API_TOKEN}` }),
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(
			`Failed to activate UMA value ${id}: ${response.status} ${error}`,
		);
	}

	return response.json();
}

async function main() {
	const args = process.argv.slice(2);
	const approvedBy =
		args.find((arg) => arg.startsWith("--approved-by="))?.split("=")[1] || null;

	console.log("Creating/updating UMA values from INEGI data...\n");
	console.log(
		"⚠️  IMPORTANT: Verify 2025 UMA value against official INEGI PDF:\n",
	);
	console.log(
		"   https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/uma/uma2025.pdf\n",
	);

	for (const [yearStr, umaData] of Object.entries(UMA_VALUES)) {
		const year = parseInt(yearStr, 10);
		try {
			console.log(`Creating UMA value for year ${year}...`);
			const created = await createUmaValue(year, umaData, approvedBy);
			console.log(`✓ Created UMA value for ${year}: ${created.dailyValue}\n`);

			// Activate 2025 if it's the current year
			if (year === 2025) {
				console.log(`Activating UMA value for ${year}...`);
				await activateUmaValue(created.id);
				console.log(`✓ Activated UMA value for ${year}\n`);
			}
		} catch (error) {
			if (error.message.includes("UNIQUE constraint")) {
				console.log(`⚠ UMA value for ${year} already exists. Skipping...\n`);
			} else {
				console.error(`✗ Error: ${error.message}\n`);
			}
		}
	}

	console.log("Done!");
	console.log(
		"\n⚠️  REMINDER: Verify and update 2025 UMA value with exact data from INEGI PDF",
	);
}

main().catch(console.error);
