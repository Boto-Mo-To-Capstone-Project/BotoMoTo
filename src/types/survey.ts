export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "date"
  | "time"
  | "linear_scale";

export type QuestionOption = { id: string; label: string };

export type QuestionBase = {
  id: string;
  type: QuestionType;
  label: string;
  description?: string;
  required?: boolean;
};

export type ChoiceQuestion = QuestionBase & {
  options: QuestionOption[];
  randomizeOptions?: boolean;
  allowOther?: boolean;
};

export type LinearScaleQuestion = QuestionBase & {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
};

export type Question = QuestionBase | ChoiceQuestion | LinearScaleQuestion;

export type FormSchema = {
  title: string;
  description?: string;
  questions: Question[];
};
