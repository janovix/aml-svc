#!/usr/bin/env node
/**
 * Chat attachment seed
 *
 * Attachments are stored when users upload files in chat. Seed validation only.
 */

async function seedChatAttachment() {
	console.log(
		`⏭️  ChatAttachment: created at runtime with messages; no bulk seed rows inserted.`,
	);
}

seedChatAttachment().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
