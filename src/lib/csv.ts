/**
 * Lightweight CSV parsing for import preview.
 * First line = headers; subsequent lines = rows.
 * Handles quoted fields (commas inside quotes are not separators).
 */

/**
 * Parse one CSV line into an array of cell values (handles quoted fields).
 */
function parseCsvLine(line: string): string[] {
	const values: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let j = 0; j < line.length; j++) {
		const char = line[j];
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === "," && !inQuotes) {
			values.push(current.trim());
			current = "";
		} else {
			current += char;
		}
	}
	values.push(current.trim());
	return values;
}

export interface CsvPreviewResult {
	headers: string[];
	sampleRows: Record<string, string>[];
}

/**
 * Parse CSV text into headers and up to maxSampleRows data rows.
 * Each sample row is an object mapping header name -> cell value.
 */
export function parseCsvPreview(
	csvText: string,
	maxSampleRows = 5,
): CsvPreviewResult {
	const lines = csvText
		.trim()
		.split(/\r?\n/)
		.filter((l) => l.trim().length > 0);
	if (lines.length < 1) {
		return { headers: [], sampleRows: [] };
	}

	const headerCells = parseCsvLine(lines[0].trim());
	const seen = new Set<string>();
	const headers = headerCells.map((h, i) => {
		const name = h.trim() || `column_${i}`;
		if (seen.has(name)) {
			const unique = `${name}_${i}`;
			seen.add(unique);
			return unique;
		}
		seen.add(name);
		return name;
	});

	const sampleRows: Record<string, string>[] = [];
	for (let i = 1; i < lines.length && sampleRows.length < maxSampleRows; i++) {
		const line = lines[i].trim();
		if (!line) continue;
		const values = parseCsvLine(line);
		const row: Record<string, string> = {};
		for (let k = 0; k < headers.length; k++) {
			row[headers[k]] = values[k] ?? "";
		}
		sampleRows.push(row);
	}

	return { headers, sampleRows };
}
