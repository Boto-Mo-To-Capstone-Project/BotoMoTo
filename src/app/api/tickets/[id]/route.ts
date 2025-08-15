import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { ROLES } from "@/lib/constants";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }>}
) {
    try {
        const authResult = await requireAuth([ROLES.SUPER_ADMIN, ROLES.ADMIN]);
        if (!authResult.authorized) return authResult.response;
        const user = authResult.user;

        const { id } = await params;
        const ticketId = parseInt(id);

        const ticket = await db.ticket.findUnique({
            where: { id: ticketId },
            include: {
                organization: {
                select: { adminId: true }
                }
            }
        });

        if (!ticket) {
            return apiResponse({
                success: false,
                message: "Ticket not found",
                status: 404,
            });
        }

        // Admin can only view tickets from their own organization
        if (user.role === ROLES.ADMIN && ticket.organization.adminId !== user.id) {
            return apiResponse({
                success: false,
                message: "You can only view your organization's ticket.",
                data: null,
                error: "Forbidden",
                status: 403,
            });
        }

        await createAuditLog({
            user,
            action: "READ",
            request: req,
            resource: "TICKET",
            message: `Viewed ticket #${ticketId} (${user.role})`,
        });

        return apiResponse({
            success: true,
            message: "Ticket fetched successfully",
            data: { ticket },
        });
    } catch (error) {
        return apiResponse({
            success: false,
            message: "Failed to fetch ticket",
            error: typeof error === "string" ? error : "Internal server error",
            status: 500,
        });
    }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    const ticketId = parseInt(id);

    const body = await req.json();
    const { status } = body;

    if (!status) {
      return apiResponse({
        success: false,
        message: "Status is required",
        status: 400,
      });
    }

    const updated = await db.ticket.update({
      where: { id: ticketId },
      data: { status },
    });

    await createAuditLog({
      user,
      action: "UPDATE",
      request: req,
      resource: "TICKET",
      message: `Updated status of ticket #${ticketId} to ${status}`,
    });

    return apiResponse({
      success: true,
      message: "Status updated successfully",
      data: { ticket: updated },
    });
  } catch (error) {
    return apiResponse({
      success: false,
      message: "Failed to update status",
      error: typeof error === "string" ? error : "Internal server error",
      status: 500,
    });
  }
}