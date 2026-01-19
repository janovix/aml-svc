import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";

// Cache for initialized Prisma clients
const prismaCache = new WeakMap<D1Database, PrismaClient>();

// Pending initialization promises to prevent race conditions during cold start
// When multiple concurrent requests arrive, only one client is created
const pendingInit = new WeakMap<D1Database, Promise<PrismaClient>>();

export function getPrismaClient(db: D1Database): PrismaClient {
	// Check if we already have a cached client
	const cached = prismaCache.get(db);
	if (cached) {
		return cached;
	}

	// Synchronously create the client - this is safe because PrismaClient
	// with D1 adapter doesn't do async initialization in constructor
	const adapter = new PrismaD1(db);
	const client = new PrismaClient({ adapter });
	prismaCache.set(db, client);

	return client;
}

/**
 * Get or create a Prisma client with protection against concurrent initialization.
 * Use this in scenarios where multiple async operations might race to initialize.
 *
 * Note: For most use cases, `getPrismaClient` is sufficient since PrismaClient
 * constructor is synchronous. This async version is provided for cases where
 * you want explicit await semantics.
 */
export async function getPrismaClientAsync(
	db: D1Database,
): Promise<PrismaClient> {
	// Check if we already have a cached client
	const cached = prismaCache.get(db);
	if (cached) {
		return cached;
	}

	// Check if there's a pending initialization
	const pending = pendingInit.get(db);
	if (pending) {
		return pending;
	}

	// Create a promise for initialization
	const initPromise = Promise.resolve().then(() => {
		// Double-check cache in case another request completed while we were waiting
		const existing = prismaCache.get(db);
		if (existing) {
			return existing;
		}

		const adapter = new PrismaD1(db);
		const client = new PrismaClient({ adapter });
		prismaCache.set(db, client);
		return client;
	});

	// Store the pending promise
	pendingInit.set(db, initPromise);

	try {
		const client = await initPromise;
		return client;
	} finally {
		// Clean up pending promise
		pendingInit.delete(db);
	}
}
