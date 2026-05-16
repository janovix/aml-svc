#!/usr/bin/env node
/**
 * Chat thread seed
 *
 * Janbot chat threads are created when users open the assistant. This script exists
 * for seed validation and documents that threads are not bulk-seeded for dev.
 */

async function seedChatThread() {
	console.log(
		`⏭️  ChatThread: created at runtime by Janbot; no bulk seed rows inserted.`,
	);
}

seedChatThread().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
