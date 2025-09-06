"use client";

import Button from "@/components/Button";
import Image from "next/image";

import EnterEmail from "@/app/assets/EnterEmail.png";
import { InputField } from "@/components/InputField";
import { useState } from "react";

const Email2fa = () => {
  const [email, setEmail] = useState("");

  return (
    <main className=" flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
      <div className="text-center space-y-2">
        <p className="voterlogin-heading">Enter your email</p>
        <p className="voterlogin-subheading">
          Enter your email address that is registered on BotoMoTo.
        </p>
      </div>

      <Image src={EnterEmail} height={300} alt="BotoMoToLogo" />
      <div className="flex flex-col gap-2">
        <InputField
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
      </div>

      <div className="flex flex-col gap-4 w-4/5 xs:w-auto">
        <Button variant="long_primary">Submit</Button>
        <Button variant="long_secondary">Cancel</Button>
      </div>
    </main>
  );
};

export default Email2fa;
