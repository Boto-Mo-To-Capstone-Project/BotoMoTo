import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";

import db from "@/lib/db/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";

import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";

import { loginSchema } from "@/lib/schema";
import { SignupSchema } from "@/lib/schema";
import { requestContext } from "@/lib/requestContext";

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
        const validated = loginSchema.parse(credentials);
        const user = await db.user.findUnique({
          where: { email: validated.email },
        });

        if (!user || !user.password) throw new Error("Invalid credentials");

        const isValid = await bcrypt.compare(validated.password, user.password);
        if (!isValid) throw new Error("Invalid credentials");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token as any).id;
        session.user.name = token.name;
        session.user.email = (token as any).email;
        session.user.role = (token as any).role;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      try {
        const ctx = requestContext.getStore();
        await db.audits.create({
          data: {
            actorId: (user as any).id,
            actorRole: (user as any).role,
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
    async signOut(event) {
      const token = (event as any).token;
      if (!token) return;
      try {
        const ctx = requestContext.getStore();
        await db.audits.create({
          data: {
            actorId: token.id ?? "",
            actorRole: token.role ?? "ADMIN",
            action: "LOGOUT",
            ipAddress: ctx?.ip || "unknown",
            userAgent: ctx?.userAgent || "unknown",
            resource: "user",
            resourceId: token.id ?? "",
            details: {
              email: token.email ?? "unknown",
              loginMethod: token.provider ?? "unknown",
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
