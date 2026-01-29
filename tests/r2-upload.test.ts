import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	uploadToR2,
	generateFileKey,
	generateReportFileKey,
	generateNoticeFileKey,
	generateImportFileKey,
	type R2UploadOptions,
	type R2Bucket,
} from "../src/lib/r2-upload";

describe("uploadToR2", () => {
	let mockBucket: R2Bucket;

	beforeEach(() => {
		mockBucket = {
			put: vi.fn().mockResolvedValue({
				key: "test-key",
				size: 1024,
				etag: "test-etag-123",
			}),
			get: vi.fn(),
		} as unknown as R2Bucket;
	});

	it("should upload string content to R2", async () => {
		const options: R2UploadOptions = {
			bucket: mockBucket,
			key: "test/file.xml",
			content: "<?xml version='1.0'?><root>test</root>",
			contentType: "application/xml",
			metadata: { alertId: "alert-123" },
		};

		const result = await uploadToR2(options);

		expect(mockBucket.put).toHaveBeenCalledTimes(1);
		expect(mockBucket.put).toHaveBeenCalledWith(
			"test/file.xml",
			expect.any(Uint8Array),
			{
				httpMetadata: {
					contentType: "application/xml",
				},
				customMetadata: { alertId: "alert-123" },
			},
		);

		expect(result.key).toBe("test/file.xml");
		expect(result.size).toBe(1024);
		expect(result.etag).toBe("test-etag-123");
	});

	it("should upload ArrayBuffer content to R2", async () => {
		const buffer = new TextEncoder().encode("test content");
		const options: R2UploadOptions = {
			bucket: mockBucket,
			key: "test/file.bin",
			content: buffer,
			contentType: "application/octet-stream",
		};

		const result = await uploadToR2(options);

		expect(mockBucket.put).toHaveBeenCalledWith(
			"test/file.bin",
			buffer,
			expect.objectContaining({
				httpMetadata: {
					contentType: "application/octet-stream",
				},
			}),
		);

		expect(result.key).toBe("test/file.bin");
	});

	it("should upload Uint8Array content to R2", async () => {
		const uint8Array = new Uint8Array([1, 2, 3, 4, 5]);
		const options: R2UploadOptions = {
			bucket: mockBucket,
			key: "test/file.bin",
			content: uint8Array,
		};

		await uploadToR2(options);

		expect(mockBucket.put).toHaveBeenCalledWith(
			"test/file.bin",
			uint8Array,
			expect.any(Object),
		);
	});

	it("should use default contentType when not provided", async () => {
		const options: R2UploadOptions = {
			bucket: mockBucket,
			key: "test/file.xml",
			content: "test content",
		};

		await uploadToR2(options);

		expect(mockBucket.put).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(Uint8Array),
			expect.objectContaining({
				httpMetadata: {
					contentType: "application/octet-stream",
				},
			}),
		);
	});

	it("should handle missing metadata", async () => {
		const options: R2UploadOptions = {
			bucket: mockBucket,
			key: "test/file.xml",
			content: "test content",
		};

		await uploadToR2(options);

		expect(mockBucket.put).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(Uint8Array),
			expect.objectContaining({
				httpMetadata: {
					contentType: "application/octet-stream",
				},
				customMetadata: undefined,
			}),
		);
	});
});

describe("generateFileKey", () => {
	it("should generate a file key with category, org, and filename", () => {
		const key = generateFileKey("documents", "org-123", "test.pdf");

		expect(key).toContain("documents/org-123/");
		expect(key).toContain("test.pdf");
	});
});

describe("generateReportFileKey", () => {
	it("should generate a report file key", () => {
		const key = generateReportFileKey("org-123", "report-1", "2024-01-01", "2024-01-31");

		expect(key).toBe("reports/org-123/report-1_2024-01-01_2024-01-31.html");
	});
});

describe("generateNoticeFileKey", () => {
	it("should generate a notice file key", () => {
		const key = generateNoticeFileKey("org-123", "notice-1", "2024-01");

		expect(key).toBe("notices/org-123/notice-1_2024-01.xml");
	});
});

describe("generateImportFileKey", () => {
	it("should generate an import file key", () => {
		const key = generateImportFileKey("org-123", "data.csv");

		expect(key).toContain("imports/org-123/");
		expect(key).toContain("data.csv");
	});

	it("should generate unique keys for same filename", () => {
		const key1 = generateImportFileKey("org-123", "data.csv");
		const key2 = generateImportFileKey("org-123", "data.csv");

		expect(key1).not.toBe(key2);
	});
});
