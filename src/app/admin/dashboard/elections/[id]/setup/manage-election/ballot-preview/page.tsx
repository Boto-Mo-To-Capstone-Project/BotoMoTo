// app/admin/dashboard/elections/[id]/setup/manage-election/ballot-preview/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BallotComponent from "@/components/BallotComponent";

interface BallotData {
  positions: {
    name: string;
    maxSelections: number;
    candidates: {
      id: string;
      name: string;
      party: string;
      partyColor: string;
      credentials: string;
      credentialsUrl?: string;
      img: string;
      position: string;
      scopeId: number | null; // ✅ new
    }[];
  }[];
  scopes: {
    id: number;
    name: string;
  }[]; // ✅ include scopes here
}

export default function BallotPreviewPage() {
  const { id } = useParams(); // grab election id from route
  const [ballotData, setBallotData] = useState<BallotData | null>(null);
  const [electionName, setElectionName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchBallot = async () => {
      try {
        const res = await fetch(`/api/ballot-preview/${id}`);
        if (!res.ok) throw new Error("Failed to load ballot data");

        const data = await res.json();
        setBallotData({
          ...data.ballotData,
          scopes: data.votingScopes.map((s: any) => ({
            id: Number(s.id),
            name: s.name,
          })),
        });
        setElectionName(data.electionName);
      } catch (err) {
        console.error("Ballot Preview Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBallot();
  }, [id]);

  if (loading) {
    return (
      <main className="flex flex-col items-center px-5 sm:px-20 pb-20 text-justify pt-8 animate-pulse">
        <div className="w-full flex flex-col">
          {/* Header */}
          <div className="mb-6 rounded-2xl bg-gray-200 px-8 py-6 w-full">
            <div className="h-6 w-1/3 bg-gray-300 rounded mb-3"></div>
            <div className="h-4 w-2/3 bg-gray-300 rounded"></div>
          </div>

          {/* Instructions box */}
          <div className="mb-6 border rounded-md p-4 bg-gray-100 border-gray-200">
            <div className="h-4 w-1/4 bg-gray-300 rounded mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 w-11/12 bg-gray-200 rounded"></div>
              <div className="h-3 w-10/12 bg-gray-200 rounded"></div>
              <div className="h-3 w-9/12 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Voter Scope Info */}
          <div className="mb-5 p-3 border rounded-md bg-gray-100 border-gray-200">
            <div className="h-4 w-1/3 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 w-2/3 bg-gray-200 rounded"></div>
          </div>

          {/* Dropdown placeholder */}
          <div className="mb-6">
            <div className="h-10 w-1/2 bg-gray-200 rounded-md"></div>
          </div>

          {/* Candidate categories (3 sample placeholders) */}
          <div className="mt-5 space-y-8">
            {[1, 2, 3].map((_, idx) => (
              <div key={idx}>
                {/* Section Header */}
                <div className="h-5 w-1/3 bg-gray-300 rounded mb-4"></div>

                {/* Candidate Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[1, 2].map((_, cardIdx) => (
                    <div
                      key={cardIdx}
                      className="flex flex-col lg:flex-row items-center lg:items-start gap-5 rounded-2xl border-2 border-gray-200 p-6 bg-gray-100 shadow-sm"
                    >
                      <div className="w-28 h-28 bg-gray-300 rounded-xl"></div>

                      <div className="flex flex-col flex-1 w-full space-y-3">
                        <div className="h-5 w-2/3 bg-gray-300 rounded"></div>
                        <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
                          <div className="h-8 w-20 bg-gray-300 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-4 justify-end mt-8">
            <div className="h-10 w-24 bg-gray-300 rounded-md"></div>
            <div className="h-10 w-32 bg-gray-300 rounded-md"></div>
          </div>
        </div>
      </main>
    );
  }
  return (
    <BallotComponent
      isLoading={loading}
      ballotData={ballotData || { positions: [], scopes: [] }}
      electionName={electionName}
      mode="preview"
      onBack={() => history.back()} // simple back
    />
  );
}
