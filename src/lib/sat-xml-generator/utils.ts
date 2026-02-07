/**
 * Utility functions for SAT XML generation
 */

import type { ClientEntity } from "../../domain/client/types";
import type { SatPersonData, SatPersonType, SatAddressType } from "./types";

/**
 * Escapes XML special characters
 */
export function escapeXml(text: string | null | undefined): string {
	if (!text) return "";
	return String(text)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Formats date to YYYYMMDD format for SAT
 */
export function formatDateYYYYMMDD(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}${month}${day}`;
}

/**
 * Formats date to YYYYMM format for reported month
 */
export function formatReportedMonth(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	return `${year}${month}`;
}

/**
 * Maps internal person type to SAT person type
 */
export function mapPersonType(
	personType: string | null | undefined,
): SatPersonType {
	if (!personType) return "fisica";
	const lower = personType.toLowerCase();
	if (lower === "physical" || lower === "fisica") return "fisica";
	if (lower === "moral" || lower === "legal") return "moral";
	if (lower === "trust" || lower === "fideicomiso") return "fideicomiso";
	return "fisica";
}

/**
 * Maps country code to address type
 */
export function mapAddressType(
	countryCode: string | null | undefined,
): SatAddressType {
	if (!countryCode) return "nacional";
	const code = countryCode.toUpperCase();
	return code === "MX" || code === "MEX" ? "nacional" : "extranjero";
}

/**
 * Maps client data to SAT person data structure
 */
export function mapClientToPersonData(
	client: ClientEntity,
	economicActivity?: string,
): SatPersonData {
	const personType = mapPersonType(client.personType);
	const addressType = mapAddressType(client.country);

	const personData: SatPersonData = {
		personType,
		addressType,
	};

	if (personType === "fisica") {
		personData.name = client.firstName || undefined;
		personData.paternalLastName = client.lastName || undefined;
		personData.maternalLastName = client.secondLastName || undefined;
		if (client.birthDate) {
			personData.birthDate = formatDateYYYYMMDD(client.birthDate);
		}
		personData.nationalityCountry = client.nationality || undefined;
		personData.economicActivity = economicActivity;
	} else if (personType === "moral") {
		personData.businessName = client.businessName || undefined;
		personData.rfc = client.rfc || undefined;
	}

	// Address fields
	personData.neighborhood = client.neighborhood || undefined;
	personData.street = client.street || undefined;
	personData.externalNumber = client.externalNumber || undefined;
	personData.internalNumber = client.internalNumber || undefined;
	personData.postalCode = client.postalCode || undefined;
	personData.country = client.country || undefined;

	return personData;
}

/**
 * Generates persona XML section
 */
export function generatePersonaXml(
	person: SatPersonData,
	tagName: string = "persona_aviso",
): string {
	const xml: string[] = [];

	xml.push(`<${tagName}>`);
	xml.push("<tipo_persona>");

	if (person.personType === "fisica") {
		xml.push("<persona_fisica>");
		if (person.name) {
			xml.push(`<nombre>${escapeXml(person.name)}</nombre>`);
		}
		if (person.paternalLastName) {
			xml.push(
				`<apellido_paterno>${escapeXml(person.paternalLastName)}</apellido_paterno>`,
			);
		}
		if (person.maternalLastName) {
			xml.push(
				`<apellido_materno>${escapeXml(person.maternalLastName)}</apellido_materno>`,
			);
		}
		if (person.birthDate) {
			xml.push(
				`<fecha_nacimiento>${escapeXml(person.birthDate)}</fecha_nacimiento>`,
			);
		}
		if (person.nationalityCountry) {
			xml.push(
				`<pais_nacionalidad>${escapeXml(person.nationalityCountry)}</pais_nacionalidad>`,
			);
		}
		if (person.economicActivity) {
			xml.push(
				`<actividad_economica>${escapeXml(person.economicActivity)}</actividad_economica>`,
			);
		}
		xml.push("</persona_fisica>");
	} else if (person.personType === "moral") {
		xml.push("<persona_moral>");
		if (person.businessName) {
			xml.push(
				`<denominacion_razon>${escapeXml(person.businessName)}</denominacion_razon>`,
			);
		}
		if (person.rfc) {
			xml.push(`<rfc>${escapeXml(person.rfc)}</rfc>`);
		}
		xml.push("</persona_moral>");
	} else if (person.personType === "fideicomiso") {
		xml.push("<fideicomiso>");
		if (person.businessName) {
			xml.push(
				`<denominacion_razon>${escapeXml(person.businessName)}</denominacion_razon>`,
			);
		}
		if (person.trustIdentifier) {
			xml.push(
				`<identificador_fideicomiso>${escapeXml(person.trustIdentifier)}</identificador_fideicomiso>`,
			);
		}
		if (person.attorneyDelegate) {
			xml.push("<apoderado_delegado>");
			if (person.attorneyDelegate.name) {
				xml.push(`<nombre>${escapeXml(person.attorneyDelegate.name)}</nombre>`);
			}
			if (person.attorneyDelegate.paternalLastName) {
				xml.push(
					`<apellido_paterno>${escapeXml(person.attorneyDelegate.paternalLastName)}</apellido_paterno>`,
				);
			}
			if (person.attorneyDelegate.maternalLastName) {
				xml.push(
					`<apellido_materno>${escapeXml(person.attorneyDelegate.maternalLastName)}</apellido_materno>`,
				);
			}
			if (person.attorneyDelegate.birthDate) {
				xml.push(
					`<fecha_nacimiento>${escapeXml(person.attorneyDelegate.birthDate)}</fecha_nacimiento>`,
				);
			}
			xml.push("</apoderado_delegado>");
		}
		xml.push("</fideicomiso>");
	}

	xml.push("</tipo_persona>");

	// Address section
	xml.push("<tipo_domicilio>");
	if (person.addressType === "nacional") {
		xml.push("<nacional>");
		if (person.neighborhood) {
			xml.push(`<colonia>${escapeXml(person.neighborhood)}</colonia>`);
		}
		if (person.street) {
			xml.push(`<calle>${escapeXml(person.street)}</calle>`);
		}
		if (person.externalNumber) {
			xml.push(
				`<numero_exterior>${escapeXml(person.externalNumber)}</numero_exterior>`,
			);
		}
		if (person.internalNumber) {
			xml.push(
				`<numero_interior>${escapeXml(person.internalNumber)}</numero_interior>`,
			);
		}
		if (person.postalCode) {
			xml.push(
				`<codigo_postal>${escapeXml(person.postalCode)}</codigo_postal>`,
			);
		}
		xml.push("</nacional>");
	} else {
		xml.push("<extranjero>");
		if (person.country) {
			xml.push(`<pais>${escapeXml(person.country)}</pais>`);
		}
		if (person.street) {
			xml.push(`<calle>${escapeXml(person.street)}</calle>`);
		}
		if (person.postalCode) {
			xml.push(
				`<codigo_postal>${escapeXml(person.postalCode)}</codigo_postal>`,
			);
		}
		xml.push("</extranjero>");
	}
	xml.push("</tipo_domicilio>");

	xml.push(`</${tagName}>`);

	return xml.join("\n");
}

/**
 * Generates liquidation/payment XML section
 */
export function generateLiquidationXml(
	paymentDate: string,
	paymentForm: string,
	monetaryInstrument: string,
	currency: string,
	amount: string,
): string {
	const xml: string[] = [];

	xml.push("<datos_liquidacion>");
	xml.push(`<fecha_pago>${escapeXml(paymentDate)}</fecha_pago>`);
	xml.push(`<forma_pago>${escapeXml(paymentForm)}</forma_pago>`);
	xml.push(
		`<instrumento_monetario>${escapeXml(monetaryInstrument)}</instrumento_monetario>`,
	);
	xml.push(`<moneda>${escapeXml(currency)}</moneda>`);
	xml.push(`<monto_operacion>${escapeXml(amount)}</monto_operacion>`);
	xml.push("</datos_liquidacion>");

	return xml.join("\n");
}
