import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	uploadToR2,
	generateAlertFileKey,
	type R2UploadOptions,
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
		expect(result.url).toContain("r2://sat-xml-files/test/file.xml");
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
					contentType: "application/xml",
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
					contentType: "application/xml",
				},
				customMetadata: undefined,
			}),
		);
	});
});

describe("generateAlertFileKey", () => {
	it("should generate a file key with alert ID and timestamp", () => {
		const alertId = "alert-123";
		const key = generateAlertFileKey(alertId);

		expect(key).toContain("alerts/alert-123/");
		expect(key).toContain("-alert-123.xml");
		expect(key).toMatch(
			/^alerts\/alert-123\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-alert-123\.xml$/,
		);
	});

	it("should generate unique keys for different alerts", () => {
		const key1 = generateAlertFileKey("alert-1");
		const key2 = generateAlertFileKey("alert-2");

		expect(key1).not.toBe(key2);
		expect(key1).toContain("alert-1");
		expect(key2).toContain("alert-2");
	});

	it("should replace colons and dots in timestamp", () => {
		const alertId = "test-alert";
		const key = generateAlertFileKey(alertId);

		// Should not contain colons or dots (except in .xml extension)
		const timestampPart = key.split("/")[2]?.split("-test-alert")[0] || "";
		expect(timestampPart).not.toContain(":");
		expect(timestampPart).not.toContain(".");
	});
});
