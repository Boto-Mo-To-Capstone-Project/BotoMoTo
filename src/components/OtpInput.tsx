"use client";

import React, { useState } from "react";

// Original OtpInput (internal state, default length=6)
interface OtpInputProps {
  length?: number;
}

const OtpInput = ({ length = 6 }: OtpInputProps) => {
  const [otp, setOtp] = useState(Array(length).fill(""));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const value = e.target.value;
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < length - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="flex gap-1 justify-center xs:gap-2">
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
          className="w-10 h-10 text-center text-secondary border border-secondary rounded-md text-dmd focus:outline-none focus:ring-2 focus:ring-primary xs:w-13 xs:h-15 xs:text-dxl"
        />
      ))}
    </div>
  );
};

// New OtpInputFour (controlled, for forgot password OTP, default length=4)
interface OtpInputFourProps {
  value: string[];
  onChange: (index: number, value: string) => void;
  length?: number;
}

export const OtpInputFour = ({
  value,
  onChange,
  length = 4,
}: OtpInputFourProps) => {
  return (
    <div className="flex gap-4 justify-center w-full max-w-[380px]">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          type="text"
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => onChange(index, e.target.value)}
          className="w-11 h-11 text-center border border-[var(--color-secondary)] text-[var(--color-secondary)] font-bold rounded-md text-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
        />
      ))}
    </div>
  );
};

export default OtpInput;
