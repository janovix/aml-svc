-- Persona moral / SAT giro_mercantil (business-activities catalog), distinct from persona física economic_activity_code.
ALTER TABLE "clients" ADD COLUMN "commercial_activity_code" TEXT;

CREATE INDEX "clients_commercial_activity_code_idx" ON "clients"("commercial_activity_code");

-- Preserve existing moral/trust activity values under the correct column.
UPDATE "clients"
SET
    "commercial_activity_code" = "economic_activity_code",
    "economic_activity_code" = NULL
WHERE "person_type" IN ('MORAL', 'TRUST')
  AND "economic_activity_code" IS NOT NULL
  AND "economic_activity_code" != '';
