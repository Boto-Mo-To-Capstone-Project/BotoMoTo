"use client"; // useRouter needs a client component

import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Image from "next/image";

import EnterVoterCode from "@/app/assets/EnterVoterCode.png";
import OtpInput from "@/components/OtpInput";
const VoterLoginPage = () => {
  const router = useRouter(); // to go to another route

  return (
    <main className=" flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
      <div className="text-center space-y-2">
        <p className="voterlogin-heading">Enter Voter Code</p>
        <p className="voterlogin-subheading">
          Enter your Voter Unique Code to continue. Check your{" "}
          <span className="text-primary">email</span> app to find your unique
          code.
        </p>
      </div>

      <Image src={EnterVoterCode} height={300} alt="BotoMoToLogo" />
      <div className="flex flex-col gap-2">
        {" "}
        <p className="voterlogin-label">Enter Unique Code</p>
        <OtpInput length={6} />
      </div>

      <div className="flex flex-col gap-4 w-4/5 xs:w-auto">
        <Button
          variant="long_primary"
          onClick={() => router.push("/voter/election-status")}
        >
          Submit
        </Button>
        <Button variant="long_secondary">Cancel</Button>
      </div>
    </main>
  );
};

export default VoterLoginPage;
