import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { hash } from "bcryptjs";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { signupSchema } from "@/lib/schema";

export async function POST(request: NextRequest) {
  try {
    // parse request body
    const body = await request.json();
    console.log('Signup API request:', body);

    // Validate input using Zod schema and helper
    const validation = validateWithZod(signupSchema, body);
    if (!('data' in validation)) return validation;
    const { name, email, password } = validation.data;

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return apiResponse({
        success: false,
        message: "User already exists",
        data: null,
        error: null,
        status: 400
      });
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user with ADMIN role (default for signup)
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: ROLES.ADMIN,
      },
    });

    // Create audit log
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const audit = await db.audits.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: "CREATE",
        ipAddress,
        userAgent,
        resource: "user",
        resourceId: user.id,
        details: {
          email: user.email,
          signupMethod: "credentials",
        },
      },
    });

    console.log('Signup API success:', { userId: user.id, email: user.email });
    // Success response with user data and audit log
    return apiResponse({
      success: true,
      message: "User created successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        audit,
      },
      error: null,
      status: 201
    });
  } catch (error) {
    // Error response with error details (no stack trace)
    console.error("Signup error:", error);
    return apiResponse({
      success: false,
      message: "Failed to create user",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
