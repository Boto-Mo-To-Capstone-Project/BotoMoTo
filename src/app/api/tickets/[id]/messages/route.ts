import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { apiResponse } from "@/lib/apiResponse";
import { ROLES } from "@/lib/constants";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth([ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;

    const { id } = params;
    const ticketId = parseInt(id);
    const { message } = await req.json();

    // Fetch current messages
    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    let messages = [];
    if (ticket?.messages) {
      if (Array.isArray(ticket.messages)) messages = ticket.messages;
      else if (typeof ticket.messages === "string") messages = JSON.parse(ticket.messages);
      else messages = [];
    }
    messages.push(message);

    // Update ticket messages
    await db.ticket.update({
      where: { id: ticketId },
      data: { messages },
    });

    return apiResponse({ success: true, message: "Message added." });
  } catch (error) {
    return apiResponse({ success: false, message: "Failed to add message.", status: 500 });
  }
}