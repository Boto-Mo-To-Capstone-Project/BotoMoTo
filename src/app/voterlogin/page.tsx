import Button from "@/components/Button";
import Image from "next/image";

import EnterVoterCode from "../assets/EnterVoterCode.png";
import OtpInput from "@/components/OtpInput";
const VoterLoginPage = () => {
  return (
    <main className=" flex flex-col items-center justify-center gap-10 px-10 py-20">
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
        <p className="voterlogin-label"> Enter Unique Code</p>
        <OtpInput length={6} />
      </div>

      <div className="flex flex-col gap-4 w-4/5 xs:w-auto">
        <Button variant="long_primary">Submit</Button>
        <Button variant="long_secondary">Cancel</Button>
      </div>
    </main>
  );
};

export default VoterLoginPage;
