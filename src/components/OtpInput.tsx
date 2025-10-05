"use client";

import React, { useState } from "react";

// Simple OtpInput component with internal state (uncontrolled mode)
interface OtpInputProps {
  length?: number;
  onChange?: (value: string) => void;
}

const OtpInput = ({ 
  length = 6, 
  onChange
}: OtpInputProps) => {
  // Internal state
  const [otp, setOtp] = useState(Array(length).fill(""));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const inputValue = e.target.value;
    if (!/^[0-9]?$/.test(inputValue)) return;
    
    const newOtp = [...otp];
    newOtp[index] = inputValue;
    setOtp(newOtp);
    
    if (onChange) {
      onChange(newOtp.join(""));
    }
    
    // Auto-focus next input if value is entered
    if (inputValue && index < length - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    // Handle backspace
    if (e.key === "Backspace") {
      if (otp[index]) {
        // If current field has value, clear it
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
        if (onChange) {
          onChange(newOtp.join(""));
        }
      } else if (index > 0) {
        // If current field is empty, move to previous field and clear it
        const prevInput = document.getElementById(`otp-${index - 1}`);
        prevInput?.focus();
        
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        if (onChange) {
          onChange(newOtp.join(""));
        }
      }
    }
    
    // Handle Enter key - move to next field or trigger submission if complete
    if (e.key === "Enter") {
      if (index < length - 1) {
        // Move to next field
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      } else {
        // If on last field and OTP is complete, trigger submission
        const otpString = otp.join("");
        if (otpString.length === length) {
          // Find and click submit button if it exists
          const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
          if (submitButton) {
            submitButton.click();
          } else {
            // Look for button with "Submit" text
            const buttons = document.querySelectorAll('button');
            const submitBtn = Array.from(buttons).find(btn => 
              btn.textContent?.toLowerCase().includes('submit') || 
              btn.textContent?.toLowerCase().includes('verify')
            );
            if (submitBtn) {
              (submitBtn as HTMLButtonElement).click();
            }
          }
        }
      }
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number
  ) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    
    // Extract only numbers from pasted data
    const numbers = pastedData.replace(/\D/g, "");
    
    if (numbers.length === 0) return;
    
    // Fill from current index up to the length limit
    const maxFillCount = Math.min(numbers.length, length - index);
    
    const newOtp = [...otp];
    for (let i = 0; i < maxFillCount; i++) {
      newOtp[index + i] = numbers[i];
    }
    setOtp(newOtp);
    if (onChange) {
      onChange(newOtp.join(""));
    }
    
    // Focus the next empty field or the last field
    const nextIndex = Math.min(index + maxFillCount, length - 1);
    const nextInput = document.getElementById(`otp-${nextIndex}`);
    nextInput?.focus();
  };

  return (
    <div className="flex gap-2 justify-between w-full max-w-[380px]">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          id={`otp-${index}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={otp[index] || ""}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={(e) => handlePaste(e, index)}
          className="w-9 xs:w-11 h-11 text-center border border-[var(--color-secondary)] text-[var(--color-secondary)] font-bold rounded-md text-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
        />
      ))}
    </div>
  );
};

export default OtpInput;
