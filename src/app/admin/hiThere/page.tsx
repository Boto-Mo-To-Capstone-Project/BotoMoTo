"use client";

import Image from "next/image";
import HiThereImage from "@/app/assets/hiThere.png";

export default function hiTherePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Heading */}
        <div>
          <p className="text-2xl font-semibold text-[var(--color-black)]">
            Hi there!
          </p>
          <p className="text-sm text-[var(--color-gray)]">
            Before you can use our voting system, 
            we just need to verify that your organization is legit. 
            This helps us keep things secure and running smoothly for everyone. 
            Thanks for understanding!
          </p>
        </div>

        {/* Image */}
        <div className="flex justify-center">
        <Image
        src={HiThereImage}
        alt="Hi there"
            className="w-[294.98px] h-[297px]"
          />
        </div>

        {/* Form */}
        <form className="space-y-4 text-left flex flex-col items-center">
          <div className="w-[380px]">
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full h-[44px] border border-[var(--color-secondary)] rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          {/* Send OTP Button */}
          <button
            type="submit"
            className="w-[380px] h-[44px] bg-[var(--color-primary)] hover:brightness-90 text-white rounded-md text-sm font-semibold"
          >
            Add Organization 
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            className="w-[380px] h-[44px] flex items-center justify-center border border-gray-300 rounded-md text-sm gap-2 hover:bg-gray-50"
          >
            Cancel
          </button>
        </form>
      </div>
    </main>
  );
}