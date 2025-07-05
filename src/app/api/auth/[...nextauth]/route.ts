import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import NextAuth, { Session } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
//   session: {
//     strategy: "jwt",  // Valid literal, safe for TS
//   },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    CredentialsProvider({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
          name: { label: "Full Name", type: "text" }, // Optional for signup
        },
        async authorize(credentials) {

          console.log("Credentials received:", credentials);
          const { email, password, name } = credentials || {};
      
          if (!email || !password) return null;
      
          let user = await prisma.user.findUnique({ where: { email } });
      
          // If user doesn't exist, treat this as registration
          if (!user) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user = await prisma.user.create({
              data: {
                email,
                name: name || "New User",
                password: hashedPassword,
              },
            });
          }
      
          const valid = user.password && await bcrypt.compare(password, user.password);
          if (!valid) return null;
      
          console.log("User authenticated:", user.email);

          return { id: user.id, email: user.email, name: user.name };
        },
      }),      
  ],
  callbacks: {
    async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.email = user.email;
        }
        return token;
      },
    async session({ session, token }: { session: Session; token: JWT }) {
      console.log("Sessions:", session);
      (session.user as { id: string }).id = token.sub!;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/signup", 
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
