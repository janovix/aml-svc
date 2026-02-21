#!/usr/bin/env node
/**
 * Split Large Catalog Files into Chunks
 *
 * Splits very large CSV files into smaller chunks for R2 upload:
 * - zip-codes.csv (~157K lines, 10.86 MB) → chunks of 20K lines
 * - cfdi-product-services.csv (~52K lines, 2.33 MB) → chunks of 10K lines
 *
 * Output format: {filename}-chunk-{number}.csv
 * Each chunk includes the header row.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CACHE_DIR = join(__dirname, "../../../catalogs-cache");
const CHUNKS_DIR = join(CACHE_DIR, "chunks");

// Configuration for large files
const LARGE_FILES = [
	{
		filename: "zip-codes.csv",
		chunkSize: 20000, // 20K lines per chunk
	},
	{
		filename: "cfdi-product-services.csv",
		chunkSize: 10000, // 10K lines per chunk
	},
];

/**
 * Split a CSV file into chunks
 */
function splitCsvFile(filename, chunkSize) {
	const filePath = join(CACHE_DIR, filename);
	const content = readFileSync(filePath, "utf-8");
	const lines = content.split("\n");

	// First line is header
	const header = lines[0];
	const dataLines = lines.slice(1).filter((line) => line.trim() !== "");

	console.log(`\n📄 Processing ${filename}:`);
	console.log(`   Total data lines: ${dataLines.length.toLocaleString()}`);
	console.log(`   Chunk size: ${chunkSize.toLocaleString()} lines`);

	const totalChunks = Math.ceil(dataLines.length / chunkSize);
	console.log(`   Will create: ${totalChunks} chunks\n`);

	const baseName = filename.replace(".csv", "");
	const chunks = [];

	for (let i = 0; i < totalChunks; i++) {
		const start = i * chunkSize;
		const end = Math.min(start + chunkSize, dataLines.length);
		const chunkLines = dataLines.slice(start, end);

		// Create chunk with header
		const chunkContent = [header, ...chunkLines].join("\n");

		// Chunk numbering: 001, 002, etc.
		const chunkNumber = String(i + 1).padStart(3, "0");
		const chunkFilename = `${baseName}-chunk-${chunkNumber}.csv`;
		const chunkPath = join(CHUNKS_DIR, chunkFilename);

		writeFileSync(chunkPath, chunkContent);

		console.log(
			`   ✅ ${chunkFilename} (${chunkLines.length.toLocaleString()} lines)`,
		);

		chunks.push({
			filename: chunkFilename,
			lines: chunkLines.length,
			start: start + 1, // +1 because we're 1-indexed for data
			end: end,
		});
	}

	return {
		originalFile: filename,
		totalLines: dataLines.length,
		chunkSize,
		chunks,
	};
}

/**
 * Generate manifest file with chunk information
 */
function generateManifest(results) {
	const manifest = {
		generated: new Date().toISOString(),
		files: results.map((result) => ({
			original: result.originalFile,
			totalLines: result.totalLines,
			chunkSize: result.chunkSize,
			totalChunks: result.chunks.length,
			chunks: result.chunks.map((c) => ({
				filename: c.filename,
				lines: c.lines,
				range: `${c.start}-${c.end}`,
			})),
		})),
	};

	const manifestPath = join(CHUNKS_DIR, "chunks-manifest.json");
	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

	console.log(`\n📋 Manifest created: chunks-manifest.json`);
	return manifest;
}

async function splitAll() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║         Split Large Catalogs into Chunks                  ║");
	console.log("╚════════════════════════════════════════════════════════════╝");

	// Create chunks directory
	if (!existsSync(CHUNKS_DIR)) {
		mkdirSync(CHUNKS_DIR, { recursive: true });
		console.log(`\n📁 Created chunks directory: ${CHUNKS_DIR}`);
	}

	const results = [];

	for (const config of LARGE_FILES) {
		const result = splitCsvFile(config.filename, config.chunkSize);
		results.push(result);
	}

	// Generate manifest
	const _manifest = generateManifest(results);

	console.log(
		"\n╔════════════════════════════════════════════════════════════╗",
	);
	console.log("║                    Summary                                 ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	for (const result of results) {
		console.log(`📄 ${result.originalFile}:`);
		console.log(`   Total lines: ${result.totalLines.toLocaleString()}`);
		console.log(`   Chunks created: ${result.chunks.length}`);
		console.log(`   Chunk size: ${result.chunkSize.toLocaleString()} lines\n`);
	}

	const totalChunks = results.reduce((sum, r) => sum + r.chunks.length, 0);
	console.log(`✅ Created ${totalChunks} chunk files in ${CHUNKS_DIR}/`);
	console.log(`\n📝 Next steps:`);
	console.log(`   1. Upload chunk files to R2 bucket (catalogs/chunks/)`);
	console.log(`   2. Use populate scripts to load from chunks`);
}

splitAll().catch(console.error);
