# AML Core Service (aml-svc)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/janovix/aml-svc)

KYC/AML core API service built with Hono on Cloudflare Workers, using D1 database and Prisma ORM. This service provides comprehensive client management, operation tracking across vulnerable activities, alert detection, KYC/onboarding, risk assessment (EBR), training (LMS), and SAT (Mexican tax authority) compliance features.

## Features

### Core Data Management

- **Client Management**: Complete KYC data for physical persons, legal entities, and trusts with documents and addresses
- **Shareholders & Beneficial Controllers**: Multi-level ownership tracking, Anexo 3 compliance, and automated watchlist screening via watchlist-svc binding
- **Operations**: Tracked across 11+ PLD vulnerable activity types (vehicle, real estate, jewelry, virtual assets, gambling, donations, loans, armoring, professional services, etc.) with payment methods and UMA value calculations
- **Invoices**: CFDI invoice parsing and storage for supply chain transparency
- **Notices**: SAT compliance cycle (17-1, 17-17 monthly submissions) with lifecycle tracking and XML generation

### AML & Compliance

- **Alert System**: Dynamic rules-based alert detection with JSON rule configuration, idempotency, SAT XML file generation, and submission tracking (DETECTED → FILE_GENERATED → SUBMITTED/OVERDUE/CANCELLED)
- **Alert Rules**: Customizable rule engine with real-time pattern matching and compliance officer configuration
- **Risk / EBR**: Client and organization risk assessments with dynamic methodology, mitigant tracking, and PDF export reports
- **Watchlist Screening**: Org-managed watchlist refresh (cron + queue-backed `aml-screening-refresh`), OFAC/UNSC/SAT-69B match detection for clients and beneficial controllers

### User Onboarding & Self-Service

- **KYC Sessions**: Organization-initiated client onboarding with session tokens, editable sections, and status tracking (PENDING → COMPLETED → APPROVED/REJECTED)
- **Public KYC**: Token-based self-service endpoints for clients to update personal info, documents, shareholders, beneficial controllers, and submit for review

### Productivity & Analytics

- **Reports**: Aggregated PDF analytics reports (EBR summaries, compliance dashboards)
- **Imports**: Bulk CSV/Excel data import for clients and operations with queue-backed row processing and event-stream error reporting
- **Catalogs**: Reference data (countries, states, currencies, payment methods, vehicle brands, CFDI codes, economic activities, vulnerable activities) with pre-populated and open-edit modes
- **Files**: R2 storage for documents, certificates, reports, and training materials
- **Exchange Rates**: CurrencyLayer-backed real-time rates (1h cache via KV)
- **UMA Values**: Unidad de Medida y Actualización reference data for operation calculations

### Training (LMS)

- **Learner training**: Organization members access mandatory annual training with quizzes, progress tracking, and certificates
- **Admin authoring**: Platform admins create and manage global training catalogs (courses, modules, quizzes)
- **Enrollment & automation**: Cron-driven enrollment sync (0 5 UTC), expiration detection (0 6 UTC), and reminder dispatch (0 7 UTC)
- **Video & certificates**: Cloudflare Stream direct upload for training videos; PDF certificate generation with R2 storage
- All endpoints under `/api/v1/training` (learners) and `/api/v1/admin/training` (admins)

### Platform & AI

- **Janbot**: Org-scoped chat threads and watchlist search helper; persistent message history and tool calls via chat bindings
- **Platform Admin**: Cross-organization statistics, risk methodology management, org settings, training admin; requires admin role via auth-svc
- **Webhooks**: Event publishing to `WEBHOOK_QUEUE` for asynchronous delivery to external systems (clients, operations, notices, alerts, KYC sessions, training)

### Infrastructure & Integrations

- **Service bindings**: auth-svc (JWT, org language, audit logs), doc-svc (document metadata), watchlist-svc (screening RPC), notifications-svc (email/notification delivery)
- **Queues**: Alert detection, imports, risk assessment, screening refresh, training cert gen, training notifications, webhooks
- **Scheduled tasks**: Cron-driven KYC expiry, notice deadlines, watchlist rescan enqueue, risk review enqueue (0 2, 0 14 UTC); training tasks (0 5, 0 6, 0 7 UTC)
- **Observability**: Sentry error tracking (disabled if `SENTRY_DSN` unset), source maps, version metadata

## ID Generation System

The service uses a custom ID generation system that produces human-readable, type-prefixed identifiers:

- **Format**: `{PREFIX}{RANDOM}` (e.g., `CLTxK9mP2qR4`, `OPR7bN3vY8wZ`)
- **Length**: 12 characters (3-character prefix + 9 random characters)
- **Prefixes** (selected; see [`src/lib/id-generator.ts`](src/lib/id-generator.ts) for complete list):
  - `CLT` - Client
  - `DOC` - Client Document
  - `ADR` - Client Address
  - `SHR` - Shareholder
  - `BC` - Beneficial Controller (Beneficiario Controlador)
  - `OPR` - Operation (standard prefix; `TRN` deprecated)
  - `INV` - Invoice
  - `IMP` - Import
  - `ARL` - Alert Rule
  - `ALT` - Alert
  - `NTC` - Notice
  - `KYC` - KYC Session
  - `RPT` - Report
  - `UMA` - UMA Value
  - `ORG` - Organization Settings
  - `CRA` - Client Risk Assessment
  - `ORA` - Organization Risk Assessment

IDs are designed to be human-readable, type-identifiable, collision-resistant, and shorter than UUIDs.

## Tech Stack

- **Runtime**: Cloudflare Workers (Node.js compat mode)
- **Framework**: [Hono](https://hono.dev/) - Fast web framework
- **Database**: Cloudflare D1 (SQLite) with [Prisma ORM](https://www.prisma.io/)
- **Storage**: Cloudflare R2 (documents, files, certificates)
- **Cache**: Cloudflare KV (JWKS, exchange rates, training uploads)
- **Queue**: Cloudflare Queues (alert detection, imports, risk assessment, screening, training, webhooks)
- **API Documentation**: OpenAPI 3.1 specification (`src/openapi.ts`) with Scalar UI at `/docsz`
- **Testing**: [Vitest](https://vitest.dev/) with Cloudflare Workers pool
- **Authentication**: JWT-based authentication via auth-svc binding
- **Error Tracking**: Sentry (configurable via `SENTRY_DSN`)

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm 10+
- Cloudflare account with Workers and D1 enabled
- Wrangler CLI installed globally or via pnpm

### Installation

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up environment variables:

   - Copy `.env` with `DATABASE_URL=file:./local.db` (or path to your local D1 SQLite file)
   - Configure secrets and vars in Cloudflare Dashboard or use `.dev.vars` for local development (see **Configuration** section below)

3. Create D1 database (local development only):

   ```bash
   pnpm wrangler d1 create aml-dev
   ```

   Update `database_id` in `wrangler.jsonc` with the new database ID.

4. Run database migrations:

   ```bash
   # Local development (applies migrations to local D1)
   pnpm wrangler d1 migrations apply DB --local

   # Or via wrangler dev (automatically runs on startup)
   pnpm dev
   ```

5. Populate catalogs (includes all SAT CFDI catalogs):

   ```bash
   pnpm run populate:local
   ```

   See [Catalog Population Guide](CATALOG-POPULATION-GUIDE.md) for details on what gets populated.

6. Seed initial data (optional):

   ```bash
   pnpm run seed:local
   ```

### Development

Start local development server with migrations applied:

```bash
pnpm run dev
```

This will:

- Apply local database migrations
- Start the Wrangler dev server on `http://localhost:8787`

### Local Development with Deployed Auth

For local development using the **deployed** auth service (no local auth-svc needed):

```bash
pnpm run dev:local
```

This uses `wrangler.local.jsonc` which:

- Uses deployed `auth-svc.janovix.workers.dev` for JWT verification
- Runs on port 8789 for use with Caddy reverse proxy
- Uses local D1 database

To use with the local frontend:

1. Start Caddy: `caddy run --config ../Caddyfile`
2. Start this service: `pnpm run dev:local`
3. Access via `https://aml-svc-local.janovix.workers.dev`

See `../aml/LOCAL_DEV_SETUP.md` for complete instructions.

### Deployment

Deploy to Cloudflare Workers:

```bash
# Deploy to dev environment
pnpm run deploy:dev

# Deploy to production
pnpm run deploy:prod

# Deploy to preview
pnpm run deploy:preview
```

Pre-deployment hooks will automatically apply database migrations.

## Testing

Run all tests:

```bash
pnpm run vitest
```

Run tests with coverage:

```bash
pnpm run vitest:coverage
```

Run specific test file:

```bash
pnpm run vitest src/lib/id-generator.test.ts
```

## Quality Gates

The project enforces quality gates that must pass before deployment:

```bash
# Lint check
pnpm run lint

# Format check
pnpm run format:check

# Type check
pnpm run typecheck

# Run tests
pnpm run vitest --run
```

All checks must pass for the codebase to be considered ready.

## Project Structure

```
aml-svc/
├── src/
│   ├── domain/                    # Domain logic organized by entity
│   │   ├── client/                # Client management (KYC, docs, addresses)
│   │   ├── shareholder/           # Shareholder management
│   │   ├── beneficial-controller/ # Beneficial controller / UBO tracking
│   │   ├── operation/             # Operation management across activity types
│   │   ├── invoice/               # CFDI invoice handling
│   │   ├── alert/                 # Alert detection and management
│   │   ├── alert-detection/       # Alert rule processors
│   │   ├── notice/                # SAT notice lifecycle
│   │   ├── report/                # PDF report generation
│   │   ├── import/                # CSV/Excel bulk import processing
│   │   ├── kyc-session/           # KYC session and onboarding
│   │   ├── catalog/               # Reference catalog data
│   │   ├── uma/                   # UMA value reference
│   │   ├── organization-settings/ # Org compliance configuration
│   │   ├── risk/                  # Risk assessment (EBR) — org, client, methodology
│   │   │   ├── org/               # Organization risk assessments and mitigants
│   │   │   ├── client/            # Client risk assessments and factors
│   │   │   └── methodology/       # Dynamic risk scoring methodology
│   │   └── training/              # Training LMS (courses, enrollments, quizzes)
│   ├── cron/                      # Scheduled cron handlers
│   │   ├── training-enrollment-sync.ts
│   │   ├── training-expiration.ts
│   │   └── training-reminders.ts
│   ├── queues/                    # Queue consumer handlers
│   │   ├── training-cert-gen.consumer.ts
│   │   └── training-notification.consumer.ts
│   ├── lib/                       # Shared utilities
│   │   ├── id-generator.ts            # Custom ID generation
│   │   ├── prisma.ts                  # Prisma client setup
│   │   ├── watchlist-rescan.ts        # Scheduled watchlist refresh orchestration
│   │   ├── screening-snapshot.ts      # Watchlist result snapshots
│   │   ├── alert-queue.ts             # Alert detection queue producer
│   │   ├── risk-queue.ts              # Risk assessment queue producer
│   │   ├── risk-queue-processor.ts    # Risk queue consumer logic
│   │   ├── training/stream.ts         # Cloudflare Stream integration
│   │   ├── training/jobs.ts           # Training background job types
│   │   ├── webhook-events.ts          # Webhook event producer
│   │   ├── synthetic-data-generator.ts # Test data generation
│   │   └── ... (other utilities)
│   ├── middleware/                # Request middleware
│   │   ├── auth.ts                # JWT authentication
│   │   ├── admin-auth.ts          # Admin role checking
│   │   ├── error.ts               # Error handling
│   │   ├── cors.ts                # CORS configuration
│   │   └── ...
│   ├── routes/                    # API route handlers (organized by domain)
│   │   ├── clients.ts
│   │   ├── shareholders.ts
│   │   ├── beneficial-controllers.ts
│   │   ├── operations.ts
│   │   ├── invoices.ts
│   │   ├── alerts.ts
│   │   ├── alert-rules.ts
│   │   ├── notices.ts
│   │   ├── reports.ts
│   │   ├── imports.ts
│   │   ├── kyc-sessions.ts
│   │   ├── public-kyc.ts
│   │   ├── risk.ts
│   │   ├── organization-settings.ts
│   │   ├── catalogs.ts
│   │   ├── exchange-rates.ts
│   │   ├── uma-values.ts
│   │   ├── training.ts
│   │   ├── training-admin.ts
│   │   ├── chat.ts
│   │   ├── janbot-watchlist.ts
│   │   ├── admin.ts
│   │   ├── internal-maintenance.ts
│   │   ├── internal-e2e.ts
│   │   └── index.ts               # Router aggregation
│   ├── types.ts                   # Type definitions and Bindings
│   ├── env.d.ts                   # Environment variable declarations
│   ├── entrypoint.ts              # RPC entrypoint for service binding access
│   ├── index.ts                   # Main application entry point
│   └── openapi.ts                 # OpenAPI 3.1 specification
├── prisma/
│   └── schema.prisma              # Prisma schema (D1 + SQLite)
├── migrations/                    # Database migration files
├── tests/                         # Integration tests
├── scripts/                       # Utility scripts (seed, populate, E2E)
└── docs/                          # Documentation
    └── E2E_INTERNAL.md            # Internal E2E testing endpoints
```

## API Documentation

Once deployed, the API documentation is available at:

- **OpenAPI Schema**: `GET /openapi.json`
- **API Reference**: `GET /docsz` (Scalar UI with interactive explorer)
- **Health check**: `GET /healthz` (status, version, environment)

## Database Schema

The service uses Prisma with SQLite (D1). Key entities:

- **Client**: KYC data (physical, moral, trust) with RFC and address
- **ClientDocument**: Uploaded documents with verification status
- **ClientAddress**: Multi-address support per client
- **Shareholder**: Legal ownership structure (1-2 levels)
- **BeneficialController**: Ultimate beneficial owners per LFPIORPI/CFF 32-B; Anexo 3 compliance
- **ClientWatchlistScreening**: Screening history and results (OFAC, UNSC, SAT-69B)
- **BeneficialControllerWatchlistScreening**: Screening history for beneficial controllers
- **Operation**: Vulnerable activity operations (purchase/sale) with PLD typing
- **OperationVehicle, OperationRealEstate, ..., OperationArt**: Activity-specific details (11+ types)
- **Invoice**: CFDI invoice headers and line items
- **KycSession**: Onboarding sessions with tokens, editable sections, and status
- **Notice**: SAT notice lifecycle (monthly 17-1, 17-17 submissions)
- **NoticeEvent**: Audit trail for notice status changes
- **Report**: Generated PDF reports with file references
- **Alert**: Compliance alerts with rule matching and SAT file generation
- **AlertRule**: Customizable alert detection rules (JSON-based patterns)
- **Import**: Bulk data imports with row-level error tracking
- **ImportRowResult**: Per-row import result (success/error)
- **OrgRiskAssessment, OrgRiskElement, OrgMitigant**: Organization-level risk and mitigants
- **ClientRiskAssessment**: Client-level risk scores and factor contributions
- **RiskMethodology, RiskCategory, RiskFactor, RiskThreshold**: Dynamic risk scoring framework
- **ChatThread, ChatMessage, ChatToolCall, ChatAttachment**: Janbot conversation persistence
- **TrainingCourse, TrainingModule, TrainingQuiz, TrainingQuizQuestion**: LMS course structure
- **TrainingEnrollment, TrainingEnrollmentProgress**: Learner enrollment and progress
- **TrainingQuizAttempt, TrainingCertification**: Assessments and certificate issuance

## Catalog Population

The service includes comprehensive catalog data, including all SAT CFDI catalogs:

- **Core Catalogs**: Countries, states, currencies, payment methods, operation types
- **CFDI Catalogs**: All 12 SAT CFDI catalogs (payment forms, tax regimes, usages, entity types, etc.)
- **PLD Catalogs**: Consolidated catalogs across 19 vulnerable activities
- **Activity Catalogs**: Individual catalogs for each vulnerable activity type
- **Economic**: UMA values, economic activities, vulnerable activities

For detailed information:

- [Catalog Population Guide](CATALOG-POPULATION-GUIDE.md) - Complete guide for local and remote population
- [Manual Workflows Guide](MANUAL-WORKFLOWS.md) - Quick reference for GitHub Actions
- [Populate Scripts README](scripts/populate/README.md) - Detailed script documentation

## Scripts

### Development & Local

- `pnpm run dev` - Start dev server with local migrations (port 8787)
- `pnpm run dev:local` - Start with deployed auth-svc (port 8789, for Caddy proxy)
- `pnpm run caddy:local` - Start local Caddy reverse proxy

### Database & Catalog

- `pnpm wrangler d1 migrations apply DB --local` - Apply migrations manually (usually done by `pnpm dev`)
- `pnpm run populate:local` - Populate all catalogs + UMA values locally
- `pnpm run populate:catalogs:local` - Populate all catalogs only (no UMA)
- `pnpm run populate:catalogs:large:local` - Large catalogs only (e.g. zip codes)
- `pnpm run populate:dev` - Populate to dev environment
- `pnpm run populate:prod` - Populate to production
- `pnpm run populate:preview` - Populate to preview environment
- `pnpm run seed:local` - Seed initial test data locally
- `pnpm run seed:dev` - Seed to dev
- `pnpm run seed:preview` - Seed to preview
- `pnpm run seed:validate` - Validate seed data integrity
- `pnpm run update:uma-values` - Update UMA values from external source

### Testing

- `pnpm run test` or `pnpm run vitest` - Run all tests (Vitest)
- `pnpm run vitest:coverage` - Run tests with coverage report
- `pnpm run typecheck` - Run TypeScript type checking

### Code Quality

- `pnpm run lint` - Run ESLint
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check formatting without changes

### Deployment & Build

- `pnpm run deploy:dev` - Deploy to dev environment
- `pnpm run deploy:prod` - Deploy to production
- `pnpm run deploy:preview` - Deploy to preview (manual test environment)
- `pnpm run deploy` - Default deploy (reads wrangler config)
- `pnpm run cf-typegen` - Generate Cloudflare Worker types (usually automatic)
- `pnpm run generate:sql` - Generate SQL migration templates

### Other

- `pnpm run release` - Semantic versioning release (CI only)
- `pnpm run sentry:sourcemaps` - Upload sourcemaps to Sentry

## Configuration

### Environment Variables & Secrets

This section describes all Cloudflare resource bindings, public `vars`, and secrets required to run aml-svc. Configuration varies by environment — refer to `wrangler.jsonc`, `wrangler.prod.jsonc`, `wrangler.preview.jsonc`, and `wrangler.local.jsonc` for environment-specific values.

#### Cloudflare Resource Bindings

Configure these in `wrangler*.jsonc`. They are **not** vars or secrets, but rather infrastructure bindings:

| Binding                 | Type                   | Purpose                                                                                      |
| ----------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| `DB`                    | D1 Database            | SQLite database (Prisma adapter)                                                             |
| `CACHE`                 | KV Namespace           | JWKS caching, exchange rates, training upload temp storage (1h TTL typical)                  |
| `R2_BUCKET`             | R2 Bucket              | Files, documents, training videos, PDF certificates, reports (prefix: `lms/` for training)   |
| `AUTH_SERVICE`          | Service Binding (RPC)  | JWT verification, user settings, org language, audit logging; uses `AuthSvcEntrypoint`       |
| `DOC_SERVICE`           | Service Binding (HTTP) | Document metadata (integration marked MVP); currently listed but not actively used in routes |
| `WATCHLIST_SERVICE`     | Service Binding (RPC)  | Screening queries (OFAC, UNSC, SAT-69B); uses `WatchlistEntrypoint`                          |
| `NOTIFICATIONS_SERVICE` | Service Binding (RPC)  | Email/notification delivery; uses `NotificationsEntrypoint`                                  |

#### Queue Bindings (Producers)

Exact queue names vary per environment; refer to `wrangler*.jsonc`:

| Binding                       | Dev Queue                        | Purpose                                                |
| ----------------------------- | -------------------------------- | ------------------------------------------------------ |
| `ALERT_DETECTION_QUEUE`       | `aml-alert-detection-dev`        | Alert rule matching and JSON payload dispatch          |
| `IMPORT_PROCESSING_QUEUE`     | `aml-imports-dev`                | CSV/Excel row processing with error tracking           |
| `RISK_ASSESSMENT_QUEUE`       | `aml-risk-assessment-dev`        | Client and org risk reassessment scoring               |
| `AML_SCREENING_REFRESH_QUEUE` | `aml-screening-refresh-dev`      | Watchlist rescan jobs for clients/BCs (cron-driven)    |
| `WEBHOOK_QUEUE`               | `webhook-events-dev`             | Outbound event delivery to external systems            |
| `TRAINING_CERT_GEN_QUEUE`     | `aml-training-cert-gen-dev`      | Training certificate PDF generation                    |
| `TRAINING_NOTIFICATION_QUEUE` | `aml-training-notifications-dev` | Training enrollment/expiration/reminder email dispatch |

All are configured as **producers** in aml-svc; some (alert-detection, risk-assessment, screening-refresh, training-cert-gen, training-notifications) are also **consumed** by aml-svc (see `src/index.ts` `queue` handler).

#### Public Variables (`vars`)

Non-secret configuration; often in `wrangler*.jsonc`:

| Name                   | Purpose                                                                                                                 | Example                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `ENVIRONMENT`          | Deployment environment (used in logs, Sentry tags)                                                                      | `dev`, `preview`, `production`             |
| `AUTH_JWKS_CACHE_TTL`  | Cache TTL for JWT JWKS in seconds                                                                                       | `3600`                                     |
| `TRUSTED_ORIGINS`      | CORS allowed origins (comma-separated)                                                                                  | `*.janovix.workers.dev,http://localhost:*` |
| `AML_FRONTEND_URL`     | Frontend URL for notification links                                                                                     | `https://aml.janovix.workers.dev`          |
| `KYC_SELF_SERVICE_URL` | KYC self-service app URL                                                                                                | `https://kyc.janovix.workers.dev`          |
| `E2E_API_KEY`          | Bearer token for internal E2E endpoints; **empty string disables** (see [`docs/E2E_INTERNAL.md`](docs/E2E_INTERNAL.md)) | (varies; empty in dev if disabled)         |
| `CF_ACCOUNT_ID`        | Cloudflare account ID (Stream direct upload)                                                                            | (12-hex string)                            |
| `STREAM_CUSTOMER_CODE` | Stream customer subdomain code for iframe URLs                                                                          | (varies)                                   |
| `API_VERSION`          | Override API version (defaults to `package.json` version)                                                               | (optional; usually unset)                  |

#### Secrets

Use `wrangler secret put <NAME>` or Cloudflare Dashboard. **Never commit** to `.env` or git:

| Name                             | Purpose                                                                                                                                                                                                                                         | Example / Notes                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `SENTRY_DSN`                     | Sentry error tracking DSN; **if unset, Sentry is disabled**                                                                                                                                                                                     | `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx` |
| `INTERNAL_SERVICE_SECRET`        | Bearer token for internal service-to-service endpoints (e.g., `/internal/maintenance`); see [`scripts/kyc-recalculate-all.mjs`](scripts/kyc-recalculate-all.mjs) and [`src/routes/internal-maintenance.ts`](src/routes/internal-maintenance.ts) | (randomly generated secret)                  |
| `SYNTHETIC_DATA_SECRET`          | Secret for POST `/internal/synthetic-data` header `X-Synthetic-Data-Secret`; **local dev only** (disabled in production; see [`src/index.ts`](src/index.ts) check)                                                                              | (randomly generated)                         |
| `CLOUDFLARE_STREAM_API_TOKEN`    | Cloudflare Stream API token for direct video upload in training                                                                                                                                                                                 | (API token from Cloudflare Dashboard)        |
| `STREAM_SIGNING_KEY_ID`          | Stream signing key ID (JWT kid) for signed video playback                                                                                                                                                                                       | (key ID from Cloudflare Dashboard)           |
| `STREAM_SIGNING_KEY_PRIVATE_PEM` | PEM PKCS8 private key for Stream JWT signing                                                                                                                                                                                                    | (multiline PEM key; keep newlines)           |
| `CURRENCYLAYER_API_KEY`          | CurrencyLayer API key for real-time exchange rates ([get key](https://currencylayer.com/))                                                                                                                                                      | (API key from CurrencyLayer)                 |

#### Optional / Reserved Secrets

The following are declared in types but currently **not used** unless SAT XML generation wiring is added:

| Name                          | Purpose                                                 |
| ----------------------------- | ------------------------------------------------------- |
| `SAT_CLAVE_SUJETO_OBLIGADO`   | 12-character RFC identifier for SAT submissions         |
| `SAT_CLAVE_ACTIVIDAD`         | Activity code for SAT notices (e.g., "VEH" for vehicle) |
| `SAT_CLAVE_ENTIDAD_COLEGIADA` | Optional collegiate entity identifier for SAT           |

#### Prisma & Local CLI

- **`DATABASE_URL`**: Set in `.env` for Prisma CLI (`prisma migrate`, `prisma generate`, etc.). Point to your local D1 SQLite file path, e.g., `file:./local.db` or the path Wrangler uses for local D1.

  - The Worker **runtime** uses the **`DB` D1 binding**, not `DATABASE_URL`.
  - For local development, `wrangler dev` will create `.wrangler/state/v3/d1/` subdirectories.
  - For Prisma migrations against the local DB: `DATABASE_URL=file:./.wrangler/state/v3/d1/<hash> prisma migrate dev`

- **Local Secrets (`.dev.vars`)**: For `wrangler dev`, create `.dev.vars` (git-ignored) with secret values:
  ```
  SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
  INTERNAL_SERVICE_SECRET=test-secret
  SYNTHETIC_DATA_SECRET=test-secret
  CLOUDFLARE_STREAM_API_TOKEN=token_abc123
  STREAM_SIGNING_KEY_ID=key_123
  STREAM_SIGNING_KEY_PRIVATE_PEM=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
  CURRENCYLAYER_API_KEY=api_key_xyz
  ```

#### Profile-Specific Notes

- **`wrangler.local.jsonc`**: Declares fewer queues (no risk assessment, screening refresh) than full config; intended for local dev with external services. Adjust as needed.
- **`wrangler.preview.jsonc`**: Training-only crons (0 5, 0 6, 0 7 UTC); no legacy crons (0 2, 0 14).
- **`wrangler.prod.jsonc`**: All crons (0 2, 0 14, 0 5, 0 6, 0 7 UTC); full queue and binding suite.

#### Generated Types Caveat

The file `worker-configuration.d.ts` (generated by `wrangler types`) may include bindings or vars that **are not referenced** in the codebase (e.g., leftover API keys from experiments). **For accurate requirements**, cross-reference `src/types.ts` (`Bindings` interface) and actual `c.env` usage in the source code, not the generated file.

## Contributing

1. Follow the existing code style (enforced by ESLint and Prettier)
2. Write tests for new features
3. Ensure all quality gates pass
4. Use conventional commits
5. Update documentation as needed

## License

Private - Algenium Systems
