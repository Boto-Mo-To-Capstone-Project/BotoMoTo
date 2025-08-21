// Main types index - exports all interfaces
export * from "./api";
export * from "./auth";
export * from "./components";
export * from "./next-auth.d"

// Legacy types (keeping for backward compatibility)
export type Candidate = {
  id: string;
  name: string;
  party: string;
  partyColor: string;
  credentials: string;
  credentialsUrl?: string; // URL to credentials file (PDF, etc.)
  img: string;
  position: string;
};
