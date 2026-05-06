-- Add optional description to training_course_module
ALTER TABLE "training_course_module"
  ADD COLUMN "description_i18n" TEXT;
