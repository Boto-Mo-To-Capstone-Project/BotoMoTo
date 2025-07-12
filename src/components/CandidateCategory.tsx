// this is used in ballot-form
"use client";

import { useState } from "react";
import { Candidate } from "@/types";
import React from "react";
import { Eye, EyeOff } from "lucide-react";
import SectionHeaderContainer from "./SectionHeaderContainer";

type CandidateCategoryProps = {
  position: string;
  selectCount: number;
  candidateList: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
  onDeselectCandidate: (candidate: Candidate) => void;
};

const CandidateCategory = ({
  position,
  selectCount,
  candidateList,
  onSelectCandidate,
  onDeselectCandidate,
}: CandidateCategoryProps) => {
  const [openIndexes, setOpenIndexes] = useState<number[]>([]); // open accordion
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

  const toggleAccordion = (index: number) => {
    setOpenIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    ); // to open and close accordion
  };

  const handleSelect = (candidate: Candidate) => {
    const candidateName = candidate.name; // get the name from candidate object

    if (selectedCandidates.includes(candidateName)) {
      // Deselect
      setSelectedCandidates((prev) =>
        prev.filter((name) => name !== candidateName)
      );
      onDeselectCandidate(candidate);
    } else {
      // check if voter exceeds the select count of the position
      if (selectedCandidates.length < selectCount) {
        setSelectedCandidates((prev) => [...prev, candidateName]);
        onSelectCandidate(candidate);
      } else {
        alert(`You can only select up to ${selectCount} candidate(s).`);
      }
    }
  };

  return (
    <div className="w-full my-3">
      <SectionHeaderContainer variant="yellow">
        {position}{" "}
        <span className="bg-primary/5 text-sm align-center font-bold ml-2 rounded-xl py-1 px-2 text-primary">
          Select up to {selectCount}
        </span>
      </SectionHeaderContainer>

      <table className="min-w-full divide-y divide-gray-200 border border-gray-300 bg-gray-100">
        <thead className="">
          <tr>
            <th className="px-4 py-2 candidate-category-desc w-3/5">
              Candidate
            </th>
            <th className="px-4 py-2 candidate-category-desc w-1/5">Party</th>
            <th className="px-4 py-2 text-center candidate-category-desc w-1/5">
              View Credentials
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {candidateList.map((candidate, index) => (
            <React.Fragment key={candidate.name}>
              <tr className="bg-white hover:bg-gray-50">
                <td className="px-4 py-2 candidate-category-name flex gap-3 items-center">
                  <input
                    type="checkbox"
                    checked={selectedCandidates.includes(candidate.name)}
                    className="h-4 w-4 lg:h-5 lg:w-5 appearance-none rounded-xl border-2 border-gray checked:border-primary checked:bg-primary focus:ring-3 focus:ring-primary focus:ring-offset-1 cursor-pointer flex-none "
                    onChange={() => handleSelect(candidate)}
                  />
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
                <td className="px-4 py-2 candidate-category-name">
                  {candidate.party}
                </td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => toggleAccordion(index)} className="">
                    {openIndexes.includes(index) ? <EyeOff /> : <Eye />}
                  </button>
                </td>
              </tr>
              {openIndexes.includes(index) && (
                <tr className="bg-gray-50">
                  <td colSpan={3} className="px-4 py-4 ">
                    <p className="candidate-category-desc">
                      {candidate.credentials}
                    </p>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CandidateCategory;
