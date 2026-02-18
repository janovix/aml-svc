-- Migration 0006: Notice PDF Document IDs
-- Purpose: Add doc-svc document ID columns for SAT submission and acknowledgment PDFs

ALTER TABLE notices ADD COLUMN submit_pdf_document_id TEXT;
ALTER TABLE notices ADD COLUMN ack_pdf_document_id TEXT;
