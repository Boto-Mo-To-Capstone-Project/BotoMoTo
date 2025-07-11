"use client";

import React from "react";

interface OtpInputProps {
  value: string[];
  onChange: (index: number, value: string) => void;
  length?: number;
}

const OtpInput = ({ value, onChange, length = 4 }: OtpInputProps) => {
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
