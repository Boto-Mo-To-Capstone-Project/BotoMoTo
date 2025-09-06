import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";

// GET MFA settings for an election
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Get MFA settings for the election
    const mfaSettings = await db.mfaSettings.findUnique({
      where: { electionId },
      select: {
        mfaEnabled: true,
        mfaMethods: true
      }
    });

    return apiResponse({
      success: true,
      message: "MFA settings retrieved successfully",
      data: mfaSettings || { mfaEnabled: false, mfaMethods: [] },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Error fetching MFA settings:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch MFA settings",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// POST/PUT MFA settings for an election
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const electionId = parseInt(id);

    const body = await request.json();
    const { mfaMethods } = body;

    if (isNaN(electionId)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    if (!Array.isArray(mfaMethods)) {
      return apiResponse({
        success: false,
        message: "mfaMethods must be an array",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Validate MFA methods
    const validMethods = ['email-confirmation', 'otp-email', 'passphrase-email'];
    const invalidMethods = mfaMethods.filter(method => !validMethods.includes(method));
    
    if (invalidMethods.length > 0) {
      return apiResponse({
        success: false,
        message: `Invalid MFA methods: ${invalidMethods.join(', ')}`,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check if election exists
    const election = await db.election.findUnique({
      where: { id: electionId },
      select: { id: true, name: true }
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

    // Update or create MFA settings
    const mfaSettings = await db.mfaSettings.upsert({
      where: { electionId },
      update: {
        mfaEnabled: mfaMethods.length > 0,
        mfaMethods: mfaMethods
      },
      create: {
        electionId,
        mfaEnabled: mfaMethods.length > 0,
        mfaMethods: mfaMethods
      }
    });

    return apiResponse({
      success: true,
      message: `MFA settings updated successfully for ${election.name}`,
      data: {
        mfaEnabled: mfaSettings.mfaEnabled,
        mfaMethods: mfaSettings.mfaMethods
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Error updating MFA settings:", error);
    return apiResponse({
      success: false,
      message: "Failed to update MFA settings",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
