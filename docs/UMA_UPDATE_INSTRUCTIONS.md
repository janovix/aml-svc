# UMA Value Update Instructions

## Important: Update 2025 UMA Value

The migration `0006_add_alert_system_and_uma.sql` includes a **placeholder value** for the 2025 UMA. This value **MUST be updated** with the exact value from the official INEGI PDF.

## Source Document

**Official INEGI PDF**: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/uma/uma2025.pdf

## Steps to Update

### Option 1: Update via SQL (After Migration)

```sql
-- Get the exact value from the INEGI PDF and update:
UPDATE uma_values
SET
    dailyValue = <EXACT_VALUE_FROM_PDF>,
    notes = 'UMA value for 2025 - Verified against official INEGI PDF: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/uma/uma2025.pdf',
    approvedBy = 'your-compliance-officer@example.com'
WHERE year = 2025;
```

### Option 2: Update via API

```bash
# First, get the UMA value ID for 2025
curl -X GET "https://your-api-url/api/v1/uma-values/year/2025" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Then update it with the exact value from PDF
curl -X PUT "https://your-api-url/api/v1/uma-values/{id}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "year": 2025,
    "dailyValue": <EXACT_VALUE_FROM_PDF>,
    "effectiveDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "approvedBy": "compliance-officer@example.com",
    "notes": "UMA value for 2025 - Verified against official INEGI PDF",
    "active": true
  }'
```

### Option 3: Use Update Script

1. Edit `scripts/update-uma-values.mjs` and update the `UMA_VALUES` object with the exact 2025 value from the PDF
2. Run: `pnpm update:uma-values --approved-by="compliance-officer@example.com"`

## Verification

After updating, verify the value:

```bash
# Get active UMA value
curl -X GET "https://your-api-url/api/v1/uma-values/active" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should show the correct 2025 value
```

## Current Placeholder

The migration currently uses **108.57** as a placeholder for 2025. This is based on the 2024 value and should be replaced with the exact value from the INEGI PDF.

## Historical Reference

For reference, historical UMA values:

- 2024: ~108.57 MXN
- 2023: ~103.74 MXN
- 2022: ~96.22 MXN

These are included in the migration for historical tracking but should also be verified if needed.
