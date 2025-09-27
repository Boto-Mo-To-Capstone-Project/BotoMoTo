"use client";

import { useState, useEffect } from "react";
import Button from "@/components/Button";
import Image from "next/image";

import VotingClose from "@/app/assets/VotingClose.png";
import VotingOpen from "@/app/assets/VotingOpen.png";

import { useRouter } from "next/navigation";

interface VoterData {
  id: string;
  voterId: string;
  voterCode: string;
  name: string;
  email: string | null;
  election: any;
  votingScope: any;
  voted: boolean;
}

const ElectionStatus = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [voter, setVoter] = useState<VoterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check session and get voter data
  const checkSession = async () => {
    try {
      const res = await fetch("/api/voter/session", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setVoter(data.voter);
      } else {
        setVoter(null);
        router.push("/voter/login");
        return;
      }
    } catch (e) {
      console.error("Error checking voter session:", e);
      setVoter(null);
      router.push("/voter/login");
      return;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch("/api/voter/logout", { method: "POST" });
    } catch (e) {
      console.error("Error logging out:", e);
    } finally {
      // Clear cookie client-side as backup
      document.cookie = "voter_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      // Clear localStorage and redirect
      localStorage.removeItem("voterData");
      localStorage.removeItem("mfaFlow");
      router.push("/voter/login");
    }
  };

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoading || !voter) return;

    // Check if voter has already voted and redirect to live dashboard
    if (voter.voted) {
      console.log("Voter has already voted, redirecting to live dashboard");
      router.push("/voter/live-dashboard");
      return;
    }

    try {
      const election = voter.election;
      const active = election?.status === "ACTIVE";

      if (!active) {
        setIsOpen(false);
        return;
      }

      if (election?.schedule) {
        const now = new Date();
        const startDate = new Date(election.schedule.dateStart);
        const endDate = new Date(election.schedule.dateFinish);
        setIsOpen(now >= startDate && now <= endDate);
      } else {
        setIsOpen(true);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load election status");
    }
  }, [voter, isLoading]);

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
        <p>Loading election status...</p>
      </main>
    );
  }

  if (!voter) return null; // redirecting

  return (
    <main className=" flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
      {isOpen ? (
        <>
          <div className="text-center space-y-2">
            <p className="voterlogin-heading">Voting is Now Open!</p>
            <p className="voterlogin-subheading">
              {voter.name}, you're voting in the {voter?.election?.name || '2025 Election'}
            </p>
          </div>

          <Image src={VotingOpen} height={300} alt="BotoMoToLogo" />

          <div className="pt-15 flex flex-col gap-4 w-4/5 xs:w-auto">
            <Button
              variant="long_primary"
              onClick={() => router.push("/voter/election-terms-conditions")}
            >
              Proceed to Voting
            </Button>
            <Button
              variant="long_secondary"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        </>
      ) : (
        <>

        {/* dapat dito yung clock na magpapakita pag close pa yung election */}
          <div className="text-center space-y-2">
            <p className="voterlogin-heading">Voting is still closed.</p>
            <p className="voterlogin-subheading">
              The {voter?.election?.name || '2025 Election'} is not currently active. Please wait for further instructions or check your email for updates regarding the voting process.
            </p>
          </div>

          <Image src={VotingClose} height={300} alt="BotoMoToLogo" />

          <div className="pt-20 flex flex-col gap-4 w-4/5 xs:w-auto">
            <Button
              variant="long_secondary"
              onClick={() => router.push("/voter/login")}
            >
              Go Back
            </Button>
          </div>
        </>
      )}
    </main>
  );
};

export default ElectionStatus;
