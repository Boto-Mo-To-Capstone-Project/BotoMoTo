import { NextRequest, NextResponse } from "next/server";
import { getUnifiedSession } from "@/lib/getUnifiedSession";

export async function GET(request: NextRequest) {
  try {
    const user = await getUnifiedSession(request);
    if (user) {
      return NextResponse.json({ success: true, user });
    }
    return NextResponse.json({ success: false, user: null, message: "Not authenticated" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
} 