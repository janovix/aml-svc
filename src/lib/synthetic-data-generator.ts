/**
 * Synthetic Data Generator
 *
 * Generates realistic synthetic data for testing and development purposes.
 * This should only be used in non-production environments.
 */

import * as Sentry from "@sentry/cloudflare";
import type { PrismaClient, DocumentType, AddressType } from "@prisma/client";
import { generateId } from "./id-generator";
import type { ClientCreateInput } from "../domain/client/schemas";

/**
 * Synthetic operation data for VEH activity
 */
export interface SyntheticVehicleOperationInput {
	clientId: string;
	operationDate: string;
	operationType: "purchase" | "sale";
	branchPostalCode: string;
	vehicleType: "land" | "marine" | "air";
	brand: string;
	model: string;
	year: number;
	armorLevel?: string | null;
	engineNumber?: string | null;
	plates?: string | null;
	registrationNumber?: string | null;
	flagCountryId?: string | null;
	amount: string;
	currency: string;
	paymentMethods: Array<{ method: string; amount: string }>;
}

export interface SyntheticDataOptions {
	clients?: {
		count: number;
		includeDocuments?: boolean;
		includeAddresses?: boolean;
	};
	operations?: {
		count: number;
		perClient?: number; // Number of operations per client
		activityCode?: string; // Activity code (VEH, INM, etc.) - defaults to VEH
	};
	/** @deprecated Use operations instead */
	transactions?: {
		count: number;
		perClient?: number;
	};
}

export interface SyntheticDataResult {
	clients: {
		created: number;
		rfcList: string[];
	};
	operations: {
		created: number;
		operationIds: string[];
	};
	/** @deprecated Use operations instead */
	transactions: {
		created: number;
		transactionIds: string[];
	};
}

/**
 * Generates a random RFC for physical persons (13 characters)
 */
function generatePhysicalRFC(): string {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const numbers = "0123456789";

	// Format: XXXX######XXX (4 letters, 6 numbers, 3 alphanumeric)
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
function generateMoralRFC(): string {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const numbers = "0123456789";

	// Format: XXX######XXX (3 letters, 6 numbers, 3 alphanumeric)
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
function generateCURP(): string {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const numbers = "0123456789";

	// Format: XXXX######HXXXXX## (4 letters, 6 numbers, 1 letter, 5 letters, 2 numbers)
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

/**
 * Generates a synthetic physical client
 */
function generatePhysicalClient(index: number): ClientCreateInput {
	const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
	const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
	const secondLastName =
		Math.random() > 0.3
			? LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
			: null;

	const birthYear = 1950 + Math.floor(Math.random() * 50);
	const birthMonth = Math.floor(Math.random() * 12) + 1;
	const birthDay = Math.floor(Math.random() * 28) + 1;
	const birthDate = `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;

	const rfc = generatePhysicalRFC();
	const curp = generateCURP();
	const stateCode =
		MEXICAN_STATES[Math.floor(Math.random() * MEXICAN_STATES.length)];
	const city = CITIES[Math.floor(Math.random() * CITIES.length)];

	return {
		personType: "physical",
		rfc,
		firstName,
		lastName,
		secondLastName,
		birthDate,
		curp,
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
function generateMoralClient(index: number): ClientCreateInput {
	const businessName = `${BUSINESS_NAMES[Math.floor(Math.random() * BUSINESS_NAMES.length)]} ${index + 1}`;
	const rfc = generateMoralRFC();

	const incorporationYear = 2000 + Math.floor(Math.random() * 24);
	const incorporationMonth = Math.floor(Math.random() * 12) + 1;
	const incorporationDay = Math.floor(Math.random() * 28) + 1;
	const incorporationDate = `${incorporationYear}-${String(incorporationMonth).padStart(2, "0")}-${String(incorporationDay).padStart(2, "0")}T00:00:00Z`;

	const stateCode =
		MEXICAN_STATES[Math.floor(Math.random() * MEXICAN_STATES.length)];
	const city = CITIES[Math.floor(Math.random() * CITIES.length)];

	return {
		personType: "moral",
		rfc,
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
 * Generates a synthetic VEH (Vehicle) operation
 */
function generateVehicleOperation(
	clientId: string,
	_index: number,
): SyntheticVehicleOperationInput {
	const operationYear = 2020 + Math.floor(Math.random() * 5);
	const operationMonth = Math.floor(Math.random() * 12) + 1;
	const operationDay = Math.floor(Math.random() * 28) + 1;
	const operationDate = `${operationYear}-${String(operationMonth).padStart(2, "0")}-${String(operationDay).padStart(2, "0")}`;

	const operationType = Math.random() > 0.5 ? "purchase" : "sale";
	const vehicleType = ["land", "marine", "air"][
		Math.floor(Math.random() * 3)
	] as "land" | "marine" | "air";
	const brand =
		VEHICLE_BRANDS[Math.floor(Math.random() * VEHICLE_BRANDS.length)];
	const model =
		VEHICLE_MODELS[Math.floor(Math.random() * VEHICLE_MODELS.length)];
	const year = 2015 + Math.floor(Math.random() * 10);

	const amount = Math.floor(Math.random() * 5000000) + 100000; // 100k to 5M
	const currency = "MXN";

	const paymentMethodCount = Math.floor(Math.random() * 3) + 1; // 1-3 payment methods
	const paymentMethods = [];
	let remainingAmount = amount;

	for (let i = 0; i < paymentMethodCount; i++) {
		const isLast = i === paymentMethodCount - 1;
		const methodAmount = isLast
			? remainingAmount
			: Math.floor(remainingAmount / (paymentMethodCount - i));
		remainingAmount -= methodAmount;

		paymentMethods.push({
			method:
				PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)],
			amount: methodAmount.toString(),
		});
	}

	// Build operation based on vehicle type with required fields
	if (vehicleType === "land") {
		const engineNumber = Array.from({ length: 17 }, () => {
			const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
			return chars[Math.floor(Math.random() * chars.length)];
		}).join("");

		return {
			clientId,
			operationDate,
			operationType,
			branchPostalCode: String(Math.floor(Math.random() * 90000) + 10000),
			vehicleType: "land",
			brand,
			model,
			year,
			armorLevel:
				Math.random() > 0.7
					? `Nivel ${Math.floor(Math.random() * 5) + 1}`
					: null,
			engineNumber,
			plates: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(Math.random() * 9000) + 1000}`,
			amount: amount.toString(),
			currency,
			paymentMethods,
		};
	}

	if (vehicleType === "marine") {
		return {
			clientId,
			operationDate,
			operationType,
			branchPostalCode: String(Math.floor(Math.random() * 90000) + 10000),
			vehicleType: "marine",
			brand,
			model,
			year,
			registrationNumber: `REG${Math.floor(Math.random() * 999999)}`,
			flagCountryId: ["MX", "US", "PA"][Math.floor(Math.random() * 3)],
			amount: amount.toString(),
			currency,
			paymentMethods,
		};
	}

	// air vehicle
	return {
		clientId,
		operationDate,
		operationType,
		branchPostalCode: String(Math.floor(Math.random() * 90000) + 10000),
		vehicleType: "air",
		brand,
		model,
		year,
		registrationNumber: `N${Math.floor(Math.random() * 99999)}`,
		flagCountryId: ["MX", "US", "PA"][Math.floor(Math.random() * 3)],
		amount: amount.toString(),
		currency,
		paymentMethods,
	};
}

/**
 * Synthetic Data Generator Service
 */
export class SyntheticDataGenerator {
	private readonly organizationId: string;

	constructor(
		private readonly prisma: PrismaClient,
		organizationId: string,
	) {
		this.organizationId = organizationId;
	}

	/**
	 * Generates synthetic data based on the provided options
	 */
	async generate(options: SyntheticDataOptions): Promise<SyntheticDataResult> {
		const result: SyntheticDataResult = {
			clients: {
				created: 0,
				rfcList: [],
			},
			operations: {
				created: 0,
				operationIds: [],
			},
			transactions: {
				created: 0,
				transactionIds: [],
			},
		};

		// Generate clients if requested
		if (options.clients && options.clients.count > 0) {
			const clientResult = await this.generateClients(
				options.clients.count,
				options.clients.includeDocuments,
				options.clients.includeAddresses,
			);
			result.clients = clientResult;
		}

		// Generate operations if requested (or use legacy transactions option)
		const operationsConfig = options.operations || options.transactions;
		if (operationsConfig && operationsConfig.count > 0) {
			// If we have clients, use them; otherwise generate new ones
			const clientRfcs =
				result.clients.rfcList.length > 0
					? result.clients.rfcList
					: await this.ensureClientsForOperations(
							operationsConfig.perClient || 1,
						);

			// Get activity code - default to VEH if using legacy transactions option
			const activityCode: string = options.operations?.activityCode ?? "VEH";

			const operationResult = await this.generateOperations(
				operationsConfig.count,
				clientRfcs,
				activityCode,
				operationsConfig.perClient,
			);
			result.operations = operationResult;
			// For backwards compatibility
			result.transactions = {
				created: operationResult.created,
				transactionIds: operationResult.operationIds,
			};
		}

		return result;
	}

	/**
	 * Generates synthetic clients
	 */
	private async generateClients(
		count: number,
		includeDocuments = false,
		includeAddresses = false,
	): Promise<{ created: number; rfcList: string[] }> {
		const rfcList: string[] = [];
		let created = 0;

		for (let i = 0; i < count; i++) {
			try {
				// Mix of physical and moral clients (70% physical, 30% moral)
				const isPhysical = Math.random() > 0.3;
				const clientData = isPhysical
					? generatePhysicalClient(i)
					: generateMoralClient(i);

				// Create client using Prisma directly
				const client = await this.prisma.client.create({
					data: {
						id: generateId("CLIENT"),
						rfc: clientData.rfc,
						organizationId: this.organizationId,
						personType: clientData.personType.toUpperCase() as
							| "PHYSICAL"
							| "MORAL"
							| "TRUST",
						firstName: clientData.firstName ?? null,
						lastName: clientData.lastName ?? null,
						secondLastName: clientData.secondLastName ?? null,
						birthDate: clientData.birthDate
							? new Date(clientData.birthDate)
							: null,
						curp: clientData.curp ?? null,
						businessName: clientData.businessName ?? null,
						incorporationDate: clientData.incorporationDate
							? new Date(clientData.incorporationDate)
							: null,
						nationality: clientData.nationality ?? null,
						email: clientData.email,
						phone: clientData.phone,
						country: clientData.country,
						stateCode: clientData.stateCode,
						city: clientData.city,
						municipality: clientData.municipality,
						neighborhood: clientData.neighborhood,
						street: clientData.street,
						externalNumber: clientData.externalNumber,
						internalNumber: clientData.internalNumber ?? null,
						postalCode: clientData.postalCode,
						reference: clientData.reference ?? null,
						notes: clientData.notes ?? null,
						countryCode: clientData.countryCode ?? null,
						economicActivityCode: clientData.economicActivityCode ?? null,
					},
				});

				rfcList.push(client.rfc);
				created++;

				// Generate documents if requested
				if (includeDocuments && isPhysical) {
					await this.generateClientDocuments(client.id);
				}

				// Generate addresses if requested
				if (includeAddresses) {
					await this.generateClientAddresses(client.id);
				}
			} catch (error) {
				// Skip if RFC already exists (collision)
				if (
					error instanceof Error &&
					error.message.includes("UNIQUE constraint")
				) {
					continue;
				}
				throw error;
			}
		}

		return { created, rfcList };
	}

	/**
	 * Generates synthetic operations
	 * Currently supports VEH (Vehicle) activity. Other activities can be added.
	 */
	private async generateOperations(
		count: number,
		clientRfcs: string[],
		activityCode: string,
		perClient?: number,
	): Promise<{ created: number; operationIds: string[] }> {
		const operationIds: string[] = [];
		let created = 0;

		if (clientRfcs.length === 0) {
			throw new Error("No clients available for operation generation");
		}

		// Look up client IDs from RFCs
		const clients = await this.prisma.client.findMany({
			where: {
				organizationId: this.organizationId,
				rfc: { in: clientRfcs },
			},
			select: { id: true, rfc: true },
		});

		const clientIdMap = new Map(clients.map((c) => [c.rfc, c.id]));

		const operationsPerClient =
			perClient || Math.ceil(count / clientRfcs.length);

		for (const clientRfc of clientRfcs) {
			const clientId = clientIdMap.get(clientRfc);
			if (!clientId) {
				continue;
			}

			const clientOperations = Math.min(operationsPerClient, count - created);

			for (let i = 0; i < clientOperations && created < count; i++) {
				try {
					// Currently only VEH activity is supported for synthetic data
					if (activityCode !== "VEH") {
						activityCode = "VEH"; // Default to VEH
					}

					const operationData = generateVehicleOperation(clientId, created);

					// Create operation using Prisma directly
					const operation = await this.prisma.operation.create({
						data: {
							id: generateId("OPERATION"),
							organizationId: this.organizationId,
							clientId: operationData.clientId,
							activityCode: "VEH",
							operationDate: new Date(operationData.operationDate),
							amount: operationData.amount,
							currencyCode: operationData.currency,
							operationTypeCode: operationData.operationType.toUpperCase(),
							branchPostalCode: operationData.branchPostalCode,
							// Create the VEH extension
							vehicle: {
								create: {
									id: generateId("OPERATION_VEH"),
									vehicleType: operationData.vehicleType.toUpperCase() as
										| "LAND"
										| "MARINE"
										| "AIR",
									brand: operationData.brand,
									model: operationData.model,
									year: operationData.year,
									armorLevelCode: operationData.armorLevel ?? null,
									engineNumber: operationData.engineNumber ?? null,
									plates: operationData.plates ?? null,
									registrationNumber: operationData.registrationNumber ?? null,
									flagCountryCode: operationData.flagCountryId ?? null,
								},
							},
						},
					});

					operationIds.push(operation.id);
					created++;
				} catch (error) {
					// Log error but continue
					Sentry.captureException(error, {
						tags: { context: "synthetic-data-create-operation-error" },
					});
				}
			}

			if (created >= count) {
				break;
			}
		}

		return { created, operationIds };
	}

	/**
	 * Ensures we have clients available for operation generation
	 */
	private async ensureClientsForOperations(
		operationsPerClient: number,
	): Promise<string[]> {
		// Get existing clients
		const existingClients = await this.prisma.client.findMany({
			where: { deletedAt: null },
			take: 10,
			select: { rfc: true },
		});

		if (existingClients.length > 0) {
			return existingClients.map((c) => c.rfc);
		}

		// Generate a few clients if none exist
		const result = await this.generateClients(
			Math.max(5, Math.ceil(operationsPerClient)),
			false,
			false,
		);
		return result.rfcList;
	}

	/**
	 * Generates synthetic documents for a client
	 */
	private async generateClientDocuments(clientId: string): Promise<void> {
		const documentTypes = [
			"NATIONAL_ID",
			"PASSPORT",
			"DRIVERS_LICENSE",
			"TAX_ID",
		];
		const documentCount = Math.floor(Math.random() * 3) + 1; // 1-3 documents

		for (let i = 0; i < documentCount; i++) {
			const docType =
				documentTypes[Math.floor(Math.random() * documentTypes.length)];
			const docNumber = `${docType.substring(0, 3)}${Math.floor(Math.random() * 9999999)}`;

			const issueYear = 2020 + Math.floor(Math.random() * 5);
			const issueMonth = Math.floor(Math.random() * 12) + 1;
			const issueDay = Math.floor(Math.random() * 28) + 1;
			const issueDate = new Date(
				`${issueYear}-${String(issueMonth).padStart(2, "0")}-${String(issueDay).padStart(2, "0")}`,
			);

			await this.prisma.clientDocument.create({
				data: {
					id: generateId("CLIENT_DOCUMENT"),
					clientId: clientId,
					documentType: docType as DocumentType,
					documentNumber: docNumber,
					issuingCountry: "MX",
					issueDate,
					expiryDate: new Date(
						issueDate.getTime() + 365 * 24 * 60 * 60 * 1000 * 5,
					), // 5 years later
					status: Math.random() > 0.3 ? "VERIFIED" : "PENDING",
				},
			});
		}
	}

	/**
	 * Generates synthetic addresses for a client
	 */
	private async generateClientAddresses(clientId: string): Promise<void> {
		const addressCount = Math.floor(Math.random() * 2) + 1; // 1-2 addresses
		const addressTypes = ["RESIDENTIAL", "BUSINESS", "MAILING"];

		for (let i = 0; i < addressCount; i++) {
			const stateCode =
				MEXICAN_STATES[Math.floor(Math.random() * MEXICAN_STATES.length)];
			const city = CITIES[Math.floor(Math.random() * CITIES.length)];

			await this.prisma.clientAddress.create({
				data: {
					id: generateId("CLIENT_ADDRESS"),
					clientId: clientId,
					addressType: addressTypes[i] as AddressType,
					street1: `Calle ${Math.floor(Math.random() * 200)}`,
					street2:
						Math.random() > 0.5
							? `Colonia ${Math.floor(Math.random() * 100)}`
							: null,
					city,
					state: stateCode,
					postalCode: String(Math.floor(Math.random() * 90000) + 10000),
					country: "MX",
					isPrimary: i === 0,
				},
			});
		}
	}
}
