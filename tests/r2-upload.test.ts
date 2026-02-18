import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	uploadToR2,
	uploadFileToR2,
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
		const key = generateReportFileKey(
			"org-123",
			"report-1",
			"2024-01-01",
			"2024-01-31",
		);

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

describe("uploadFileToR2", () => {
	let mockBucket: R2Bucket;

	beforeEach(() => {
		mockBucket = {
			put: vi.fn().mockResolvedValue({
				key: "uploads/file-key",
				size: 2048,
				etag: "file-etag",
			}),
			get: vi.fn(),
		} as unknown as R2Bucket;
	});

	it("should upload a file with category and organizationId", async () => {
		const mockFile = new File(["test content"], "test.pdf", {
			type: "application/pdf",
		});

		const result = await uploadFileToR2(mockBucket, mockFile, {
			category: "documents",
			organizationId: "org-123",
		});

		expect(mockBucket.put).toHaveBeenCalledOnce();
		expect(result.key).toContain("documents/org-123/");
		expect(result.key).toContain("test.pdf");
		expect(result.size).toBe(2048);
		expect(result.etag).toBe("file-etag");
	});

	it("should include clientId in key when provided", async () => {
		const mockFile = new File(["test content"], "doc.pdf", {
			type: "application/pdf",
		});

		const result = await uploadFileToR2(mockBucket, mockFile, {
			category: "documents",
			organizationId: "org-123",
			clientId: "client-456",
		});

		expect(result.key).toContain("documents/org-123/client-456/");
	});

	it("should include documentId in key when provided", async () => {
		const mockFile = new File(["test content"], "doc.pdf", {
			type: "application/pdf",
		});

		const result = await uploadFileToR2(mockBucket, mockFile, {
			category: "documents",
			organizationId: "org-123",
			clientId: "client-456",
			documentId: "doc-789",
		});

		expect(result.key).toContain("documents/org-123/client-456/doc-789/");
	});

	it("should sanitize filename by replacing unsafe characters", async () => {
		const mockFile = new File(["test content"], "test@file#name!.pdf", {
			type: "application/pdf",
		});

		const result = await uploadFileToR2(mockBucket, mockFile, {
			category: "documents",
			organizationId: "org-123",
		});

		expect(result.key).toContain("test_file_name_.pdf");
		expect(result.key).not.toContain("@");
		expect(result.key).not.toContain("#");
		expect(result.key).not.toContain("!");
	});

	it("should preserve safe characters in filename", async () => {
		const mockFile = new File(["test content"], "test-file_123.pdf", {
			type: "application/pdf",
		});

		const result = await uploadFileToR2(mockBucket, mockFile, {
			category: "documents",
			organizationId: "org-123",
		});

		expect(result.key).toContain("test-file_123.pdf");
	});

	it("should include custom metadata in upload", async () => {
		const mockFile = new File(["test content"], "test.pdf", {
			type: "application/pdf",
		});

		await uploadFileToR2(mockBucket, mockFile, {
			category: "documents",
			organizationId: "org-123",
			metadata: { clientName: "John Doe", docType: "passport" },
		});

		const putCall = (mockBucket.put as any).mock.calls[0];
		const putOptions = putCall[2] as any;

		expect(putOptions.customMetadata).toMatchObject({
			organizationId: "org-123",
			originalFileName: "test.pdf",
			clientName: "John Doe",
			docType: "passport",
		});
		expect(putOptions.customMetadata.uploadedAt).toBeDefined();
	});

	it("should use file's MIME type as contentType", async () => {
		const mockFile = new File(["test content"], "test.png", {
			type: "image/png",
		});

		await uploadFileToR2(mockBucket, mockFile, {
			category: "documents",
			organizationId: "org-123",
		});

		const putCall = (mockBucket.put as any).mock.calls[0];
		const putOptions = putCall[2] as any;

		expect(putOptions.httpMetadata.contentType).toBe("image/png");
	});

	it("should use default contentType when file type is empty", async () => {
		const mockFile = new File(["test content"], "test", {
			type: "",
		});

		await uploadFileToR2(mockBucket, mockFile, {
			category: "documents",
			organizationId: "org-123",
		});

		const putCall = (mockBucket.put as any).mock.calls[0];
		const putOptions = putCall[2] as any;

		expect(putOptions.httpMetadata.contentType).toBe(
			"application/octet-stream",
		);
	});

	it("should generate timestamp and file ID in key", async () => {
		const mockFile = new File(["test content"], "test.pdf", {
			type: "application/pdf",
		});

		const result = await uploadFileToR2(mockBucket, mockFile, {
			category: "documents",
			organizationId: "org-123",
		});

		// Key should contain ISO timestamp (with colons replaced by dashes)
		expect(result.key).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
		// Key should contain FILE prefix (FILE is 3 chars + random chars)
		expect(result.key).toMatch(/FIL[A-Za-z0-9]+/);
	});

	it("should pass file stream to bucket.put", async () => {
		const mockFile = new File(["test content"], "test.pdf", {
			type: "application/pdf",
		});

		// Mock the stream() method
		mockFile.stream = vi.fn().mockReturnValue("mock-stream");

		await uploadFileToR2(mockBucket, mockFile, {
			category: "documents",
			organizationId: "org-123",
		});

		expect(mockFile.stream).toHaveBeenCalled();
		const putCall = (mockBucket.put as any).mock.calls[0];
		expect(putCall[1]).toBe("mock-stream");
	});

	it("should not include clientId in key when not provided", async () => {
		const mockFile = new File(["test content"], "test.pdf", {
			type: "application/pdf",
		});

		const result = await uploadFileToR2(mockBucket, mockFile, {
			category: "documents",
			organizationId: "org-123",
		});

		const keyParts = result.key.split("/");
		// Should be: documents / org-123 / timestamp-fileid-filename
		expect(keyParts.length).toBe(3);
	});

	it("should include clientId but not documentId when only clientId is provided", async () => {
		const mockFile = new File(["test content"], "test.pdf", {
			type: "application/pdf",
		});

		const result = await uploadFileToR2(mockBucket, mockFile, {
			category: "documents",
			organizationId: "org-123",
			clientId: "client-456",
		});

		const keyParts = result.key.split("/");
		// Should be: documents / org-123 / client-456 / timestamp-fileid-filename
		expect(keyParts.length).toBe(4);
		expect(keyParts[2]).toBe("client-456");
	});
});
