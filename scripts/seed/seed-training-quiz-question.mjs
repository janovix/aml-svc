#!/usr/bin/env node
/**
 * Training quiz question seed
 *
 * Questions are defined when building quizzes. Seed validation placeholder only.
 */

async function seedTrainingQuizQuestion() {
	console.log(
		`⏭️  TrainingQuizQuestion: created with quiz authoring; no bulk seed rows inserted.`,
	);
}

seedTrainingQuizQuestion().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
