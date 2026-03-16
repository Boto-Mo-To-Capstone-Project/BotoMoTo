import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    const voterId = parseInt(id, 10);
    if (Number.isNaN(voterId)) {
      return apiResponse({
        success: false,
        message: "Invalid voter ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const voter = await db.voter.findUnique({
      where: {
        id: voterId,
        isDeleted: false
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            isDeleted: true,
            organization: {
              select: {
                adminId: true
              }
            }
          }
        }
      }
    });

    if (!voter || voter.election.isDeleted) {
      return apiResponse({
        success: false,
        message: "Voter not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    if (user.role === ROLES.ADMIN && voter.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only manage voters from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const result = await db.voterSession.updateMany({
      where: {
        voterId: voter.id,
        isActive: true
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "VOTER",
      resourceId: voter.id,
      message: `Terminated ${result.count} active session(s) for voter: ${voter.firstName} ${voter.lastName}`,
    });

    return apiResponse({
      success: true,
      message: result.count > 0 ? "Session terminated successfully" : "No active session to terminate",
      data: {
        terminatedCount: result.count,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Voter session termination error:", error);
    return apiResponse({
      success: false,
      message: "Failed to terminate voter session",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
