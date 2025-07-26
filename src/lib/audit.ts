import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { AuditAction, AuditResource, User } from "@prisma/client";
import { Prisma } from "@prisma/client";

type CreateAuditLogArgs = {
  user: User;
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

  const details: Prisma.JsonObject = {
    operation: action,
    actor: {
      id: user.id,
      role: user.role,
    },
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
      actorId: user.id,
      actorRole: user.role,
      action,
      ipAddress,
      userAgent,
      resource,
      resourceId: resourceId?.toString(),
      details,
    },
  });
}
