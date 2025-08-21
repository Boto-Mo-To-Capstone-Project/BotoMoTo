import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { apiResponse } from "@/lib/apiResponse";
import { ROLES } from "@/lib/constants";

export async function GET(
  request: NextRequest,
   { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;

    const { id } = await params;
    const ticketId = parseInt(id);
    const { message } = await request.json();

    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return apiResponse({ success: false, message: "Ticket not found.", status: 404 });
    }

    let messages: any[] = [];
    if (ticket?.messages) {
      if (Array.isArray(ticket.messages)) messages = ticket.messages;
      else if (typeof ticket.messages === "string") {
        try {
          messages = JSON.parse(ticket.messages);
        } catch {
          messages = [];
        }
      }
    }

    return apiResponse({ success: true, message: "Messages fetched.", data: messages });
  } catch (error) {
    return apiResponse({ success: false, message: "Failed to fetch messages.", status: 500 });
  }
}

// Add POST handler to append a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;

    const { id } = await params;
    const ticketId = parseInt(id);
    const { message } = await request.json();

    if (!message) {
      return apiResponse({ success: false, message: "Message is required.", status: 400 });
    }

    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return apiResponse({ success: false, message: "Ticket not found.", status: 404 });
    }

    let messages: any[] = [];
    if (ticket?.messages) {
      if (Array.isArray(ticket.messages)) messages = ticket.messages;
      else if (typeof ticket.messages === "string") {
        try {
          messages = JSON.parse(ticket.messages);
        } catch {
          messages = [];
        }
      }
    }

    messages.push(message);

    await db.ticket.update({
      where: { id: ticketId },
      data: { messages },
    });

    return apiResponse({ success: true, message: "Message added.", data: message });
  } catch (error) {
    return apiResponse({ success: false, message: "Failed to add message.", status: 500 });
  }
}