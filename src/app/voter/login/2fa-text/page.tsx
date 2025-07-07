import Button from "@/components/Button";
import Image from "next/image";

import EnterOTPText from "@/app/assets/EnterOTPText.png";
import OtpInput from "@/components/OtpInput";
const Text2fa = () => {
  return (
    <main className=" flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
      <div className="text-center space-y-2">
        <p className="voterlogin-heading">Enter OTP</p>
        <p className="voterlogin-subheading">
          A One-Time Password (OTP) has been sent to your phone number{" "}
          <span className="text-primary">09 *** 89.</span> This code will
          authenticate your current session.
        </p>
      </div>

      <Image src={EnterOTPText} height={300} alt="BotoMoToLogo" />
      <div className="flex flex-col gap-2">
        {" "}
        <p className="voterlogin-label">One Time Password</p>
        <OtpInput length={4} />
      </div>

      <div className="flex flex-col gap-4 w-4/5 xs:w-auto">
        <Button variant="long_primary">Submit</Button>
        <Button variant="long_secondary">Cancel</Button>
      </div>
    </main>
  );
};

export default Text2fa;
