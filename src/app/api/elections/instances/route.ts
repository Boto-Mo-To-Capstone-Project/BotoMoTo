import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { generateUniqueVoterCode } from "@/lib/utils";
import { CodeSendStatus } from "@prisma/client";

// Handle POST request to create election instance from template
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Parse request body
    const { templateId, instanceYear, instanceName } = await request.json();

    // Validate required fields
    if (!templateId || !instanceYear || !instanceName) {
      return apiResponse({
        success: false,
        message: 'templateId, instanceYear, and instanceName are required',
        error: 'Bad Request',
        status: 400,
      });
    }

    // Get template with all related data
    const template = await db.election.findUnique({
      where: { 
        id: templateId,
        isTemplate: true,
        isDeleted: false,
        organization: { adminId: user.id } // Ensure user owns this template
      },
      include: {
        organization: true,
        voters: { where: { isDeleted: false, isActive: true } },
        positions: { where: { isDeleted: false } },
        parties: { where: { isDeleted: false } },
        votingScopes: { where: { isDeleted: false } },
        mfaSettings: true
      }
    });

    if (!template) {
      return apiResponse({
        success: false,
        message: 'Template not found or access denied',
        error: 'Not Found',
        status: 404,
      });
    }

    // Check if instance name already exists for this template
    const instanceExists = await db.election.findFirst({
      where: {
        templateId: templateId,
        instanceName: instanceName,
        instanceYear: instanceYear,
        isDeleted: false
      }
    });

    if (instanceExists) {
      return apiResponse({
        success: false,
        message: 'An instance with this name and year already exists',
        error: 'Conflict',
        status: 409,
      });
    }

    // Create new election instance
    const newElection = await db.election.create({
      data: {
        orgId: template.orgId,
        name: template.name,
        description: template.description,
        isTemplate: false,
        templateId: template.id,
        instanceYear,
        instanceName,
        status: ELECTION_STATUS.DRAFT
      }
    });

    // Migrate voters with new codes
    const voterMigrations = [];
    for (const voter of template.voters) {
      const newCode = await generateUniqueVoterCode();
      
      voterMigrations.push({
        electionId: newElection.id,
        code: newCode,
        email: voter.email,
        firstName: voter.firstName,
        middleName: voter.middleName,
        lastName: voter.lastName,
        votingScopeId: voter.votingScopeId, // Will need to map to new scope IDs
        codeSendStatus: CodeSendStatus.PENDING,
        isActive: voter.isActive
      });
    }

    // Migrate voting scopes first (to get new IDs for voters)
    const scopeIdMapping = new Map();
    for (const scope of template.votingScopes) {
      const newScope = await db.votingScope.create({
        data: {
          electionId: newElection.id,
          name: scope.name,
          description: scope.description
        }
      });
      scopeIdMapping.set(scope.id, newScope.id);
    }

    // Update voter migrations with correct scope IDs
    const updatedVoterMigrations = voterMigrations.map(voter => ({
      ...voter,
      votingScopeId: voter.votingScopeId ? scopeIdMapping.get(voter.votingScopeId) : null
    }));

    await db.voter.createMany({ data: updatedVoterMigrations });

    // Migrate positions
    const positionIdMapping = new Map();
    for (const position of template.positions) {
      const newPosition = await db.position.create({
        data: {
          electionId: newElection.id,
          name: position.name,
          voteLimit: position.voteLimit,
          numOfWinners: position.numOfWinners,
          votingScopeId: position.votingScopeId ? scopeIdMapping.get(position.votingScopeId) : null,
          order: position.order
        }
      });
      positionIdMapping.set(position.id, newPosition.id);
    }

    // Migrate parties
    for (const party of template.parties) {
      await db.party.create({
        data: {
          electionId: newElection.id,
          name: party.name,
          color: party.color
        }
      });
    }

    // Migrate MFA settings if exists
    if (template.mfaSettings) {
      await db.mfaSettings.create({
        data: {
          electionId: newElection.id,
          mfaEnabled: template.mfaSettings.mfaEnabled,
          mfaMethods: template.mfaSettings.mfaMethods
        }
      });
    }

    // Fetch the complete new election
    const finalElection = await db.election.findUnique({
      where: { id: newElection.id },
      include: {
        organization: {
          select: { id: true, name: true, email: true, status: true }
        },
        template: {
          select: { id: true, name: true, isTemplate: true }
        },
        schedule: true,
        mfaSettings: true,
        _count: {
          select: {
            voters: { where: { isDeleted: false } },
            candidates: { where: { isDeleted: false } },
            positions: { where: { isDeleted: false } },
            parties: { where: { isDeleted: false } }
          }
        }
      }
    });

    const audit = await createAuditLog({
      user,
      action: "CREATE",
      request,
      resource: "ELECTION",
      resourceId: newElection.id,
      newData: finalElection as any,
      message: `Created election instance: ${template.name} - ${instanceName}`,
    });

    return apiResponse({
      success: true,
      message: 'Election instance created successfully',
      data: {
        election: finalElection,
        migratedData: {
          voters: updatedVoterMigrations.length,
          positions: template.positions.length,
          parties: template.parties.length,
          votingScopes: template.votingScopes.length
        },
        audit,
      },
      status: 201,
    });

  } catch (error) {
    console.error('Election instance creation error:', error);
    return apiResponse({
      success: false,
      message: 'Failed to create election instance',
      error: typeof error === 'string' ? error : 'Internal server error',
      status: 500,
    });
  }
}
