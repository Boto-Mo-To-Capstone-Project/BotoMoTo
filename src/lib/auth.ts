import bcrypt from "bcryptjs";
import db from "@/lib/db/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { loginSchema } from "@/lib/schema";
import { requestContext } from "@/lib/requestContext";
import { UserRole } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    GitHub,
    Google,
    Facebook,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        // Validate credentials using zod schema
        const result = loginSchema.safeParse(credentials);
        if (!result.success) {
          // If validation fails, throw an error with details
          throw new Error("Invalid credentials: " + JSON.stringify(result.error.format()));
        }
        const validated = result.data;
        const user = await db.user.findUnique({
          where: { email: validated.email },
          include: { organization: true }
        });

        if (!user || !user.password) throw new Error("Invalid credentials");

        const isValid = await bcrypt.compare(validated.password, user.password);
        if (!isValid) throw new Error("Invalid credentials");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organization: user.organization
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.organization = user.organization;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session callback:", session, token);
      if (session.user) {

        // find the fresh user data from database
        const user = await db.user.findUnique({
          where: { id: token.id as string },
          include: { organization: true }
        });

        if (user) {
          session.user.id = user.id as string;
          session.user.name = user.name as string;
          session.user.email = user.email as string;
          session.user.role = user.role as UserRole;
          session.user.organization = user.organization;
        }
      }

      console.log("Updated session:", session);
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      try {
        const ctx = requestContext.getStore();
        await db.audits.create({
          data: {
            actorId: user.id,
            actorRole: user.role || "ADMIN",
            action: "LOGIN",
            ipAddress: ctx?.ip || "unknown",
            userAgent: ctx?.userAgent || "unknown",
            resource: "user",
            resourceId: user.id,
            details: {
              email: user.email ?? "unknown",
              loginMethod: account?.provider,
            },
          },
        });
      } catch (e) {
        console.error("Audit log error (signIn):", e);
      }
    },
    async signOut(message) {
      // Handle both v4 and v5 signOut event shapes
      const token = 'token' in message ? message.token : null;
      if (!token) return;
      
      try {
        const ctx = requestContext.getStore();
        await db.audits.create({
          data: {
            actorId: token.id as string,
            actorRole: (token.role as UserRole) || "ADMIN",
            action: "LOGOUT",
            ipAddress: ctx?.ip || "unknown",
            userAgent: ctx?.userAgent || "unknown",
            resource: "user",
            resourceId: token.id as string,
            details: {
              email: token.email as string || "unknown",
              loginMethod: (token as any).provider || "unknown",
            },
          },
        });
      } catch (e) {
        console.error("Audit log error (signOut):", e);
      }
    },
  },
  session: {
    strategy: "jwt",
  },
});