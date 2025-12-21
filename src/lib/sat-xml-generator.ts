/**
 * SAT XML Generator for Vehicle Notices
 * Generates XML files following the SAT schema for vehicle notice reports
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/veh.xsd
 * Example: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/ejemplosxml/ejemplo_veh.xml
 */

import type { AlertEntity } from "../domain/alert/types";
import type { ClientEntity } from "../domain/client/types";
import type { TransactionEntity } from "../domain/transaction/types";

export interface SatVehicleNoticeData {
	// File metadata
	mesReportado: string; // YYYYMM format

	// Subject Obligated (Sujeto Obligado)
	claveEntidadColegiada?: string; // Optional, format: LLLAAMMDDXXX
	claveSujetoObligado: string; // 12 chars
	tipoSujetoObligado: string; // From CAT_TIPO_SUJETO_OBLIGADO

	// Notice/Operation
	folioAviso: string;
	tipoOperacion: string; // From CAT_TIPO_OPERACION
	fechaOperacion: string; // YYYY-MM-DD
	montoOperacion: string; // Decimal as string
	moneda: string; // From CAT_MONEDA

	// Vehicle
	tipoVehiculo: string; // From CAT_TIPO_VEHICULO
	marca: string; // From CAT_MARCA_VEHICULO
	modelo: string;
	anioModelo: number;
	numeroSerie: string; // VIN
	color: string; // From CAT_COLOR_VEHICULO

	// Person
	tipoPersona: string; // From CAT_TIPO_PERSONA
	nombre?: string; // Conditional
	apellidoPaterno?: string; // Conditional
	apellidoMaterno?: string; // Optional
	rfc?: string; // Conditional
	curp?: string; // Conditional
	paisNacionalidad: string; // From CAT_PAIS

	// Address
	pais: string; // From CAT_PAIS
	entidadFederativa?: string; // Conditional, from CAT_ENTIDAD_FEDERATIVA
	municipio?: string; // Conditional
	codigoPostal: string; // 5 chars
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
 * Generates SAT Vehicle Notice XML from data
 */
export function generateSatVehicleNoticeXml(
	data: SatVehicleNoticeData,
): string {
	const xml: string[] = [];

	xml.push('<?xml version="1.0" encoding="UTF-8"?>');
	xml.push("<archivo>");
	xml.push("  <informe>");
	xml.push(
		`    <mes_reportado>${escapeXml(data.mesReportado)}</mes_reportado>`,
	);
	xml.push("  </informe>");

	xml.push("  <sujeto_obligado>");
	if (data.claveEntidadColegiada) {
		xml.push(
			`    <clave_entidad_colegiada>${escapeXml(data.claveEntidadColegiada)}</clave_entidad_colegiada>`,
		);
	}
	xml.push(
		`    <clave_sujeto_obligado>${escapeXml(data.claveSujetoObligado)}</clave_sujeto_obligado>`,
	);
	xml.push(
		`    <tipo_sujeto_obligado>${escapeXml(data.tipoSujetoObligado)}</tipo_sujeto_obligado>`,
	);
	xml.push("  </sujeto_obligado>");

	xml.push("  <aviso>");
	xml.push(`    <folio_aviso>${escapeXml(data.folioAviso)}</folio_aviso>`);
	xml.push(
		`    <tipo_operacion>${escapeXml(data.tipoOperacion)}</tipo_operacion>`,
	);
	xml.push(
		`    <fecha_operacion>${escapeXml(data.fechaOperacion)}</fecha_operacion>`,
	);
	xml.push(
		`    <monto_operacion>${escapeXml(data.montoOperacion)}</monto_operacion>`,
	);
	xml.push(`    <moneda>${escapeXml(data.moneda)}</moneda>`);
	xml.push("  </aviso>");

	xml.push("  <vehiculo>");
	xml.push(
		`    <tipo_vehiculo>${escapeXml(data.tipoVehiculo)}</tipo_vehiculo>`,
	);
	xml.push(`    <marca>${escapeXml(data.marca)}</marca>`);
	xml.push(`    <modelo>${escapeXml(data.modelo)}</modelo>`);
	xml.push(`    <anio_modelo>${data.anioModelo}</anio_modelo>`);
	xml.push(`    <numero_serie>${escapeXml(data.numeroSerie)}</numero_serie>`);
	xml.push(`    <color>${escapeXml(data.color)}</color>`);
	xml.push("  </vehiculo>");

	xml.push("  <persona>");
	xml.push(`    <tipo_persona>${escapeXml(data.tipoPersona)}</tipo_persona>`);
	if (data.nombre) {
		xml.push(`    <nombre>${escapeXml(data.nombre)}</nombre>`);
	}
	if (data.apellidoPaterno) {
		xml.push(
			`    <apellido_paterno>${escapeXml(data.apellidoPaterno)}</apellido_paterno>`,
		);
	}
	if (data.apellidoMaterno) {
		xml.push(
			`    <apellido_materno>${escapeXml(data.apellidoMaterno)}</apellido_materno>`,
		);
	}
	if (data.rfc) {
		xml.push(`    <rfc>${escapeXml(data.rfc)}</rfc>`);
	}
	if (data.curp) {
		xml.push(`    <curp>${escapeXml(data.curp)}</curp>`);
	}
	xml.push(
		`    <pais_nacionalidad>${escapeXml(data.paisNacionalidad)}</pais_nacionalidad>`,
	);
	xml.push("  </persona>");

	xml.push("  <domicilio>");
	xml.push(`    <pais>${escapeXml(data.pais)}</pais>`);
	if (data.entidadFederativa) {
		xml.push(
			`    <entidad_federativa>${escapeXml(data.entidadFederativa)}</entidad_federativa>`,
		);
	}
	if (data.municipio) {
		xml.push(`    <municipio>${escapeXml(data.municipio)}</municipio>`);
	}
	xml.push(
		`    <codigo_postal>${escapeXml(data.codigoPostal)}</codigo_postal>`,
	);
	xml.push("  </domicilio>");

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
		tipoSujetoObligado: string;
		claveEntidadColegiada?: string;
		// Catalog mappings (these should come from database)
		tipoOperacion: string; // From alert rule or transaction
		moneda: string; // Usually "MXN"
		tipoVehiculo: string; // Map from transaction.vehicleType
		marca: string; // From transaction.brandId -> catalog lookup
		color: string; // From transaction or default
		tipoPersona: string; // Map from client.personType
		paisNacionalidad: string; // From client.nationality -> CAT_PAIS
		pais: string; // From client.country -> CAT_PAIS
		entidadFederativa?: string; // From client.stateCode -> CAT_ENTIDAD_FEDERATIVA
	},
): SatVehicleNoticeData {
	// Determine reporting month (YYYYMM format)
	const operationDate = new Date(transaction.operationDate);
	const mesReportado = `${operationDate.getFullYear()}${String(
		operationDate.getMonth() + 1,
	).padStart(2, "0")}`;

	// Format operation date
	const fechaOperacion = operationDate.toISOString().split("T")[0]; // YYYY-MM-DD

	// Map person type
	const tipoPersona =
		client.personType === "physical"
			? "1" // Natural person
			: client.personType === "moral"
				? "2" // Legal person
				: "1"; // Default to natural person

	return {
		mesReportado,
		claveEntidadColegiada: config.claveEntidadColegiada,
		claveSujetoObligado: config.claveSujetoObligado,
		tipoSujetoObligado: config.tipoSujetoObligado,
		folioAviso: alert.id,
		tipoOperacion: config.tipoOperacion,
		fechaOperacion,
		montoOperacion: transaction.amount,
		moneda: config.moneda,
		tipoVehiculo: config.tipoVehiculo,
		marca: config.marca,
		modelo: transaction.model,
		anioModelo: transaction.year,
		numeroSerie:
			transaction.registrationNumber || transaction.engineNumber || "",
		color: config.color,
		tipoPersona,
		nombre: client.firstName || undefined,
		apellidoPaterno: client.lastName || undefined,
		apellidoMaterno: client.secondLastName || undefined,
		rfc: client.rfc || undefined,
		curp: client.curp || undefined,
		paisNacionalidad: config.paisNacionalidad,
		pais: config.pais,
		entidadFederativa: config.entidadFederativa,
		municipio: client.municipality || undefined,
		codigoPostal: client.postalCode,
	};
}
