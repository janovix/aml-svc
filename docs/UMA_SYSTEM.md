# UMA (Unidad de Medida y Actualización) System

## Overview

The UMA system manages the **Unidad de Medida y Actualización** (Unit of Measurement and Update) values that are critical for calculating alert thresholds in the Janovix AV Vehículos system.

UMA values change **once per year** and must be configured by the Compliance Officer. These values are used to calculate thresholds for mandatory reporting to SAT.

## Key Features

- **Annual Configuration**: UMA values are stored per year
- **Active Value Management**: Only one UMA value can be active at a time
- **Precision**: Values stored as Decimal to preserve precision
- **Audit Trail**: Tracks who approved each value and when
- **Service Binding Support**: Available via service binding for worker access

## Database Model

```prisma
model UmaValue {
  id          String   @id @default(uuid())
  year        Int      @unique // Year this UMA value applies to (e.g., 2025)
  dailyValue  Decimal  // UMA daily value for the year
  effectiveDate DateTime // Date when this UMA value becomes effective
  endDate     DateTime? // Optional: date when this UMA value expires
  approvedBy  String?  // User who approved/configured this value
  notes       String?  // Optional notes about the UMA value
  active      Boolean  @default(true) // Whether this is the current active UMA value
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## API Endpoints

### List UMA Values

```
GET /api/v1/uma-values?year=2025&active=true&page=1&limit=10
```

### Get Active UMA Value

```
GET /api/v1/uma-values/active
```

Returns the currently active UMA value used for threshold calculations.

### Get UMA Value by Year

```
GET /api/v1/uma-values/year/2025
```

### Get UMA Value by ID

```
GET /api/v1/uma-values/{id}
```

### Create UMA Value

```
POST /api/v1/uma-values
```

Request Body:

```json
{
	"year": 2025,
	"dailyValue": 108.57,
	"effectiveDate": "2025-01-01T00:00:00Z",
	"endDate": "2025-12-31T23:59:59Z",
	"approvedBy": "compliance-officer@example.com",
	"notes": "UMA value for 2025 as published by INEGI",
	"active": false
}
```

**Note**: Set `active: false` initially, then activate manually after verification.

### Update UMA Value

```
PUT /api/v1/uma-values/{id}
PATCH /api/v1/uma-values/{id}
```

### Activate UMA Value

```
POST /api/v1/uma-values/{id}/activate
```

This endpoint:

- Deactivates all other UMA values
- Activates the specified UMA value
- Ensures only one UMA value is active at a time

### Delete UMA Value

```
DELETE /api/v1/uma-values/{id}
```

## Service Binding Access

Workers can access UMA values via service binding:

```typescript
// Get active UMA value
const response = await env.AML_SERVICE.fetch(
	new Request("https://internal/uma-values/active", { method: "GET" }),
);
const umaValue = await response.json();

// Calculate threshold
const UMBRAL_AVISO = 6420 * parseFloat(umaValue.dailyValue);
```

## Usage in Alert Rules

Alert rules that use UMA thresholds should:

1. Fetch the active UMA value when processing alerts
2. Calculate thresholds dynamically: `UMBRAL_AVISO = 6420 * umaValue.dailyValue`
3. Use the calculated threshold to evaluate transactions

Example alert rule evaluation:

```typescript
// In worker implementation
const umaValue = await getActiveUmaValue();
const threshold = 6420 * parseFloat(umaValue.dailyValue);

if (transactionAmount >= threshold) {
	// Trigger alert
	await createAlert({
		alertRuleId: rule.id,
		clientId: clientId,
		severity: "HIGH",
		alertData: {
			transactionAmount,
			umaAmount: transactionAmount / parseFloat(umaValue.dailyValue),
			threshold,
			umaDailyValue: umaValue.dailyValue,
			year: umaValue.year,
		},
		// ... other fields
	});
}
```

## Annual Configuration Process

1. **Get UMA Value**: Compliance Officer obtains the new UMA daily value from official sources (INEGI)
2. **Create UMA Value**: Create new UMA value via API with `active: false`
3. **Verify**: Compliance Officer reviews the value
4. **Activate**: Activate the new UMA value (this deactivates the previous one)
5. **Document**: Add notes about the source and approval

## Important Notes

- **Only one active UMA value**: The system ensures only one UMA value is active at a time
- **Precision**: Values are stored as Decimal to preserve precision for calculations
- **Year uniqueness**: Each year can only have one UMA value
- **Effective dates**: Use `effectiveDate` and `endDate` to track when values apply
- **Audit trail**: `approvedBy` field tracks who configured each value

## Migration

Run the migration to create the UMA values table:

```bash
wrangler d1 migrations apply DB --remote
```

The migration file is: `migrations/0007_add_uma_values.sql`
