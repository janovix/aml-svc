/**
 * Tenant context for multi-environment data isolation.
 *
 * Every org-scoped query must be filtered by both organizationId AND environment.
 * Dashboard (session-based) access always uses 'production'.
 * API key access uses the key's environment (embedded in the JWT).
 */

export type ApiKeyEnvironment = "production" | "staging" | "development";

export interface TenantContext {
	organizationId: string;
	environment: ApiKeyEnvironment;
}

/**
 * Appends `AND environment = ?` to a SQL query fragment that already has
 * a `WHERE organization_id = ?` clause.
 *
 * Usage:
 *   const sql = withEnvScope(
 *     `SELECT * FROM clients WHERE organization_id = ? AND deleted_at IS NULL`,
 *   );
 *   // → `SELECT * FROM clients WHERE organization_id = ? AND deleted_at IS NULL AND environment = ?`
 *   db.prepare(sql).bind(orgId, env)
 */
export function withEnvScope(sql: string): string {
	return `${sql} AND environment = ?`;
}

/**
 * Builds a `WHERE organization_id = ? AND environment = ?` clause
 * for queries that start fresh.
 */
export function orgEnvWhere(alias?: string): string {
	const prefix = alias ? `${alias}.` : "";
	return `${prefix}organization_id = ? AND ${prefix}environment = ?`;
}

/**
 * Returns [organizationId, environment] as a bind-parameter tuple.
 */
export function tenantBinds(ctx: TenantContext): [string, string] {
	return [ctx.organizationId, ctx.environment];
}

/**
 * Dashboard sessions and internal jobs operate on the production data slice.
 * Use when only `organizationId` is known and API-key environment is not in scope.
 */
export function productionTenant(organizationId: string): TenantContext {
	return { organizationId, environment: "production" };
}
