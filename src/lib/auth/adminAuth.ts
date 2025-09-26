import { v4 as uuid } from "uuid";
import { encode as defaultEncode } from "next-auth/jwt";

import bcrypt from "bcryptjs";
import db from "@/lib/db/db";
// import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { loginSchema } from "@/lib/schema";
import { requestContext } from "@/lib/requestContext";
import { UserRole } from "@prisma/client";
import { CustomPrismaAdapter } from "./adminAdapter";
// import { createAuditLog } from "./audit";

const adapter = CustomPrismaAdapter(db);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter,
  pages: {
    signIn: "/auth/login",
  },
  providers: [
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

        // Check if user is deleted - use same error message for security
        if (user.isDeleted) throw new Error("Invalid credentials");

        const isValid = await bcrypt.compare(validated.password, user.password);
        if (!isValid) throw new Error("Invalid credentials");

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === "credentials") {
        token.credentials = true;
      }
      return token;
    },
    async session({ session }) {
      console.log("Session callback triggered:", session);

      // `session` here is actually the DB session model including `user`
      if (session.user) {
        return {
          user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            role: session.user.role as UserRole,
            organization: session.user.organization,
          },
          expires: session.expires, // required by NextAuth
        };
      }

      console.warn("Session callback did not find user data:", session);
      return session; // fallback
    }
  },
  jwt: {
    encode: async function (params) {
      if (params.token?.credentials) {
        const sessionToken = uuid();

        if (!params.token.sub) {
          throw new Error("No user ID found in token");
        }

        const createdSession = await adapter?.createSession?.({
          sessionToken: sessionToken,
          userId: params.token.sub,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        if (!createdSession) {
          throw new Error("Failed to create session");
        }

        return sessionToken;
      }
      return defaultEncode(params);
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
    //signout event handler for db session
    async signOut(params) {
      try {
      const ctx = requestContext.getStore();
      
      // Handle both session types safely
      if ('session' in params && params.session) {
        console.log("Database session signOut", params.session);
        console.log("id:", params.session.userId);
        
        const userId = params.session.userId;
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { email: true, role: true }
        });

        await db.audits.create({
          data: {
            actorId: userId,
            actorRole: user?.role || "ADMIN",
            action: "LOGOUT",
            ipAddress: ctx?.ip || "unknown",
            userAgent: ctx?.userAgent || "unknown",
            resource: "user",
            resourceId: userId,
            details: {
              email: user?.email || "unknown",
            },
          },
        });
      }
    } catch (e) {
      console.error("Audit log error (signOut):", e);
    }
    },
  },
});