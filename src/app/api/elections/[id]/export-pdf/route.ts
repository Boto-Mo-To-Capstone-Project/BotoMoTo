import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/helpers/requireAuth";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { generateElectionResultsPDF } from "@/lib/pdf/generateElectionResultsPDF";

/**
 * Export election results to PDF
 * Only admin users can export PDFs
 * Only closed elections with votes can be exported
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin user
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    const electionId = parseInt(id);
    
    if (isNaN(electionId)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check if election exists and get basic info
    const election = await db.election.findUnique({
      where: {
        id: electionId,
        isDeleted: false
      },
      select: {
        id: true,
        name: true,
        status: true,
        orgId: true,
        organization: {
          select: {
            name: true,
            adminId: true
          }
        }
      }
    });

    if (!election) {
      return apiResponse({
        success: false,
        message: "Election not found",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Verify user has access to this election
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You don't have permission to export this election",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if election is closed
    if (election.status !== ELECTION_STATUS.CLOSED) {
      return apiResponse({
        success: false,
        message: "Only closed elections can be exported",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Get vote count to ensure there are votes to export
    const voteCount = await db.voteResponse.count({
      where: {
        electionId: electionId
      }
    });

    if (voteCount === 0) {
      return apiResponse({
        success: false,
        message: "Cannot export election with no votes",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Fetch complete election results data
    const resultsResponse = await fetch(`${request.nextUrl.origin}/api/elections/${electionId}/results`, {
      headers: {
        'Cookie': request.headers.get('Cookie') || '',
      }
    });

    if (!resultsResponse.ok) {
      throw new Error(`Failed to fetch election results: ${resultsResponse.statusText}`);
    }

    const resultsData = await resultsResponse.json();

    if (!resultsData.success) {
      throw new Error(resultsData.message || "Failed to fetch election results");
    }

    // Generate PDF
    const pdfBuffer = await generateElectionResultsPDF(resultsData.data);

    // Create audit log
    await createAuditLog({
      user,
      action: 'READ',
      request,
      resource: 'ELECTION',
      resourceId: electionId,
      message: `Exported PDF results for election: ${election.name}`,
    });

    // Generate filename with election name and timestamp
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
    const electionName = election.name || 'Election_Results';
    const filename = `${electionName.replace(/[^a-zA-Z0-9]/g, '_')}_Results_${timestamp}.pdf`;

    // Return PDF as response
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("❌ PDF export error:", error);
    
    return apiResponse({
      success: false,
      message: error instanceof Error ? error.message : "Failed to export PDF",
      data: null,
      error: "Internal Server Error",
      status: 500
    });
  }
}
