// components/SurveyTable.tsx
"use client";

import React from "react";
import { SurveySection } from "@/types";
import SurveyItem from "./SurveyItem";
import SectionHeaderContainer from "./SectionHeaderContainer";

type Props = {
  section: SurveySection;
  sectionIndex: number;
};

const SurveyTable: React.FC<Props> = ({ section, sectionIndex }) => {
  return (
    <div className="mb-8">
      <SectionHeaderContainer>{section.title}</SectionHeaderContainer>

      {/* Desktop table */}
      <table className="hidden md:table w-full border border-gray-200 table-fixed">
        <colgroup>
          <col className="w-1/10" />
          <col className="w-4/10" />
          <col className="w-5/10" />
        </colgroup>
        <thead className="bg-gray-100 voter-election-desc border-b border-gray-200">
          <tr>
            <th className="py-2 px-4 text-center ">{""}</th>
            <th className="py-2 px-4 text-left text-md">Question</th>
            <th className="py-2 px-4 text-center ">{""}</th>
          </tr>
        </thead>
        <tbody>
          {section.questions.map((q) => (
            <SurveyItem
              key={q.id}
              id={q.id}
              question={q.question}
              name={`section${sectionIndex}`}
            />
          ))}
        </tbody>
      </table>

      {/* Mobile view handled inside SurveyItem */}
      <div className="md:hidden">
        {section.questions.map((q) => (
          <SurveyItem
            key={q.id}
            id={q.id}
            question={q.question}
            name={`section${sectionIndex}`}
          />
        ))}
      </div>
    </div>
  );
};

export default SurveyTable;
