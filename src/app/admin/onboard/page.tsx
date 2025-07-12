"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import HiThereImage from "@/app/assets/hiThere.png";

import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthFooter } from "@/components/AuthFooter";
import { ErrorMessage } from "@/components/ErrorMessage";

export default function HiTherePage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // TODO: Implement organization verification logic
      console.log("Adding organization with email:", email);
      // For now, just simulate success
      router.push("/admin/dashboard");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/dashboard");
  };

  return (
    <main className="min-h-screen flex justify-center items-center px-2 bg-[var(--background)] text-[var(--foreground)] pt-40 pb-40">
      <div className="w-full max-w-[380px] mx-auto text-center space-y-6 pt-10 pb-10 px-4">
        
        <AuthHeading
          title="Hi there!"
          subtitle="Before you can use our voting system, we just need to verify that your organization is legit. This helps us keep things secure and running smoothly for everyone. Thanks for understanding!"
        />

        {error && <ErrorMessage message={error} />}

        {/* Image */}
        <div className="flex justify-center">
          <Image
            src={HiThereImage}
            alt="Hi there"
            className="w-[294.98px] h-[297px]"
          />
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 text-left flex flex-col items-center w-full"
        >
          <InputField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
          />

          <SubmitButton label="Add Organization" isLoading={isLoading} className="w-full" />

          {/* Cancel Button */}
          <button
            type="button"
            onClick={handleCancel}
            className="w-full max-w-[380px] h-[44px] flex items-center justify-center border border-gray-300 rounded-md text-sm gap-2 hover:bg-gray-50"
          >
            Cancel
          </button>
        </form>

        <AuthFooter
          question="Need help?"
          link="/contact"
          linkText="Contact Support"
        />
      </div>
    </main>
  );
}