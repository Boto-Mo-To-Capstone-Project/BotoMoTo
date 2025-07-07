"use client";

import Button from "@/components/Button";
import Image from "next/image";

import VotingClose from "@/app/assets/VotingClose.png";
import VotingOpen from "@/app/assets/VotingOpen.png"; // example image for open state

import { useRouter } from "next/navigation";

const ElectionStatus = () => {
  const isOpen = true; // condition if election is now open
  const router = useRouter(); // to go to another route

  return (
    <main className=" flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
      {isOpen ? (
        <>
          <div className="text-center space-y-2">
            <p className="voterlogin-heading">Voting is Now Open!</p>
            <p className="voterlogin-subheading">
              You can now vote in the election
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
              Please wait for further instructions or check your email for
              updates regarding the voting process.
            </p>
          </div>

          <Image src={VotingClose} height={300} alt="BotoMoToLogo" />

          <div className="pt-20 flex flex-col gap-4 w-4/5 xs:w-auto">
            <Button
              variant="long_secondary"
              onClick={() => router.push("/voter/election-terms-conditions")}
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
