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
            !showCredentials ? "w-3/4" : "w-3/5"
          }`}
        >
          <img
            src={
              candidate.img ||
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaHfpIhAPZHSbZstaGEgFBIjZZ-Y-K533dag&s"
            }
            alt={`${candidate.name} photo`}
            className="w-10 h-10 object-cover rounded-full"
          />
          <strong>{candidate.name}</strong>
        </td>
        <td
          className={`px-4 py-2 candidate-category-name  ${
            !showCredentials ? "w-1/4" : "w-1/5"
          }`}
        >
          {candidate.party}
        </td>
        <td className="px-4 py-2 text-center">
          {showCredentials && (
            <button onClick={toggleAccordion}>
              {isOpen ? <EyeOff /> : <Eye />}
            </button>
          )}
        </td>
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
