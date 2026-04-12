/**
 * Excel Parser
 * Parses Excel files (.xlsx, .xls) into row data using xlsx library
 */

import * as XLSX from "xlsx";
import type { ParsedRow } from "../types";

/**
 * Parses an Excel file buffer into an array of parsed rows
 */
export function parseExcel(buffer: ArrayBuffer): ParsedRow[] {
	const workbook = XLSX.read(buffer, { type: "array" });

	// Get the first sheet
	const sheetName = workbook.SheetNames[0];
	if (!sheetName) {
		throw new Error("Excel file has no sheets");
	}

	const sheet = workbook.Sheets[sheetName];
	if (!sheet) {
		throw new Error("Could not read Excel sheet");
	}

	// Convert sheet to JSON with header row
	const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
		raw: false, // Convert all values to strings
		defval: "", // Default value for empty cells
	});

	if (jsonData.length === 0) {
		throw new Error(
			"Excel file must have at least a header row and one data row",
		);
	}

	// Convert to ParsedRow format
	const rows: ParsedRow[] = jsonData.map((row, index) => {
		const data: Record<string, string> = {};

		for (const [key, value] of Object.entries(row)) {
			// Normalize header to lowercase
			const normalizedKey = key.toLowerCase().trim();
			// Convert value to string
			data[normalizedKey] = String(value ?? "").trim();
		}

		return {
			rowNumber: index + 1, // 1-based row numbers (excluding header)
			data,
		};
	});

	return rows;
}

/**
 * Gets headers from an Excel file
 */
export function getExcelHeaders(buffer: ArrayBuffer): string[] {
	const workbook = XLSX.read(buffer, { type: "array" });

	const sheetName = workbook.SheetNames[0];
	if (!sheetName) {
		return [];
	}

	const sheet = workbook.Sheets[sheetName];
	if (!sheet) {
		return [];
	}

	// Get the first row as headers
	const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
	const headers: string[] = [];

	for (let col = range.s.c; col <= range.e.c; col++) {
		const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
		const cell = sheet[cellAddress];
		const header = cell ? String(cell.v).toLowerCase().trim() : "";
		headers.push(header);
	}

	return headers;
}

/**
 * Checks if a file is an Excel file based on extension
 */
export function isExcelFile(filename: string): boolean {
	const ext = filename.toLowerCase();
	return ext.endsWith(".xlsx") || ext.endsWith(".xls");
}
