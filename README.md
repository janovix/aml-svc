# AML Core Service (aml-svc)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/janovix/aml-svc)

KYC/AML core API service built with Hono on Cloudflare Workers, using D1 database and Prisma ORM. This service provides comprehensive client management, transaction tracking, alert detection, and SAT (Mexican tax authority) compliance features.

## Features

- **Client Management**: Complete KYC data management for physical persons, legal entities (moral), and trusts
- **Transaction Tracking**: Vehicle transaction management (land, marine, air) with UMA value calculations
- **Alert System**: Dynamic alert rule engine with SAT file generation and submission tracking
- **Catalog Management**: Flexible catalog system for countries, states, currencies, vehicle brands, and more
- **Multi-tenant**: Organization-based data isolation
- **SAT Compliance**: XML file generation for Mexican tax authority submissions
- **UMA Values**: Unidad de Medida y Actualización (UMA) value management for transaction calculations

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
  - `TRN` - Transaction
  - `PMT` - Transaction Payment Method
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

5. Populate catalogs (optional):

   ```bash
   pnpm run populate
   ```

6. Seed initial data (optional):
   ```bash
   pnpm run seed
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
│   │   ├── transaction/  # Transaction management
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
- **Transaction**: Vehicle transactions with payment methods
- **Alert**: Compliance alerts with SAT submission tracking
- **AlertRule**: Dynamic alert detection rules
- **Catalog/CatalogItem**: Flexible catalog system
- **UmaValue**: UMA values for transaction calculations
- **OrganizationSettings**: Organization-specific compliance settings

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

### Transaction Management

Transactions track vehicle operations:

- **Operation Types**: Purchase or Sale
- **Vehicle Types**: Land, Marine, or Air
- **Payment Methods**: Multiple payment methods per transaction
- **UMA Calculation**: Automatic UMA value calculation based on transaction date

### Alert System

The alert system provides:

- **Dynamic Rules**: JSON-based rule configuration
- **Idempotency**: Prevents duplicate alerts via idempotency keys
- **SAT Integration**: XML file generation and submission tracking
- **Status Tracking**: DETECTED → FILE_GENERATED → SUBMITTED/OVERDUE/CANCELLED

### Catalog System

Catalogs provide reference data:

- Countries, states, currencies
- Vehicle brands (by type: terrestrial, maritime, air)
- Payment methods, operation types
- Economic activities, vulnerable activities

Catalogs can be:

- **Closed**: Pre-populated, no user additions
- **Open**: Users can add new items (e.g., vehicle brands)

## Scripts

- `pnpm run dev` - Start development server
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
