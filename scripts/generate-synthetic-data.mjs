#!/usr/bin/env node
/**
 * Generate Synthetic Data
 *
 * Generates synthetic data (clients, transactions, etc.) for a user account.
 * This script can be run locally or from GitHub Actions.
 *
 * Usage:
 *   node scripts/generate-synthetic-data.mjs
 *
 * Environment Variables:
 *   USER_ID - User ID for which to generate data (required)
 *   MODELS - Comma-separated list of models to generate: clients,transactions (required)
 *   CLIENTS_COUNT - Number of clients to generate (default: 10)
 *   CLIENTS_INCLUDE_DOCUMENTS - Include documents for clients (default: false)
 *   CLIENTS_INCLUDE_ADDRESSES - Include addresses for clients (default: false)
 *   TRANSACTIONS_COUNT - Number of transactions to generate (default: 50)
 *   TRANSACTIONS_PER_CLIENT - Number of transactions per client (optional)
 *   WRANGLER_CONFIG - Wrangler config file (optional, defaults to wrangler.preview.jsonc)
 *   CLOUDFLARE_API_TOKEN - Cloudflare API token for D1 access (required for remote)
 *   CLOUDFLARE_ACCOUNT_ID - Cloudflare account ID (required for remote)
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse environment variables
const userId = process.env.USER_ID;
const modelsStr = process.env.MODELS || "";
const clientsCount = parseInt(process.env.CLIENTS_COUNT || "10", 10);
const clientsIncludeDocuments =
	process.env.CLIENTS_INCLUDE_DOCUMENTS === "true";
const clientsIncludeAddresses =
	process.env.CLIENTS_INCLUDE_ADDRESSES === "true";
const transactionsCount = parseInt(process.env.TRANSACTIONS_COUNT || "50", 10);
const transactionsPerClient = process.env.TRANSACTIONS_PER_CLIENT
	? parseInt(process.env.TRANSACTIONS_PER_CLIENT, 10)
	: undefined;
const wranglerConfigFile =
	process.env.WRANGLER_CONFIG || "wrangler.preview.jsonc";

// Determine if we're running locally or remotely
const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";

// Validate required parameters
if (!userId) {
	console.error("❌ Error: USER_ID environment variable is required");
	process.exit(1);
}

if (!modelsStr) {
	console.error("❌ Error: MODELS environment variable is required");
	console.error("   Example: MODELS=clients,transactions");
	process.exit(1);
}

const models = modelsStr.split(",").map((m) => m.trim().toLowerCase());
const validModels = ["clients", "transactions"];
const invalidModels = models.filter((m) => !validModels.includes(m));

if (invalidModels.length > 0) {
	console.error(
		`❌ Error: Invalid models: ${invalidModels.join(", ")}. Valid models are: ${validModels.join(", ")}`,
	);
	process.exit(1);
}

// =========================================================================
// SQL Helper Functions
// =========================================================================

function escapeSqlString(str) {
	if (str === null || str === undefined) return "NULL";
	return `'${String(str).replace(/'/g, "''")}'`;
}

function formatDateForSql(date) {
	if (!date) return "NULL";
	const d = typeof date === "string" ? new Date(date) : date;
	return escapeSqlString(d.toISOString());
}

// =========================================================================
// Data Generation Constants
// =========================================================================

const FIRST_NAMES = [
	"Juan",
	"María",
	"José",
	"Ana",
	"Carlos",
	"Laura",
	"Miguel",
	"Patricia",
	"Roberto",
	"Guadalupe",
	"Francisco",
	"Carmen",
	"Luis",
	"Rosa",
	"Antonio",
	"Verónica",
	"Pedro",
	"Mónica",
	"Manuel",
	"Alejandra",
	"Ricardo",
	"Sofía",
	"Fernando",
	"Daniela",
	"Javier",
	"Andrea",
	"Eduardo",
	"Paola",
	"Sergio",
	"Gabriela",
];

const LAST_NAMES = [
	"García",
	"Rodríguez",
	"González",
	"López",
	"Martínez",
	"Hernández",
	"Pérez",
	"Sánchez",
	"Ramírez",
	"Torres",
	"Flores",
	"Rivera",
	"Gómez",
	"Díaz",
	"Cruz",
	"Morales",
	"Ortiz",
	"Gutiérrez",
	"Chávez",
	"Ramos",
	"Mendoza",
	"Ruiz",
	"Vargas",
	"Castillo",
	"Jiménez",
	"Moreno",
	"Romero",
	"Álvarez",
	"Méndez",
	"Guerrero",
];

const BUSINESS_NAMES = [
	"Automotriz del Norte",
	"Vehículos Premium",
	"Autos y Más",
	"Concesionaria Central",
	"Distribuidora Automotriz",
	"Grupo Vehícular",
	"Autoservicio Nacional",
	"Comercializadora de Vehículos",
	"Importadora Automotriz",
	"Venta de Autos SA",
];

const MEXICAN_STATES = [
	"AGU",
	"BCN",
	"BCS",
	"CAM",
	"CHP",
	"CHH",
	"COA",
	"COL",
	"DIF",
	"DUR",
	"GUA",
	"GRO",
	"HID",
	"JAL",
	"MEX",
	"MIC",
	"MOR",
	"NAY",
	"NLE",
	"OAX",
	"PUE",
	"QUE",
	"ROO",
	"SLP",
	"SIN",
	"SON",
	"TAB",
	"TAM",
	"TLA",
	"VER",
	"YUC",
	"ZAC",
];

const CITIES = [
	"Ciudad de México",
	"Guadalajara",
	"Monterrey",
	"Puebla",
	"Tijuana",
	"León",
	"Juárez",
	"Torreón",
	"Querétaro",
	"San Luis Potosí",
	"Mérida",
	"Mexicali",
	"Aguascalientes",
	"Tampico",
	"Culiacán",
	"Cuernavaca",
	"Acapulco",
	"Toluca",
	"Morelia",
	"Chihuahua",
];

const VEHICLE_BRANDS = [
	"Toyota",
	"Nissan",
	"Volkswagen",
	"Chevrolet",
	"Ford",
	"Honda",
	"Hyundai",
	"Kia",
	"Mazda",
	"BMW",
	"Mercedes-Benz",
	"Audi",
	"Jeep",
	"Ram",
	"GMC",
];

const VEHICLE_MODELS = [
	"Sentra",
	"Versa",
	"Altima",
	"Civic",
	"Corolla",
	"Camry",
	"Jetta",
	"Golf",
	"Silverado",
	"F-150",
	"Ranger",
	"Tacoma",
	"Tundra",
	"Wrangler",
	"Grand Cherokee",
];

const PAYMENT_METHODS = [
	"Efectivo",
	"Transferencia bancaria",
	"Cheque",
	"Tarjeta de crédito",
	"Tarjeta de débito",
	"Crédito",
	"Financiamiento",
];

// =========================================================================
// Data Generation Functions
// =========================================================================

function randomChoice(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a random RFC for physical persons (13 characters)
 */
function generatePhysicalRFC() {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const numbers = "0123456789";

	const part1 = Array.from(
		{ length: 4 },
		() => letters[Math.floor(Math.random() * letters.length)],
	).join("");

	const part2 = Array.from(
		{ length: 6 },
		() => numbers[Math.floor(Math.random() * numbers.length)],
	).join("");

	const part3 = Array.from({ length: 3 }, () => {
		const chars = letters + numbers;
		return chars[Math.floor(Math.random() * chars.length)];
	}).join("");

	return `${part1}${part2}${part3}`;
}

/**
 * Generates a random RFC for legal entities (12 characters)
 */
function generateMoralRFC() {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const numbers = "0123456789";

	const part1 = Array.from(
		{ length: 3 },
		() => letters[Math.floor(Math.random() * letters.length)],
	).join("");

	const part2 = Array.from(
		{ length: 6 },
		() => numbers[Math.floor(Math.random() * numbers.length)],
	).join("");

	const part3 = Array.from({ length: 3 }, () => {
		const chars = letters + numbers;
		return chars[Math.floor(Math.random() * chars.length)];
	}).join("");

	return `${part1}${part2}${part3}`;
}

/**
 * Generates a random CURP (18 characters)
 */
function generateCURP() {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const numbers = "0123456789";

	const part1 = Array.from(
		{ length: 4 },
		() => letters[Math.floor(Math.random() * letters.length)],
	).join("");

	const part2 = Array.from(
		{ length: 6 },
		() => numbers[Math.floor(Math.random() * numbers.length)],
	).join("");

	const part3 = letters[Math.floor(Math.random() * letters.length)];

	const part4 = Array.from(
		{ length: 5 },
		() => letters[Math.floor(Math.random() * letters.length)],
	).join("");

	const part5 = Array.from(
		{ length: 2 },
		() => numbers[Math.floor(Math.random() * numbers.length)],
	).join("");

	return `${part1}${part2}${part3}${part4}${part5}`;
}

function generateUUID() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

/**
 * Generates a synthetic physical client
 */
function generatePhysicalClient(index) {
	const firstName = randomChoice(FIRST_NAMES);
	const lastName = randomChoice(LAST_NAMES);
	const secondLastName = Math.random() > 0.3 ? randomChoice(LAST_NAMES) : null;

	const birthYear = 1950 + Math.floor(Math.random() * 50);
	const birthMonth = Math.floor(Math.random() * 12) + 1;
	const birthDay = Math.floor(Math.random() * 28) + 1;
	const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

	const rfc = generatePhysicalRFC();
	const curp = generateCURP();
	const stateCode = randomChoice(MEXICAN_STATES);
	const city = randomChoice(CITIES);

	return {
		rfc,
		personType: "PHYSICAL",
		firstName,
		lastName,
		secondLastName,
		birthDate,
		curp,
		businessName: null,
		incorporationDate: null,
		nationality: "MX",
		email: `client${index}.${rfc.toLowerCase()}@example.com`,
		phone: `+52${Math.floor(Math.random() * 9000000000) + 1000000000}`,
		country: "MX",
		stateCode,
		city,
		municipality: city,
		neighborhood: `Colonia ${Math.floor(Math.random() * 100)}`,
		street: `Calle ${Math.floor(Math.random() * 200)}`,
		externalNumber: String(Math.floor(Math.random() * 9999) + 1),
		internalNumber:
			Math.random() > 0.7 ? String(Math.floor(Math.random() * 99) + 1) : null,
		postalCode: String(Math.floor(Math.random() * 90000) + 10000),
	};
}

/**
 * Generates a synthetic legal entity client (moral)
 */
function generateMoralClient(index) {
	const businessName = `${randomChoice(BUSINESS_NAMES)} ${index + 1}`;
	const rfc = generateMoralRFC();

	const incorporationYear = 2000 + Math.floor(Math.random() * 24);
	const incorporationMonth = Math.floor(Math.random() * 12) + 1;
	const incorporationDay = Math.floor(Math.random() * 28) + 1;
	const incorporationDate = new Date(
		incorporationYear,
		incorporationMonth - 1,
		incorporationDay,
	);

	const stateCode = randomChoice(MEXICAN_STATES);
	const city = randomChoice(CITIES);

	return {
		rfc,
		personType: "MORAL",
		firstName: null,
		lastName: null,
		secondLastName: null,
		birthDate: null,
		curp: null,
		businessName,
		incorporationDate,
		nationality: null,
		email: `empresa${index}.${rfc.toLowerCase()}@example.com`,
		phone: `+52${Math.floor(Math.random() * 9000000000) + 1000000000}`,
		country: "MX",
		stateCode,
		city,
		municipality: city,
		neighborhood: `Colonia ${Math.floor(Math.random() * 100)}`,
		street: `Avenida ${Math.floor(Math.random() * 200)}`,
		externalNumber: String(Math.floor(Math.random() * 9999) + 1),
		internalNumber:
			Math.random() > 0.5 ? String(Math.floor(Math.random() * 99) + 1) : null,
		postalCode: String(Math.floor(Math.random() * 90000) + 10000),
	};
}

/**
 * Generates a synthetic transaction
 */
function generateTransaction(clientRfc, _index) {
	const operationYear = 2020 + Math.floor(Math.random() * 5);
	const operationMonth = Math.floor(Math.random() * 12) + 1;
	const operationDay = Math.floor(Math.random() * 28) + 1;
	const operationDate = new Date(
		operationYear,
		operationMonth - 1,
		operationDay,
	);

	const operationType = Math.random() > 0.5 ? "PURCHASE" : "SALE";
	const vehicleTypes = ["LAND", "MARINE", "AIR"];
	const vehicleType = randomChoice(vehicleTypes);
	const brand = randomChoice(VEHICLE_BRANDS);
	const model = randomChoice(VEHICLE_MODELS);
	const year = 2015 + Math.floor(Math.random() * 10);

	const amount = Math.floor(Math.random() * 5000000) + 100000;
	const currency = "MXN";

	// Generate engine number for land vehicles
	let engineNumber = null;
	let plates = null;
	let registrationNumber = null;
	let flagCountryId = null;

	if (vehicleType === "LAND") {
		engineNumber = Array.from({ length: 17 }, () => {
			const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
			return chars[Math.floor(Math.random() * chars.length)];
		}).join("");
		plates = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(Math.random() * 9000) + 1000}`;
	} else {
		registrationNumber = `REG${Math.floor(Math.random() * 999999)}`;
		flagCountryId = randomChoice(["MX", "US", "PA"]);
	}

	// Generate payment methods
	const paymentMethodCount = Math.floor(Math.random() * 3) + 1;
	const paymentMethods = [];
	let remainingAmount = amount;

	for (let i = 0; i < paymentMethodCount; i++) {
		const isLast = i === paymentMethodCount - 1;
		const methodAmount = isLast
			? remainingAmount
			: Math.floor(remainingAmount / (paymentMethodCount - i));
		remainingAmount -= methodAmount;

		paymentMethods.push({
			method: randomChoice(PAYMENT_METHODS),
			amount: methodAmount,
		});
	}

	return {
		id: generateUUID(),
		clientId: clientRfc,
		operationDate,
		operationType,
		branchPostalCode: String(Math.floor(Math.random() * 90000) + 10000),
		vehicleType,
		brandId: brand,
		model,
		year,
		armorLevel:
			Math.random() > 0.7 ? `Nivel ${Math.floor(Math.random() * 5) + 1}` : null,
		engineNumber,
		plates,
		registrationNumber,
		flagCountryId,
		amount,
		currency,
		paymentMethods,
	};
}

/**
 * Generates client document
 */
function generateClientDocument(clientRfc) {
	const documentTypes = [
		"NATIONAL_ID",
		"PASSPORT",
		"DRIVERS_LICENSE",
		"TAX_ID",
	];
	const docType = randomChoice(documentTypes);
	const docNumber = `${docType.substring(0, 3)}${Math.floor(Math.random() * 9999999)}`;

	const issueYear = 2020 + Math.floor(Math.random() * 5);
	const issueMonth = Math.floor(Math.random() * 12) + 1;
	const issueDay = Math.floor(Math.random() * 28) + 1;
	const issueDate = new Date(issueYear, issueMonth - 1, issueDay);
	const expiryDate = new Date(
		issueDate.getTime() + 365 * 24 * 60 * 60 * 1000 * 5,
	);

	return {
		id: generateUUID(),
		clientId: clientRfc,
		documentType: docType,
		documentNumber: docNumber,
		issuingCountry: "MX",
		issueDate,
		expiryDate,
		status: Math.random() > 0.3 ? "VERIFIED" : "PENDING",
	};
}

/**
 * Generates client address
 */
function generateClientAddress(clientRfc, index) {
	const addressTypes = ["RESIDENTIAL", "BUSINESS", "MAILING"];
	const stateCode = randomChoice(MEXICAN_STATES);
	const city = randomChoice(CITIES);

	return {
		id: generateUUID(),
		clientId: clientRfc,
		addressType: addressTypes[index % addressTypes.length],
		street1: `Calle ${Math.floor(Math.random() * 200)}`,
		street2:
			Math.random() > 0.5 ? `Colonia ${Math.floor(Math.random() * 100)}` : null,
		city,
		state: stateCode,
		postalCode: String(Math.floor(Math.random() * 90000) + 10000),
		country: "MX",
		isPrimary: index === 0,
	};
}

// =========================================================================
// SQL Generation Functions
// =========================================================================

function generateClientInsertSql(client) {
	return `INSERT INTO clients (
		rfc, personType, firstName, lastName, secondLastName, birthDate, curp,
		businessName, incorporationDate, nationality, email, phone, country,
		stateCode, city, municipality, neighborhood, street, externalNumber,
		internalNumber, postalCode, createdAt, updatedAt
	) VALUES (
		${escapeSqlString(client.rfc)},
		${escapeSqlString(client.personType)},
		${escapeSqlString(client.firstName)},
		${escapeSqlString(client.lastName)},
		${escapeSqlString(client.secondLastName)},
		${formatDateForSql(client.birthDate)},
		${escapeSqlString(client.curp)},
		${escapeSqlString(client.businessName)},
		${formatDateForSql(client.incorporationDate)},
		${escapeSqlString(client.nationality)},
		${escapeSqlString(client.email)},
		${escapeSqlString(client.phone)},
		${escapeSqlString(client.country)},
		${escapeSqlString(client.stateCode)},
		${escapeSqlString(client.city)},
		${escapeSqlString(client.municipality)},
		${escapeSqlString(client.neighborhood)},
		${escapeSqlString(client.street)},
		${escapeSqlString(client.externalNumber)},
		${escapeSqlString(client.internalNumber)},
		${escapeSqlString(client.postalCode)},
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP
	);`;
}

function generateTransactionInsertSql(transaction) {
	return `INSERT INTO transactions (
		id, clientId, operationDate, operationType, branchPostalCode, vehicleType,
		brandId, model, year, armorLevel, engineNumber, plates, registrationNumber,
		flagCountryId, amount, currency, createdAt, updatedAt
	) VALUES (
		${escapeSqlString(transaction.id)},
		${escapeSqlString(transaction.clientId)},
		${formatDateForSql(transaction.operationDate)},
		${escapeSqlString(transaction.operationType)},
		${escapeSqlString(transaction.branchPostalCode)},
		${escapeSqlString(transaction.vehicleType)},
		${escapeSqlString(transaction.brandId)},
		${escapeSqlString(transaction.model)},
		${transaction.year},
		${escapeSqlString(transaction.armorLevel)},
		${escapeSqlString(transaction.engineNumber)},
		${escapeSqlString(transaction.plates)},
		${escapeSqlString(transaction.registrationNumber)},
		${escapeSqlString(transaction.flagCountryId)},
		${transaction.amount},
		${escapeSqlString(transaction.currency)},
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP
	);`;
}

function generatePaymentMethodInsertSql(transactionId, paymentMethod) {
	return `INSERT INTO transaction_payment_methods (
		id, transactionId, method, amount, createdAt, updatedAt
	) VALUES (
		${escapeSqlString(generateUUID())},
		${escapeSqlString(transactionId)},
		${escapeSqlString(paymentMethod.method)},
		${paymentMethod.amount},
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP
	);`;
}

function generateDocumentInsertSql(doc) {
	return `INSERT INTO client_documents (
		id, clientId, documentType, documentNumber, issuingCountry,
		issueDate, expiryDate, status, createdAt, updatedAt
	) VALUES (
		${escapeSqlString(doc.id)},
		${escapeSqlString(doc.clientId)},
		${escapeSqlString(doc.documentType)},
		${escapeSqlString(doc.documentNumber)},
		${escapeSqlString(doc.issuingCountry)},
		${formatDateForSql(doc.issueDate)},
		${formatDateForSql(doc.expiryDate)},
		${escapeSqlString(doc.status)},
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP
	);`;
}

function generateAddressInsertSql(addr) {
	return `INSERT INTO client_addresses (
		id, clientId, addressType, street1, street2, city, state,
		postalCode, country, isPrimary, createdAt, updatedAt
	) VALUES (
		${escapeSqlString(addr.id)},
		${escapeSqlString(addr.clientId)},
		${escapeSqlString(addr.addressType)},
		${escapeSqlString(addr.street1)},
		${escapeSqlString(addr.street2)},
		${escapeSqlString(addr.city)},
		${escapeSqlString(addr.state)},
		${escapeSqlString(addr.postalCode)},
		${escapeSqlString(addr.country)},
		${addr.isPrimary ? 1 : 0},
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP
	);`;
}

// =========================================================================
// Main Script
// =========================================================================

async function generateSyntheticData() {
	console.log(`🔧 Generating synthetic data for user: ${userId}`);
	console.log(`   Environment: ${isRemote ? "remote" : "local"}`);
	console.log(`   Models: ${models.join(", ")}`);
	console.log("");

	// Build options
	if (models.includes("clients")) {
		console.log(
			`   Clients: ${clientsCount} (documents: ${clientsIncludeDocuments}, addresses: ${clientsIncludeAddresses})`,
		);
	}
	if (models.includes("transactions")) {
		console.log(
			`   Transactions: ${transactionsCount}${transactionsPerClient ? ` (${transactionsPerClient} per client)` : ""}`,
		);
	}
	console.log("");

	const configFlag = wranglerConfigFile ? `--config ${wranglerConfigFile}` : "";

	try {
		console.log("⏳ Generating synthetic data...");

		const sqlStatements = [];
		const generatedClients = [];

		// Generate clients if requested
		if (models.includes("clients") && clientsCount > 0) {
			console.log(`   📝 Generating ${clientsCount} clients...`);

			for (let i = 0; i < clientsCount; i++) {
				// Mix of physical and moral clients (70% physical, 30% moral)
				const isPhysical = Math.random() > 0.3;
				const client = isPhysical
					? generatePhysicalClient(i)
					: generateMoralClient(i);

				generatedClients.push(client);
				sqlStatements.push(generateClientInsertSql(client));

				// Generate documents if requested (only for physical clients)
				if (clientsIncludeDocuments && isPhysical) {
					const docCount = Math.floor(Math.random() * 3) + 1;
					for (let d = 0; d < docCount; d++) {
						const doc = generateClientDocument(client.rfc);
						sqlStatements.push(generateDocumentInsertSql(doc));
					}
				}

				// Generate addresses if requested
				if (clientsIncludeAddresses) {
					const addrCount = Math.floor(Math.random() * 2) + 1;
					for (let a = 0; a < addrCount; a++) {
						const addr = generateClientAddress(client.rfc, a);
						sqlStatements.push(generateAddressInsertSql(addr));
					}
				}
			}
		}

		// Generate transactions if requested
		if (models.includes("transactions") && transactionsCount > 0) {
			console.log(`   📝 Generating ${transactionsCount} transactions...`);

			// If no clients were generated, we need to generate some first
			if (generatedClients.length === 0) {
				const minClients = Math.min(5, transactionsCount);
				console.log(
					`   📝 No clients in request, generating ${minClients} clients first...`,
				);

				for (let i = 0; i < minClients; i++) {
					const isPhysical = Math.random() > 0.3;
					const client = isPhysical
						? generatePhysicalClient(i)
						: generateMoralClient(i);
					generatedClients.push(client);
					sqlStatements.push(generateClientInsertSql(client));
				}
			}

			const transactionsPerClientActual =
				transactionsPerClient ||
				Math.ceil(transactionsCount / generatedClients.length);

			let transactionsCreated = 0;
			for (const client of generatedClients) {
				const clientTxCount = Math.min(
					transactionsPerClientActual,
					transactionsCount - transactionsCreated,
				);

				for (
					let t = 0;
					t < clientTxCount && transactionsCreated < transactionsCount;
					t++
				) {
					const transaction = generateTransaction(
						client.rfc,
						transactionsCreated,
					);
					sqlStatements.push(generateTransactionInsertSql(transaction));

					// Generate payment methods for the transaction
					for (const pm of transaction.paymentMethods) {
						sqlStatements.push(
							generatePaymentMethodInsertSql(transaction.id, pm),
						);
					}

					transactionsCreated++;
				}

				if (transactionsCreated >= transactionsCount) break;
			}
		}

		if (sqlStatements.length === 0) {
			console.log("⚠️ No data to generate based on the provided options.");
			process.exit(0);
		}

		// Write SQL to temp file
		const sql = sqlStatements.join("\n");
		const sqlFile = join(__dirname, `temp-synthetic-data-${Date.now()}.sql`);

		try {
			writeFileSync(sqlFile, sql);

			// Execute SQL via wrangler
			console.log(
				`   🚀 Executing ${sqlStatements.length} SQL statements via wrangler...`,
			);
			const command = isRemote
				? `wrangler d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
				: `wrangler d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

			execSync(command, { stdio: "inherit" });

			console.log("✅ Synthetic data generation completed!");
			console.log(`   Clients created: ${generatedClients.length}`);
			console.log(`   Total SQL statements: ${sqlStatements.length}`);
		} finally {
			// Clean up temp file
			try {
				unlinkSync(sqlFile);
			} catch {
				// Ignore cleanup errors
			}
		}

		process.exit(0);
	} catch (error) {
		console.error("❌ Error generating synthetic data:", error);
		if (error instanceof Error) {
			console.error("   Message:", error.message);
			if (error.stack) {
				console.error("   Stack:", error.stack);
			}
		}
		process.exit(1);
	}
}

generateSyntheticData().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
