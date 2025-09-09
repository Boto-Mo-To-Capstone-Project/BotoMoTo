import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import { positionSchema } from "@/lib/schema";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";
import { requireAuth } from "@/lib/helpers/requireAuth";

// Handle GET request to fetch positions
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Get election ID from query parameters
    const url = new URL(request.url);
    const electionId = url.searchParams.get('electionId');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const all = url.searchParams.get('all') === 'true';

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
    if (isNaN(electionIdInt)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check if election exists and user has permission
    const election = await db.election.findUnique({
      where: {
        id: electionIdInt,
        isDeleted: false
      },
      include: {
        organization: {
          select: {
            id: true,
            adminId: true
          }
        }
      }
    });

    if (!election) {
      return apiResponse({
        success: false,
        message: "Election not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check permissions - admin can only view positions from their organization's elections
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view positions from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Deny access for voters
    if (user.role === ROLES.VOTER) {
      return apiResponse({
        success: false,
        message: "You do not have permission to view positions",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Build query filters
    const where: any = {
      electionId: electionIdInt,
      isDeleted: false
    };

    // Add search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      where.OR = [
        {
          name: {
            contains: searchLower
          }
        },
      ];
    }

    // Calculate pagination
    const skip = all ? 0 : (page - 1) * limit;
    const take = all ? undefined : limit;

    // Get total count for pagination
    const totalCount = await db.position.count({
      where
    });

    // Fetch positions for the election (exclude soft-deleted) - no backend sorting, client handles it
    const positions = await db.position.findMany({
      where,
      include: {
        election: {
          select: {
            id: true,
            name: true,
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        votingScope: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            candidates: true
          }
        }
      },
      skip,
      ...(take !== undefined && { take })
    });

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "POSITION",
      resourceId: electionIdInt,
      message: `Viewed positions for election: ${election.name}${all ? ' (all positions)' : ''}`,
    });

    // Calculate pagination info
    const totalPages = all ? 1 : Math.ceil(totalCount / limit);

    // Prepare response data
    const responseData: any = {
      positions,
      audit
    };

    // Only include pagination when not fetching all
    if (!all) {
      responseData.pagination = {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
    }

    return apiResponse({
      success: true,
      message: "Positions fetched successfully",
      data: responseData,
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Positions fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch positions",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle POST request to create a new position
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user - only admins can create positions
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Parse request body
    const body = await request.json();

    // Check if this is bulk creation (positions array) or single position
    if (body.positions && Array.isArray(body.positions)) {
      // Handle bulk creation
      const positions = body.positions;
      
      if (positions.length === 0) {
        return apiResponse({
          success: false,
          message: "At least one position is required for bulk creation",
          data: null,
          error: "Bad Request",
          status: 400
        });
      }

      // Validate each position in the array
      for (const pos of positions) {
        const validation = validateWithZod(positionSchema, pos);
        if (!("data" in validation)) {
          return validation; // Return the validation error response directly
        }
      }

      // Detect duplicates within the incoming batch for same name + same scope
      const seen = new Set<string>();
      for (const pos of positions) {
        const key = `${pos.electionId}-${pos.name.trim().toLowerCase()}-${pos.votingScopeId ?? 'null'}`;
        if (seen.has(key)) {
          return apiResponse({
            success: false,
            message: `Duplicate position in upload: name "${pos.name}" with the same scope appears more than once`,
            data: null,
            error: "Conflict",
            status: 409
          });
        }
        seen.add(key);
      }

      // For bulk creation, we'll use the electionId from the first position
      const firstPosition = positions[0];
      const electionId = firstPosition.electionId;

      // Check if election exists and user has permission (same validation as single creation)
      const election = await db.election.findUnique({
        where: {
          id: electionId,
          isDeleted: false
        },
        include: {
          organization: {
            select: {
              id: true,
              adminId: true,
              status: true
            }
          }
        }
      });

      if (!election) {
        return apiResponse({
          success: false,
          message: "Election not found or has been deleted",
          data: null,
          error: "Not Found",
          status: 404
        });
      }

      // Check if admin owns this election (through organization)
      if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
        return apiResponse({
          success: false,
          message: "You can only create positions for your organization's elections",
          data: null,
          error: "Forbidden",
          status: 403
        });
      }

      // Only approved organizations can create positions
      if (election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
        return apiResponse({
          success: false,
          message: "Only approved organizations can create positions",
          data: null,
          error: "Forbidden",
          status: 403
        });
      }

      // Create all positions in a transaction
      const createdPositions = await db.$transaction(async (tx) => {
        const results = [];
        let createdCount = 0;
        let restoredCount = 0;

        for (const posData of positions) {
          // Check if position with same name AND same scope already exists (including soft-deleted)
          const existingPosition = await tx.position.findFirst({
            where: {
              electionId: posData.electionId || electionId,
              name: posData.name,
              votingScopeId: posData.votingScopeId ?? null,
            }
          });

          if (existingPosition) {
            if (existingPosition.isDeleted) {
              // Restore soft-deleted position
              const restoredPosition = await tx.position.update({
                where: { id: existingPosition.id },
                data: {
                  isDeleted: false,
                  deletedAt: null,
                  voteLimit: posData.voteLimit || 1,
                  numOfWinners: posData.numOfWinners || 1,
                  order: posData.order || 0,
                  updatedAt: new Date()
                },
                include: {
                  election: {
                    select: {
                      id: true,
                      name: true,
                      organization: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  },
                  votingScope: {
                    select: {
                      id: true,
                      name: true
                    }
                  },
                  _count: {
                    select: {
                      candidates: true
                    }
                  }
                }
              });
              results.push(restoredPosition);
              restoredCount++;
            } else {
              throw new Error(`A position with name "${posData.name}" and this scope already exists in this election`);
            }
          } else {
            // Create new position
            const position = await tx.position.create({
              data: {
                electionId: posData.electionId || electionId,
                name: posData.name,
                voteLimit: posData.voteLimit || 1,
                numOfWinners: posData.numOfWinners || 1,
                votingScopeId: posData.votingScopeId,
                order: posData.order || 0
              },
              include: {
                election: {
                  select: {
                    id: true,
                    name: true,
                    organization: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                },
                votingScope: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                _count: {
                  select: {
                    candidates: true
                  }
                }
              },
            });
            results.push(position);
            createdCount++;
          }
        }
        return { positions: results, createdCount, restoredCount, totalCount: createdCount + restoredCount };
      });

      const audit = await createAuditLog({
        user,
        action: "CREATE",
        request,
        resource: "POSITION",
        resourceId: electionId,
        message: `Batch imported ${createdPositions.totalCount} positions for election: ${election.name} (${createdPositions.createdCount} new, ${createdPositions.restoredCount} restored)`,
      });

      return apiResponse({
        success: true,
        message: `Successfully imported ${createdPositions.totalCount} positions (${createdPositions.createdCount} new, ${createdPositions.restoredCount} restored)`,
        data: {
          positions: createdPositions.positions,
          summary: {
            total: createdPositions.totalCount,
            created: createdPositions.createdCount,
            restored: createdPositions.restoredCount
          },
          audit
        },
        error: null,
        status: 201
      });
    }

    // Handle single position creation
    // Validate position data using helper
    const validation = validateWithZod(positionSchema, body);
    if (!("data" in validation)) return validation;

    const { electionId, name, voteLimit, numOfWinners, votingScopeId, order } = validation.data;

    // Simple validation: Vote limit cannot be greater than number of winners
    if (voteLimit > numOfWinners) {
      return apiResponse({
        success: false,
        message: "Vote limit cannot be greater than number of winners",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Simple validation: Order must be greater than 0
    if (order <= 0) {
      return apiResponse({
        success: false,
        message: "Order must be greater than 0",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check if election exists and user has permission
    const election = await db.election.findUnique({
      where: {
        id: electionId,
        isDeleted: false
      },
      include: {
        organization: {
          select: {
            id: true,
            adminId: true,
            status: true
          }
        }
      }
    });

    if (!election) {
      return apiResponse({
        success: false,
        message: "Election not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this election (through organization)
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only create positions for your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Only approved organizations can create positions
    if (election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({
        success: false,
        message: "Only approved organizations can create positions",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // If votingScopeId is provided, validate it exists and belongs to the same election
    if (votingScopeId) {
      const votingScope = await db.votingScope.findUnique({
        where: {
          id: votingScopeId,
          isDeleted: false
        },
        select: {
          id: true,
          electionId: true
        }
      });

      if (!votingScope) {
        return apiResponse({
          success: false,
          message: "Voting scope not found or has been deleted",
          data: null,
          error: "Bad Request",
          status: 400
        });
      }

      if (votingScope.electionId !== electionId) {
        return apiResponse({
          success: false,
          message: "Voting scope must belong to the same election",
          data: null,
          error: "Bad Request",
          status: 400
        });
      }
    }

    // Check if position name already exists for the SAME scope (including soft-deleted)
    const existingPosition = await db.position.findFirst({
      where: {
        electionId: electionId,
        name,
        votingScopeId: votingScopeId ?? null,
      }
    });

    if (existingPosition) {
      if (existingPosition.isDeleted) {
        // Restore soft-deleted position
        const restoredPosition = await db.position.update({
          where: { id: existingPosition.id },
          data: {
            isDeleted: false,
            deletedAt: null,
            voteLimit,
            numOfWinners,
            order,
            updatedAt: new Date()
          },
          include: {
            election: {
              select: {
                id: true,
                name: true,
                organization: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            votingScope: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                candidates: true
              }
            }
          },
        });

        // Log restoration audit
        const audit = await createAuditLog({
          user,
          action: "RESTORE",
          request,
          resource: "POSITION",
          resourceId: restoredPosition.id,
          newData: restoredPosition,
          message: `Restored position: ${name} for election: ${election.name}`,
        });

        // Return success response
        return apiResponse({
          success: true,
          message: "Position restored successfully",
          data: {
            position: restoredPosition,
            audit
          },
          error: null,
          status: 200
        });
      } else {
        return apiResponse({
          success: false,
          message: "A position with this name and scope already exists in this election",
          data: null,
          error: "Conflict",
          status: 409
        });
      }
    }

    // Create a new position in the database
    const position = await db.position.create({
      data: {
        electionId,
        name,
        voteLimit,
        numOfWinners,
        votingScopeId,
        order
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        votingScope: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            candidates: true
          }
        }
      },
    });

    // Log creation audit
    const audit = await createAuditLog({
      user,
      action: "CREATE",
      request,
      resource: "POSITION",
      resourceId: position.id,
      newData: position,
    });

    // Return success response
    return apiResponse({
      success: true,
      message: "Position created successfully",
      data: {
        position,
        audit
      },
      error: null,
      status: 201
    });
  } catch (error) {
    console.error("Position creation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to create position",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to delete all positions of a specific election
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Get election ID from query parameters
    const url = new URL(request.url);
    const electionId = url.searchParams.get('electionId');

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
    if (isNaN(electionIdInt)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check if election exists and user has permission
    const election = await db.election.findUnique({
      where: {
        id: electionIdInt,
        isDeleted: false
      },
      include: {
        organization: {
          select: {
            id: true,
            adminId: true
          }
        }
      }
    });

    if (!election) {
      return apiResponse({
        success: false,
        message: "Election not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this election (through organization)
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only delete positions from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Get count of positions to be deleted
    const positionsCount = await db.position.count({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      }
    });

    if (positionsCount === 0) {
      return apiResponse({
        success: false,
        message: "No positions found to delete for this election",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Soft delete all positions for this election
    const deletedPositions = await db.position.updateMany({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      },
      data: { 
        isDeleted: true, 
        deletedAt: new Date() 
      },
    });

    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "POSITION",
      resourceId: electionIdInt,
      deletionType: "SOFT",
      message: `Deleted ${deletedPositions.count} positions for election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: `Successfully deleted ${deletedPositions.count} positions`,
      data: {
        deletedCount: deletedPositions.count,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Positions deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete positions",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
