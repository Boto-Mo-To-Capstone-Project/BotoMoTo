import Button from "@/components/Button";
import Image from "next/image";

import EnterOTP from "../../assets/EnterOTP.png";
import OtpInput from "@/components/OtpInput";

const OTP2fa = () => {
  return (
    <main className=" flex flex-col items-center justify-center gap-10 px-10 py-20">
      <div className="text-center space-y-2">
        <p className="voterlogin-heading">Enter OTP</p>
        <p className="voterlogin-subheading">
          Enter your One Time Password (OTP) to continue. Check your{" "}
          <span className="text-primary">email</span> app for the One Time
          Password (OTP) which will be serve as your credentials for this
          session.
        </p>
      </div>

      <Image src={EnterOTP} height={300} alt="BotoMoToLogo" />
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

export default OTP2fa;
