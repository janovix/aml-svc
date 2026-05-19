-- Operation exceptions (Art. 27 Bis, Frac. III RCG — primera venta de inmuebles)
CREATE TABLE "operation_exceptions" (
  "id"                             TEXT PRIMARY KEY NOT NULL,
  "operation_id"                   TEXT NOT NULL UNIQUE,
  "organization_id"                TEXT NOT NULL,
  "environment"                    TEXT NOT NULL DEFAULT 'production',
  "exception_type"                 TEXT NOT NULL,
  "status"                         TEXT NOT NULL DEFAULT 'INCOMPLETE',
  "legal_reference"                TEXT,
  "is_first_sale"                  BOOLEAN,
  "has_development_bank_funding"   BOOLEAN,
  "development_bank_code"          TEXT,
  "development_bank_name"          TEXT,
  "paid_through_financial_system"  BOOLEAN,
  "has_documentary_evidence"       BOOLEAN,
  "notes"                          TEXT,
  "validated_at"                   DATETIME,
  "validated_by"                   TEXT,
  "created_at"                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE CASCADE
);

CREATE INDEX "operation_exceptions_organization_id_idx" ON "operation_exceptions"("organization_id");
CREATE INDEX "operation_exceptions_status_idx" ON "operation_exceptions"("status");
CREATE INDEX "operation_exceptions_exception_type_idx" ON "operation_exceptions"("exception_type");

-- Evidence documents attached to an exception
CREATE TABLE "operation_exception_evidence" (
  "id"                 TEXT PRIMARY KEY NOT NULL,
  "exception_id"       TEXT NOT NULL,
  "evidence_type"      TEXT NOT NULL,
  "description"        TEXT,
  "doc_svc_document_id" TEXT,
  "uploaded_by"        TEXT,
  "created_at"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("exception_id") REFERENCES "operation_exceptions"("id") ON DELETE CASCADE
);

CREATE INDEX "operation_exception_evidence_exception_id_idx" ON "operation_exception_evidence"("exception_id");
