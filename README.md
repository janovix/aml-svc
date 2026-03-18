# AML Core Service (aml-svc)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/janovix/aml-svc)

KYC/AML core API service built with Hono on Cloudflare Workers, using D1 database and Prisma ORM. This service provides comprehensive client management, operation tracking, alert detection, and SAT (Mexican tax authority) compliance features.

## Features

- **Client Management**: Complete KYC data management for physical persons, legal entities (moral), and trusts
- **Operation Tracking**: Vehicle operation management (land, marine, air) with UMA value calculations
- **Alert System**: Dynamic alert rule engine with SAT file generation and submission tracking
- **Catalog Management**: Flexible catalog system for countries, states, currencies, vehicle brands, and more
- **Multi-tenant**: Organization-based data isolation
- **SAT Compliance**: XML file generation for Mexican tax authority submissions
- **UMA Values**: Unidad de Medida y Actualización (UMA) value management for operation calculations

## ID Generation System

The service uses a custom ID generation system that produces human-readable, type-prefixed identifiers:

- **Format**: `{PREFIX}{RANDOM}` (e.g., `CLTxK9mP2qR4`, `TRN7bN3vY8wZ`)
- **Length**: 12 characters (3-character prefix + 9 random characters)
- **Prefixes**:
  - `CLT` - Client
  - `DOC` - Client Document
  - `ADR` - Client Address
  - `CAT` - Catalog
  - `CIT` - Catalog Item
  - `TRN` - Operation (formerly Transaction)
  - `PMT` - Operation Payment Method
  - `ARL` - Alert Rule
  - `ALT` - Alert
  - `UMA` - UMA Value
  - `ORG` - Organization Settings

IDs are designed to be:

- Human-readable and easy to type/copy
- Type-identifiable by prefix
- Collision-resistant (sufficient entropy)
- Shorter than UUIDs while maintaining uniqueness

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: [Hono](https://hono.dev/) - Fast web framework
- **Database**: Cloudflare D1 (SQLite) with [Prisma ORM](https://www.prisma.io/)
- **API Documentation**: OpenAPI 3.1 specification with auto-generation
- **Testing**: [Vitest](https://vitest.dev/) with Cloudflare Workers pool
- **Authentication**: JWT-based authentication via auth-svc integration

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

   - Copy `.env.example` to `.env` (if exists)
   - Configure `DATABASE_URL` for local development

3. Create D1 database:

   ```bash
   pnpm wrangler d1 create aml-dev
   ```

   Update `database_id` in `wrangler.jsonc` with the new database ID.

4. Run database migrations:

   ```bash
   pnpm run seedLocalDb  # For local development
   # or
   pnpm wrangler d1 migrations apply DB --remote  # For remote
   ```

5. Populate catalogs (includes all CFDI catalogs):

   ```bash
   pnpm run populate:local
   ```

   See [Catalog Population Guide](CATALOG-POPULATION-GUIDE.md) for details on what gets populated.

6. Seed initial data (optional):
   ```bash
   pnpm run seed:local
   ```

### Development

Start local development server:

```bash
pnpm run dev
```

This will:

- Apply local database migrations
- Populate catalogs
- Seed initial data
- Start the Wrangler dev server

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
```

Pre-deployment hooks will automatically:

- Apply database migrations
- Populate catalogs

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
│   ├── domain/           # Domain logic organized by entity
│   │   ├── client/       # Client management
│   │   ├── operation/    # Operation management
│   │   ├── alert/        # Alert system
│   │   ├── catalog/      # Catalog management
│   │   ├── uma/          # UMA value management
│   │   └── organization-settings/
│   ├── lib/              # Shared utilities
│   │   ├── id-generator.ts      # Custom ID generation
│   │   ├── prisma.ts            # Prisma client setup
│   │   ├── synthetic-data-generator.ts
│   │   └── ...
│   ├── middleware/       # Request middleware (auth, error handling)
│   ├── routes/           # API route handlers
│   ├── index.ts          # Main application entry point
│   └── openapi.ts        # OpenAPI specification
├── prisma/
│   └── schema.prisma     # Database schema
├── migrations/           # Database migration files
├── tests/               # Integration tests
└── scripts/             # Utility scripts (seed, populate, etc.)
```

## API Documentation

Once deployed, the API documentation is available at:

- **OpenAPI Schema**: `/openapi.json`
- **API Reference**: `/docsz` (Scalar UI)

## Database Schema

The service uses Prisma with SQLite (D1). Key entities:

- **Client**: KYC data for individuals and entities
- **Operation**: Vehicle operations with payment methods
- **Alert**: Compliance alerts with SAT submission tracking
- **AlertRule**: Dynamic alert detection rules
- **Catalog/CatalogItem**: Flexible catalog system
- **UmaValue**: UMA values for operation calculations
- **OrganizationSettings**: Organization-specific compliance settings

## Catalog Population

The service includes comprehensive catalog data, including all SAT CFDI catalogs:

- **Core Catalogs**: Countries, states, currencies, payment methods, etc.
- **CFDI Catalogs**: All 12 SAT CFDI catalogs (payment forms, tax regimes, etc.)
- **PLD Catalogs**: Consolidated catalogs across vulnerable activities
- **Activity Catalogs**: Individual catalogs for each vulnerable activity

For detailed information on populating catalogs:

- [Catalog Population Guide](CATALOG-POPULATION-GUIDE.md) - Complete guide for local and remote population
- [Manual Workflows Guide](MANUAL-WORKFLOWS.md) - Quick reference for GitHub Actions
- [Populate Scripts README](scripts/populate/README.md) - Detailed script documentation

Quick commands:

```bash
# Local development
pnpm populate:local              # All catalogs + UMA values
pnpm populate:catalogs:local     # All catalogs (no UMA)
pnpm populate:catalogs:large:local  # Large catalogs (zip codes, etc.)

# Remote environments
pnpm populate:dev                # Dev environment
pnpm populate:prod               # Production
```

Or use GitHub Actions: See [Manual Workflows Guide](MANUAL-WORKFLOWS.md)

## Key Concepts

### Client Management

Clients can be:

- **Physical Persons** (`PHYSICAL`): Individual clients with RFC (13 characters)
- **Legal Entities** (`MORAL`): Companies with RFC (12 characters)
- **Trusts** (`TRUST`): Trust entities with RFC (12 characters)

Each client has:

- Unique ID (generated, format: `CLT...`)
- RFC (Registro Federal de Contribuyentes) - unique identifier
- Contact information and address
- Documents and addresses (one-to-many relationships)

### Operation Management

Operations track vehicle activity:

- **Operation Types**: Purchase or Sale
- **Vehicle Types**: Land, Marine, or Air
- **Payment Methods**: Multiple payment methods per operation
- **UMA Calculation**: Automatic UMA value calculation based on operation date

### Alert System

The alert system provides:

- **Dynamic Rules**: JSON-based rule configuration
- **Idempotency**: Prevents duplicate alerts via idempotency keys
- **SAT Integration**: XML file generation and submission tracking
- **Status Tracking**: DETECTED → FILE_GENERATED → SUBMITTED/OVERDUE/CANCELLED

### Catalog System

Catalogs provide reference data:

- **Core**: Countries, states, currencies, payment methods, operation types
- **Vehicle**: Terrestrial, maritime, air vehicle brands
- **CFDI**: All 12 SAT CFDI catalogs (payment forms, tax regimes, usages, etc.)
- **CFDI-PLD**: Mappings between CFDI codes and PLD monetary instruments
- **PLD**: Consolidated catalogs across 19 vulnerable activities
- **Activity**: Individual catalogs for each vulnerable activity
- **Economic**: UMA values, economic activities, vulnerable activities

Catalogs can be:

- **Closed**: Pre-populated, no user additions
- **Open**: Users can add new items (e.g., vehicle brands)

See [Catalog Population Guide](CATALOG-POPULATION-GUIDE.md) for complete details.

## Scripts

- `pnpm run dev` - Start development server (with seeding)
- `pnpm run dev:local` - Start local dev with deployed auth (port 8789)
- `pnpm run seedLocalDb` - Apply migrations to local DB
- `pnpm run populate` - Populate catalogs
- `pnpm run seed` - Seed initial data
- `pnpm run lint` - Run ESLint
- `pnpm run format` - Format code with Prettier
- `pnpm run typecheck` - Type check TypeScript
- `pnpm run vitest` - Run tests
- `pnpm run deploy` - Deploy to Cloudflare Workers

## Contributing

1. Follow the existing code style (enforced by ESLint and Prettier)
2. Write tests for new features
3. Ensure all quality gates pass
4. Use conventional commits
5. Update documentation as needed

## License

Private - Algenium Systems
