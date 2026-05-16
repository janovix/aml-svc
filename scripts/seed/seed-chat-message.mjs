#!/usr/bin/env node
/**
 * Chat message seed
 *
 * Messages are persisted as users chat. This entry exists for seed validation only.
 */

async function seedChatMessage() {
	console.log(
		`⏭️  ChatMessage: created at runtime with threads; no bulk seed rows inserted.`,
	);
}

seedChatMessage().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
