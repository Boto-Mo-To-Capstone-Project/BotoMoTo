import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function getUnifiedSession(request: NextRequest) {
  // Try NextAuth session first
  const session = await getServerSession(authOptions);
  if (session && session.user) {
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      organization: session.user.organization || null,
      method: "next-auth",
    };
  }
  // Try JWT-based session from custom credentials login
  const token = request.cookies.get("auth_token")?.value;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (typeof decoded === "object" && decoded !== null) {
        const user = await prisma.user.findUnique({ where: { id: (decoded as any).id }, include: { organization: true } });
        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organization: user.organization || null,
            method: "jwt-auth",
          };
        }
      }
    } catch (err) {
      // Invalid token, ignore and fall through
    }
  }
  // No session found
  return null;
} 