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

  const [timeLeft, setTimeLeft] = useState<string | null>(null); // countdown string

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

  // fetch and handle countdown
  useEffect(() => {
    if (isLoading || !voter) return;

    const election = voter.election;
    if (!election || election.status !== "ACTIVE") {
      setIsOpen(false);
      return;
    }

    const startDate = new Date(election.schedule.dateStart);
    const endDate = new Date(election.schedule.dateFinish);

    const updateCountdown = () => {
      const now = new Date();
      if (now >= startDate && now <= endDate) {
        setIsOpen(true);
        setTimeLeft(null); // no countdown
      } else if (now < startDate) {
        setIsOpen(false);
        const diff = startDate.getTime() - now.getTime();

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
      } else {
        setIsOpen(false); // election finished
        setTimeLeft(null);
      }
    };

    updateCountdown(); // run once immediately
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
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
            <p className="voterlogin-heading">Voting has not started yet</p>
            {timeLeft ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 flex-col">
                  <p className="voterlogin-subheading">Election will open in</p>
                  <div className="flex items-center gap-2 xs:gap-4">
                    {/* Split timeLeft string into characters */}
                    {timeLeft.split("").map((char, idx) => (
                      char === ":" ? (
                        <span key={idx} className="text-xl xs:text-2xl font-bold">:</span>
                      ) : (
                        <div
                          key={idx}
                          className="w-8 xs:w-12 h-12 xs:h-14 flex items-center justify-center border-2 border-secondary rounded-md text-xl xs:text-2xl font-bold text-black"
                        >
                          {char}
                        </div>
                      )
                    ))}
                  </div>
                </div>
                <div className="flex justify-between w-full px-6 text-sm text-gray-600 font-medium">
                  <span>hours</span>
                  <span>mins</span>
                  <span>seconds</span>
                </div>
              </div>
            ) : (
              <p className="voterlogin-subheading">
                Please wait for further instructions.
              </p>
            )}
          </div>

          <Image src={VotingClose} height={300} alt="BotoMoToLogo" />

          <div className="pt-10 flex flex-col gap-4 w-4/5 xs:w-auto">
              <Button
                variant="long_secondary"
                onClick={logout}
              >
                Logout
              </Button>
          </div>
        </>
      )}
    </main>
  );
};

export default ElectionStatus;
