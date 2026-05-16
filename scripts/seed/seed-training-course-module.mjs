#!/usr/bin/env node
/**
 * Training course module seed
 *
 * Modules belong to courses and are managed with course authoring. Seed validation placeholder only.
 */

async function seedTrainingCourseModule() {
	console.log(
		`⏭️  TrainingCourseModule: created with courses; no bulk seed rows inserted.`,
	);
}

seedTrainingCourseModule().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
