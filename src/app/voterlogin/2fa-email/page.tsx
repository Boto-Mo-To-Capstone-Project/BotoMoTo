import Button from "@/components/Button";
import Image from "next/image";

import EnterEmail from "../../assets/EnterEmail.png";
import OtpInput from "@/components/OtpInput";
const Email2fa = () => {
  return (
    <main className=" flex flex-col items-center justify-center gap-10 px-10 py-20">
      <div className="text-center space-y-2">
        <p className="voterlogin-heading">Enter your email</p>
        <p className="voterlogin-subheading">
          Enter your email address or log in with Google to verify that the
          email we sent belongs to you.
        </p>
      </div>

      <Image src={EnterEmail} height={300} alt="BotoMoToLogo" />
      <div className="flex flex-col gap-2">
        {" "}
        <p className="voterlogin-label">Email Address TEXT INPUT</p>
        <OtpInput length={4} />
      </div>

      <div className="flex flex-col gap-4 w-4/5 xs:w-auto">
        <Button variant="long_primary">Submit</Button>
        <Button variant="long_secondary">Cancel</Button>
      </div>
    </main>
  );
};

export default Email2fa;
