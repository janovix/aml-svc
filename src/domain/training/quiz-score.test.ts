import { describe, expect, it } from "vitest";

import { scoreTrainingQuiz } from "./quiz-score";

describe("scoreTrainingQuiz", () => {
	it("returns 100% when there are no questions", () => {
		expect(scoreTrainingQuiz([], {})).toEqual({
			correct: 0,
			total: 0,
			scorePercent: 100,
		});
	});

	it("scores single choice", () => {
		const q = [
			{
				id: "q1",
				type: "SINGLE_CHOICE" as const,
				options: [
					{ id: "a", isCorrect: false },
					{ id: "b", isCorrect: true },
				],
			},
		];
		expect(scoreTrainingQuiz(q, { q1: "b" }).scorePercent).toBe(100);
		expect(scoreTrainingQuiz(q, { q1: "a" }).scorePercent).toBe(0);
	});

	it("scores multiple choice exact set", () => {
		const q = [
			{
				id: "q1",
				type: "MULTIPLE_CHOICE" as const,
				options: [
					{ id: "a", isCorrect: true },
					{ id: "b", isCorrect: true },
					{ id: "c", isCorrect: false },
				],
			},
		];
		expect(scoreTrainingQuiz(q, { q1: ["a", "b"] }).scorePercent).toBe(100);
		expect(scoreTrainingQuiz(q, { q1: ["a"] }).scorePercent).toBe(0);
		expect(scoreTrainingQuiz(q, { q1: ["a", "b", "c"] }).scorePercent).toBe(0);
	});

	it("scores multiple choice when answer is a single string id", () => {
		const q = [
			{
				id: "q1",
				type: "MULTIPLE_CHOICE" as const,
				options: [
					{ id: "a", isCorrect: true },
					{ id: "b", isCorrect: false },
				],
			},
		];
		expect(scoreTrainingQuiz(q, { q1: "a" }).scorePercent).toBe(100);
	});

	it("rejects multiple choice when selected set matches size but not ids", () => {
		const q = [
			{
				id: "q1",
				type: "MULTIPLE_CHOICE" as const,
				options: [
					{ id: "a", isCorrect: true },
					{ id: "b", isCorrect: true },
					{ id: "c", isCorrect: false },
				],
			},
		];
		expect(scoreTrainingQuiz(q, { q1: ["a", "c"] }).scorePercent).toBe(0);
	});
});
