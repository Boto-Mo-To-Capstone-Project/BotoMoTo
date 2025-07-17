// System roles
export const ROLES = {
  VOTER: "VOTER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

// Organization statuses
export const ORGANIZATION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
} as const;

// Election statuses
export const ELECTION_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  CLOSED: "CLOSED",
  ARCHIVED: "ARCHIVED",
} as const;

// Ticket statuses
export const TICKET_STATUS = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;

// Route permissions (reflects latest route structure)
export const ROUTE_PERMISSIONS = {
  PUBLIC: [
    "/", "/login", "/signup", "/about-us", "/contact",
    "/forgotpassword", "/forgotpasswordOTP", "/hiThere"
  ],
  ADMIN: [
    "/admin",
    "/admin/dashboard",
    "/admin/organizations",
    "/admin/elections",
    "/admin/voters",
    "/admin/candidates",
    "/admin/positions",
    "/admin/reports",
    "/admin/settings",
    "/admin/profile",
    "/admin/onboard", // Onboarding landing
    "/admin/onboard/add-org", // Create org
    "/admin/onboard/processing", // Approval pending
    "/organization/create", // Only for admins without org
    "/pending-approval", // Only for admins with pending org
  ],
  SUPER_ADMIN: [
    "/superadmin",
    "/superadmin/dashboard",
    "/superadmin/dashboard/org-request",
    "/superadmin/dashboard/elections",
    "/superadmin/dashboard/tickets",
    "/superadmin/dashboard/audits",
    "/superadmin/dashboard/survey-form",
    "/superadmin/organizations",
    "/superadmin/elections",
    "/superadmin/tickets",
    "/superadmin/audits",
    "/superadmin/surveys",
    "/superadmin/users",
    "/superadmin/system-settings",
    "/superadmin/analytics",
    "/superadmin/logs",
  ],
  VOTER: [
    "/voter/login",
    "/voter/login/2fa-email",
    "/voter/login/2fa-otp",
    "/voter/login/2fa-passphrase",
    "/voter/login/2fa-text",
    "/voter/election-status",
    "/voter/election-terms-conditions",
    "/voter/ballot-form",
    "/voter/receipt-form",
    "/voter/survey-form",
    "/voter/live-dashboard",
  ],
  ONBOARDING: [
    "/admin/onboard",
    "/admin/onboard/add-org",
    "/admin/onboard/processing",
    "/admin/onboard/success",
    "/organization/welcome",
    "/organization/create"
  ],
} as const;

// File upload limits
export const FILE_LIMITS = {
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  CSV_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  PDF_MAX_SIZE: 20 * 1024 * 1024, // 20MB
} as const;

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  IMAGES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  CSV: ["text/csv"],
  PDF: ["application/pdf"],
} as const;

// Audit actions (sync with Prisma schema)
export const AUDIT_ACTIONS = {
  CREATE: "CREATE",
  READ: "READ",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  VOTE: "VOTE",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  UPLOAD: "UPLOAD",
} as const;

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "You are not authorized to access this resource.",
  FORBIDDEN: "Access denied. You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION_ERROR: "Please check your input and try again.",
  SERVER_ERROR: "An unexpected error occurred. Please try again later.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  ACCOUNT_LOCKED: "Your account has been locked. Please contact support.",
  MFA_REQUIRED: "Multi-factor authentication is required.",
  INVALID_MFA_CODE: "Invalid MFA code. Please try again.",
  VOTER_CODE_INVALID: "Invalid voter code. Please check and try again.",
  ELECTION_CLOSED: "This election is currently closed.",
  ALREADY_VOTED: "You have already voted in this election.",
  VOTE_LIMIT_EXCEEDED: "You have exceeded the vote limit for this position.",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Successfully logged in.",
  LOGOUT_SUCCESS: "Successfully logged out.",
  REGISTRATION_SUCCESS: "Registration successful. Please wait for approval.",
  ORGANIZATION_CREATED: "Organization created successfully. Pending approval.",
  ORGANIZATION_APPROVED: "Organization approved successfully.",
  ELECTION_CREATED: "Election created successfully.",
  VOTER_REGISTERED: "Voter registered successfully.",
  VOTE_SUBMITTED: "Vote submitted successfully.",
  TICKET_CREATED: "Support ticket created successfully.",
  SETTINGS_UPDATED: "Settings updated successfully.",
} as const;

// Default pagination
export const DEFAULT_PAGINATION = {
  PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

// Session settings
export const SESSION_SETTINGS = {
  MAX_AGE: 30 * 24 * 60 * 60, // 30 days
  UPDATE_AGE: 24 * 60 * 60, // 24 hours
} as const;

// Helper functions for route permissions (unchanged)
export const canAccessRoute = (
  userRole: string,
  pathname: string,
  userState?: {
    hasOrganization?: boolean;
    isApproved?: boolean;
  }
): boolean => {
  if (ROUTE_PERMISSIONS.PUBLIC.some((route) => pathname === route)) return true;
  if (userRole === ROLES.SUPER_ADMIN)
    return ROUTE_PERMISSIONS.SUPER_ADMIN.some((route) => pathname.startsWith(route));
  if (userRole === ROLES.ADMIN) {
    if (pathname === "/organization/create" && !userState?.hasOrganization) return true;
    if (pathname === "/pending-approval" && userState?.hasOrganization && !userState?.isApproved) return true;
    if (userState?.hasOrganization && userState?.isApproved)
      return ROUTE_PERMISSIONS.ADMIN.some((route) => pathname.startsWith(route));
  }
  if (userRole === ROLES.VOTER)
    return ROUTE_PERMISSIONS.VOTER.some((route) => pathname.startsWith(route));
  return false;
};

export const getRedirectPath = (
  userRole: string,
  userState?: {
    hasOrganization?: boolean;
    isApproved?: boolean;
  }
): string => {
  if (userRole === ROLES.SUPER_ADMIN) return "/superadmin/dashboard";
  if (userRole === ROLES.ADMIN) {
    if (!userState?.hasOrganization) return "/organization/create";
    if (!userState?.isApproved) return "/pending-approval";
    return "/admin/dashboard";
  }
  if (userRole === ROLES.VOTER) return "/voter/login";
  return "/login";
};
