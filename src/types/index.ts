// Main types index - exports all interfaces
export * from "./auth";
export * from "./api";
export * from "./components";
export * from "./database";

// Legacy types (keeping for backward compatibility)
export type Candidate = {
  name: string;
  party: string;
  credentials: string;
  img: string;
  position: string;
};
