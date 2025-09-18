import { useState, useEffect } from "react";
import { MdVisibility } from "react-icons/md";

interface Candidate {
  id: number;
  name: string;
  email?: string;
  position?: string;
}

type PartyCandidatesModalProps = {
  open: boolean;
  onClose: () => void;
  partyName: string;
  partyId: number;
  candidates?: Candidate[];
  loading?: boolean;
};

export function PartyCandidatesModal({
  open,
  onClose,
  partyName,
  partyId,
  candidates = [],
  loading = false,
}: PartyCandidatesModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh]">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {partyName} - Candidates
              </h3>
            </div>
             
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
              onClick={onClose}
            >
              <svg className="w-3 h-3" aria-hidden="true" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          {/* Modal body */}
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">View all candidates belonging to this party.</p>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading candidates...</div>
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-8">
                <MdVisibility className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No candidates</h3>
                <p className="mt-1 text-sm text-gray-500">
                  There are no candidates currently belonging to this party.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-700 border-b font-semibold text-base">
                      <th className="py-3 px-4 border-b border-gray-200">Name</th>
                      <th className="py-3 px-4 border-b border-gray-200">Email</th>
                      <th className="py-3 px-4 border-b border-gray-200">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate, idx) => (
                      <tr
                        key={candidate.id}
                        className={`border-b border-gray-200 ${
                          idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        }`}
                      >
                        <td className="py-3 px-4 align-middle font-medium">
                          {candidate.name}
                        </td>
                        <td className="py-3 px-4 align-middle text-gray-600">
                          {candidate.email || '—'}
                        </td>
                        <td className="py-3 px-4 align-middle text-gray-600">
                          {candidate.position || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
