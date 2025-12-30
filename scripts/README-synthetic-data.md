# Synthetic Data Generation

This script generates synthetic data (clients, transactions, etc.) for testing and development purposes. It is intended to be run from GitHub Actions via `workflow_dispatch`.

## Usage

### From GitHub Actions

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
        working-directory: aml-svc

      - name: Generate synthetic data
        env:
          USER_ID: ${{ inputs.user_id }}
          MODELS: ${{ inputs.models }}
          CLIENTS_COUNT: ${{ inputs.clients_count }}
          TRANSACTIONS_COUNT: ${{ inputs.transactions_count }}
          SYNTHETIC_DATA_SECRET: ${{ secrets.SYNTHETIC_DATA_SECRET }}
          WORKER_URL: ${{ secrets.WORKER_URL }}
          WRANGLER_CONFIG: wrangler.preview.jsonc
          REMOTE: "true"
        run: node scripts/generate-synthetic-data.mjs
        working-directory: aml-svc
```

### From Local Development

1. Start the worker:

   ```bash
   cd aml-svc
   pnpm dev
   ```

2. In another terminal, run the script:
   ```bash
   cd aml-svc
   USER_ID=user-123 \
   MODELS=clients,transactions \
   CLIENTS_COUNT=10 \
   TRANSACTIONS_COUNT=50 \
   SYNTHETIC_DATA_SECRET=your-secret-token \
   WORKER_URL=http://localhost:8787 \
   node scripts/generate-synthetic-data.mjs
   ```

## Environment Variables

| Variable                    | Required     | Description                                            | Default       |
| --------------------------- | ------------ | ------------------------------------------------------ | ------------- |
| `USER_ID`                   | Yes          | User ID for which to generate data                     | -             |
| `MODELS`                    | Yes          | Comma-separated list of models: `clients,transactions` | -             |
| `CLIENTS_COUNT`             | No           | Number of clients to generate                          | 10            |
| `CLIENTS_INCLUDE_DOCUMENTS` | No           | Include documents for clients                          | false         |
| `CLIENTS_INCLUDE_ADDRESSES` | No           | Include addresses for clients                          | false         |
| `TRANSACTIONS_COUNT`        | No           | Number of transactions to generate                     | 50            |
| `TRANSACTIONS_PER_CLIENT`   | No           | Number of transactions per client                      | -             |
| `SYNTHETIC_DATA_SECRET`     | Yes          | Secret token for authentication                        | -             |
| `WORKER_URL`                | Yes (remote) | URL of the deployed worker                             | -             |
| `WRANGLER_CONFIG`           | No           | Wrangler config file                                   | Auto-detected |
| `REMOTE`                    | No           | Use remote database                                    | false         |

## Security

- The endpoint `/internal/synthetic-data` is **not** part of the public API
- It requires a secret token (`X-Synthetic-Data-Secret` header)
- It is blocked in production environments
- The secret should be stored in GitHub Secrets

## Configuration

Add the `SYNTHETIC_DATA_SECRET` to your Wrangler configuration:

```jsonc
// wrangler.preview.jsonc
{
	"vars": {
		"SYNTETIC_DATA_SECRET": "your-secret-token-here",
	},
}
```

And add it to your GitHub Secrets for use in workflows.
