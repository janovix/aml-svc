-- Migration: Add exchange rate to operation payments
-- Description: Adds per-payment exchange rate column for foreign currency payments

-- ============================================================================
-- Add exchange_rate column to operation_payments
-- ============================================================================

ALTER TABLE operation_payments ADD COLUMN exchange_rate NUMERIC;
