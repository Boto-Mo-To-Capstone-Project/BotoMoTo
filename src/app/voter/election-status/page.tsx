"use client";

import { useState, useEffect } from "react";
import Button from "@/components/Button";
import Image from "next/image";

import VotingClose from "@/app/assets/VotingClose.png";
import VotingOpen from "@/app/assets/VotingOpen.png"; // example image for open state

import { useRouter } from "next/navigation";

const ElectionStatus = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [voterData, setVoterData] = useState<any>(null);
  const [error, setError] = useState("");
  const router = useRouter(); // to go to another route

  useEffect(() => {
    const checkElectionStatus = () => {
      try {
        // Get voter data from localStorage
        const storedData = localStorage.getItem("voterData");
        
        if (!storedData) {
          // If no voter data, redirect back to login
          router.push("/voter/login");
          return;
        }

        const data = JSON.parse(storedData);
        setVoterData(data);

        // Check if election is open based on the election data
        const election = data.election;
        
        // Check election status
        if (election.status !== "ACTIVE") {
          setIsOpen(false);
          setIsLoading(false);
          return;
        }

        // Check if election is live
        if (!election.isLive) {
          setIsOpen(false);
          setIsLoading(false);
          return;
        }

        // Check election schedule if available
        if (election.schedule) {
          const now = new Date();
          const startDate = new Date(election.schedule.dateStart);
          const endDate = new Date(election.schedule.dateFinish);

          if (now >= startDate && now <= endDate) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        } else {
          // If no schedule but election is active and live, consider it open
          setIsOpen(true);
        }

      } catch (err) {
        setError("Failed to load election status");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    checkElectionStatus();
  }, [router]);

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
        <p>Loading election status...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
        <p className="text-red-500">{error}</p>
        <Button
          variant="long_secondary"
          onClick={() => router.push("/voter/login")}
        >
          Return to Login
        </Button>
      </main>
    );
  }

  return (
    <main className=" flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
      {isOpen ? (
        <>
          <div className="text-center space-y-2">
            <p className="voterlogin-heading">Voting is Now Open!</p>
            <p className="voterlogin-subheading">
              You're voting in the {voterData?.election?.name || '2025 Election'}
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
          </div>
        </>
      ) : (
        <>
          <div className="text-center space-y-2">
            <p className="voterlogin-heading">Voting is still closed.</p>
            <p className="voterlogin-subheading">
              The {voterData?.election?.name || '2025 Election'} is not currently active. Please wait for further instructions or check your email for updates regarding the voting process.
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
