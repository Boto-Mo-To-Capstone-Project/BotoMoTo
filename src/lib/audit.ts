import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { AuditAction, AuditResource, User, Voter } from "@prisma/client";
import { Prisma } from "@prisma/client";

type CreateAuditLogArgs = {
  user: User | Voter;
  action: AuditAction;
  request: NextRequest;
  resource: AuditResource;
  resourceId?: string | number;
  newData?: Record<string, any>;
  changedFields?: Record<string, { old: any; new: any }>;
  deletionType?: "SOFT" | "HARD";
  message?: string; // optional, idk if tanggalin ko later
};

export async function createAuditLog({
  user,
  action,
  request,
  resource,
  resourceId,
  newData,
  changedFields,
  deletionType,
  message,
}: CreateAuditLogArgs) {
  const ipAddress = request.headers.get("x-real-ip") ||request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  // Helper function to check if the user is a Voter
  const isVoter = (user: User | Voter): user is Voter => {
    return 'firstName' in user && 'lastName' in user && 'code' in user;
  };

  // Normalize user data for both User and Voter
  const actorData = isVoter(user) ? {
    id: user.id.toString(), // Convert number to string for voters
    name: `${user.firstName} ${user.lastName}`,
    email: user.email || "voter@election.system",
    role: "VOTER" as const,
  } : {
    id: user.id,
    name: user.name || `${user.email}`,
    email: user.email || "unknown@system.local",
    role: user.role,
  };

  const details: Prisma.JsonObject = {
    operation: action,
    actor: actorData,
    resource: {
      type: resource,
      id: resourceId?.toString(),
    },
    client: {
      ip: ipAddress,
      userAgent,
    },
    timestamp: new Date().toISOString(),
    ...(message && { message }),
    ...(newData && { newData }),
    ...(changedFields && { changedFields }),
    ...(deletionType && { deletionType }),
  };

  return db.audits.create({
    data: {
      actorId: actorData.id,
      actorRole: actorData.role,
      action,
      ipAddress,
      userAgent,
      resource,
      resourceId: resourceId?.toString(),
      details,
    },
  });
}
