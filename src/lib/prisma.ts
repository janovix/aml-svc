import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";

const prismaCache = new WeakMap<D1Database, PrismaClient>();

export function getPrismaClient(db: D1Database): PrismaClient {
	let client = prismaCache.get(db);
	if (!client) {
		const adapter = new PrismaD1(db);
		client = new PrismaClient({ adapter });
		prismaCache.set(db, client);
	}
	return client;
}
