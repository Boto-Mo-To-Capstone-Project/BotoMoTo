"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Vote, Users, BarChart2, Clock, ShieldCheck, CheckSquare, BadgeCheck, UserSquare } from "lucide-react";
import Button from "@/components/Button";
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
        <span className="ml-2 text-gray-700">Verifying election integrity...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] text-red-600">
        {error || "Failed to load verification data"}
      </div>
    );
  }

  const { election, verification } = data;
  const router = useRouter();
  

  return (
    <div className="p-6 space-y-6">
        {/* page head and details*/}
        <div className="flex flex-col items-start gap-10 justify-between xl:flex-row w-full">
          <div className="text-center xl:text-start space-y-2 ">
            <p className="voter-election-heading">
              {election.name}{" "}
            </p>
            <p className="voter-election-desc">
              Organization: {election.organization}
            </p>
            <p className="voter-election-desc">
              Status: {election.status}
            </p>
            
          </div>
          <div className="flex justify-center w-full xs:w-auto">
            <p className="voter-election-desc">
              Verified at: {new Date(verification.timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {verification.errors && (
        <div className="rounded-xl shadow border border-gray-200 ">
          <h2 className="text-lg font-semibold mb-2 text-primary pt-4 pl-4">Integrity Issues!!</h2>
          <div className="p-4 overflow-y-auto h-70">
            
            <div className="space-y-4">
              {verification.errors.map((err, idx) => (
                <div
                  key={idx}
                  className="border p-3 rounded-md bg-red-50 border-red-200 text-wrap overflow-hidden"
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
        </div>
      )}

        {/* kpi section */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 w-full mt-10">
          <KpiCard name="Integrity:" value={`${verification.integrityPercentage}%`} icon={ShieldCheck} />
          <KpiCard name="Total Votes" value={`${verification.summary.totalVotes}`} icon={CheckSquare} />
          <KpiCard name="Total Voters" value={`${verification.summary.totalVoters}`} icon={Users} />
          <KpiCard name="Verified Votes" value={`${verification.summary.verifiedVotes}`} icon={BadgeCheck} />                   
          <KpiCard name="Candidates" value={`${verification.summary.totalCandidates}`} icon={UserSquare} />
          <KpiCard name="Invalid Votes" value={`${verification.summary.invalidVotes}`} icon={XCircle} />
        </div>

      
      <div className="flex w-full justify-end mt-10">
        <Button
          variant="long_secondary"
          onClick={() => router.push(`/admin/dashboard/elections/${id}/setup/manage-election`)}
        >
          Go Back
        </Button>
      </div>
      
    </div>
  );
}
