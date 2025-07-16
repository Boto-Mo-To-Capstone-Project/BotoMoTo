// types/next-auth.d.ts
import { DefaultSession } from "next-auth";
import { UserRole, SessionUser } from "./auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: UserRole;
      organization?: {
        id: number;
        name: string;
        status: string;
      };
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: UserRole;
    organization?: {
      id: number;
      name: string;
      status: string;
    };
  }
}
