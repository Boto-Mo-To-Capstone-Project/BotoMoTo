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
  // Get selected candidates from Redux store for this position
  const selectedCandidatesFromRedux = useSelector((state: RootState) => 
    state.ballot.selections[position] || []
  );
  
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<{
    url: string;
    candidateName: string;
  } | null>(null);

  const handleViewCredentials = (candidate: Candidate) => {
    // Check if candidate has credentialsUrl (from API) or credentials (fallback)
    const credentialsUrl = candidate.credentialsUrl || candidate.credentials;
    
    if (credentialsUrl) {
      setSelectedCredential({
        url: credentialsUrl,
        candidateName: candidate.name
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
    if (disabled) return; // Don't allow selection in preview mode
    
    // Check if candidate is already selected (compare by ID)
    const isSelected = selectedCandidatesFromRedux.some(c => c.id === candidate.id);

    if (isSelected) {
      // Deselect
      onDeselectCandidate(candidate);
    } else {
      // Check if voter exceeds the select count of the position
      if (selectedCandidatesFromRedux.length < selectCount) {
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
      <div className="w-full overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-300 bg-gray-100">
          <thead className="">
            <tr>
              <th className="px-4 py-2 candidate-category-desc ">Candidate</th>
              <th className="px-4 py-2 candidate-category-desc ">Party</th>
              <th className="px-4 py-2 text-center candidate-category-desc ">
                View Credentials
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {candidateList.map((candidate, index) => (
              <tr key={candidate.id} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-2 candidate-category-name flex gap-3 items-center">
                  <input
                    type="checkbox"
                    checked={selectedCandidatesFromRedux.some(c => c.id === candidate.id)}
                    className={`accent-primary min-h-5 min-w-5 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onChange={() => handleSelect(candidate)}
                    disabled={disabled}
                  />
                  <img
                    src={
                      candidate.img ||
                      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaHfpIhAPZHSbZstaGEgFBIjZZ-Y-K533dag&s"
                    }
                    alt={`${candidate.name} photo`}
                    className="w-10 h-10 object-cover rounded-full"
                  />
                  <div className="flex flex-col">
                    <strong>{candidate.name}</strong>
                    {/* Show ID only if there might be duplicate names */}
                    {candidateList.filter(c => c.name === candidate.name).length > 1 && (
                      <span className="text-xs text-gray-500">ID: {candidate.id}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 candidate-category-name">
                  {candidate.party}
                </td>
                <td className="px-4 py-2 text-center">
                  <button 
                    onClick={() => handleViewCredentials(candidate)} 
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title={`View ${candidate.name}'s credentials`}
                  >
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
