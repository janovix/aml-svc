-- KYC self-service: send invite email when creating a session (org default, toggleable in compliance settings)
ALTER TABLE "organization_settings" ADD COLUMN "self_service_send_email" INTEGER NOT NULL DEFAULT 1;
