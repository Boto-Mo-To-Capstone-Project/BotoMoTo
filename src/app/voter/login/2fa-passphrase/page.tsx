"use client";
import Button from "@/components/Button";
import Image from "next/image";

import EnterPassphrase from "@/app/assets/EnterPassphrase.png";
import OtpInput from "@/components/OtpInput";
import { InputField } from "@/components/InputField";
import { useState } from "react";

const Passphrase2fa = () => {
  const [passphrase, setPassphrase] = useState("");

  return (
    <main className=" flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
      <div className="text-center space-y-2">
        <p className="voterlogin-heading">Enter passphrase</p>
        <p className="voterlogin-subheading">
          Enter your Passphrase to continue. This was sent to your{" "}
          <span className="text-primary">email</span> and will serve as your
          authentication for this session.
        </p>
      </div>

      <Image src={EnterPassphrase} height={300} alt="BotoMoToLogo" />
      <div className="flex flex-col gap-2">
        <InputField
          label="Passphrase"
          type="text"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Enter passphrase"
        />
      </div>

      <div className="flex flex-col gap-4 w-4/5 xs:w-auto">
        <Button variant="long_primary">Submit</Button>
        <Button variant="long_secondary">Cancel</Button>
      </div>
    </main>
  );
};

export default Passphrase2fa;
