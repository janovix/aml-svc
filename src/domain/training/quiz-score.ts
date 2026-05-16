/**
 * Pure quiz scoring for training (unit-tested).
 */

export type QuizQuestionForScore = {
	id: string;
	type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
	options: { id: string; isCorrect: boolean }[];
};

/**
 * Answers: questionId -> option id (single) or option ids (multiple)
 */
export function scoreTrainingQuiz(
	questions: QuizQuestionForScore[],
	answers: Record<string, string | string[] | undefined>,
): { correct: number; total: number; scorePercent: number } {
	let correct = 0;
	const total = questions.length;

	for (const q of questions) {
		const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
		const raw = answers[q.id];

		if (q.type === "SINGLE_CHOICE") {
			const picked = typeof raw === "string" ? raw : "";
			if (correctIds.length === 1 && picked === correctIds[0]) {
				correct++;
			}
			continue;
		}

		// MULTIPLE_CHOICE: must match exact set of correct option ids
		const pickedArr = Array.isArray(raw)
			? raw
			: typeof raw === "string"
				? [raw]
				: [];
		const pickedSet = new Set(pickedArr);
		const expectedSet = new Set(correctIds);
		if (pickedSet.size !== expectedSet.size) continue;
		let allMatch = true;
		for (const id of expectedSet) {
			if (!pickedSet.has(id)) {
				allMatch = false;
				break;
			}
		}
		if (allMatch) correct++;
	}

	const scorePercent = total === 0 ? 100 : Math.round((correct / total) * 100);

	return { correct, total, scorePercent };
}
