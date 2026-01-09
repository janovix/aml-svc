# Audit Trail Logging Requirements

## Overview

This codebase implements a **tamper-evident cryptographic audit trail** using hash chaining (similar to blockchain). Every mutation or significant operation MUST be logged to maintain compliance and enable forensic analysis.

## Mandatory Audit Logging

### Operations That MUST Be Logged

Any code that performs the following operations MUST include audit logging:

#### 1. Entity Mutations (CREATE, UPDATE, DELETE)

- **Client operations**: Creating, updating, or deleting clients
- **Transaction operations**: Creating, updating, or deleting transactions
- **Alert operations**: Creating, updating, resolving, or cancelling alerts
- **Notice operations**: Creating, generating XML, submitting to SAT
- **Report operations**: Creating, generating PDF
- **Organization Settings**: Creating or updating settings
- **Alert Rules**: Creating, updating, or deleting rules
- **Alert Rule Configs**: Creating, updating, or deleting configurations
- **UMA Values**: Creating or updating UMA values

#### 2. Sensitive Read Operations

- Exporting data (CSV, PDF, XML)
- Accessing compliance-sensitive information
- Bulk data retrieval operations

#### 3. System Events

- Authentication events (login, logout)
- SAT submission events
- PDF/XML generation events
- Chain verification events

## How to Log Audit Events

### Import the Audit Service

```typescript
import { AuditLogService, AuditLogRepository } from "../domain/audit";
import { getPrismaClient } from "../lib/prisma";
```

### Create the Service

```typescript
function getAuditService(c: Context<{ Bindings: Bindings }>) {
	const prisma = getPrismaClient(c.env.DB);
	const secretKey = c.env.AUDIT_SECRET_KEY || DEFAULT_AUDIT_SECRET_KEY;
	const repository = new AuditLogRepository(prisma, secretKey);
	return new AuditLogService(repository, secretKey);
}
```

### Log Events

#### For CREATE operations:

```typescript
const auditService = getAuditService(c);
await auditService.logCreate(
	organizationId,
	"CLIENT", // Entity type
	created.id, // Entity ID
	created, // New data (full entity)
	{
		actorId: userId, // From JWT
		actorType: "USER",
		ipAddress: c.req.header("CF-Connecting-IP"),
		userAgent: c.req.header("User-Agent"),
	},
);
```

#### For UPDATE operations:

```typescript
const auditService = getAuditService(c);
await auditService.logUpdate(
	organizationId,
	"CLIENT",
	updated.id,
	oldData, // Previous state
	updated, // New state
	{
		actorId: userId,
		actorType: "USER",
		ipAddress: c.req.header("CF-Connecting-IP"),
		userAgent: c.req.header("User-Agent"),
	},
);
```

#### For DELETE operations:

```typescript
const auditService = getAuditService(c);
await auditService.logDelete(
	organizationId,
	"CLIENT",
	clientId,
	deletedEntity, // State before deletion
	{
		actorId: userId,
		actorType: "USER",
		ipAddress: c.req.header("CF-Connecting-IP"),
		userAgent: c.req.header("User-Agent"),
	},
);
```

#### For custom actions (SUBMIT, GENERATE, EXPORT, etc.):

```typescript
const auditService = getAuditService(c);
await auditService.logAction(
	organizationId,
	"NOTICE",
	noticeId,
	"SUBMIT", // Action type
	{
		actorId: userId,
		actorType: "USER",
		newData: { satFolioNumber, submittedAt },
		metadata: { reason: "Monthly SAT submission" },
	},
);
```

## Entity Type Reference

Use these standardized entity type strings:

| Entity Type                  | Description                       |
| ---------------------------- | --------------------------------- |
| `CLIENT`                     | Client records                    |
| `CLIENT_DOCUMENT`            | Client documents                  |
| `CLIENT_ADDRESS`             | Client addresses                  |
| `TRANSACTION`                | Financial transactions            |
| `TRANSACTION_PAYMENT_METHOD` | Payment methods                   |
| `ALERT`                      | Compliance alerts                 |
| `ALERT_RULE`                 | Alert detection rules             |
| `ALERT_RULE_CONFIG`          | Rule configurations               |
| `NOTICE`                     | SAT regulatory notices            |
| `REPORT`                     | Analytics reports                 |
| `UMA_VALUE`                  | UMA value records                 |
| `ORGANIZATION_SETTINGS`      | Organization settings             |
| `CATALOG`                    | Catalog definitions               |
| `CATALOG_ITEM`               | Catalog items                     |
| `AUDIT_LOG`                  | Audit operations (verify, export) |

## Action Type Reference

Use these standardized action strings:

| Action     | When to Use                        |
| ---------- | ---------------------------------- |
| `CREATE`   | New entity created                 |
| `UPDATE`   | Entity modified                    |
| `DELETE`   | Entity deleted (soft or hard)      |
| `READ`     | Sensitive data accessed (optional) |
| `EXPORT`   | Data exported (CSV, PDF, XML)      |
| `VERIFY`   | Audit chain verified               |
| `LOGIN`    | User authentication                |
| `LOGOUT`   | User logout                        |
| `SUBMIT`   | Regulatory submission (SAT)        |
| `GENERATE` | File generation (PDF, XML)         |

## Actor Types

| Actor Type        | When to Use                  |
| ----------------- | ---------------------------- |
| `USER`            | Action by authenticated user |
| `SYSTEM`          | Automated system action      |
| `API`             | External API integration     |
| `SERVICE_BINDING` | Worker-to-worker call        |

## Best Practices

### 1. Log BEFORE returning success

```typescript
// ✅ CORRECT: Log before returning
const created = await service.create(data);
await auditService.logCreate(orgId, "CLIENT", created.id, created, context);
return c.json(created, 201);
```

### 2. Include both old and new data for updates

```typescript
// ✅ CORRECT: Fetch old data before update
const oldData = await service.get(orgId, id);
const updated = await service.update(orgId, id, payload);
await auditService.logUpdate(orgId, "CLIENT", id, oldData, updated, context);
```

### 3. Always include actor context

```typescript
// ✅ CORRECT: Include user context
await auditService.logCreate(orgId, "CLIENT", id, data, {
	actorId: getUserId(c), // From JWT
	actorType: "USER",
	ipAddress: c.req.header("CF-Connecting-IP"),
	userAgent: c.req.header("User-Agent"),
});
```

### 4. Use metadata for additional context

```typescript
// ✅ CORRECT: Add relevant metadata
await auditService.logAction(orgId, "NOTICE", id, "SUBMIT", {
	metadata: {
		satFolioNumber: "ABC123",
		alertCount: 5,
		periodMonth: "202501",
	},
});
```

### 5. Handle audit failures gracefully

```typescript
// ✅ CORRECT: Don't fail the operation if audit fails
try {
	await auditService.logCreate(orgId, "CLIENT", id, data, context);
} catch (auditError) {
	console.error("Audit logging failed:", auditError);
	// Continue with the operation - don't fail user request
}
```

## Compliance Requirements

The audit trail is designed to meet regulatory requirements for:

- **PLD/AML Compliance** - Anti-money laundering regulations
- **SAT Requirements** - Mexican tax authority audit trails
- **SOX Compliance** - Financial data integrity
- **Data Protection** - GDPR-style audit requirements

## Chain Integrity

The audit log uses cryptographic hash chaining:

- Each entry contains a SHA-256 hash of its content
- Each entry is signed with HMAC-SHA256 using a secret key
- Each entry references the signature of the previous entry
- Tampering with any entry invalidates the entire chain from that point forward

Use the `/api/v1/audit-logs/verify` endpoint to verify chain integrity.

## Environment Configuration

Set the `AUDIT_SECRET_KEY` environment variable in production:

```bash
# wrangler.toml or secrets
AUDIT_SECRET_KEY = "your-strong-secret-key-min-32-chars"
```

**CRITICAL**: Use a strong, unique secret key in production. The default key is for development only.
