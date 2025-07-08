// Authentication and user-related interfaces
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isApproved: boolean;
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
  isApproved: boolean;
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

// Authentication state
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Login/Registration forms
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  organizationName?: string;
  organizationDescription?: string;
}

export interface MFAFormData {
  code: string;
  method: "email" | "otp" | "passphrase" | "text";
}
