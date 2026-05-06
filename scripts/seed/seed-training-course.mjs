#!/usr/bin/env node
/**
 * Training course seed
 *
 * Courses are authored and published via admin flows. This entry exists for seed validation only.
 */

async function seedTrainingCourse() {
	console.log(
		`⏭️  TrainingCourse: created via LMS/admin APIs; no bulk seed rows inserted.`,
	);
}

seedTrainingCourse().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
