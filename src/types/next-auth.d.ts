// types/next-auth.d.ts
import { UserRole, OrganizationStatus } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role: UserRole;
    organization?: {
      id: number;
      name: string;
      email: string;
      status: OrganizationStatus;
      photoUrl?: string | null;
      letterUrl?: string | null;
    } | null;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: UserRole;
      organization?: {
        id: number;
        name: string;
        email: string;
        status: OrganizationStatus;
        photoUrl?: string | null;
        letterUrl?: string | null;
      } | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    name?: string | null;
    email?: string | null;
    role: UserRole;
    organization?: {
      id: number;
      name: string;
      email: string;
      status: OrganizationStatus;
      photoUrl?: string | null;
      letterUrl?: string | null;
    } | null;
  }
}