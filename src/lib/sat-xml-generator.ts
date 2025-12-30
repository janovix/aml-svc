/**
 * SAT XML Generator for Vehicle Notices
 * Generates XML files following the SAT schema for vehicle notice reports
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/veh.xsd
 * Example: https://eng-assets.algenium.tools/janovix_catalogs/ejemplo_veh.xml
 */

import type { AlertEntity } from "../domain/alert/types";
import type { ClientEntity } from "../domain/client/types";
import type { TransactionEntity } from "../domain/transaction/types";

export interface SatVehicleNoticeData {
	// File metadata
	reportedMonth: string; // YYYYMM format

	// Subject Obligated (Sujeto Obligado)
	obligatedSubjectKey: string; // 12 chars (RFC)
	activityKey: string; // Activity code (e.g., "VEH")

	// Notice (Aviso)
	noticeReference: string; // Unique notice reference
	priority: string; // Priority (e.g., "1")
	alertType: string; // Alert type code (e.g., "803")

	// Person in Notice (Persona Aviso)
	noticePerson: {
		personType: "fisica" | "moral" | "fideicomiso";
		// For persona_fisica
		name?: string;
		paternalLastName?: string;
		maternalLastName?: string;
		birthDate?: string; // YYYYMMDD format
		nationalityCountry?: string; // Country code (e.g., "RW")
		economicActivity?: string; // Economic activity code
		// For persona_moral
		businessName?: string;
		rfc?: string;
		// For fideicomiso
		trustIdentifier?: string;
		attorneyDelegate?: {
			name?: string;
			paternalLastName?: string;
			maternalLastName?: string;
			birthDate?: string; // YYYYMMDD format
		};
		// Address
		addressType: "nacional" | "extranjero";
		neighborhood?: string;
		street?: string;
		externalNumber?: string;
		postalCode?: string;
	};

	// Owner/Beneficiary (Dueno Beneficiario) - optional
	ownerBeneficiary?: {
		personType: "fisica" | "moral" | "fideicomiso";
		name?: string;
		paternalLastName?: string;
		maternalLastName?: string;
		birthDate?: string; // YYYYMMDD format
		nationalityCountry?: string;
	};

	// Operation Details (Detalle Operaciones)
	operationDetails: {
		operationDate: string; // YYYYMMDD format
		postalCode: string; // 5 chars
		operationType: string; // Operation type code (e.g., "802")
		vehicles: Array<{
			type: "terrestre" | "maritimo" | "aereo";
			manufacturerBrand: string;
			model: string;
			year: number;
			// For terrestre
			vin?: string;
			repuve?: string;
			plates?: string;
			// For maritimo/aereo
			serialNumber?: string;
			flag?: string;
			registration?: string;
			// Common
			armorLevel?: string;
		}>;
		liquidationData: {
			paymentDate: string; // YYYYMMDD format
			paymentForm: string; // Payment method code
			monetaryInstrument: string; // Monetary instrument code
			currency: string; // Currency code (e.g., "3" for MXN)
			operationAmount: string; // Decimal as string
		};
	};
}

/**
 * Escapes XML special characters
 */
function escapeXml(text: string | null | undefined): string {
	if (!text) return "";
	return String(text)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Formats date to YYYYMMDD format
 */
function formatDateYYYYMMDD(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}${month}${day}`;
}

/**
 * Generates SAT Vehicle Notice XML from data
 * Matches the structure from: https://eng-assets.algenium.tools/janovix_catalogs/ejemplo_veh.xml
 */
export function generateSatVehicleNoticeXml(
	data: SatVehicleNoticeData,
): string {
	const xml: string[] = [];

	xml.push('<?xml version="1.0" encoding="UTF-8"?>');
	xml.push(
		'<archivo xsi:schemaLocation="http://www.uif.shcp.gob.mx/recepcion/veh veh.xsd" xmlns="http://www.uif.shcp.gob.mx/recepcion/veh" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
	);
	xml.push("<informe>");
	xml.push(`<mes_reportado>${escapeXml(data.reportedMonth)}</mes_reportado>`);
	xml.push("<sujeto_obligado>");
	xml.push(
		`<clave_sujeto_obligado>${escapeXml(data.obligatedSubjectKey)}</clave_sujeto_obligado>`,
	);
	xml.push(`<clave_actividad>${escapeXml(data.activityKey)}</clave_actividad>`);
	xml.push("</sujeto_obligado>");
	xml.push("<aviso>");
	xml.push(
		`<referencia_aviso>${escapeXml(data.noticeReference)}</referencia_aviso>`,
	);
	xml.push(`<prioridad>${escapeXml(data.priority)}</prioridad>`);
	xml.push("<alerta>");
	xml.push(`<tipo_alerta>${escapeXml(data.alertType)}</tipo_alerta>`);
	xml.push("</alerta>");

	// Persona Aviso
	xml.push("<persona_aviso>");
	xml.push("<tipo_persona>");
	if (data.noticePerson.personType === "fisica") {
		xml.push("<persona_fisica>");
		if (data.noticePerson.name) {
			xml.push(`<nombre>${escapeXml(data.noticePerson.name)}</nombre>`);
		}
		if (data.noticePerson.paternalLastName) {
			xml.push(
				`<apellido_paterno>${escapeXml(data.noticePerson.paternalLastName)}</apellido_paterno>`,
			);
		}
		if (data.noticePerson.maternalLastName) {
			xml.push(
				`<apellido_materno>${escapeXml(data.noticePerson.maternalLastName)}</apellido_materno>`,
			);
		}
		if (data.noticePerson.birthDate) {
			xml.push(
				`<fecha_nacimiento>${escapeXml(data.noticePerson.birthDate)}</fecha_nacimiento>`,
			);
		}
		if (data.noticePerson.nationalityCountry) {
			xml.push(
				`<pais_nacionalidad>${escapeXml(data.noticePerson.nationalityCountry)}</pais_nacionalidad>`,
			);
		}
		if (data.noticePerson.economicActivity) {
			xml.push(
				`<actividad_economica>${escapeXml(data.noticePerson.economicActivity)}</actividad_economica>`,
			);
		}
		xml.push("</persona_fisica>");
	} else if (data.noticePerson.personType === "moral") {
		xml.push("<persona_moral>");
		if (data.noticePerson.businessName) {
			xml.push(
				`<denominacion_razon>${escapeXml(data.noticePerson.businessName)}</denominacion_razon>`,
			);
		}
		if (data.noticePerson.rfc) {
			xml.push(`<rfc>${escapeXml(data.noticePerson.rfc)}</rfc>`);
		}
		xml.push("</persona_moral>");
	} else if (data.noticePerson.personType === "fideicomiso") {
		xml.push("<fideicomiso>");
		if (data.noticePerson.businessName) {
			xml.push(
				`<denominacion_razon>${escapeXml(data.noticePerson.businessName)}</denominacion_razon>`,
			);
		}
		if (data.noticePerson.trustIdentifier) {
			xml.push(
				`<identificador_fideicomiso>${escapeXml(data.noticePerson.trustIdentifier)}</identificador_fideicomiso>`,
			);
		}
		if (data.noticePerson.attorneyDelegate) {
			xml.push("<apoderado_delegado>");
			if (data.noticePerson.attorneyDelegate.name) {
				xml.push(
					`<nombre>${escapeXml(data.noticePerson.attorneyDelegate.name)}</nombre>`,
				);
			}
			if (data.noticePerson.attorneyDelegate.paternalLastName) {
				xml.push(
					`<apellido_paterno>${escapeXml(data.noticePerson.attorneyDelegate.paternalLastName)}</apellido_paterno>`,
				);
			}
			if (data.noticePerson.attorneyDelegate.maternalLastName) {
				xml.push(
					`<apellido_materno>${escapeXml(data.noticePerson.attorneyDelegate.maternalLastName)}</apellido_materno>`,
				);
			}
			if (data.noticePerson.attorneyDelegate.birthDate) {
				xml.push(
					`<fecha_nacimiento>${escapeXml(data.noticePerson.attorneyDelegate.birthDate)}</fecha_nacimiento>`,
				);
			}
			xml.push("</apoderado_delegado>");
		}
		xml.push("</fideicomiso>");
	}
	xml.push("</tipo_persona>");

	// Address
	xml.push("<tipo_domicilio>");
	if (data.noticePerson.addressType === "nacional") {
		xml.push("<nacional>");
		if (data.noticePerson.neighborhood) {
			xml.push(
				`<colonia>${escapeXml(data.noticePerson.neighborhood)}</colonia>`,
			);
		}
		if (data.noticePerson.street) {
			xml.push(`<calle>${escapeXml(data.noticePerson.street)}</calle>`);
		}
		if (data.noticePerson.externalNumber) {
			xml.push(
				`<numero_exterior>${escapeXml(data.noticePerson.externalNumber)}</numero_exterior>`,
			);
		}
		if (data.noticePerson.postalCode) {
			xml.push(
				`<codigo_postal>${escapeXml(data.noticePerson.postalCode)}</codigo_postal>`,
			);
		}
		xml.push("</nacional>");
	} else {
		xml.push("<extranjero>");
		// Add foreign address fields if needed
		xml.push("</extranjero>");
	}
	xml.push("</tipo_domicilio>");
	xml.push("</persona_aviso>");

	// Dueno Beneficiario (optional)
	if (data.ownerBeneficiary) {
		xml.push("<dueno_beneficiario>");
		xml.push("<tipo_persona>");
		if (data.ownerBeneficiary.personType === "fisica") {
			xml.push("<persona_fisica>");
			if (data.ownerBeneficiary.name) {
				xml.push(`<nombre>${escapeXml(data.ownerBeneficiary.name)}</nombre>`);
			}
			if (data.ownerBeneficiary.paternalLastName) {
				xml.push(
					`<apellido_paterno>${escapeXml(data.ownerBeneficiary.paternalLastName)}</apellido_paterno>`,
				);
			}
			if (data.ownerBeneficiary.maternalLastName) {
				xml.push(
					`<apellido_materno>${escapeXml(data.ownerBeneficiary.maternalLastName)}</apellido_materno>`,
				);
			}
			if (data.ownerBeneficiary.birthDate) {
				xml.push(
					`<fecha_nacimiento>${escapeXml(data.ownerBeneficiary.birthDate)}</fecha_nacimiento>`,
				);
			}
			if (data.ownerBeneficiary.nationalityCountry) {
				xml.push(
					`<pais_nacionalidad>${escapeXml(data.ownerBeneficiary.nationalityCountry)}</pais_nacionalidad>`,
				);
			}
			xml.push("</persona_fisica>");
		}
		xml.push("</tipo_persona>");
		xml.push("</dueno_beneficiario>");
	}

	// Detalle Operaciones
	xml.push("<detalle_operaciones>");
	xml.push("<datos_operacion>");
	xml.push(
		`<fecha_operacion>${escapeXml(data.operationDetails.operationDate)}</fecha_operacion>`,
	);
	xml.push(
		`<codigo_postal>${escapeXml(data.operationDetails.postalCode)}</codigo_postal>`,
	);
	xml.push(
		`<tipo_operacion>${escapeXml(data.operationDetails.operationType)}</tipo_operacion>`,
	);

	// Vehicles
	for (const vehicle of data.operationDetails.vehicles) {
		xml.push("<tipo_vehiculo>");
		if (vehicle.type === "terrestre") {
			xml.push("<datos_vehiculo_terrestre>");
			xml.push(
				`<marca_fabricante>${escapeXml(vehicle.manufacturerBrand)}</marca_fabricante>`,
			);
			xml.push(`<modelo>${escapeXml(vehicle.model)}</modelo>`);
			xml.push(`<anio>${vehicle.year}</anio>`);
			if (vehicle.vin) {
				xml.push(`<vin>${escapeXml(vehicle.vin)}</vin>`);
			}
			if (vehicle.repuve) {
				xml.push(`<repuve>${escapeXml(vehicle.repuve)}</repuve>`);
			}
			if (vehicle.plates) {
				xml.push(`<placas>${escapeXml(vehicle.plates)}</placas>`);
			}
			if (vehicle.armorLevel) {
				xml.push(
					`<nivel_blindaje>${escapeXml(vehicle.armorLevel)}</nivel_blindaje>`,
				);
			}
			xml.push("</datos_vehiculo_terrestre>");
		} else if (vehicle.type === "maritimo") {
			xml.push("<datos_vehiculo_maritimo>");
			xml.push(
				`<marca_fabricante>${escapeXml(vehicle.manufacturerBrand)}</marca_fabricante>`,
			);
			xml.push(`<modelo>${escapeXml(vehicle.model)}</modelo>`);
			xml.push(`<anio>${vehicle.year}</anio>`);
			if (vehicle.serialNumber) {
				xml.push(
					`<numero_serie>${escapeXml(vehicle.serialNumber)}</numero_serie>`,
				);
			}
			if (vehicle.flag) {
				xml.push(`<bandera>${escapeXml(vehicle.flag)}</bandera>`);
			}
			if (vehicle.registration) {
				xml.push(`<matricula>${escapeXml(vehicle.registration)}</matricula>`);
			}
			if (vehicle.armorLevel) {
				xml.push(
					`<nivel_blindaje>${escapeXml(vehicle.armorLevel)}</nivel_blindaje>`,
				);
			}
			xml.push("</datos_vehiculo_maritimo>");
		} else if (vehicle.type === "aereo") {
			xml.push("<datos_vehiculo_aereo>");
			xml.push(
				`<marca_fabricante>${escapeXml(vehicle.manufacturerBrand)}</marca_fabricante>`,
			);
			xml.push(`<modelo>${escapeXml(vehicle.model)}</modelo>`);
			xml.push(`<anio>${vehicle.year}</anio>`);
			if (vehicle.serialNumber) {
				xml.push(
					`<numero_serie>${escapeXml(vehicle.serialNumber)}</numero_serie>`,
				);
			}
			if (vehicle.flag) {
				xml.push(`<bandera>${escapeXml(vehicle.flag)}</bandera>`);
			}
			if (vehicle.registration) {
				xml.push(`<matricula>${escapeXml(vehicle.registration)}</matricula>`);
			}
			if (vehicle.armorLevel) {
				xml.push(
					`<nivel_blindaje>${escapeXml(vehicle.armorLevel)}</nivel_blindaje>`,
				);
			}
			xml.push("</datos_vehiculo_aereo>");
		}
		xml.push("</tipo_vehiculo>");
	}

	// Datos Liquidacion
	xml.push("<datos_liquidacion>");
	xml.push(
		`<fecha_pago>${escapeXml(data.operationDetails.liquidationData.paymentDate)}</fecha_pago>`,
	);
	xml.push(
		`<forma_pago>${escapeXml(data.operationDetails.liquidationData.paymentForm)}</forma_pago>`,
	);
	xml.push(
		`<instrumento_monetario>${escapeXml(data.operationDetails.liquidationData.monetaryInstrument)}</instrumento_monetario>`,
	);
	xml.push(
		`<moneda>${escapeXml(data.operationDetails.liquidationData.currency)}</moneda>`,
	);
	xml.push(
		`<monto_operacion>${escapeXml(data.operationDetails.liquidationData.operationAmount)}</monto_operacion>`,
	);
	xml.push("</datos_liquidacion>");
	xml.push("</datos_operacion>");
	xml.push("</detalle_operaciones>");
	xml.push("</aviso>");
	xml.push("</informe>");
	xml.push("</archivo>");

	return xml.join("\n");
}

/**
 * Maps alert, client, and transaction data to SAT Vehicle Notice format
 */
export function mapToSatVehicleNoticeData(
	alert: AlertEntity,
	client: ClientEntity,
	transaction: TransactionEntity,
	config: {
		obligatedSubjectKey: string;
		activityKey: string; // e.g., "VEH"
		noticeReference?: string; // Defaults to alert.id
		priority?: string; // Defaults to "1"
		alertType?: string; // From alert rule or default
		// Catalog mappings (these should come from database)
		operationType: string; // From alert rule or transaction
		currency: string; // Usually "3" for MXN
		vehicleType: "terrestre" | "maritimo" | "aereo"; // Map from transaction.vehicleType
		brand: string; // From transaction.brand (text field)
		nationalityCountry?: string; // From client.nationality -> CAT_PAIS
		economicActivity?: string; // Economic activity code
		paymentForm?: string; // Payment method code
		monetaryInstrument?: string; // Monetary instrument code
	},
): SatVehicleNoticeData {
	// Determine reporting month (YYYYMM format)
	const operationDate = new Date(transaction.operationDate);
	const reportedMonth = `${operationDate.getFullYear()}${String(
		operationDate.getMonth() + 1,
	).padStart(2, "0")}`;

	// Format dates to YYYYMMDD
	const operationDateFormatted = formatDateYYYYMMDD(operationDate);
	const paymentDate = formatDateYYYYMMDD(operationDate); // Assuming same as operation date

	// Map person type
	const personType =
		client.personType === "physical"
			? "fisica"
			: client.personType === "moral"
				? "moral"
				: "fisica"; // Default to fisica

	// Map vehicle type
	const vehicleType: "terrestre" | "maritimo" | "aereo" =
		transaction.vehicleType === "land"
			? "terrestre"
			: transaction.vehicleType === "marine"
				? "maritimo"
				: "aereo";

	// Build vehicle data
	const vehicle = {
		type: vehicleType,
		manufacturerBrand: config.brand,
		model: transaction.model,
		year: transaction.year,
		vin:
			vehicleType === "terrestre"
				? transaction.registrationNumber ||
					transaction.engineNumber ||
					undefined
				: undefined,
		repuve:
			vehicleType === "terrestre"
				? transaction.registrationNumber || undefined
				: undefined,
		plates:
			vehicleType === "terrestre" ? transaction.plates || undefined : undefined,
		serialNumber:
			vehicleType !== "terrestre"
				? transaction.engineNumber ||
					transaction.registrationNumber ||
					undefined
				: undefined,
		flag:
			vehicleType !== "terrestre"
				? transaction.flagCountryId || undefined
				: undefined,
		registration:
			vehicleType !== "terrestre"
				? transaction.registrationNumber || undefined
				: undefined,
		armorLevel: transaction.armorLevel || undefined,
	};

	// Build notice person
	const noticePerson: SatVehicleNoticeData["noticePerson"] = {
		personType: personType as "fisica" | "moral" | "fideicomiso",
		addressType: client.country === "MX" ? "nacional" : "extranjero",
	};

	if (personType === "fisica") {
		noticePerson.name = client.firstName || undefined;
		noticePerson.paternalLastName = client.lastName || undefined;
		noticePerson.maternalLastName = client.secondLastName || undefined;
		if (client.birthDate) {
			noticePerson.birthDate = formatDateYYYYMMDD(new Date(client.birthDate));
		}
		noticePerson.nationalityCountry =
			config.nationalityCountry || client.nationality || undefined;
		noticePerson.economicActivity = config.economicActivity;
		noticePerson.neighborhood = client.neighborhood || undefined;
		noticePerson.street = client.street || undefined;
		noticePerson.externalNumber = client.externalNumber || undefined;
		noticePerson.postalCode = client.postalCode || undefined;
	} else if (personType === "moral") {
		noticePerson.businessName = client.businessName || undefined;
		noticePerson.rfc = client.rfc || undefined;
		noticePerson.neighborhood = client.neighborhood || undefined;
		noticePerson.street = client.street || undefined;
		noticePerson.externalNumber = client.externalNumber || undefined;
		noticePerson.postalCode = client.postalCode || undefined;
	}

	return {
		reportedMonth,
		obligatedSubjectKey: config.obligatedSubjectKey,
		activityKey: config.activityKey,
		noticeReference: config.noticeReference || alert.id,
		priority: config.priority || "1",
		alertType: config.alertType || "803", // Default alert type
		noticePerson,
		operationDetails: {
			operationDate: operationDateFormatted,
			postalCode: transaction.branchPostalCode || client.postalCode || "",
			operationType: config.operationType,
			vehicles: [vehicle],
			liquidationData: {
				paymentDate,
				paymentForm: config.paymentForm || "1",
				monetaryInstrument: config.monetaryInstrument || "1",
				currency: config.currency,
				operationAmount: transaction.amount.toString(),
			},
		},
	};
}
