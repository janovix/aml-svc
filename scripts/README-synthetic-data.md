# Synthetic Data Generation

This script generates synthetic data (clients, transactions, etc.) for testing and development purposes. It can be run from GitHub Actions via `workflow_dispatch` or locally.

## Usage

### From GitHub Actions

The script runs entirely within GitHub Actions and connects directly to your D1 database via Cloudflare REST API.

Create a workflow file (e.g., `.github/workflows/generate-synthetic-data.yml`):

```yaml
name: Generate Synthetic Data

on:
  workflow_dispatch:
    inputs:
      user_id:
        description: "User ID for which to generate data"
        required: true
        type: string
      models:
        description: "Models to generate (comma-separated: clients,transactions)"
        required: true
        type: string
        default: "clients,transactions"
      clients_count:
        description: "Number of clients to generate"
        required: false
        type: number
        default: 10
      transactions_count:
        description: "Number of transactions to generate"
        required: false
        type: number
        default: 50

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install

      - name: Generate synthetic data
        env:
          USER_ID: ${{ inputs.user_id }}
          MODELS: ${{ inputs.models }}
          CLIENTS_COUNT: ${{ inputs.clients_count }}
          TRANSACTIONS_COUNT: ${{ inputs.transactions_count }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          WRANGLER_CONFIG: wrangler.preview.jsonc
          REMOTE: "true"
        run: node scripts/generate-synthetic-data.mjs
```

**Required GitHub Secrets:**

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with D1 read/write permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

### From Local Development

For local development, you can either:

1. **Run the script directly** (requires wrangler dev to be running):

   ```bash
   cd aml-svc
   USER_ID=user-123 \
   MODELS=clients,transactions \
   CLIENTS_COUNT=10 \
   TRANSACTIONS_COUNT=50 \
   node scripts/generate-synthetic-data.mjs
   ```

2. **Use the HTTP endpoint** (requires wrangler dev to be running with `SYNTHETIC_DATA_SECRET` configured):

   ```bash
   # Start the worker
   cd aml-svc
   pnpm dev

   # In another terminal, call the endpoint
   curl -X POST http://localhost:8787/internal/synthetic-data \
     -H "Content-Type: application/json" \
     -H "X-Synthetic-Data-Secret: your-secret-token" \
     -d '{
       "userId": "user-123",
       "models": ["clients", "transactions"],
       "options": {
         "clients": { "count": 10 },
         "transactions": { "count": 50 }
       }
     }'
   ```

## Environment Variables

| Variable                    | Required     | Description                                            | Default                |
| --------------------------- | ------------ | ------------------------------------------------------ | ---------------------- |
| `USER_ID`                   | Yes          | User ID for which to generate data                     | -                      |
| `MODELS`                    | Yes          | Comma-separated list of models: `clients,transactions` | -                      |
| `CLIENTS_COUNT`             | No           | Number of clients to generate                          | 10                     |
| `CLIENTS_INCLUDE_DOCUMENTS` | No           | Include documents for clients                          | false                  |
| `CLIENTS_INCLUDE_ADDRESSES` | No           | Include addresses for clients                          | false                  |
| `TRANSACTIONS_COUNT`        | No           | Number of transactions to generate                     | 50                     |
| `TRANSACTIONS_PER_CLIENT`   | No           | Number of transactions per client                      | -                      |
| `CLOUDFLARE_API_TOKEN`      | Yes (remote) | Cloudflare API token for D1 access                     | -                      |
| `CLOUDFLARE_ACCOUNT_ID`     | Yes (remote) | Cloudflare account ID                                  | -                      |
| `WRANGLER_CONFIG`           | No           | Wrangler config file                                   | wrangler.preview.jsonc |
| `REMOTE`                    | No           | Use remote database (set to "true" for GitHub Actions) | false                  |

## Security

- The script connects directly to D1 via Cloudflare REST API when running remotely
- The `/internal/synthetic-data` HTTP endpoint (for local development) requires a secret token (`X-Synthetic-Data-Secret` header)
- The HTTP endpoint is blocked in production environments
- Cloudflare API tokens should be stored in GitHub Secrets with minimal required permissions

## Configuration

For GitHub Actions, add these secrets:

- `CLOUDFLARE_API_TOKEN` - Create at https://dash.cloudflare.com/profile/api-tokens
- `CLOUDFLARE_ACCOUNT_ID` - Found in your Cloudflare dashboard

For local development using the HTTP endpoint, add `SYNTHETIC_DATA_SECRET` to your Wrangler configuration:

```jsonc
// wrangler.preview.jsonc
{
	"vars": {
		"SYNTHETIC_DATA_SECRET": "your-secret-token-here",
	},
}
```
