// Authentication and user-related interfaces
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization?: Organization;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: number;
  name: string;
  description?: string;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization?: {
    id: number;
    name: string;
    status: string;
  };
}

// Enums and constants
export type UserRole = "ADMIN" | "VOTER" | "SUPER_ADMIN";
export type OrganizationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";