-- Persona moral: giro mercantil (business-activities catalog), distinct from persona física economic activity.
ALTER TABLE "clients" ADD COLUMN "commercial_activity_code" TEXT;

-- Copy legacy moral rows that stored activity in economic_activity_code.
UPDATE "clients"
SET "commercial_activity_code" = "economic_activity_code"
WHERE "person_type" = 'MORAL'
  AND ("commercial_activity_code" IS NULL OR TRIM("commercial_activity_code") = '')
  AND "economic_activity_code" IS NOT NULL
  AND TRIM("economic_activity_code") != '';

CREATE INDEX "clients_commercial_activity_code_idx" ON "clients"("commercial_activity_code");
