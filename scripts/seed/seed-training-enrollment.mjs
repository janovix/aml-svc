#!/usr/bin/env node
/**
 * Training enrollment seed
 *
 * Enrollments are assigned per org/user at runtime. Seed validation placeholder only.
 */

async function seedTrainingEnrollment() {
	console.log(
		`⏭️  TrainingEnrollment: created via assignment flows; no bulk seed rows inserted.`,
	);
}

seedTrainingEnrollment().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
