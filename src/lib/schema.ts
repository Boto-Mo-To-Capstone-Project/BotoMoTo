// import { z } from "zod";

// const schema = z.object({
//   email: z.string().email(),
//   password: z.string().min(8),
// });

// type Schema = z.infer<typeof schema>;

// export { schema, type Schema };


import { z } from "zod";

// Login schema and type
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type LoginSchema = z.infer<typeof loginSchema>;

// Signup schema and type
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type SignupSchema = z.infer<typeof signupSchema>;

// Export all in one go
export {
  loginSchema,
  signupSchema,
  type LoginSchema,
  type SignupSchema,
};