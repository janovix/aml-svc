#!/usr/bin/env node
/**
 * Training quiz option seed
 *
 * Options belong to questions. Seed validation placeholder only.
 */

async function seedTrainingQuizOption() {
	console.log(
		`⏭️  TrainingQuizOption: created with quiz authoring; no bulk seed rows inserted.`,
	);
}

seedTrainingQuizOption().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
