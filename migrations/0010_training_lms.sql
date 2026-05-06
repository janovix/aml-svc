-- AML Training (LMS): global courses, modules, quiz, per-org enrollments, certifications

CREATE TABLE IF NOT EXISTS "training_course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title_i18n" TEXT NOT NULL,
    "description_i18n" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_mandatory" INTEGER NOT NULL DEFAULT 1,
    "validity_months" INTEGER NOT NULL DEFAULT 12,
    "passing_score" INTEGER NOT NULL DEFAULT 80,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "cooldown_hours" INTEGER NOT NULL DEFAULT 24,
    "published_at" TEXT,
    "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "training_course_slug_key" ON "training_course" ("slug");

CREATE TABLE IF NOT EXISTS "training_course_module" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "course_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "title_i18n" TEXT NOT NULL,
    "asset_ref" TEXT NOT NULL,
    "duration_seconds" INTEGER,
    "required" INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY ("course_id") REFERENCES "training_course" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_training_module_course" ON "training_course_module" ("course_id");

CREATE TABLE IF NOT EXISTS "training_course_quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "course_id" TEXT NOT NULL,
    "shuffle_questions" INTEGER NOT NULL DEFAULT 0,
    "time_limit_minutes" INTEGER,
    FOREIGN KEY ("course_id") REFERENCES "training_course" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "training_course_quiz_course_id_key" ON "training_course_quiz" ("course_id");

CREATE TABLE IF NOT EXISTS "training_quiz_question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quiz_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "prompt_i18n" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "explanation_i18n" TEXT,
    FOREIGN KEY ("quiz_id") REFERENCES "training_course_quiz" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_training_quiz_question_quiz" ON "training_quiz_question" ("quiz_id");

CREATE TABLE IF NOT EXISTS "training_quiz_option" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "text_i18n" TEXT NOT NULL,
    "is_correct" INTEGER NOT NULL,
    FOREIGN KEY ("question_id") REFERENCES "training_quiz_question" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_training_quiz_option_question" ON "training_quiz_option" ("question_id");

CREATE TABLE IF NOT EXISTS "training_enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "course_version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "enrolled_at" TEXT NOT NULL DEFAULT (datetime('now')),
    "due_at" TEXT,
    "completed_at" TEXT,
    "valid_until" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY ("course_id") REFERENCES "training_course" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "training_enrollment_organization_id_user_id_course_id_key" ON "training_enrollment" ("organization_id", "user_id", "course_id");
CREATE INDEX IF NOT EXISTS "idx_training_enrollment_org_status" ON "training_enrollment" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_training_enrollment_org_user" ON "training_enrollment" ("organization_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_training_enrollment_valid_until" ON "training_enrollment" ("valid_until");

CREATE TABLE IF NOT EXISTS "training_enrollment_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enrollment_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "completed_at" TEXT,
    "watched_seconds" INTEGER,
    FOREIGN KEY ("enrollment_id") REFERENCES "training_enrollment" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("module_id") REFERENCES "training_course_module" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "training_enrollment_progress_enrollment_id_module_id_key" ON "training_enrollment_progress" ("enrollment_id", "module_id");
CREATE INDEX IF NOT EXISTS "idx_training_progress_enrollment" ON "training_enrollment_progress" ("enrollment_id");

CREATE TABLE IF NOT EXISTS "training_quiz_attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enrollment_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "started_at" TEXT NOT NULL DEFAULT (datetime('now')),
    "submitted_at" TEXT,
    "score" INTEGER,
    "passed" INTEGER,
    "answers" TEXT,
    FOREIGN KEY ("enrollment_id") REFERENCES "training_enrollment" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_training_quiz_attempt_enrollment" ON "training_quiz_attempt" ("enrollment_id");

CREATE TABLE IF NOT EXISTS "training_certification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enrollment_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "issued_at" TEXT NOT NULL DEFAULT (datetime('now')),
    "expires_at" TEXT NOT NULL,
    "pdf_r2_key" TEXT,
    FOREIGN KEY ("enrollment_id") REFERENCES "training_enrollment" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "training_certification_enrollment_id_key" ON "training_certification" ("enrollment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "training_certification_certificate_number_key" ON "training_certification" ("certificate_number");
CREATE INDEX IF NOT EXISTS "idx_training_cert_org" ON "training_certification" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_training_cert_org_user" ON "training_certification" ("organization_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_training_cert_expires" ON "training_certification" ("expires_at");
