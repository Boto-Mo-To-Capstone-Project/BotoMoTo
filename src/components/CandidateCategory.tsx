// this is used in ballot-form
"use client";

import { useState } from "react";
import { Candidate } from "@/types";
import React from "react";
import { Eye } from "lucide-react";
import SectionHeaderContainer from "./SectionHeaderContainer";
import FileViewer from "./FileViewer";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

type CandidateCategoryProps = {
  position: string;
  selectCount: number;
  candidateList: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
  onDeselectCandidate: (candidate: Candidate) => void;
  disabled?: boolean; // For preview mode
};

const CandidateCategory = ({
  position,
  selectCount,
  candidateList,
  onSelectCandidate,
  onDeselectCandidate,
  disabled = false,
}: CandidateCategoryProps) => {
  const selectedCandidatesFromRedux = useSelector(
    (state: RootState) => state.ballot.selections[position] || []
  );

  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<{
    url: string;
    candidateName: string;
  } | null>(null);

  const handleViewCredentials = (candidate: Candidate) => {
    const credentialsUrl = candidate.credentialsUrl || candidate.credentials;
    if (credentialsUrl) {
      setSelectedCredential({
        url: credentialsUrl,
        candidateName: candidate.name,
      });
      setFileViewerOpen(true);
    } else {
      alert("No credentials available for this candidate.");
    }
  };

  const closeFileViewer = () => {
    setFileViewerOpen(false);
    setSelectedCredential(null);
  };

  const handleSelect = (candidate: Candidate) => {
    const isSelected = selectedCandidatesFromRedux.some(
      (c) => c.id === candidate.id
    );
    if (isSelected) {
      onDeselectCandidate(candidate);
    } else {
      if (selectedCandidatesFromRedux.length < selectCount) {
        onSelectCandidate(candidate);
      } else {
        alert(
          `You can only select up to ${selectCount} candidates for ${position}.`
        );
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

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[auto-fit,minmax(320px,1fr)] gap-6 mt-4">
        {candidateList.map((candidate) => {
          const isSelected = selectedCandidatesFromRedux.some(
            (c) => c.id === candidate.id
          );

          return (
            <div
              key={candidate.id}
              className={`flex flex-col lg:flex-row items-center lg:items-start gap-5 rounded-2xl border-2 p-6 bg-white shadow transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-gray-200"
              } hover:shadow-lg w-full h-full`}
            >
              {/* Candidate Image */}
              <div className="w-28 h-28 flex items-center justify-center rounded-xl border-2 border-gray-200 overflow-hidden">
                <img
                  src={candidate.img ? candidate.img : "/assets/placeholderuser.png"}
                  alt={candidate.img ? `${candidate.name} photo` : "Placeholder user"}
                  className="w-full h-full object-cover"
                  onError={e => {
                    if (e.currentTarget.src.indexOf('placeholderuser.png') === -1) {
                      e.currentTarget.src = '/assets/placeholderuser.png';
                    }
                  }}
                />
              </div>

              {/* Candidate Info */}
              <div className="flex flex-col flex-1 w-full">
                {/* Name + Party pill */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full">
                  <span className="font-bold text-xl text-gray-900 text-center lg:text-left">
                    {candidate.name}
                  </span>
                  {candidate.party && (
                    <span className="px-4 py-1 rounded-full font-semibold text-gray-700 bg-gray-200 text-sm mt-2 lg:mt-0 text-center self-center lg:self-auto">
                      {candidate.party}
                    </span>
                  )}
                </div>

                {/* Credentials + Vote */}
                <div className="flex flex-row items-center justify-between gap-3 mt-4 w-full">
                  <div className="flex flex-row items-center gap-2">
                    <span className="text-sm text-gray-600 italic">
                      Credentials:
                    </span>
                    <button
                      onClick={() => handleViewCredentials(candidate)}
                      className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title={`View ${candidate.name}'s credentials`}
                      aria-label={`View ${candidate.name}'s credentials`}
                      type="button"
                    >
                      <Eye size={20} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleSelect(candidate)}
                    className={`px-5 py-2 rounded-full font-bold text-sm transition-colors ${
                      isSelected
                        ? "bg-primary text-white border-2 border-primary"
                        : "bg-gray-100 text-primary border-2 border-gray-200 hover:bg-primary/10 hover:border-primary"
                    }`}
                    disabled={disabled}
                  >
                    {isSelected ? "Voted" : "Vote"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* File Viewer Modal */}
      {fileViewerOpen && selectedCredential && (
        <FileViewer
          fileUrl={selectedCredential.url}
          fileName={`${selectedCredential.candidateName}_credentials`}
          title={`${selectedCredential.candidateName} - Credentials`}
          onClose={closeFileViewer}
        />
      )}
    </div>
  );
};

export default CandidateCategory;
