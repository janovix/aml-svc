/**
 * CSV Parser
 * Parses CSV files into row data
 */

import type { ParsedRow } from "../types";

/**
 * Parses a CSV string into an array of parsed rows
 */
export function parseCSV(content: string): ParsedRow[] {
	const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");

	if (lines.length < 2) {
		throw new Error(
			"CSV file must have at least a header row and one data row",
		);
	}

	// Parse header row
	const headers = parseCSVLine(lines[0]);

	// Parse data rows
	const rows: ParsedRow[] = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const values = parseCSVLine(line);
		const data: Record<string, string> = {};

		for (let j = 0; j < headers.length; j++) {
			const header = headers[j].toLowerCase().trim();
			const value = values[j]?.trim() ?? "";
			data[header] = value;
		}

		rows.push({
			rowNumber: i,
			data,
		});
	}

	return rows;
}

/**
 * Parses a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
	const values: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		const nextChar = line[i + 1];

		if (inQuotes) {
			if (char === '"') {
				if (nextChar === '"') {
					// Escaped quote
					current += '"';
					i++;
				} else {
					// End of quoted value
					inQuotes = false;
				}
			} else {
				current += char;
			}
		} else {
			if (char === '"') {
				inQuotes = true;
			} else if (char === ",") {
				values.push(current);
				current = "";
			} else {
				current += char;
			}
		}
	}

	// Don't forget the last value
	values.push(current);

	return values;
}

/**
 * Validates that required headers are present
 */
export function validateHeaders(
	headers: string[],
	requiredHeaders: string[],
): { valid: boolean; missing: string[] } {
	const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
	const missing: string[] = [];

	for (const required of requiredHeaders) {
		if (!normalizedHeaders.includes(required.toLowerCase())) {
			missing.push(required);
		}
	}

	return {
		valid: missing.length === 0,
		missing,
	};
}

/**
 * Gets headers from a CSV string
 */
export function getCSVHeaders(content: string): string[] {
	const firstLine = content.split(/\r?\n/)[0];
	if (!firstLine) {
		return [];
	}
	return parseCSVLine(firstLine).map((h) => h.toLowerCase().trim());
}

/**
 * Build a normalized map from CSV column name (lowercase) to target field name.
 */
function normalizedMapping(
	mapping: Record<string, string>,
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [csvCol, target] of Object.entries(mapping)) {
		out[csvCol.toLowerCase().trim()] = target;
	}
	return out;
}

/**
 * Returns headers with CSV column names replaced by mapped target field names.
 * Used so required-headers validation runs against target names.
 */
export function applyColumnMappingToHeaders(
	headers: string[],
	columnMapping: Record<string, string>,
): string[] {
	const map = normalizedMapping(columnMapping);
	return headers.map((h) => map[h] ?? h);
}

/**
 * Returns a new row object with keys remapped from CSV columns to target field names.
 */
export function applyColumnMappingToRow(
	rowData: Record<string, string>,
	columnMapping: Record<string, string>,
): Record<string, string> {
	const map = normalizedMapping(columnMapping);
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(rowData)) {
		const targetKey = map[key] ?? key;
		out[targetKey] = value;
	}
	return out;
}
