import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import NextAuth, { Session } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user as any).role;
        token.organization = (user as any).organization;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      (session.user as { id: string }).id = token.sub ?? token.id;
      (session.user as { role?: string }).role = token.role;
      (session.user as { organization?: any }).organization = token.organization;
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      try {
        await prisma.audits.create({
          data: {
            actorId: (user as any).id,
            actorRole: (user as any).role,
            action: "LOGIN",
            ipAddress: "oauth", // Could be improved with request context
            userAgent: "oauth",
            resource: "user",
            resourceId: (user as any).id,
            details: { email: (user as any).email, loginMethod: account?.provider },
          },
        });
      } catch (e) { console.error("Audit log error (signIn):", e); }
    },
    async signOut({ token }) {
      try {
        await prisma.audits.create({
          data: {
            actorId: token.sub ?? '',
            actorRole: token.role ?? 'VOTER',
            action: "LOGOUT",
            ipAddress: "oauth",
            userAgent: "oauth",
            resource: "user",
            resourceId: token.sub ?? '',
            details: { logoutMethod: "oauth" },
          },
        });
      } catch (e) { console.error("Audit log error (signOut):", e); }
    },
  },
  pages: {
    signIn: "/login",
    error: "/signup",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
