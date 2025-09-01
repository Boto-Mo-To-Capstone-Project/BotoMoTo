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
    }[];
  }[];
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
            id: String(s.id),
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

  if (loading) return <p className="p-10">Loading ballot preview...</p>;
  if (!ballotData) return <p className="p-10">Failed to load ballot data.</p>;

  return (
    <BallotComponent
      ballotData={ballotData}
      electionName={electionName}
      mode="preview"
      onBack={() => history.back()} // simple back
    />
  );
}
