import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { validateWithZod } from "@/lib/validateWithZod";
import { candidateSchema } from "@/lib/schema";

// Handle POST request for bulk candidate operations
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({ success: false, message: "You must be logged in to perform bulk candidate operations", error: "Unauthorized", status: 401 });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({ success: false, message: "Only admin users can perform bulk candidate operations", error: "Forbidden", status: 403 });
    }

    const body = await request.json();
    const { operation, candidateIds, electionId, candidates: candidatesData } = body || {};

    // Validate required fields
    if (!operation) {
      return apiResponse({ success: false, message: "Operation type is required", error: "Bad Request", status: 400 });
    }

    if (!electionId) {
      return apiResponse({ success: false, message: "Election ID is required", error: "Bad Request", status: 400 });
    }

    const electionIdInt = parseInt(String(electionId));
    if (isNaN(electionIdInt)) {
      return apiResponse({ success: false, message: "Invalid election ID", error: "Bad Request", status: 400 });
    }

    // Verify election exists and user has access
    const election = await db.election.findUnique({
      where: {
        id: electionIdInt,
        isDeleted: false,
      },
      include: {
        organization: {
          select: {
            id: true,
            adminId: true,
            status: true,
            name: true,
          },
        },
      },
    });

    if (!election) {
      return apiResponse({ success: false, message: "Election not found or has been deleted", error: "Not Found", status: 404 });
    }

    // Check if admin owns this election
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({ success: false, message: "You can only perform bulk operations on candidates from your organization's elections", error: "Forbidden", status: 403 });
    }

    // Only approved organizations can modify candidates
    if (election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({ success: false, message: "Only approved organizations can perform bulk candidate operations", error: "Forbidden", status: 403 });
    }

    let result;

    switch (operation) {
      case "bulk_create":
        result = await handleBulkCreate(electionIdInt, candidatesData, user, request);
        break;
      case "soft_delete":
        result = await handleBulkDelete(electionIdInt, candidateIds, user, request, election);
        break;
      default:
        return apiResponse({ success: false, message: "Unsupported bulk operation", error: "Bad Request", status: 400 });
    }

    return result;
  } catch (error) {
    console.error("Bulk candidate operation error:", error);
    return apiResponse({ success: false, message: "Failed to perform bulk candidate operation", error: typeof error === "string" ? error : "Internal server error", status: 500 });
  }
}

// Handle bulk creation of candidates
async function handleBulkCreate(electionId: number, candidatesData: any[], user: any, request: NextRequest) {
  if (!candidatesData || !Array.isArray(candidatesData) || candidatesData.length === 0) {
    return apiResponse({ success: false, message: "Candidates data is required for bulk creation", error: "Bad Request", status: 400 });
  }

  const normalized = candidatesData.map((c, idx) => ({
    index: idx,
    data: {
      electionId,
      voterId: Number(c.voterId),
      positionId: Number(c.positionId),
      // Optional fields: if invalid or null, omit so Zod optional passes
      ...(c.partyId != null && !Number.isNaN(Number(c.partyId)) ? { partyId: Number(c.partyId) } : {}),
      ...(typeof c.isNew === "boolean" ? { isNew: c.isNew } : {}),
      ...(c.imageUrl ? { imageUrl: String(c.imageUrl) } : {}),
      ...(c.credentialUrl ? { credentialUrl: String(c.credentialUrl) } : {}),
      // bio is only in update schema; ignore on create if provided
    },
  }));

  const validatedCandidates: any[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  // Validate each candidate
  for (const item of normalized) {
    const validation = validateWithZod(candidateSchema, item.data);
    if ("data" in validation) {
      validatedCandidates.push(validation.data);
    } else {
      errors.push({ index: item.index, error: "Candidate validation failed" });
    }
  }

  if (errors.length > 0) {
    return apiResponse({ success: false, message: "Validation errors found in candidate data", data: { errors }, error: "Bad Request", status: 400 });
  }

  // Check for duplicate voterIds within the batch
  const voterIds = validatedCandidates.map((c) => c.voterId);
  const duplicateVoterIds = voterIds.filter((id, i) => voterIds.indexOf(id) !== i);
  if (duplicateVoterIds.length > 0) {
    return apiResponse({ success: false, message: "Duplicate voter IDs found within the batch", data: { duplicateVoterIds: Array.from(new Set(duplicateVoterIds)) }, error: "Bad Request", status: 400 });
  }

  // Validate referenced entities exist and belong to the election
  const [voters, positions, parties] = await Promise.all([
    db.voter.findMany({ where: { id: { in: voterIds }, electionId, isDeleted: false }, select: { id: true } }),
    db.position.findMany({ where: { id: { in: validatedCandidates.map((c) => c.positionId) }, electionId, isDeleted: false }, select: { id: true } }),
    db.party.findMany({ where: { id: { in: validatedCandidates.map((c) => c.partyId).filter(Boolean) as number[] }, electionId, isDeleted: false }, select: { id: true } }),
  ]);

  const foundVoterIds = new Set(voters.map((v) => v.id));
  const foundPositionIds = new Set(positions.map((p) => p.id));
  const foundPartyIds = new Set(parties.map((p) => p.id));

  const missingVoters = voterIds.filter((id) => !foundVoterIds.has(id));
  if (missingVoters.length > 0) {
    return apiResponse({ success: false, message: "Some voters were not found in this election", data: { missingVoters }, error: "Not Found", status: 404 });
  }

  const missingPositions = validatedCandidates.map((c) => c.positionId).filter((id) => !foundPositionIds.has(id));
  if (missingPositions.length > 0) {
    return apiResponse({ success: false, message: "Some positions were not found in this election", data: { missingPositions }, error: "Not Found", status: 404 });
  }

  const providedPartyIds = validatedCandidates.map((c) => c.partyId).filter(Boolean) as number[];
  const missingParties = providedPartyIds.filter((id) => !foundPartyIds.has(id));
  if (missingParties.length > 0) {
    return apiResponse({ success: false, message: "Some parties were not found in this election", data: { missingParties }, error: "Not Found", status: 404 });
  }

  // Check if any voters are already candidates (prevent duplicates)
  const existingCandidates = await db.candidate.findMany({
    where: {
      electionId,
      voterId: { in: voterIds },
      isDeleted: false,
    },
    select: { voterId: true },
  });
  if (existingCandidates.length > 0) {
    return apiResponse({
      success: false,
      message: "Some voters are already candidates in this election",
      data: { existingVoterIds: existingCandidates.map((c) => c.voterId) },
      error: "Conflict",
      status: 409,
    });
  }

  // Create candidates
  const toCreate = validatedCandidates.map((c) => ({
    electionId: c.electionId,
    voterId: c.voterId,
    positionId: c.positionId,
    partyId: c.partyId ?? null,
    imageUrl: (c as any).imageUrl ?? null,
    credentialUrl: (c as any).credentialUrl ?? null,
    isNew: c.isNew ?? false,
  }));

  const created = await db.candidate.createMany({ data: toCreate });

  // Fetch created rows for response
  const createdCandidates = await db.candidate.findMany({
    where: { electionId, voterId: { in: voterIds }, isDeleted: false },
    select: {
      id: true,
      electionId: true,
      isNew: true,
      imageUrl: true,
      credentialUrl: true,
      voter: { select: { id: true, firstName: true, lastName: true, email: true } },
      position: { select: { id: true, name: true } },
      party: { select: { id: true, name: true, color: true } },
    },
  });

  const audit = await createAuditLog({
    user,
    action: "CREATE",
    request,
    resource: "CANDIDATE",
    resourceId: electionId,
    newData: { createdCount: created.count, voterIds },
    message: `Bulk created ${created.count} candidates`,
  });

  return apiResponse({
    success: true,
    message: `Successfully created ${created.count} candidates`,
    data: { createdCount: created.count, candidates: createdCandidates, audit },
    status: 201,
  });
}

// Handle bulk deletion of candidates
async function handleBulkDelete(electionId: number, candidateIds: number[], user: any, request: NextRequest, election: any) {
  if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
    return apiResponse({ success: false, message: "Candidate IDs are required for bulk deletion", error: "Bad Request", status: 400 });
  }

  // Validate candidate IDs
  const invalidIds = candidateIds.filter((id) => typeof id !== "number" || isNaN(id) || id <= 0);
  if (invalidIds.length > 0) {
    return apiResponse({ success: false, message: "Invalid candidate IDs provided", data: { invalidIds }, error: "Bad Request", status: 400 });
  }

  // Check if candidates exist and belong to the election
  const candidates = await db.candidate.findMany({
    where: {
      id: { in: candidateIds },
      electionId,
      isDeleted: false,
    },
    select: {
      id: true,
      voter: { select: { firstName: true, lastName: true } },
      _count: { select: { voteResponses: true } },
    },
  });

  if (candidates.length !== candidateIds.length) {
    const foundIds = candidates.map((c) => c.id);
    const notFoundIds = candidateIds.filter((id) => !foundIds.includes(id));
    return apiResponse({ success: false, message: "Some candidates not found or don't belong to this election", data: { notFoundIds }, error: "Not Found", status: 404 });
  }

  // Check for candidates with votes
  const candidatesWithVotes = candidates.filter((c) => c._count.voteResponses > 0);
  if (candidatesWithVotes.length > 0) {
    return apiResponse({
      success: false,
      message: "Cannot delete candidates who have received votes",
      data: {
        candidatesWithVotes: candidatesWithVotes.map((c) => ({ id: c.id, name: `${c.voter.firstName} ${c.voter.lastName}`.trim() })),
      },
      error: "Conflict",
      status: 409,
    });
  }

  // Soft delete candidates
  const deleted = await db.candidate.updateMany({
    where: { id: { in: candidateIds }, electionId, isDeleted: false },
    data: { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() },
  });

  const audit = await createAuditLog({
    user,
    action: "DELETE",
    request,
    resource: "CANDIDATE",
    resourceId: electionId,
    deletionType: "SOFT",
    message: `Bulk deleted ${deleted.count} candidates from election: ${election.name}`,
  });

  return apiResponse({
    success: true,
    message: `Successfully deleted ${deleted.count} candidates`,
    data: {
      deletedCount: deleted.count,
      deletedCandidates: candidates.map((c) => ({ id: c.id, name: `${c.voter.firstName} ${c.voter.lastName}`.trim() })),
      audit,
    },
    status: 200,
  });
}
