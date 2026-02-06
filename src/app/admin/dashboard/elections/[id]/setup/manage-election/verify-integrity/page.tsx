"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Vote, Users, BarChart2, Clock, ShieldCheck, CheckSquare, BadgeCheck, UserSquare } from "lucide-react";
import Button from "@/components/Button";
import { SubmitButton } from "@/components/SubmitButton";
import KpiCard from "@/components/KpiCard";

interface VerificationResponse {
  election: {
    id: number;
    name: string;
    status: string;
    organization: string;
  };
  verification: {
    timestamp: string;
    isValid: boolean;
    integrityPercentage: number;
    summary: {
      totalVotes: number;
      verifiedVotes: number;
      invalidVotes: number;
      totalVoters: number;
      totalCandidates: number;
    };
    chain: {
      startHash: string;
      endHash: string;
      firstVoteAt: string | null;
      lastVoteAt: string | null;
    };
    errors?: Array<{
      voteId: number;
      chainOrder: number;
      issues: string[];
    }>;
  };
}

export default function VerifyIntegrityPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<VerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      try {
        const res = await fetch(`/api/elections/${id}/verify-integrity`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message || "Failed to fetch data");
        }
      } catch (err) {
        setError("Unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  const election = data?.election;
  const verification = data?.verification;

  return (
    <div className="flex-1 bg-white w-full min-w-0 p-4 md:p-8 pt-8">
      {/* Election Header - Professional Gradient */}
      <div className="relative overflow-hidden rounded-2xl shadow-lg mb-8 mt-4">
        <div className="absolute inset-0 bg-gradient-to-r from-[#7b1c1c] via-[#992b2b] to-[#5c0000]"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative px-6 py-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-md font-bold text-white mb-1">{election ? election.name : "Election name"}</h2>
            <p className="text-white/90 text-sm">Organization: {election ? election.organization : "Your organization"}</p>
            <p className="text-white/90 text-sm">Status: {election ? election.status : "Election status"}</p>
            <p className="text-white/80 text-sm">Verified at: {verification ? new Date(verification.timestamp).toLocaleString() : "Verified date"}</p>
          </div>
        </div>
      </div>

      {verification?.errors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold mb-2 text-primary">Integrity Issues!!</h2>
          <div className="space-y-4">
            {verification.errors.map((err, idx) => (
              <div
                key={idx}
                className="border p-3 rounded-md bg-red-100 border-red-300 text-wrap overflow-hidden"
              >
                <p className="font-medium">
                  Vote ID: {err.voteId} | Chain Order: {err.chainOrder}
                </p>
                <ul className="list-disc list-inside text-sm text-red-700">
                  {err.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 w-full">
        <KpiCard
          name="Integrity"
          value={verification ? `${verification.integrityPercentage}%` : "..."}
          icon={ShieldCheck}
          badge="SCORE"
          color="amber"
        />
        <KpiCard
          name="Total Votes"
          value={verification ? verification.summary.totalVotes.toString() : "..."}
          icon={CheckSquare}
          badge="VOTES"
          color="blue"
        />
        <KpiCard
          name="Total Voters"
          value={verification ? verification.summary.totalVoters.toString() : "..."}
          icon={Users}
          badge="VOTERS"
          color="green"
        />
        <KpiCard
          name="Verified Votes"
          value={verification ? verification.summary.verifiedVotes.toString() : "..."}
          icon={BadgeCheck}
          badge="VERIFIED"
          color="pink"
        />
        <KpiCard
          name="Candidates"
          value={verification ? verification.summary.totalCandidates.toString() : "..."}
          icon={UserSquare}
          badge="TOTAL"
          color="purple"
        />
        <KpiCard
          name="Invalid Votes"
          value={verification ? verification.summary.invalidVotes.toString() : "..."}
          icon={XCircle}
          badge="INVALID"
          color="red"
        />
      </div>

  {/* ...existing code... */}
    </div>
  );
}
