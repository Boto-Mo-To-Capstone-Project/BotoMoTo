import { apiResponse } from "./apiResponse";

/**
 * Validates data against a Zod schema and returns a standardized API response on error.
 * Returns { success: true, data } if valid, or the error response if invalid.
 */
export function validateWithZod(schema: any, data: any) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessages = Object.values(result.error.format())
    .flatMap((err: any) => err?._errors ?? [])
    .filter(Boolean);
  return apiResponse({
    success: false,
    message: errorMessages.join('; ') || "Invalid data. Please check your input.",
    data: null,
    error: result.error.format(),
    status: 400
  });
}
