-- Snapshot recipient and org names on training_certification for immutable PDFs.
ALTER TABLE "training_certification" ADD COLUMN "user_name" TEXT;
ALTER TABLE "training_certification" ADD COLUMN "organization_name" TEXT;
