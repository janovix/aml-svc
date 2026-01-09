# Troubleshooting Transaction Foreign Key Constraint Errors

## Error: Foreign key constraint violated on the foreign key

This error occurs when trying to create a transaction with a `clientId` that doesn't exist in the database or belongs to a different organization.

## Common Causes

### 1. Client Doesn't Exist

The `clientId` in the request payload doesn't exist in the `clients` table.

**Solution:**

- Verify the client exists by querying: `SELECT * FROM clients WHERE id = '<clientId>' AND deletedAt IS NULL`
- Check if the client was soft-deleted (`deletedAt IS NOT NULL`)
- Ensure the client was created before attempting to create the transaction

### 2. Client Belongs to Different Organization

The client exists but belongs to a different organization than the one making the request.

**Solution:**

- Verify the client's organization matches the request's organization
- Query: `SELECT * FROM clients WHERE id = '<clientId>' AND organizationId = '<organizationId>' AND deletedAt IS NULL`

### 3. Race Condition

In rare cases, the client might be deleted between the validation check and the transaction creation.

**Solution:**

- The service now includes better error handling to catch this scenario
- Retry the request if it's a transient issue

## Troubleshooting Steps

### Step 1: Verify Client Exists

```sql
-- Check if client exists (replace with actual clientId)
SELECT id, organizationId, rfc, deletedAt
FROM clients
WHERE id = 'CLTd3abe94b3';
```

**Expected Result:** Should return exactly one row with `deletedAt IS NULL`

**If no rows returned:**

- Client doesn't exist - create the client first
- Check for typos in the `clientId`

**If `deletedAt IS NOT NULL`:**

- Client was soft-deleted - restore it or use a different client

### Step 2: Verify Organization Match

```sql
-- Check if client belongs to the correct organization
SELECT id, organizationId, rfc, deletedAt
FROM clients
WHERE id = 'CLTd3abe94b3'
  AND organizationId = '<your-organization-id>'
  AND deletedAt IS NULL;
```

**Expected Result:** Should return exactly one row

**If no rows returned:**

- Client belongs to a different organization
- Use a client that belongs to your organization

### Step 3: Check Transaction Schema

The Transaction model has the following foreign key constraints:

```prisma
model Transaction {
  clientId String
  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  // ...
}
```

**Key Points:**

- `clientId` must reference an existing `Client.id`
- The client must belong to the same `organizationId` (enforced by application logic, not DB constraint)
- The client must not be soft-deleted (`deletedAt IS NULL`)

### Step 4: Review Error Details

With the improved error handling, you should now see more detailed error messages:

```json
{
	"error": "APIError",
	"message": "Client not found",
	"details": {
		"field": "clientId",
		"message": "The specified client does not exist or belongs to a different organization"
	}
}
```

## Example Payload That Causes This Error

```json
{
	"clientId": "CLTd3abe94b3", // ← This client doesn't exist or belongs to different org
	"operationDate": "2026-01-02",
	"operationType": "sale",
	"branchPostalCode": "72580",
	"vehicleType": "land",
	"brand": "82132d676c80453e048c8a004c1b80b9",
	"model": "F40",
	"year": 2005,
	"amount": "10000000.00",
	"currency": "MXN",
	"paymentMethods": [{ "method": "EFECTIVO", "amount": "10000000" }],
	"plates": "TXP0123"
}
```

## Prevention

1. **Always validate client exists before creating transaction:**

   ```typescript
   // This is already done in TransactionService.create()
   await this.ensureClientExists(organizationId, input.clientId);
   ```

2. **Use proper error handling:**

   - The service now catches Prisma foreign key errors and converts them to user-friendly messages
   - Check the error response for specific field information

3. **Test client existence in your frontend:**
   - Before allowing transaction creation, verify the client exists
   - Show appropriate error messages if client is missing

## Related Files

- `src/routes/transactions.ts` - Route handler with error handling
- `src/domain/transaction/service.ts` - Service layer with client validation
- `src/domain/transaction/repository.ts` - Repository that performs the actual DB operation
- `src/domain/client/repository.ts` - Client repository used for validation
- `prisma/schema.prisma` - Database schema definition

## Additional Notes

- The foreign key constraint is enforced at the database level by SQLite
- The application also validates client existence before attempting to create the transaction
- If you see this error, it means either:
  1. The validation check passed but the client was deleted between check and creation (race condition)
  2. The client exists but belongs to a different organization (validation bug - should be caught)
  3. There's a database inconsistency (client was deleted but transaction creation was attempted)
