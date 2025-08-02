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
  photoUrl: field.url("Photo URL"),
  letterUrl: field.url("Letter URL")
});

const electionSchema = z.object({
  name: field.string("Election name", { min: 3, max: 100 }),
  description: field.string("Election description", { min: 10, max: 500 }),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "CLOSED", "ARCHIVED"], {
    required_error: "Election status is required",
    invalid_type_error: "Invalid election status"
  }).default("DRAFT"),
  isLive: z.boolean().default(false),
  allowSurvey: z.boolean().default(false)
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
  logoUrl: field.url("Logo URL", { required: false }),
  description: field.string("Party description", { required: false, min: 5, max: 500 })
});

const votingScopeSchema = z.object({
  electionId: z.number().int().positive("Election ID must be a positive integer"),
  type: z.enum(["AREA", "LEVEL", "DEPARTMENT", "CUSTOM"], {
    required_error: "Voting scope type is required",
    invalid_type_error: "Invalid voting scope type"
  }),
  name: field.string("Voting scope name", { min: 2, max: 100 }),
  description: field.string("Voting scope description", { min: 5, max: 500 })
});

const votingScopeUpdateSchema = z.object({
  type: z.enum(["AREA", "LEVEL", "DEPARTMENT", "CUSTOM"], {
    required_error: "Voting scope type is required",
    invalid_type_error: "Invalid voting scope type"
  }),
  name: field.string("Voting scope name", { min: 2, max: 100 }),
  description: field.string("Voting scope description", { min: 5, max: 500 })
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
  type LoginSchema,
  type SignupSchema,
  type OrganizationSchema,
  type ElectionSchema,
  type UserSchema,
  type PartySchema,
  type VotingScopeSchema,
  type VotingScopeUpdateSchema
};
