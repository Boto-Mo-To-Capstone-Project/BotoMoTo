import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { requireAuth } from "@/lib/helpers/requireAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;

    const url = new URL(request.url);
    const electionId = url.searchParams.get('electionId');
    const votingScopeId = url.searchParams.get('votingScopeId');
    const excludePositionId = url.searchParams.get('excludePositionId'); // For edit mode

    if (!electionId) {
      return apiResponse({
        success: false,
        message: "Election ID is required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const electionIdInt = parseInt(electionId);
    const scopeId = votingScopeId ? parseInt(votingScopeId) : null;
    const excludeId = excludePositionId ? parseInt(excludePositionId) : null;

    // Get existing orders for this scope (excluding soft-deleted)
    const whereClause: any = {
      electionId: electionIdInt,
      votingScopeId: scopeId,
      isDeleted: false
    };

    // Exclude current position in edit mode
    if (excludeId) {
      whereClause.id = { not: excludeId };
    }

    const existingPositions = await db.position.findMany({
      where: whereClause,
      select: { order: true },
      orderBy: { order: 'asc' }
    });

    const usedOrders = existingPositions.map(p => p.order);
    
    // Find the next available order (simple logic)
    let nextOrder = 1;
    while (usedOrders.includes(nextOrder)) {
      nextOrder++;
    }

    return apiResponse({
      success: true,
      message: "Next order calculated successfully",
      data: { nextOrder, usedOrders },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Next order calculation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to calculate next order",
      data: null,
      error: "Internal server error",
      status: 500
    });
  }
}
