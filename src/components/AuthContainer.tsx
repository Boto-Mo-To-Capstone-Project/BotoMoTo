import React from "react";

export default function AuthContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[380px] mx-auto text-center space-y-4 md:space-y-6 px-4">
      {children}
    </div>
  );
} 