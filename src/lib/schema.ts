import { z } from "zod";

// Simplified field helpers with customizable messages
const field = {
  string: (name: string, options?: {
    required?: boolean;
    min?: number;
    max?: number;
    messages?: {
      required?: string;
      invalid?: string;
      min?: string;
      max?: string;
    }
  }) => {
    let schema = z.string({
      required_error: options?.messages?.required ?? `${name} is required`,
      invalid_type_error: options?.messages?.invalid ?? `${name} must be a string`,
    });

    if (options?.min !== undefined) {
      schema = schema.min(options.min, {
        message: options?.messages?.min ?? `${name} must be at least ${options.min} characters`
      });
    }

    if (options?.max !== undefined) {
      schema = schema.max(options.max, {
        message: options?.messages?.max ?? `${name} must be at most ${options.max} characters`
      });
    }

    return options?.required === false ? schema.optional() : schema;
  },

  email: (name: string, options?: {
    required?: boolean;
    messages?: {
      required?: string;
      invalid?: string;
    }
  }) => {
    let schema = z.string({
      required_error: options?.messages?.required ?? `${name} is required`,
      invalid_type_error: options?.messages?.invalid ?? `${name} must be a string`,
    });

    schema = schema.email({
      message: options?.messages?.invalid ?? `${name} must be a valid email address`
    });

    return options?.required === false ? schema.optional() : schema;
  },

  url: (name: string, options?: {
    required?: boolean;
    messages?: {
      required?: string;
      invalid?: string;
    }
  }) => {
    let schema = z.string({
      required_error: options?.messages?.required ?? `${name} is required`,
      invalid_type_error: options?.messages?.invalid ?? `${name} must be a string`,
    });

    schema = schema.url({
      message: options?.messages?.invalid ?? `${name} must be a valid URL`
    });

    return options?.required === false ? schema.optional() : schema;
  },

  number: (name: string, options?: {
    required?: boolean;
    min?: number;
    max?: number;
    messages?: {
      required?: string;
      invalid?: string;
      min?: string;
      max?: string;
    }
  }) => {
    let schema = z.number({
      required_error: options?.messages?.required ?? `${name} is required`,
      invalid_type_error: options?.messages?.invalid ?? `${name} must be a number`,
    });

    if (options?.min !== undefined) {
      schema = schema.min(options.min, {
        message: options?.messages?.min ?? `${name} must be at least ${options.min}`
      });
    }

    if (options?.max !== undefined) {
      schema = schema.max(options.max, {
        message: options?.messages?.max ?? `${name} must be at most ${options.max}`
      });
    }

    return options?.required === false ? schema.optional() : schema;
  },

  password: (name: string, options?: {
    messages?: {
      required?: string;
      invalid?: string;
      min?: string;
      uppercase?: string;
      lowercase?: string;
      number?: string;
      special?: string;
    }
  }) => {
    let schema = z.string({
      required_error: options?.messages?.required ?? `${name} is required`,
      invalid_type_error: options?.messages?.invalid ?? `${name} must be a string`,
    });

    schema = schema
      .min(8, { message: options?.messages?.min ?? `${name} must be at least 8 characters` })
      .regex(/[A-Z]/, { message: options?.messages?.uppercase ?? `${name} must contain at least one uppercase letter` })
      .regex(/[a-z]/, { message: options?.messages?.lowercase ?? `${name} must contain at least one lowercase letter` })
      .regex(/[0-9]/, { message: options?.messages?.number ?? `${name} must contain at least one number` })
      .regex(/[^A-Za-z0-9]/, { message: options?.messages?.special ?? `${name} must contain at least one special character` });

    return schema;
  }
};

// Example schemas with clean syntax
const loginSchema = z.object({
  email: field.email("Email"),
  password: field.password("Password")
});

const signupSchema = z.object({
  name: field.string("Name", { min: 5 }),
  email: field.email("Email"),
  password: field.password("Password")
});

const organizationSchema = z.object({
  name: field.string("Organization name", { min: 5 }),
  email: field.email("Organization email"),
  membersCount: field.number("Members count", { min: 1 }),
  logoObjectKey: field.string("Logo object key", { required: false }),
  logoProvider: field.string("Logo provider", { required: false }),
  letterObjectKey: field.string("Letter object key", { required: false }),
  letterProvider: field.string("Letter provider", { required: false }),
  adminId: field.string("Admin ID", { required: false }) // Optional for superadmin use
});

const electionSchema = z.object({
  name: field.string("Election name", { min: 3, max: 100 }),
  description: field.string("Election description", { min: 10, max: 500 }),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"], {
    required_error: "Election status is required",
    invalid_type_error: "Invalid election status"
  }).default("DRAFT"),
  
  // Template fields
  isTemplate: z.boolean().default(false),
  templateId: z.number().int().positive("Template ID must be a positive integer").optional(),
  instanceYear: z.number().int().min(2020).max(2050).optional(),
  instanceName: field.string("Instance name", { min: 2, max: 100, required: false }),
  
  // Optional schedule fields to allow flexible payloads; validated in route handlers
  startDate: z.union([z.string(), z.date()]).optional(),
  endDate: z.union([z.string(), z.date()]).optional(),
  schedule: z.object({
    dateStart: z.union([z.string(), z.date()]),
    dateFinish: z.union([z.string(), z.date()]),
  }).partial().optional(),
});

const userSchema = z.object({
  name: field.string("Name", { min: 2, max: 100 }),
  email: field.email("Email"),
  role: z.enum(["VOTER", "ADMIN", "SUPER_ADMIN"], {
    required_error: "User role is required",
    invalid_type_error: "Invalid user role"
  }),
  password: field.string("Password", { required: false, min: 8 })
});

const partySchema = z.object({
  name: field.string("Party name", { min: 2, max: 100 }),
  color: field.string("Party color", { min: 3, max: 7 }), // For hex colors like #FF0000
});

const votingScopeSchema = z.object({
  electionId: z.number().int().positive("Election ID must be a positive integer"),
  name: field.string("Voting scope name", { min: 2, max: 100 }),
  description: field.string("Voting scope description", { min: 5, max: 500 })
});

const votingScopeUpdateSchema = z.object({
  name: field.string("Voting scope name", { min: 2, max: 100 }),
  description: field.string("Voting scope description", { min: 5, max: 500 })
});

const positionSchema = z.object({
  electionId: z.number().int().positive("Election ID must be a positive integer"),
  name: field.string("Position name", { min: 2, max: 100 }),
  voteLimit: z.number().int().min(1, "Vote limit must be at least 1").default(1),
  numOfWinners: z.number().int().min(1, "Number of winners must be at least 1").default(1),
  votingScopeId: z.number().int().positive("Voting scope ID must be a positive integer").optional().nullable(),
  order: z.number().int().min(0, "Order must be non-negative").default(0)
});

const positionUpdateSchema = z.object({
  name: field.string("Position name", { min: 2, max: 100 }),
  voteLimit: z.number().int().min(1, "Vote limit must be at least 1").default(1),
  numOfWinners: z.number().int().min(1, "Number of winners must be at least 1").default(1),
  votingScopeId: z.number().int().positive("Voting scope ID must be a positive integer").optional().nullable(),
  order: z.number().int().min(0, "Order must be non-negative").default(0)
});

const voterSchema = z.object({
  electionId: z.number().int().positive("Election ID must be a positive integer"),
  email: field.email("Email", { required: true }),
  firstName: field.string("First name", { min: 2, max: 50 }),
  middleName: field.string("Middle name", { required: false, min: 1, max: 50 }),
  lastName: field.string("Last name", { min: 2, max: 50 }),
  votingScopeId: z.number().int().positive("Voting scope ID must be a positive integer").optional(),
  isActive: z.boolean().default(true)
});

const voterUpdateSchema = z.object({
  email: field.email("Email", { required: true }),
  firstName: field.string("First name", { min: 2, max: 50 }),
  middleName: field.string("Middle name", { required: false, min: 1, max: 50 }),
  lastName: field.string("Last name", { min: 2, max: 50 }),
  votingScopeId: z.number().int().positive("Voting scope ID must be a positive integer").optional(),
  isActive: z.boolean().default(true)
});

const voterBulkUploadSchema = z.object({
  electionId: z.number().int().positive("Election ID must be a positive integer"),
  voters: z.array(z.object({
    email: field.email("Email", { required: true }),
    firstName: field.string("First name", { min: 2, max: 50 }),
    middleName: field.string("Middle name", { required: false, min: 1, max: 50 }),
    lastName: field.string("Last name", { min: 2, max: 50 }),
    votingScopeId: z.number().int().positive("Voting scope ID must be a positive integer").optional(),
  })).min(1, "At least one voter is required")
});

// Candidate Creation Schema
const candidateSchema = z.object({
  electionId: z.number().int().positive("Election ID must be a positive integer"),
  voterId: z.number().int().positive("Voter ID must be a positive integer"),
  positionId: z.number().int().positive("Position ID must be a positive integer"),
  partyId: z.number().int().positive("Party ID must be a positive integer").nullable().optional(),
  // Storage-agnostic fields replacing direct URLs
  imageObjectKey: field.string("Image object key", { required: false }),
  imageProvider: field.string("Image provider", { required: false }),
  credentialObjectKey: field.string("Credential object key", { required: false }),
  credentialProvider: field.string("Credential provider", { required: false }),
});

// Candidate Update Schema
const candidateUpdateSchema = z.object({
  positionId: z.number().int().positive("Position ID must be a positive integer").optional(),
  partyId: z.number().int().positive("Party ID must be a positive integer").nullable().optional(),
  // Allow updates to object keys / provider when replacing files
  imageObjectKey: field.string("Image object key", { required: false }),
  imageProvider: field.string("Image provider", { required: false }),
  credentialObjectKey: field.string("Credential object key", { required: false }),
  credentialProvider: field.string("Credential provider", { required: false }),
  bio: field.string("Biography", { required: false, max: 1000 }),
});

// Survey Form Creation Schema
const surveyFormCreateSchema = z.object({
  title: field.string("Survey title", { min: 1, max: 200 }),
  description: field.string("Survey description", { required: false, max: 1000 }).default(""),
  formSchema: z.any(), // Store full builder schema as JSON
  isActive: z.boolean().default(false), // false = draft, true = published
});

const surveyFormUpdateSchema = z.object({
  title: field.string("Survey title", { required: false, min: 1, max: 200 }),
  description: field.string("Survey description", { required: false, max: 1000 }),
  formSchema: z.any().optional(),
  isActive: z.boolean().optional(),
});

// Types
type LoginSchema = z.infer<typeof loginSchema>;
type SignupSchema = z.infer<typeof signupSchema>;
type OrganizationSchema = z.infer<typeof organizationSchema>;
type ElectionSchema = z.infer<typeof electionSchema>;
type UserSchema = z.infer<typeof userSchema>;
type PartySchema = z.infer<typeof partySchema>;
type VotingScopeSchema = z.infer<typeof votingScopeSchema>;
type VotingScopeUpdateSchema = z.infer<typeof votingScopeUpdateSchema>;
type PositionSchema = z.infer<typeof positionSchema>;
type PositionUpdateSchema = z.infer<typeof positionUpdateSchema>;
type VoterSchema = z.infer<typeof voterSchema>;
type VoterUpdateSchema = z.infer<typeof voterUpdateSchema>;
type VoterBulkUploadSchema = z.infer<typeof voterBulkUploadSchema>;
type CandidateSchema = z.infer<typeof candidateSchema>;
type CandidateUpdateSchema = z.infer<typeof candidateUpdateSchema>;
type SurveyFormCreateSchema = z.infer<typeof surveyFormCreateSchema>;
type SurveyFormUpdateSchema = z.infer<typeof surveyFormUpdateSchema>;

export {
  field,
  loginSchema,
  signupSchema,
  organizationSchema,
  electionSchema,
  userSchema,
  partySchema,
  votingScopeSchema,
  votingScopeUpdateSchema,
  positionSchema,
  positionUpdateSchema,
  voterSchema,
  voterUpdateSchema,
  voterBulkUploadSchema,
  candidateSchema,
  candidateUpdateSchema,
  surveyFormCreateSchema,
  surveyFormUpdateSchema,
  type LoginSchema,
  type SignupSchema,
  type OrganizationSchema,
  type ElectionSchema,
  type UserSchema,
  type PartySchema,
  type VotingScopeSchema,
  type VotingScopeUpdateSchema,
  type PositionSchema,
  type PositionUpdateSchema,
  type VoterSchema,
  type VoterUpdateSchema,
  type VoterBulkUploadSchema,
  type CandidateSchema,
  type CandidateUpdateSchema,
  type SurveyFormCreateSchema,
  type SurveyFormUpdateSchema,
};
