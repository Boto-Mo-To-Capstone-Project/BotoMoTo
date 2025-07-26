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

// Types
type LoginSchema = z.infer<typeof loginSchema>;
type SignupSchema = z.infer<typeof signupSchema>;
type OrganizationSchema = z.infer<typeof organizationSchema>;

export {
  field,
  loginSchema,
  signupSchema,
  organizationSchema,
  type LoginSchema,
  type SignupSchema,
  type OrganizationSchema
};
