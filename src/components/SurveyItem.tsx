// components/SurveyItem.tsx
"use client";

import React from "react";

type Props = {
  id: number;
  question: string;
  name: string;
};

const options = [1, 2, 3, 4];

const SurveyItem: React.FC<Props> = ({ id, question, name }) => {
  return (
    <>
      {/* Desktop view */}
      <tr className="hidden md:table-row border-b border-gray-200">
        <td className="py-2 px-4 text-center">{id}</td>
        <td className="py-2 px-4 voter-election-desc">{question}</td>
        <td className="py-2 px-4 flex justify-center gap-10">
          {options.map((opt) => (
            <label
              key={opt}
              className="inline-flex items-center flex-col gap-1"
            >
              <input
                type="radio"
                name={`${name}-${id}`}
                value={opt}
                className="form-radio h-4 w-4 lg:h-5 lg:w-5 appearance-none rounded-xl border-2 border-primary checked:border-primary checked:bg-primary focus:ring-3 focus:ring-primary focus:ring-offset-1 cursor-pointer flex-none "
              />
              <span className="text-sm text-gray">{opt}</span>
            </label>
          ))}
        </td>
      </tr>

      {/* Mobile view */}
      <div className="md:hidden border border-gray-200 rounded p-3 mb-3 shadow-sm">
        <p className="mb-2 voter-election-desc">
          {id}. {question}
        </p>
        <div className="flex justify-center gap-8">
          {options.map((opt) => (
            <label
              key={opt}
              className="inline-flex items-center flex-col gap-1"
            >
              <input
                type="radio"
                name={`${name}-${id}`}
                value={opt}
                className="form-radio h-4 w-4 lg:h-5 lg:w-5 appearance-none rounded-xl border-2 border-primary checked:border-primary checked:bg-primary focus:ring-3 focus:ring-primary focus:ring-offset-1 cursor-pointer flex-none "
              />
              <span className="ml-1 text-sm text-gray">{opt}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
};

export default SurveyItem;
