/**
 * Client Processor
 * Processes client rows from CSV/Excel import using direct service calls.
 */

import type { PrismaClient } from "@prisma/client";
import type { Bindings } from "../../../types";
import type { ParsedRow, RowProcessingResult, ClientRowData } from "../types";
import type { ClientCreateInput } from "../../client/schemas";
import { ClientRepository } from "../../client/repository";
import { productionTenant } from "../../../lib/tenant-context";
import { ClientService } from "../../client/service";
import { createAlertQueueService } from "../../../lib/alert-queue";
import { createRiskQueueService, type RiskJob } from "../../../lib/risk-queue";
import { createWatchlistSearchService } from "../../../lib/watchlist-search";
import { getClientDisplayName } from "../../../lib/route-helpers";

const REQUIRED_FIELDS_PHYSICAL = [
	"person_type",
	"rfc",
	"first_name",
	"last_name",
	"birth_date",
	"curp",
	"email",
	"phone",
	"country",
	"state_code",
	"city",
	"municipality",
	"neighborhood",
	"street",
	"external_number",
	"postal_code",
];

const REQUIRED_FIELDS_MORAL = [
	"person_type",
	"rfc",
	"business_name",
	"incorporation_date",
	"email",
	"phone",
	"country",
	"state_code",
	"city",
	"municipality",
	"neighborhood",
	"street",
	"external_number",
	"postal_code",
];

const REQUIRED_FIELDS_TRUST = REQUIRED_FIELDS_MORAL;

export function getClientRequiredHeaders(): string[] {
	return [
		"person_type",
		"rfc",
		"email",
		"phone",
		"country",
		"state_code",
		"city",
		"municipality",
		"neighborhood",
		"street",
		"external_number",
		"postal_code",
	];
}

function validateClientRow(data: Record<string, string>): {
	valid: boolean;
	errors: string[];
	rowData: ClientRowData | null;
} {
	const errors: string[] = [];
	const personType = data.person_type?.toLowerCase();

	let requiredFields: string[];
	if (personType === "physical") {
		requiredFields = REQUIRED_FIELDS_PHYSICAL;
	} else if (personType === "moral") {
		requiredFields = REQUIRED_FIELDS_MORAL;
	} else if (personType === "trust") {
		requiredFields = REQUIRED_FIELDS_TRUST;
	} else {
		errors.push(
			`Invalid person_type: "${data.person_type}". Must be physical, moral, or trust`,
		);
		return { valid: false, errors, rowData: null };
	}

	for (const field of requiredFields) {
		if (!data[field] || data[field].trim() === "") {
			errors.push(`Missing required field: ${field}`);
		}
	}

	if (data.rfc) {
		const rfcLength = data.rfc.length;
		if (personType === "physical" && rfcLength !== 13) {
			errors.push(
				`RFC for physical persons must be 13 characters (got ${rfcLength})`,
			);
		} else if (
			(personType === "moral" || personType === "trust") &&
			rfcLength !== 12
		) {
			errors.push(
				`RFC for legal entities must be 12 characters (got ${rfcLength})`,
			);
		}
	}

	if (data.email && !isValidEmail(data.email)) {
		errors.push(`Invalid email format: ${data.email}`);
	}

	if (personType === "physical" && data.curp) {
		if (data.curp.length !== 18) {
			errors.push(`CURP must be 18 characters (got ${data.curp.length})`);
		}
	}

	if (data.birth_date && !isValidDate(data.birth_date)) {
		errors.push(`Invalid birth_date format: ${data.birth_date}`);
	}
	if (data.incorporation_date && !isValidDate(data.incorporation_date)) {
		errors.push(
			`Invalid incorporation_date format: ${data.incorporation_date}`,
		);
	}

	if (data.gender) {
		const validGenders = ["M", "F", "OTHER"];
		if (!validGenders.includes(data.gender.toUpperCase())) {
			errors.push(`Invalid gender: "${data.gender}". Must be M, F, or OTHER`);
		}
	}

	if (data.marital_status) {
		const validStatuses = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"];
		if (!validStatuses.includes(data.marital_status.toUpperCase())) {
			errors.push(
				`Invalid marital_status: "${data.marital_status}". Must be SINGLE, MARRIED, DIVORCED, WIDOWED, or OTHER`,
			);
		}
	}

	if (errors.length > 0) {
		return { valid: false, errors, rowData: null };
	}

	const rowData: ClientRowData = {
		person_type: personType,
		rfc: data.rfc.toUpperCase(),
		first_name: data.first_name,
		last_name: data.last_name,
		second_last_name: data.second_last_name,
		birth_date: data.birth_date,
		curp: data.curp?.toUpperCase(),
		business_name: data.business_name,
		incorporation_date: data.incorporation_date,
		nationality:
			data.nationality || (personType === "physical" ? "MX" : undefined),
		email: data.email.toLowerCase(),
		phone: data.phone,
		country: data.country.toUpperCase(),
		state_code: data.state_code.toUpperCase(),
		city: data.city,
		municipality: data.municipality,
		neighborhood: data.neighborhood,
		street: data.street,
		external_number: data.external_number,
		internal_number: data.internal_number,
		postal_code: data.postal_code,
		reference: data.reference,
		notes: data.notes,
		country_code: data.country_code?.toUpperCase(),
		economic_activity_code: data.economic_activity_code,
		gender: data.gender?.toUpperCase(),
		occupation: data.occupation,
		marital_status: data.marital_status?.toUpperCase(),
		source_of_funds: data.source_of_funds,
		source_of_wealth: data.source_of_wealth,
	};

	return { valid: true, errors: [], rowData };
}

/**
 * Processes a single client row using direct service calls.
 * Replicates the side-effects from the internal client creation route:
 * alert queue, risk queue, watchlist screening.
 */
export async function processClientRow(
	prisma: PrismaClient,
	env: Bindings,
	organizationId: string,
	row: ParsedRow,
	createdBy: string,
): Promise<RowProcessingResult> {
	const { rowNumber, data } = row;

	const validation = validateClientRow(data);
	if (!validation.valid || !validation.rowData) {
		return {
			rowNumber,
			status: "ERROR",
			errors: validation.errors,
			message: `Validation failed: ${validation.errors.join("; ")}`,
		};
	}

	const rowData = validation.rowData;

	const str = (v: string | undefined) => v || undefined;

	const clientPayload: ClientCreateInput = {
		personType: rowData.person_type as "physical" | "moral" | "trust",
		rfc: rowData.rfc,
		firstName: str(rowData.first_name),
		lastName: str(rowData.last_name),
		secondLastName: str(rowData.second_last_name),
		birthDate: str(rowData.birth_date),
		curp: str(rowData.curp),
		businessName: str(rowData.business_name),
		incorporationDate: rowData.incorporation_date
			? new Date(rowData.incorporation_date).toISOString()
			: undefined,
		nationality: str(rowData.nationality),
		email: rowData.email,
		phone: rowData.phone,
		country: rowData.country,
		stateCode: rowData.state_code,
		city: rowData.city,
		municipality: rowData.municipality,
		neighborhood: rowData.neighborhood,
		street: rowData.street,
		externalNumber: rowData.external_number,
		internalNumber: str(rowData.internal_number),
		postalCode: rowData.postal_code,
		reference: str(rowData.reference),
		notes: str(rowData.notes),
		countryCode: str(rowData.country_code),
		economicActivityCode: str(rowData.economic_activity_code),
		gender: str(rowData.gender),
		occupation: str(rowData.occupation),
		maritalStatus: str(rowData.marital_status),
		sourceOfFunds: str(rowData.source_of_funds),
		sourceOfWealth: str(rowData.source_of_wealth),
	} as ClientCreateInput;

	try {
		const repository = new ClientRepository(prisma);
		const service = new ClientService(repository);
		const created = await service.create(
			productionTenant(organizationId),
			clientPayload,
		);

		// Side-effects (non-blocking, mirror internal route behaviour)
		try {
			const alertQueue = createAlertQueueService(env.ALERT_DETECTION_QUEUE);
			await alertQueue.queueClientCreated(created.id, organizationId);
		} catch {
			/* best-effort */
		}

		try {
			const riskQueue = createRiskQueueService(
				env.RISK_ASSESSMENT_QUEUE as Queue<RiskJob> | undefined,
			);
			await riskQueue.queueClientAssess(
				organizationId,
				created.id,
				"client_created_import",
			);
		} catch {
			/* best-effort */
		}

		// Watchlist screening (fire-and-forget)
		try {
			const watchlistSearch = createWatchlistSearchService(
				env.WATCHLIST_SERVICE,
			);
			const fullName = getClientDisplayName(created);
			if (fullName) {
				const result = await watchlistSearch.triggerSearch({
					query: fullName,
					entityType:
						created.personType === "physical" ? "person" : "organization",
					organizationId,
					userId: createdBy,
					source: "csv_import",
					birthDate: created.birthDate || undefined,
					identifiers: created.rfc ? [created.rfc] : undefined,
					countries: created.nationality ? [created.nationality] : undefined,
				});

				if (result?.queryId) {
					const isFlagged =
						result.ofacCount > 0 ||
						result.unscCount > 0 ||
						result.sat69bCount > 0;
					await prisma.client.update({
						where: { id: created.id },
						data: {
							watchlistQueryId: result.queryId,
							ofacSanctioned: result.ofacCount > 0,
							unscSanctioned: result.unscCount > 0,
							sat69bListed: result.sat69bCount > 0,
							screeningResult: isFlagged ? "flagged" : "pending",
							screenedAt: new Date(),
						},
					});
				}
			}
		} catch (err) {
			console.warn(
				`[ClientProcessor] Row ${rowNumber} watchlist screening failed (non-fatal):`,
				err,
			);
		}

		return {
			rowNumber,
			status: "SUCCESS",
			entityId: created.id,
			message: "Client created successfully",
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		if (
			errorMessage.includes("UNIQUE constraint failed") ||
			errorMessage.toLowerCase().includes("duplicate")
		) {
			return {
				rowNumber,
				status: "WARNING",
				message: `Client with RFC ${rowData.rfc} already exists - skipped`,
			};
		}

		console.error(`[ClientProcessor] Row ${rowNumber} error:`, error);
		return {
			rowNumber,
			status: "ERROR",
			errors: [errorMessage],
			message: `Failed to create client: ${errorMessage}`,
		};
	}
}

function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(dateStr: string): boolean {
	const date = new Date(dateStr);
	return !isNaN(date.getTime());
}
