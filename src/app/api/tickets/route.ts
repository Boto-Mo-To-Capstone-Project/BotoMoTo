import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { validateWithZod } from "@/lib/validateWithZod";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { createAuditLog } from '@/lib/audit';
import { apiResponse } from '@/lib/apiResponse';
import { ROLES, TICKET_STATUS } from "@/lib/constants";
import prisma from '@/lib/db/db';

// GET /api/tickets - superadmin only: list all tickets
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
        if (!authResult.authorized) return authResult.response;
        const user = authResult.user;

        const tickets = await db.ticket.findMany();

        const audit = await createAuditLog({
            user,
            action: "READ",
            request: req,
            resource: "TICKET",
            message: "Viewed all tickets (superadmin)",
        });

        return apiResponse({ 
            success: true, 
            message: "Tickets fetched successfully", 
            data: { tickets },
            status: 200, 
        });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        return apiResponse({
            success: false, 
            message: 'Failed to fetch tickets',
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