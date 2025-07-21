// Main types index - exports all interfaces
export * from "./api";
export * from "./auth";
export * from "./components";
export * from "./next-auth.d"

// Legacy types (keeping for backward compatibility)
export type Candidate = {
  name: string;
  party: string;
  credentials: string;
  img: string;
  position: string;
};
