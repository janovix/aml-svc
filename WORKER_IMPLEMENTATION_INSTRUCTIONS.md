# Alert Detection Worker Implementation Instructions

This document provides instructions for implementing the alert detection worker that processes alerts when clients or transactions are created/updated.

## Overview

The worker should:

1. Receive jobs when a client is created/updated or a transaction is created
2. Fetch active alert rules from the API
3. Evaluate each rule against the client's context (client data + transactions)
4. Create alerts idempotently (no duplicates)

## API Endpoints

### Get Active Alert Rules

```
GET /api/v1/alert-rules?active=true
```

Response:

```json
{
	"data": [
		{
			"id": "rule-uuid",
			"name": "High Value Transaction",
			"description": "Alert when transaction exceeds threshold",
			"active": true,
			"severity": "HIGH",
			"ruleConfig": {
				"type": "transaction_amount",
				"threshold": 1000000,
				"currency": "MXN",
				"timeWindow": "24h"
			},
			"metadata": {},
			"createdAt": "2025-01-01T00:00:00Z",
			"updatedAt": "2025-01-01T00:00:00Z"
		}
	],
	"pagination": {
		"page": 1,
		"limit": 10,
		"total": 1,
		"totalPages": 1
	}
}
```

### Create Alert (Idempotent)

```
POST /api/v1/alerts
```

Request Body:

```json
{
	"alertRuleId": "rule-uuid",
	"clientId": "RFC123456789",
	"severity": "HIGH",
	"idempotencyKey": "hash(clientId + alertRuleId + contextHash)",
	"contextHash": "hash(transactionIds + amounts + dates)",
	"alertData": {
		"transactionIds": ["tx-1", "tx-2"],
		"totalAmount": 1500000,
		"currency": "MXN",
		"triggeredAt": "2025-01-01T12:00:00Z"
	},
	"triggerTransactionId": "tx-1",
	"notes": "Optional notes about the alert"
}
```

**Important**: The `idempotencyKey` ensures no duplicate alerts. It should be a hash of:

- `clientId`
- `alertRuleId`
- `contextHash`

The `contextHash` should be a hash of the specific data that triggered the alert (e.g., transaction IDs, amounts, dates).

If an alert with the same `idempotencyKey` already exists, the API will return the existing alert (idempotent behavior).

### Get Client Data

```
GET /api/v1/clients/{clientId}
```

### Get Client Transactions

```
GET /api/v1/transactions?clientId={clientId}
```

## Worker Implementation Steps

### 1. Job Queue Setup

The worker should listen to jobs from a queue system (e.g., Cloudflare Queues, RabbitMQ, etc.). Job payload should include:

```typescript
interface AlertJob {
	type: "client.created" | "client.updated" | "transaction.created";
	clientId: string;
	transactionId?: string; // Only for transaction.created
	timestamp: string;
}
```

### 2. Fetch Active Alert Rules

When a job is received:

1. Call `GET /api/v1/alert-rules?active=true` to get all active rules
2. Cache rules if possible (they don't change frequently)

### 3. Fetch Client Context

For each active rule:

1. Fetch client data: `GET /api/v1/clients/{clientId}`
2. Fetch client transactions: `GET /api/v1/transactions?clientId={clientId}`

### 4. Evaluate Alert Rules

For each alert rule, evaluate the `ruleConfig` against the client context:

#### Example Rule Configurations

**Transaction Amount Threshold:**

```json
{
	"type": "transaction_amount",
	"threshold": 1000000,
	"currency": "MXN",
	"timeWindow": "24h"
}
```

Logic: Check if any transaction in the time window exceeds the threshold.

**Multiple Transactions in Time Window:**

```json
{
	"type": "transaction_count",
	"threshold": 5,
	"timeWindow": "1h"
}
```

Logic: Check if client has more than N transactions in the time window.

**Aggregate Amount:**

```json
{
	"type": "aggregate_amount",
	"threshold": 5000000,
	"currency": "MXN",
	"timeWindow": "7d",
	"operationType": "PURCHASE"
}
```

Logic: Sum all transactions of specified type in time window and check if exceeds threshold.

**Custom Rule:**

```json
{
	"type": "custom",
	"conditions": [
		{
			"field": "client.personType",
			"operator": "equals",
			"value": "PHYSICAL"
		},
		{
			"field": "transactions.amount",
			"operator": "sum",
			"threshold": 1000000
		}
	],
	"logic": "AND"
}
```

### 5. Generate Idempotency Key

For each detected alert:

1. Create a `contextHash` from the alert-specific data:

   ```typescript
   const contextHash = hash(JSON.stringify({
     transactionIds: [...],
     amounts: [...],
     dates: [...],
     // Any other relevant data
   }));
   ```

2. Create an `idempotencyKey`:
   ```typescript
   const idempotencyKey = hash(`${clientId}:${alertRuleId}:${contextHash}`);
   ```

### 6. Create Alert

Call `POST /api/v1/alerts` with:

- The alert data
- The generated `idempotencyKey`
- The `contextHash`

The API will handle idempotency - if an alert with the same `idempotencyKey` exists, it will return the existing alert.

### 7. Error Handling

- If API calls fail, retry with exponential backoff
- Log all errors for debugging
- Consider dead-letter queue for failed jobs

## Example Implementation Pseudocode

```typescript
async function processAlertJob(job: AlertJob) {
	// 1. Fetch active alert rules
	const rules = await fetchActiveAlertRules();

	// 2. Fetch client context
	const client = await fetchClient(job.clientId);
	const transactions = await fetchClientTransactions(job.clientId);

	// 3. Evaluate each rule
	for (const rule of rules) {
		const evaluationResult = evaluateRule(
			rule.ruleConfig,
			client,
			transactions,
		);

		if (evaluationResult.triggered) {
			// 4. Generate idempotency key
			const contextHash = generateContextHash(evaluationResult.data);
			const idempotencyKey = generateIdempotencyKey(
				job.clientId,
				rule.id,
				contextHash,
			);

			// 5. Create alert (idempotent)
			await createAlert({
				alertRuleId: rule.id,
				clientId: job.clientId,
				severity: rule.severity,
				idempotencyKey,
				contextHash,
				alertData: evaluationResult.data,
				triggerTransactionId: job.transactionId,
			});
		}
	}
}

function evaluateRule(
	ruleConfig: Record<string, unknown>,
	client: Client,
	transactions: Transaction[],
): { triggered: boolean; data: Record<string, unknown> } {
	// Implement rule evaluation logic based on ruleConfig.type
	// This is where the dynamic nature of rules comes into play
	switch (ruleConfig.type) {
		case "transaction_amount":
			return evaluateTransactionAmount(ruleConfig, transactions);
		case "transaction_count":
			return evaluateTransactionCount(ruleConfig, transactions);
		case "aggregate_amount":
			return evaluateAggregateAmount(ruleConfig, transactions);
		case "custom":
			return evaluateCustomRule(ruleConfig, client, transactions);
		default:
			return { triggered: false, data: {} };
	}
}
```

## Testing

1. Create test alert rules via API
2. Create/update test clients and transactions
3. Verify that alerts are created correctly
4. Verify idempotency (same job processed twice should not create duplicate alerts)
5. Test with different rule configurations

## Notes

- The worker should be stateless and idempotent
- Consider rate limiting when calling the API
- Cache alert rules to reduce API calls
- Monitor worker performance and alert creation rates
- Consider batching multiple rule evaluations if possible
