# Alert Rules for Janovix AV Vehículos

This document describes the alert rules created based on the Janovix AV Vehículos requirements document.

## Overview

The alert system implements 10 different alert rules covering:

1. **Aviso Obligatorio** - Mandatory reporting to SAT
2. **Acumulación** - Transaction accumulation detection
3. **Pago en Efectivo** - Cash payment restrictions
4. **Fraccionamiento** - Cash fragmentation detection
5. **Debida Diligencia** - Enhanced due diligence triggers
6. **PEP Monitoring** - Politically Exposed Persons tracking
7. **Operaciones Inusuales** - Unusual operations detection

## Alert Rules

### 1. Monto igual o superior a 6,420 UMA – Aviso Obligatorio

**Type**: `transaction_amount_uma`

**Trigger**: When transaction amount >= 6,420 UMA

**Configuration Required**:

- `umaDailyValue`: Must be set manually each year by the Compliance Officer
- Calculated threshold: `UMBRAL_AVISO = 6420 * UMA_diaria_vigente`

**Behavior**:

- Evaluates each transaction individually
- Requires complete client file (identification, activity/occupation, beneficial owner)
- Automatically includes in monthly Aviso report
- Generates immediate alert to Compliance Officer

**Severity**: HIGH

---

### 2. Acumulación de operaciones que alcanza el umbral de aviso

**Type**: `aggregate_amount_uma`

**Trigger**: When 2+ transactions from same client sum >= 6,420 UMA within 6 months

**Configuration Required**:

- `umaDailyValue`: Must be set manually each year

**Behavior**:

- Rolling 6-month window from first transaction
- Groups by client (RFC)
- Includes both PURCHASE and SALE operations
- Resets accumulation after Aviso is filed
- Detects:
  - Multiple units sold to same client
  - Payments at different agencies of same corporate group
  - Third-party payments for same client

**Severity**: HIGH

---

### 3. Intento de pago en efectivo superior al monto permitido

**Type**: `cash_payment_limit`

**Trigger**: When cash payment exceeds legal limit

**Configuration Required**:

- `maxCashAmount`: Must be configured according to legal limit for this vulnerable activity

**Behavior**:

- Operation must be rejected
- Based on Art. 32 LFPIORPI

**Severity**: HIGH

---

### 4. Sistema detecta fraccionamiento de efectivo

**Type**: `cash_fragmentation`

**Trigger**: When multiple cash deposits are detected within 30 days

**Behavior**:

- Detects multiple cash payments (minimum 2)
- Checks for different payers
- Verifies all payments are for same buyer
- Indicates possible structuring attempt

**Severity**: MEDIUM

---

### 5. El pagador no coincide con el comprador

**Type**: `payer_buyer_mismatch`

**Trigger**: When payer doesn't match buyer

**Behavior**:

- Requires enhanced due diligence
- Checks all payment methods
- Indicates possible "testaferro" (straw man) risk

**Severity**: MEDIUM

---

### 6. Operación de PEP por encima del umbral de aviso – seguimiento reforzado

**Type**: `pep_above_threshold`

**Trigger**: When PEP client has transaction >= 6,420 UMA

**Configuration Required**:

- `umaDailyValue`: Must be set manually each year
- Client must be flagged as PEP

**Behavior**:

- Requires enhanced monitoring
- Requires manual review by Compliance Officer
- Requires reinforced documentation of resource origin

**Severity**: CRITICAL

---

### 7. Cliente PEP o de Alto Riesgo – Seguimiento Intensificado

**Type**: `pep_or_high_risk`

**Trigger**: All transactions from PEP or high-risk clients

**Behavior**:

- Requires enhanced monitoring for all transactions
- Requires manual review
- Requires reinforced documentation
- Stricter monitoring of subsequent operations

**Severity**: HIGH

---

### 8. Operaciones frecuentes en corto plazo

**Type**: `frequent_transactions`

**Trigger**: When client has 3+ transactions within 30 days

**Behavior**:

- Indicates possible structuring
- Triggers accumulation check
- Possible attempt to evade Aviso thresholds

**Severity**: MEDIUM

---

### 9. Cliente sin historial adquiriendo vehículo de muy alto valor

**Type**: `new_client_high_value`

**Trigger**: New client (no previous transactions) buying very high-value vehicle

**Configuration Required**:

- `minTransactionAmount`: Must be configured based on what constitutes "very high value"

**Behavior**:

- Requires enhanced due diligence
- Requires additional resource origin documentation
- Indicates possible money laundering risk

**Severity**: HIGH

---

### 10. Uso de cuentas de terceros no relacionados

**Type**: `third_party_accounts`

**Trigger**: When third-party accounts unrelated to client are used for payment

**Behavior**:

- Requires relationship verification
- Action: reject operation or require enhanced due diligence
- Indicates possible "prestanombres" (straw man) use

**Severity**: HIGH

## Configuration Requirements

### Annual Configuration

The following values must be updated annually by the Compliance Officer:

1. **UMA Daily Value** (`umaDailyValue`)
   - Used in rules 1, 2, and 6
   - Must be updated each year
   - Used to calculate: `UMBRAL_AVISO = 6420 * UMA_diaria_vigente`

### Business Configuration

The following values should be configured based on business rules:

1. **Max Cash Amount** (`maxCashAmount`)

   - Used in rule 3
   - Legal limit for cash payments in this vulnerable activity

2. **Min Transaction Amount** (`minTransactionAmount`)
   - Used in rule 9
   - Defines what constitutes "very high value" for new clients

## Creating Alert Rules

### Using the Script

```bash
# Set API URL and token (if needed)
export API_URL="https://your-api-url.workers.dev"
export API_TOKEN="your-auth-token"

# Run the script
pnpm create:alert-rules
```

### Using the API Directly

You can create rules individually using the API:

```bash
curl -X POST https://your-api-url.workers.dev/api/v1/alert-rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @scripts/alert-rules-examples.json
```

### Manual Creation

See `scripts/alert-rules-examples.json` for the complete JSON structure of all rules.

## Worker Implementation Notes

The alert detection worker must implement evaluation logic for each `ruleConfig.type`:

- `transaction_amount_uma`: Compare transaction amount to UMA threshold
- `aggregate_amount_uma`: Sum transactions within time window
- `cash_payment_limit`: Check cash payment amounts
- `cash_fragmentation`: Detect multiple cash payments
- `payer_buyer_mismatch`: Compare payer vs buyer
- `pep_above_threshold`: Check PEP flag + amount threshold
- `pep_or_high_risk`: Check PEP or high-risk flags
- `frequent_transactions`: Count transactions in time window
- `new_client_high_value`: Check client history + amount
- `third_party_accounts`: Verify payment account relationships

See `WORKER_IMPLEMENTATION_INSTRUCTIONS.md` for detailed worker implementation guidance.

## Alert Data Structure

When creating alerts, the `alertData` field should include:

```json
{
	"transactionIds": ["tx-1", "tx-2"],
	"totalAmount": 1500000,
	"currency": "MXN",
	"umaAmount": 6500,
	"umaDailyValue": 108.57,
	"threshold": 6420,
	"triggeredAt": "2025-01-01T12:00:00Z",
	"clientId": "RFC123456789",
	"clientName": "Nombre del Cliente",
	"operationType": "PURCHASE"
}
```

## Compliance Requirements

All alerts must:

1. Generate immediate notification to Compliance Officer
2. Include complete transaction and client information
3. Maintain 10-year traceability
4. Support monthly Aviso report generation
5. Allow attachment of SAT acknowledgment receipts
6. Support simultaneous Aviso por Monto and Aviso por Sospecha

## Notes

- Rules are designed to be dynamic and configurable
- The worker implementation must handle all rule types
- Some rules require additional client data (PEP status, risk level, etc.)
- UMA values must be updated annually
- All operations are evaluated individually, but accumulation is also tracked
