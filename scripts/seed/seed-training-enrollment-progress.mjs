#!/usr/bin/env node
/**
 * Training enrollment progress seed
 *
 * Progress rows are written as learners complete modules. Seed validation placeholder only.
 */

async function seedTrainingEnrollmentProgress() {
	console.log(
		`⏭️  TrainingEnrollmentProgress: recorded during learning; no bulk seed rows inserted.`,
	);
}

seedTrainingEnrollmentProgress().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
