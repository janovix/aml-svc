#!/usr/bin/env node
/**
 * Chat tool call seed
 *
 * Tool call rows are written when the assistant invokes tools. Seed validation only.
 */

async function seedChatToolCall() {
	console.log(
		`⏭️  ChatToolCall: created at runtime with assistant messages; no bulk seed.`,
	);
}

seedChatToolCall().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
