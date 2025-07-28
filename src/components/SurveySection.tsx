// components/SurveySection.tsx
import React from "react";
import SectionHeaderContainer from "./SectionHeaderContainer";

type Question = {
  id: string;
  text: string;
};

type Section = {
  title: string;
  questions: Question[];
};

type Props = {
  section: Section;
  onAnswer: (questionId: string, value: number) => void;
  responses: Record<string, number>;
};

export default function SurveySection({ section, onAnswer, responses }: Props) {
  return (
    <div className="mb-10">
      <SectionHeaderContainer>{section.title}</SectionHeaderContainer>
      <div className="mt-5 space-y-10">
        {section.questions.map((q) => (
          <div
            key={q.id}
            className="flex flex-col lg:flex-row lg:justify-between lg:pr-3 lg:items-center"
          >
            <p className="voter-election-desc ml-2 lg:w-3/5">{q.text}</p>
            <div className="flex gap-4 justify-around mt-4 px-5 lg:px-0 lg:mt-0 lg:w-2/5">
              {[1, 2, 3, 4].map((value) => (
                <label key={value} className="flex flex-col items-center gap-1">
                  <input
                    type="radio"
                    name={q.id}
                    value={value}
                    checked={responses[q.id] === value}
                    onChange={() => onAnswer(q.id, value)}
                    className="accent-primary h-5 w-5"
                  />
                  <span className="text-sm text-gray">{value}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
