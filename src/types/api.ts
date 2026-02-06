// API request and response interfaces
import { User, Organization } from "./auth";

// Generic API response wrapper
export type ApiResponse<T> = {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    details?: Record<string, unknown>;
};

// Pagination interfaces
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// User API interfaces
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: string;
  organizationId?: number;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: string;
  isApproved?: boolean;
}

export interface UserListResponse extends PaginatedResponse<User> {}

// Organization API interfaces
export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  adminId: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  status?: string;
}

export interface OrganizationListResponse
  extends PaginatedResponse<Organization> {}

// Election API interfaces
export interface Election {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED" | "ARCHIVED";
  organizationId: number;
  organization: Organization;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateElectionRequest {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  organizationId: number;
}

export interface UpdateElectionRequest {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface ElectionListResponse extends PaginatedResponse<Election> {}

// Voting API interfaces
export interface Vote {
  id: string;
  electionId: string;
  voterId: string;
  candidateId: string;
  position: string;
  createdAt: Date;
}

export interface SubmitVoteRequest {
  electionId: string;
  candidateId: string;
  position: string;
  voterCode: string;
}

// Error interfaces
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Search interfaces
export interface SearchParams {
  query: string;
  filters?: Record<string, unknown>;
  pagination?: PaginationParams;
}
