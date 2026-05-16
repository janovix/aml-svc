#!/usr/bin/env node
/**
 * Training quiz attempt seed
 *
 * Attempts are stored when users submit quizzes. Seed validation placeholder only.
 */

async function seedTrainingQuizAttempt() {
	console.log(
		`⏭️  TrainingQuizAttempt: created at quiz submission; no bulk seed rows inserted.`,
	);
}

seedTrainingQuizAttempt().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
