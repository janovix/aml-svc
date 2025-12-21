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
	mesReportado: string; // YYYYMM format

	// Subject Obligated (Sujeto Obligado)
	claveSujetoObligado: string; // 12 chars (RFC)
	claveActividad: string; // Activity code (e.g., "VEH")

	// Notice (Aviso)
	referenciaAviso: string; // Unique notice reference
	prioridad: string; // Priority (e.g., "1")
	tipoAlerta: string; // Alert type code (e.g., "803")

	// Person in Notice (Persona Aviso)
	personaAviso: {
		tipoPersona: "fisica" | "moral" | "fideicomiso";
		// For persona_fisica
		nombre?: string;
		apellidoPaterno?: string;
		apellidoMaterno?: string;
		fechaNacimiento?: string; // YYYYMMDD format
		paisNacionalidad?: string; // Country code (e.g., "RW")
		actividadEconomica?: string; // Economic activity code
		// For persona_moral
		denominacionRazon?: string;
		rfc?: string;
		// For fideicomiso
		identificadorFideicomiso?: string;
		apoderadoDelegado?: {
			nombre?: string;
			apellidoPaterno?: string;
			apellidoMaterno?: string;
			fechaNacimiento?: string; // YYYYMMDD format
		};
		// Address
		tipoDomicilio: "nacional" | "extranjero";
		colonia?: string;
		calle?: string;
		numeroExterior?: string;
		codigoPostal?: string;
	};

	// Owner/Beneficiary (Dueno Beneficiario) - optional
	duenoBeneficiario?: {
		tipoPersona: "fisica" | "moral" | "fideicomiso";
		nombre?: string;
		apellidoPaterno?: string;
		apellidoMaterno?: string;
		fechaNacimiento?: string; // YYYYMMDD format
		paisNacionalidad?: string;
	};

	// Operation Details (Detalle Operaciones)
	detalleOperaciones: {
		fechaOperacion: string; // YYYYMMDD format
		codigoPostal: string; // 5 chars
		tipoOperacion: string; // Operation type code (e.g., "802")
		vehiculos: Array<{
			tipo: "terrestre" | "maritimo" | "aereo";
			marcaFabricante: string;
			modelo: string;
			anio: number;
			// For terrestre
			vin?: string;
			repuve?: string;
			placas?: string;
			// For maritimo/aereo
			numeroSerie?: string;
			bandera?: string;
			matricula?: string;
			// Common
			nivelBlindaje?: string;
		}>;
		datosLiquidacion: {
			fechaPago: string; // YYYYMMDD format
			formaPago: string; // Payment method code
			instrumentoMonetario: string; // Monetary instrument code
			moneda: string; // Currency code (e.g., "3" for MXN)
			montoOperacion: string; // Decimal as string
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
	xml.push(`<mes_reportado>${escapeXml(data.mesReportado)}</mes_reportado>`);
	xml.push("<sujeto_obligado>");
	xml.push(
		`<clave_sujeto_obligado>${escapeXml(data.claveSujetoObligado)}</clave_sujeto_obligado>`,
	);
	xml.push(
		`<clave_actividad>${escapeXml(data.claveActividad)}</clave_actividad>`,
	);
	xml.push("</sujeto_obligado>");
	xml.push("<aviso>");
	xml.push(
		`<referencia_aviso>${escapeXml(data.referenciaAviso)}</referencia_aviso>`,
	);
	xml.push(`<prioridad>${escapeXml(data.prioridad)}</prioridad>`);
	xml.push("<alerta>");
	xml.push(`<tipo_alerta>${escapeXml(data.tipoAlerta)}</tipo_alerta>`);
	xml.push("</alerta>");

	// Persona Aviso
	xml.push("<persona_aviso>");
	xml.push("<tipo_persona>");
	if (data.personaAviso.tipoPersona === "fisica") {
		xml.push("<persona_fisica>");
		if (data.personaAviso.nombre) {
			xml.push(`<nombre>${escapeXml(data.personaAviso.nombre)}</nombre>`);
		}
		if (data.personaAviso.apellidoPaterno) {
			xml.push(
				`<apellido_paterno>${escapeXml(data.personaAviso.apellidoPaterno)}</apellido_paterno>`,
			);
		}
		if (data.personaAviso.apellidoMaterno) {
			xml.push(
				`<apellido_materno>${escapeXml(data.personaAviso.apellidoMaterno)}</apellido_materno>`,
			);
		}
		if (data.personaAviso.fechaNacimiento) {
			xml.push(
				`<fecha_nacimiento>${escapeXml(data.personaAviso.fechaNacimiento)}</fecha_nacimiento>`,
			);
		}
		if (data.personaAviso.paisNacionalidad) {
			xml.push(
				`<pais_nacionalidad>${escapeXml(data.personaAviso.paisNacionalidad)}</pais_nacionalidad>`,
			);
		}
		if (data.personaAviso.actividadEconomica) {
			xml.push(
				`<actividad_economica>${escapeXml(data.personaAviso.actividadEconomica)}</actividad_economica>`,
			);
		}
		xml.push("</persona_fisica>");
	} else if (data.personaAviso.tipoPersona === "moral") {
		xml.push("<persona_moral>");
		if (data.personaAviso.denominacionRazon) {
			xml.push(
				`<denominacion_razon>${escapeXml(data.personaAviso.denominacionRazon)}</denominacion_razon>`,
			);
		}
		if (data.personaAviso.rfc) {
			xml.push(`<rfc>${escapeXml(data.personaAviso.rfc)}</rfc>`);
		}
		xml.push("</persona_moral>");
	} else if (data.personaAviso.tipoPersona === "fideicomiso") {
		xml.push("<fideicomiso>");
		if (data.personaAviso.denominacionRazon) {
			xml.push(
				`<denominacion_razon>${escapeXml(data.personaAviso.denominacionRazon)}</denominacion_razon>`,
			);
		}
		if (data.personaAviso.identificadorFideicomiso) {
			xml.push(
				`<identificador_fideicomiso>${escapeXml(data.personaAviso.identificadorFideicomiso)}</identificador_fideicomiso>`,
			);
		}
		if (data.personaAviso.apoderadoDelegado) {
			xml.push("<apoderado_delegado>");
			if (data.personaAviso.apoderadoDelegado.nombre) {
				xml.push(
					`<nombre>${escapeXml(data.personaAviso.apoderadoDelegado.nombre)}</nombre>`,
				);
			}
			if (data.personaAviso.apoderadoDelegado.apellidoPaterno) {
				xml.push(
					`<apellido_paterno>${escapeXml(data.personaAviso.apoderadoDelegado.apellidoPaterno)}</apellido_paterno>`,
				);
			}
			if (data.personaAviso.apoderadoDelegado.apellidoMaterno) {
				xml.push(
					`<apellido_materno>${escapeXml(data.personaAviso.apoderadoDelegado.apellidoMaterno)}</apellido_materno>`,
				);
			}
			if (data.personaAviso.apoderadoDelegado.fechaNacimiento) {
				xml.push(
					`<fecha_nacimiento>${escapeXml(data.personaAviso.apoderadoDelegado.fechaNacimiento)}</fecha_nacimiento>`,
				);
			}
			xml.push("</apoderado_delegado>");
		}
		xml.push("</fideicomiso>");
	}
	xml.push("</tipo_persona>");

	// Address
	xml.push("<tipo_domicilio>");
	if (data.personaAviso.tipoDomicilio === "nacional") {
		xml.push("<nacional>");
		if (data.personaAviso.colonia) {
			xml.push(`<colonia>${escapeXml(data.personaAviso.colonia)}</colonia>`);
		}
		if (data.personaAviso.calle) {
			xml.push(`<calle>${escapeXml(data.personaAviso.calle)}</calle>`);
		}
		if (data.personaAviso.numeroExterior) {
			xml.push(
				`<numero_exterior>${escapeXml(data.personaAviso.numeroExterior)}</numero_exterior>`,
			);
		}
		if (data.personaAviso.codigoPostal) {
			xml.push(
				`<codigo_postal>${escapeXml(data.personaAviso.codigoPostal)}</codigo_postal>`,
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
	if (data.duenoBeneficiario) {
		xml.push("<dueno_beneficiario>");
		xml.push("<tipo_persona>");
		if (data.duenoBeneficiario.tipoPersona === "fisica") {
			xml.push("<persona_fisica>");
			if (data.duenoBeneficiario.nombre) {
				xml.push(
					`<nombre>${escapeXml(data.duenoBeneficiario.nombre)}</nombre>`,
				);
			}
			if (data.duenoBeneficiario.apellidoPaterno) {
				xml.push(
					`<apellido_paterno>${escapeXml(data.duenoBeneficiario.apellidoPaterno)}</apellido_paterno>`,
				);
			}
			if (data.duenoBeneficiario.apellidoMaterno) {
				xml.push(
					`<apellido_materno>${escapeXml(data.duenoBeneficiario.apellidoMaterno)}</apellido_materno>`,
				);
			}
			if (data.duenoBeneficiario.fechaNacimiento) {
				xml.push(
					`<fecha_nacimiento>${escapeXml(data.duenoBeneficiario.fechaNacimiento)}</fecha_nacimiento>`,
				);
			}
			if (data.duenoBeneficiario.paisNacionalidad) {
				xml.push(
					`<pais_nacionalidad>${escapeXml(data.duenoBeneficiario.paisNacionalidad)}</pais_nacionalidad>`,
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
		`<fecha_operacion>${escapeXml(data.detalleOperaciones.fechaOperacion)}</fecha_operacion>`,
	);
	xml.push(
		`<codigo_postal>${escapeXml(data.detalleOperaciones.codigoPostal)}</codigo_postal>`,
	);
	xml.push(
		`<tipo_operacion>${escapeXml(data.detalleOperaciones.tipoOperacion)}</tipo_operacion>`,
	);

	// Vehicles
	for (const vehiculo of data.detalleOperaciones.vehiculos) {
		xml.push("<tipo_vehiculo>");
		if (vehiculo.tipo === "terrestre") {
			xml.push("<datos_vehiculo_terrestre>");
			xml.push(
				`<marca_fabricante>${escapeXml(vehiculo.marcaFabricante)}</marca_fabricante>`,
			);
			xml.push(`<modelo>${escapeXml(vehiculo.modelo)}</modelo>`);
			xml.push(`<anio>${vehiculo.anio}</anio>`);
			if (vehiculo.vin) {
				xml.push(`<vin>${escapeXml(vehiculo.vin)}</vin>`);
			}
			if (vehiculo.repuve) {
				xml.push(`<repuve>${escapeXml(vehiculo.repuve)}</repuve>`);
			}
			if (vehiculo.placas) {
				xml.push(`<placas>${escapeXml(vehiculo.placas)}</placas>`);
			}
			if (vehiculo.nivelBlindaje) {
				xml.push(
					`<nivel_blindaje>${escapeXml(vehiculo.nivelBlindaje)}</nivel_blindaje>`,
				);
			}
			xml.push("</datos_vehiculo_terrestre>");
		} else if (vehiculo.tipo === "maritimo") {
			xml.push("<datos_vehiculo_maritimo>");
			xml.push(
				`<marca_fabricante>${escapeXml(vehiculo.marcaFabricante)}</marca_fabricante>`,
			);
			xml.push(`<modelo>${escapeXml(vehiculo.modelo)}</modelo>`);
			xml.push(`<anio>${vehiculo.anio}</anio>`);
			if (vehiculo.numeroSerie) {
				xml.push(
					`<numero_serie>${escapeXml(vehiculo.numeroSerie)}</numero_serie>`,
				);
			}
			if (vehiculo.bandera) {
				xml.push(`<bandera>${escapeXml(vehiculo.bandera)}</bandera>`);
			}
			if (vehiculo.matricula) {
				xml.push(`<matricula>${escapeXml(vehiculo.matricula)}</matricula>`);
			}
			if (vehiculo.nivelBlindaje) {
				xml.push(
					`<nivel_blindaje>${escapeXml(vehiculo.nivelBlindaje)}</nivel_blindaje>`,
				);
			}
			xml.push("</datos_vehiculo_maritimo>");
		} else if (vehiculo.tipo === "aereo") {
			xml.push("<datos_vehiculo_aereo>");
			xml.push(
				`<marca_fabricante>${escapeXml(vehiculo.marcaFabricante)}</marca_fabricante>`,
			);
			xml.push(`<modelo>${escapeXml(vehiculo.modelo)}</modelo>`);
			xml.push(`<anio>${vehiculo.anio}</anio>`);
			if (vehiculo.numeroSerie) {
				xml.push(
					`<numero_serie>${escapeXml(vehiculo.numeroSerie)}</numero_serie>`,
				);
			}
			if (vehiculo.bandera) {
				xml.push(`<bandera>${escapeXml(vehiculo.bandera)}</bandera>`);
			}
			if (vehiculo.matricula) {
				xml.push(`<matricula>${escapeXml(vehiculo.matricula)}</matricula>`);
			}
			if (vehiculo.nivelBlindaje) {
				xml.push(
					`<nivel_blindaje>${escapeXml(vehiculo.nivelBlindaje)}</nivel_blindaje>`,
				);
			}
			xml.push("</datos_vehiculo_aereo>");
		}
		xml.push("</tipo_vehiculo>");
	}

	// Datos Liquidacion
	xml.push("<datos_liquidacion>");
	xml.push(
		`<fecha_pago>${escapeXml(data.detalleOperaciones.datosLiquidacion.fechaPago)}</fecha_pago>`,
	);
	xml.push(
		`<forma_pago>${escapeXml(data.detalleOperaciones.datosLiquidacion.formaPago)}</forma_pago>`,
	);
	xml.push(
		`<instrumento_monetario>${escapeXml(data.detalleOperaciones.datosLiquidacion.instrumentoMonetario)}</instrumento_monetario>`,
	);
	xml.push(
		`<moneda>${escapeXml(data.detalleOperaciones.datosLiquidacion.moneda)}</moneda>`,
	);
	xml.push(
		`<monto_operacion>${escapeXml(data.detalleOperaciones.datosLiquidacion.montoOperacion)}</monto_operacion>`,
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
		claveSujetoObligado: string;
		claveActividad: string; // e.g., "VEH"
		referenciaAviso?: string; // Defaults to alert.id
		prioridad?: string; // Defaults to "1"
		tipoAlerta?: string; // From alert rule or default
		// Catalog mappings (these should come from database)
		tipoOperacion: string; // From alert rule or transaction
		moneda: string; // Usually "3" for MXN
		tipoVehiculo: "terrestre" | "maritimo" | "aereo"; // Map from transaction.vehicleType
		marca: string; // From transaction.brandId -> catalog lookup
		paisNacionalidad?: string; // From client.nationality -> CAT_PAIS
		actividadEconomica?: string; // Economic activity code
		formaPago?: string; // Payment method code
		instrumentoMonetario?: string; // Monetary instrument code
	},
): SatVehicleNoticeData {
	// Determine reporting month (YYYYMM format)
	const operationDate = new Date(transaction.operationDate);
	const mesReportado = `${operationDate.getFullYear()}${String(
		operationDate.getMonth() + 1,
	).padStart(2, "0")}`;

	// Format dates to YYYYMMDD
	const fechaOperacion = formatDateYYYYMMDD(operationDate);
	const fechaPago = formatDateYYYYMMDD(operationDate); // Assuming same as operation date

	// Map person type
	const tipoPersona =
		client.personType === "physical"
			? "fisica"
			: client.personType === "moral"
				? "moral"
				: "fisica"; // Default to fisica

	// Map vehicle type
	const vehiculoTipo: "terrestre" | "maritimo" | "aereo" =
		transaction.vehicleType === "land"
			? "terrestre"
			: transaction.vehicleType === "marine"
				? "maritimo"
				: "aereo";

	// Build vehicle data
	const vehiculo = {
		tipo: vehiculoTipo,
		marcaFabricante: config.marca,
		modelo: transaction.model,
		anio: transaction.year,
		vin:
			vehiculoTipo === "terrestre"
				? transaction.registrationNumber ||
					transaction.engineNumber ||
					undefined
				: undefined,
		repuve:
			vehiculoTipo === "terrestre"
				? transaction.registrationNumber || undefined
				: undefined,
		placas:
			vehiculoTipo === "terrestre"
				? transaction.plates || undefined
				: undefined,
		numeroSerie:
			vehiculoTipo !== "terrestre"
				? transaction.engineNumber ||
					transaction.registrationNumber ||
					undefined
				: undefined,
		bandera:
			vehiculoTipo !== "terrestre"
				? transaction.flagCountryId || undefined
				: undefined,
		matricula:
			vehiculoTipo !== "terrestre"
				? transaction.registrationNumber || undefined
				: undefined,
		nivelBlindaje: transaction.armorLevel || undefined,
	};

	// Build persona aviso
	const personaAviso: SatVehicleNoticeData["personaAviso"] = {
		tipoPersona: tipoPersona as "fisica" | "moral" | "fideicomiso",
		tipoDomicilio: client.country === "MX" ? "nacional" : "extranjero",
	};

	if (tipoPersona === "fisica") {
		personaAviso.nombre = client.firstName || undefined;
		personaAviso.apellidoPaterno = client.lastName || undefined;
		personaAviso.apellidoMaterno = client.secondLastName || undefined;
		if (client.birthDate) {
			personaAviso.fechaNacimiento = formatDateYYYYMMDD(
				new Date(client.birthDate),
			);
		}
		personaAviso.paisNacionalidad =
			config.paisNacionalidad || client.nationality || undefined;
		personaAviso.actividadEconomica = config.actividadEconomica;
		personaAviso.colonia = client.neighborhood || undefined;
		personaAviso.calle = client.street || undefined;
		personaAviso.numeroExterior = client.externalNumber || undefined;
		personaAviso.codigoPostal = client.postalCode || undefined;
	} else if (tipoPersona === "moral") {
		personaAviso.denominacionRazon = client.businessName || undefined;
		personaAviso.rfc = client.rfc || undefined;
		personaAviso.colonia = client.neighborhood || undefined;
		personaAviso.calle = client.street || undefined;
		personaAviso.numeroExterior = client.externalNumber || undefined;
		personaAviso.codigoPostal = client.postalCode || undefined;
	}

	return {
		mesReportado,
		claveSujetoObligado: config.claveSujetoObligado,
		claveActividad: config.claveActividad,
		referenciaAviso: config.referenciaAviso || alert.id,
		prioridad: config.prioridad || "1",
		tipoAlerta: config.tipoAlerta || "803", // Default alert type
		personaAviso,
		detalleOperaciones: {
			fechaOperacion,
			codigoPostal: transaction.branchPostalCode || client.postalCode || "",
			tipoOperacion: config.tipoOperacion,
			vehiculos: [vehiculo],
			datosLiquidacion: {
				fechaPago,
				formaPago: config.formaPago || "1",
				instrumentoMonetario: config.instrumentoMonetario || "1",
				moneda: config.moneda,
				montoOperacion: transaction.amount.toString(),
			},
		},
	};
}
