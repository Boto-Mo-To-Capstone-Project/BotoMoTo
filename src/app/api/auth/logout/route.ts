import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(request: NextRequest) {
  try {
    let userId = null;
    let userRole = null;
    console.log('Logout API request');
    const authToken = request.cookies.get("auth_token")?.value;
    if (authToken) {
      try {
        const decoded = jwt.verify(authToken, JWT_SECRET);
        if (typeof decoded === "object" && decoded !== null) {
          userId = (decoded as any).id;
          userRole = (decoded as any).role;
        }
      } catch {}
    }
    if (!userId) {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      if (token) {
        userId = token.sub;
        userRole = token.role;
      }
    }
    if (userId) {
      const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";
      await prisma.audits.create({
        data: {
          actorId: userId,
          actorRole: userRole,
          action: "LOGOUT",
          ipAddress,
          userAgent,
          resource: "user",
          resourceId: userId,
          details: { logoutMethod: "api" },
        },
      });
    }
    const response = NextResponse.json({ success: true, message: "Logged out" });
    response.cookies.set("auth_token", "", { maxAge: 0, path: "/" });
    response.cookies.set("next-auth.session-token", "", { maxAge: 0, path: "/" });
    response.cookies.set("__Secure-next-auth.session-token", "", { maxAge: 0, path: "/" });
    console.log('Logout API success:', { userId });
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
} 