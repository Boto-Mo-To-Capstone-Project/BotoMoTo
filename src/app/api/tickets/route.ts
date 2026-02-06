import { NextRequest, NextResponse } from 'next/server';
import db from "@/lib/db/db";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { createAuditLog } from '@/lib/audit';
import { apiResponse } from '@/lib/apiResponse';
import { ROLES } from "@/lib/constants";

// GET the tickets
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth([ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    let tickets: any[];
        if (user.role === ROLES.SUPER_ADMIN) {
        // Super admin: fetch all tickets
            tickets = await db.ticket.findMany({
            include: { organization: true }
        });
        } else if (user.role === ROLES.ADMIN) {
        // Admin: fetch only their organization's tickets
            tickets = await db.ticket.findMany({
            where: { 
                organization: { 
                    adminId: user.id 
                } },
            include: { organization: true }
        });
        } else {
            tickets = [];
        }

    return apiResponse({
      success: true,
      message: "Tickets fetched successfully",
      data: { tickets }
    });
  } catch (error) {
    return apiResponse({
      success: false,
      message: "Failed to fetch tickets",
      error: typeof error === "string" ? error : "Internal server error",
      status: 500,
    });
  }
}

// POST /api/tickets - admin only: create a ticket
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth([ROLES.ADMIN]);
        if (!authResult.authorized) return authResult.response;
        const user = authResult.user;

        const body = await req.json();

        // Check for existing active ticket for this admin/org
        const activeTicket = await db.ticket.findFirst({
            where: {
                orgId: body.orgId,
                // Only consider tickets that are not resolved
                status: {
                    in: ["PENDING", "IN_PROGRESS"],
                },
            },
        });

        if (activeTicket) {
            return apiResponse({
                success: false,
                message: "You already have an active ticket. Please resolve your current ticket before creating a new one.",
                status: 400,
            });
        }

        const ticket = await db.ticket.create({
            data: {
                orgId: body.orgId,
                subject: body.subject,
                messages: body.messages || [],
            },
        });

        const audit = await createAuditLog({
            user,
            action: "CREATE",
            request: req,
            resource: "TICKET",
            resourceId: ticket.id,
            newData: ticket,
            message: `Created new ticket: ${ticket.subject}`,
        });
        
        return apiResponse({
            success: true,
            message: "Ticket created successfully",
            data: { 
                ticket, 
                audit 
            },
            status: 201,
        });
    }

    catch (error) {
        console.error('Error creating tickets:', error);
        return apiResponse({
            success: false, 
            message: 'Failed to create tickets',
            error: typeof error === "string" ? error : "Internal server error",
            status: 500,
        });
    }
}