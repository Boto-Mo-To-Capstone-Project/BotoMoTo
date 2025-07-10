// types/next-auth.d.ts
import { DefaultSession } from "next-auth";
import { UserRole, SessionUser } from "./auth";

declare module "next-auth" {
  interface Session {
    user: SessionUser & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    isApproved: boolean;
    organization?: {
      id: number;
      name: string;
      status: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    id: string;
    isApproved: boolean;
    organization?: {
      id: number;
      name: string;
      status: string;
    };
  }
}
