// Helper function to format API responses consistently
import { NextResponse } from "next/server";

/**
 * Formats and returns a standardized API response.
 * @param success - Indicates if the request was successful.
 * @param message - A human-readable message about the response.
 * @param data - The response data (default: null).
 * @param error - Error details if any (default: null).
 * @param status - HTTP status code (default: 200).
 */
export function apiResponse({
  success,
  message,
  data = null,
  error = null,
  status = 200
}: {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
  status?: number;
}) {
  // Return a JSON response with a consistent structure
  return NextResponse.json(
    { success, message, data, error, status },
    { status }
  );
}
