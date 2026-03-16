import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db/db";
import { isValidVoterCodeFormat } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body?.code?.toString();

    if (!code) {
      return NextResponse.json({ error: "Voter code is required" }, { status: 400 });
    }

    if (!isValidVoterCodeFormat(code)) {
      return NextResponse.json(
        { error: "Invalid voter code format. Code must be 6 digits." },
        { status: 400 }
      );
    }

    const voter = await db.voter.findUnique({
      where: { code },
      select: {
        id: true,
        isDeleted: true,
        isActive: true,
      },
    });

    if (!voter || voter.isDeleted) {
      return NextResponse.json({ error: "Invalid voter code" }, { status: 404 });
    }

    if (!voter.isActive) {
      return NextResponse.json(
        { error: "Voter account is inactive. Please contact election administrators." },
        { status: 403 }
      );
    }

    const terminated = await db.voterSession.updateMany({
      where: {
        voterId: voter.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Active sessions terminated",
      terminatedCount: terminated.count,
    });
  } catch (error) {
    console.error("Error terminating voter sessions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
