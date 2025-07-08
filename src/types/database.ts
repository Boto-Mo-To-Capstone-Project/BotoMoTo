// Database model interfaces (matching Prisma schema)
export interface PrismaUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: string;
  isApproved: boolean;
  organizationId?: number;
  organization?: PrismaOrganization;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaOrganization {
  id: number;
  name: string;
  description?: string;
  status: string;
  adminId: string;
  admin?: PrismaUser;
  users?: PrismaUser[];
  elections?: PrismaElection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaElection {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: string;
  organizationId: number;
  organization?: PrismaOrganization;
  candidates?: PrismaCandidate[];
  votes?: PrismaVote[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaCandidate {
  id: string;
  name: string;
  party: string;
  credentials: string;
  img: string;
  position: string;
  electionId: string;
  election?: PrismaElection;
  votes?: PrismaVote[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaVote {
  id: string;
  electionId: string;
  voterId: string;
  candidateId: string;
  position: string;
  election?: PrismaElection;
  voter?: PrismaUser;
  candidate?: PrismaCandidate;
  createdAt: Date;
}

export interface PrismaAuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  user?: PrismaUser;
  createdAt: Date;
}

export interface PrismaTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  userId: string;
  organizationId?: number;
  user?: PrismaUser;
  organization?: PrismaOrganization;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaSurvey {
  id: string;
  title: string;
  description: string;
  questions: Record<string, any>;
  organizationId: number;
  organization?: PrismaOrganization;
  responses?: PrismaSurveyResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaSurveyResponse {
  id: string;
  surveyId: string;
  userId: string;
  answers: Record<string, any>;
  survey?: PrismaSurvey;
  user?: PrismaUser;
  createdAt: Date;
}

// Database query result types
export interface UserWithOrganization {
  id: string;
  email: string;
  name: string;
  role: string;
  isApproved: boolean;
  organization: {
    id: number;
    name: string;
    status: string;
  } | null;
}

export interface ElectionWithCandidates {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: string;
  organization: {
    id: number;
    name: string;
  };
  candidates: Array<{
    id: string;
    name: string;
    party: string;
    credentials: string;
    img: string;
    position: string;
  }>;
}

export interface VoteResult {
  candidateId: string;
  candidateName: string;
  position: string;
  voteCount: number;
  percentage: number;
}

// Database transaction types
export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role: string;
  organizationId?: number;
}

export interface CreateOrganizationData {
  name: string;
  description?: string;
  adminId: string;
}

export interface CreateElectionData {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  organizationId: number;
}

export interface CreateCandidateData {
  name: string;
  party: string;
  credentials: string;
  img: string;
  position: string;
  electionId: string;
}
