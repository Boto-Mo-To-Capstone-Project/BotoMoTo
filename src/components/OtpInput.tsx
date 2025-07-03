"use client";

import { useState } from "react";

type OtpInputProps = {
  length?: number; // prop to customize number of input
};

const OtpInput = ({ length = 6 }: OtpInputProps) => {
  const [otp, setOtp] = useState(Array(length).fill(""));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const value = e.target.value;

    // Allow only single digit 0-9
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move focus to next input automatically
    if (value && index < length - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {otp.map((digit, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          placeholder="0"
          onChange={(e) => handleChange(e, i)}
          className="w-12 h-12 text-center text-secondary border border-secondary rounded-md text-dlg focus:outline-none focus:ring-2 focus:ring-primary md:w-13 md:h-15 md:text-dxl"
        />
      ))}
    </div>
  );
};

export default OtpInput;
