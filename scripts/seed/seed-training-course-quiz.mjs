#!/usr/bin/env node
/**
 * Training course quiz seed
 *
 * Quizzes attach to courses via the app. Seed validation placeholder only.
 */

async function seedTrainingCourseQuiz() {
	console.log(
		`⏭️  TrainingCourseQuiz: created with course authoring; no bulk seed rows inserted.`,
	);
}

seedTrainingCourseQuiz().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
