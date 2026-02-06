import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { validateWithZod } from "@/lib/validateWithZod";
import { positionSchema } from "@/lib/schema";
import { requireAuth } from "@/lib/helpers/requireAuth";

// Handle POST request for bulk position operations
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const body = await request.json();
    const { operation, positionIds, electionId, positions: positionsData } = body;

    // Validate required fields
    if (!operation) {
      return apiResponse({ success: false, message: "Operation type is required", error: "Bad Request", status: 400 });
    }

    if (!electionId) {
      return apiResponse({ success: false, message: "Election ID is required", error: "Bad Request", status: 400 });
    }

    const electionIdInt = parseInt(electionId);
    if (isNaN(electionIdInt)) {
      return apiResponse({ success: false, message: "Invalid election ID", error: "Bad Request", status: 400 });
    }

    // Verify election exists and user has access
    const election = await db.election.findUnique({
      where: {
        id: electionIdInt,
        isDeleted: false
      },
      include: {
        organization: {
          select: {
            id: true,
            adminId: true,
            status: true,
            name: true
          }
        }
      }
    });

    if (!election) {
      return apiResponse({ success: false, message: "Election not found or has been deleted", error: "Not Found", status: 404 });
    }

    // Check if admin owns this election
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({ success: false, message: "You can only perform bulk operations on positions from your organization's elections", error: "Forbidden", status: 403 });
    }

    // Only approved organizations can modify positions
    if (election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({ success: false, message: "Only approved organizations can perform bulk position operations", error: "Forbidden", status: 403 });
    }

    let result;
    let audit;

    switch (operation) {
      case 'CREATE_MULTIPLE':
        result = await handleBulkCreate(electionIdInt, positionsData, user, request);
        break;
      case 'soft_delete':
        result = await handleBulkDelete(electionIdInt, positionIds, user, request, election);
        break;
      case 'REORDER':
        result = await handleBulkReorder(electionIdInt, positionIds, user, request);
        break;
      default:
        return apiResponse({ success: false, message: "Unsupported bulk operation", error: "Bad Request", status: 400 });
    }

    return result;

  } catch (error) {
    console.error("Bulk position operation error:", error);
    return apiResponse({ success: false, message: "Failed to perform bulk position operation", error: typeof error === "string" ? error : "Internal server error", status: 500 });
  }
}

// Handle bulk creation of positions
async function handleBulkCreate(electionId: number, positionsData: any[], user: any, request: NextRequest) {
  if (!positionsData || !Array.isArray(positionsData) || positionsData.length === 0) {
    return apiResponse({ success: false, message: "Positions data is required for bulk creation", error: "Bad Request", status: 400 });
  }

  const validatedPositions = [];
  const errors = [];

  // Validate each position
  for (let i = 0; i < positionsData.length; i++) {
    const positionData = { ...positionsData[i], electionId };
    const validation = validateWithZod(positionSchema, positionData);
    
    if ('data' in validation) {
      validatedPositions.push(validation.data);
    } else {
      errors.push({ index: i, error: `Position ${i + 1} validation failed` });
    }
  }

  if (errors.length > 0) {
    return apiResponse({ success: false, message: "Validation errors found in position data", data: { errors }, error: "Bad Request", status: 400 });
  }

  // Check for duplicate names within the batch and existing positions
  const names = validatedPositions.map(p => p.name);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
  
  if (duplicateNames.length > 0) {
    return apiResponse({ success: false, message: "Duplicate position names found within the batch", data: { duplicateNames }, error: "Bad Request", status: 400 });
  }

  // Check for existing position names in the election
  const existingPositions = await db.position.findMany({
    where: {
      electionId,
      name: { in: names },
      isDeleted: false
    },
    select: { name: true }
  });

  if (existingPositions.length > 0) {
    return apiResponse({
      success: false,
      message: "Some position names already exist in this election",
      data: { existingNames: existingPositions.map(p => p.name) },
      error: "Conflict",
      status: 409
    });
  }

  // Validate voting scopes if provided
  const votingScopeIds = validatedPositions
    .map(p => p.votingScopeId)
    .filter(id => id !== undefined && id !== null);

  if (votingScopeIds.length > 0) {
    const votingScopes = await db.votingScope.findMany({
      where: {
        id: { in: votingScopeIds },
        electionId,
        isDeleted: false
      }
    });

    if (votingScopes.length !== new Set(votingScopeIds).size) {
      return apiResponse({ success: false, message: "Some voting scopes are invalid or don't belong to this election", error: "Bad Request", status: 400 });
    }
  }

  // Create positions
  const createdPositions = await db.position.createMany({
    data: validatedPositions
  });

  // Fetch the created positions with their IDs
  const positions = await db.position.findMany({
    where: {
      electionId,
      name: { in: names },
      isDeleted: false
    },
    include: {
      votingScope: {
        select: {
          id: true,
          name: true,
        }
      },
      _count: {
        select: {
          candidates: true
        }
      }
    }
  });

  const audit = await createAuditLog({
    user,
    action: "CREATE",
    request,
    resource: "POSITION",
    resourceId: electionId,
    newData: { createdCount: createdPositions.count, positionNames: names },
    message: `Bulk created ${createdPositions.count} positions`,
  });

  return apiResponse({
    success: true,
    message: `Successfully created ${createdPositions.count} positions`,
    data: {
      createdCount: createdPositions.count,
      positions,
      audit
    },
    status: 201
  });
}

// Handle bulk deletion of positions
async function handleBulkDelete(electionId: number, positionIds: number[], user: any, request: NextRequest, election: any) {
  if (!positionIds || !Array.isArray(positionIds) || positionIds.length === 0) {
    return apiResponse({ success: false, message: "Position IDs are required for bulk deletion", error: "Bad Request", status: 400 });
  }

  // Validate position IDs
  const invalidIds = positionIds.filter(id => typeof id !== 'number' || isNaN(id) || id <= 0);
  if (invalidIds.length > 0) {
    return apiResponse({ success: false, message: "Invalid position IDs provided", data: { invalidIds }, error: "Bad Request", status: 400 });
  }

  // Check if positions exist and belong to the election
  const positions = await db.position.findMany({
    where: {
      id: { in: positionIds },
      electionId,
      isDeleted: false
    },
    include: {
      candidates: {
        where: { isDeleted: false },
        select: { id: true }
      },
      voteResponses: {
        select: { id: true }
      }
    }
  });

  if (positions.length !== positionIds.length) {
    const foundIds = positions.map(p => p.id);
    const notFoundIds = positionIds.filter(id => !foundIds.includes(id));
    return apiResponse({ success: false, message: "Some positions not found or don't belong to this election", data: { notFoundIds }, error: "Not Found", status: 404 });
  }

  // Check for positions with candidates or votes (ignore soft-deleted candidates)
  const positionsWithCandidates = positions.filter(p => p.candidates.length > 0);
  const positionsWithVotes = positions.filter(p => p.voteResponses.length > 0);

  if (positionsWithCandidates.length > 0) {
    return apiResponse({
      success: false,
      message: "Cannot delete positions that have candidates",
      data: { 
        positionsWithCandidates: positionsWithCandidates.map(p => ({ 
          id: p.id, 
          name: p.name, 
          candidateCount: p.candidates.length
        }))
      },
      error: "Conflict",
      status: 409
    });
  }

  if (positionsWithVotes.length > 0) {
    return apiResponse({
      success: false,
      message: "Cannot delete positions that have votes",
      data: { 
        positionsWithVotes: positionsWithVotes.map(p => ({ 
          id: p.id, 
          name: p.name, 
          voteCount: p.voteResponses.length
        }))
      },
      error: "Conflict",
      status: 409
    });
  }

  // Soft delete positions
  const deletedPositions = await db.position.updateMany({
    where: {
      id: { in: positionIds },
      electionId,
      isDeleted: false
    },
    data: {
      isDeleted: true,
      deletedAt: new Date()
    }
  });

  const audit = await createAuditLog({
    user,
    action: "DELETE",
    request,
    resource: "POSITION",
    resourceId: electionId,
    deletionType: "SOFT",
    message: `Bulk deleted ${deletedPositions.count} positions from election: ${election.name}`,
  });

  return apiResponse({
    success: true,
    message: `Successfully deleted ${deletedPositions.count} positions`,
    data: {
      deletedCount: deletedPositions.count,
      deletedPositions: positions.map(p => ({ id: p.id, name: p.name })),
      audit
    },
    status: 200
  });
}

// Handle bulk reordering of positions
async function handleBulkReorder(electionId: number, orderedPositionIds: number[], user: any, request: NextRequest) {
  if (!orderedPositionIds || !Array.isArray(orderedPositionIds) || orderedPositionIds.length === 0) {
    return apiResponse({ success: false, message: "Ordered position IDs are required for reordering", error: "Bad Request", status: 400 });
  }

  // Validate position IDs
  const invalidIds = orderedPositionIds.filter(id => typeof id !== 'number' || isNaN(id) || id <= 0);
  if (invalidIds.length > 0) {
    return apiResponse({ success: false, message: "Invalid position IDs provided", data: { invalidIds }, error: "Bad Request", status: 400 });
  }

  // Check if positions exist and belong to the election
  const positions = await db.position.findMany({
    where: {
      id: { in: orderedPositionIds },
      electionId,
      isDeleted: false
    }
  });

  if (positions.length !== orderedPositionIds.length) {
    const foundIds = positions.map(p => p.id);
    const notFoundIds = orderedPositionIds.filter(id => !foundIds.includes(id));
    return apiResponse({ success: false, message: "Some positions not found or don't belong to this election", data: { notFoundIds }, error: "Not Found", status: 404 });
  }

  // Update the order of each position
  const updatePromises = orderedPositionIds.map((positionId, index) => 
    db.position.update({
      where: { id: positionId },
      data: { order: index }
    })
  );

  const updatedPositions = await Promise.all(updatePromises);

  const audit = await createAuditLog({
    user,
    action: "UPDATE",
    request,
    resource: "POSITION",
    resourceId: electionId,
    message: `Reordered ${updatedPositions.length} positions`,
  });

  return apiResponse({
    success: true,
    message: `Successfully reordered ${updatedPositions.length} positions`,
    data: {
      reorderedCount: updatedPositions.length,
      newOrder: orderedPositionIds,
      audit
    },
    status: 200
  });
}
