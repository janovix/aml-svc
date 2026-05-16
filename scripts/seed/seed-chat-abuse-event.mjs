#!/usr/bin/env node
/**
 * Chat abuse event seed
 *
 * Abuse/guardrail events are recorded by the app when triggered. Seed validation only.
 */

async function seedChatAbuseEvent() {
	console.log(
		`⏭️  ChatAbuseEvent: created at runtime by guardrails; no bulk seed rows inserted.`,
	);
}

seedChatAbuseEvent().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
