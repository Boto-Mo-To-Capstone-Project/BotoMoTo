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
    <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8 pt-4">
      {/* Sticky Go Back Button at top */}
      <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-row items-end justify-end mb-6 py-3 px-2 sm:px-5 w-full">
        <SubmitButton
          variant="action"
          label="Go Back"
          onClick={() => router.push(`/admin/dashboard/elections/${id}/setup/manage-election`)}
        />
      </div>
      {/* Maroon Header Card */}
      <div className="flex items-center rounded-2xl bg-red-800 mb-6 px-6 py-6 relative overflow-hidden mt-8">
        <div>
          <h2 className="text-white text-xl font-semibold mb-2">{election ? election.name : "Election name"}</h2>
          <p className="text-white text-base">Organization: {election ? election.organization : "Your organization"}</p>
          <p className="text-white text-base">Status: {election ? election.status : "Election status"}</p>
          <p className="text-white text-sm">Verified at: {verification ? new Date(verification.timestamp).toLocaleString() : "Verified date"}</p>
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

      {/* KPI Cards Section - dashboard style with icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 w-full">
        <div className="rounded-2xl shadow-sm p-6 bg-orange-100 flex items-center min-w-0 w-full">
          <div className="flex-1">
            <div className="text-3xl font-bold mb-1 text-[#7c3a12]">{verification ? `${verification.integrityPercentage}%` : "..."}</div>
            <div className="text-base font-semibold text-[#7c3a12]">Integrity</div>
          </div>
          <ShieldCheck className="w-14 h-14 text-[#7c3a12]" />
        </div>
        <div className="rounded-2xl shadow-sm p-6 bg-blue-100 flex items-center min-w-0 w-full">
          <div className="flex-1">
            <div className="text-3xl font-bold mb-1 text-[#1e3a8a]">{verification ? `${verification.summary.totalVotes}` : "..."}</div>
            <div className="text-base font-semibold text-[#1e3a8a]">Total Votes</div>
          </div>
          <CheckSquare className="w-14 h-14 text-[#1e3a8a]" />
        </div>
        <div className="rounded-2xl shadow-sm p-6 bg-green-100 flex items-center min-w-0 w-full">
          <div className="flex-1">
            <div className="text-3xl font-bold mb-1 text-[#166534]">{verification ? `${verification.summary.totalVoters}` : "..."}</div>
            <div className="text-base font-semibold text-[#166534]">Total Voters</div>
          </div>
          <Users className="w-14 h-14 text-[#166534]" />
        </div>
        <div className="rounded-2xl shadow-sm p-6 bg-pink-100 flex items-center min-w-0 w-full">
          <div className="flex-1">
            <div className="text-3xl font-bold mb-1 text-[#a21a5b]">{verification ? `${verification.summary.verifiedVotes}` : "..."}</div>
            <div className="text-base font-semibold text-[#a21a5b]">Verified Votes</div>
          </div>
          <BadgeCheck className="w-14 h-14 text-[#a21a5b]" />
        </div>
        <div className="rounded-2xl shadow-sm p-6 bg-yellow-100 flex items-center min-w-0 w-full">
          <div className="flex-1">
            <div className="text-3xl font-bold mb-1 text-[#854d0e]">{verification ? `${verification.summary.totalCandidates}` : "..."}</div>
            <div className="text-base font-semibold text-[#854d0e]">Candidates</div>
          </div>
          <UserSquare className="w-14 h-14 text-[#854d0e]" />
        </div>
        <div className="rounded-2xl shadow-sm p-6 bg-red-100 flex items-center min-w-0 w-full">
          <div className="flex-1">
            <div className="text-3xl font-bold mb-1 text-[#991b1b]">{verification ? `${verification.summary.invalidVotes}` : "..."}</div>
            <div className="text-base font-semibold text-[#991b1b]">Invalid Votes</div>
          </div>
          <XCircle className="w-14 h-14 text-[#991b1b]" />
        </div>
      </div>

  {/* ...existing code... */}
    </div>
  );
}
