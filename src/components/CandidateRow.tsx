"use client";

import { Candidate } from "@/types";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type CandidateRowProps = {
  candidate: Candidate;
  showCredentials?: boolean; // optional prop, for vote receipt where there is no view credentials
};

const CandidateRow = ({
  candidate,
  showCredentials = true,
}: CandidateRowProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAccordion = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <tr className="bg-white hover:bg-gray-50">
        <td
          className={`px-4 py-2 candidate-category-name flex gap-3 items-center ${
            !showCredentials ? "w-1/2" : "w-2/5"
          }`}
        >
          {/* Candidate Image */}
          <div className="min-w-[3.5rem] min-h-[3.5rem] w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-xl border-2 border-gray-200 overflow-hidden">
            <img
              src={candidate.img ? candidate.img : "/assets/placeholderuser.png"}
              alt={candidate.img ? `${candidate.name} photo` : "Placeholder user"}
              className="w-full h-full object-cover max-w-none"
              onError={e => {
                if (e.currentTarget.src.indexOf('placeholderuser.png') === -1) {
                  e.currentTarget.src = '/assets/placeholderuser.png';
                }
              }}
            />
          </div>
          <strong>{candidate.name}</strong>
        </td>
        <td
          className={`px-4 py-2 candidate-category-name  ${
            !showCredentials ? "w-1/2" : "w-2/5"
          }`}
        >
          {candidate.party}
        </td>
        {showCredentials && (
          <td className="px-4 py-2 text-center w-1/5">
            <button onClick={toggleAccordion}>
              {isOpen ? <EyeOff /> : <Eye />}
            </button>
          </td>
        )}
      </tr>
      {showCredentials && isOpen && (
        <tr className="bg-gray-50">
          <td colSpan={3} className="px-4 py-4">
            <p className="candidate-category-desc">{candidate.credentials}</p>
          </td>
        </tr>
      )}
    </>
  );
};

export default CandidateRow;
