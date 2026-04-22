export type SubmissionStatus =
  | "queued"
  | "running"
  | "accepted"
  | "wrong-answer"
  | "time-limit-exceeded"
  | "runtime-error"
  | "compilation-error";

export interface SubmissionSummary {
  readonly id: string;
  readonly problemId: string;
  readonly languageId: string;
  readonly status: SubmissionStatus;
}
