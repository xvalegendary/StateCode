import {
  problemCategories as fallbackCategories,
  problems as fallbackProblems
} from "@/features/platform/data/catalog";
import type { ProblemRecord } from "@/features/platform/lib/platform-api";

export const fallbackLanguages = [
  "C",
  "C++17",
  "C++20",
  "Rust",
  "Go",
  "Java 21",
  "Kotlin",
  "Python 3.12",
  "JavaScript",
  "TypeScript",
  "C#"
];

export const fallbackProblemCategories = fallbackCategories;

export const fallbackProblemRecords: ProblemRecord[] = fallbackProblems.map((problem) => ({
  problem_id: problem.id,
  slug: problem.title.toLowerCase().replaceAll(" ", "-"),
  title: problem.title,
  category: problem.category,
  difficulty: problem.difficulty,
  status: problem.status,
  solved_count: problem.solvedCount,
  time_limit: problem.timeLimit,
  statement: `Solve ${problem.title}. Read input from stdin and print the answer to stdout.`,
  created_at: new Date().toISOString(),
  languages: ["C++17", "Rust", "Python 3.12"],
  solved_by_current_user: false
}));
