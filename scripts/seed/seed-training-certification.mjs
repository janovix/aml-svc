#!/usr/bin/env node
/**
 * Training certification seed
 *
 * Certificates are issued when enrollments pass. Seed validation placeholder only.
 */

async function seedTrainingCertification() {
	console.log(
		`⏭️  TrainingCertification: issued after successful completion; no bulk seed rows inserted.`,
	);
}

seedTrainingCertification().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
