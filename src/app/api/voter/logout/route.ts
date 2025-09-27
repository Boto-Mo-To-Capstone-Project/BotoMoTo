import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db/db";

const VOTER_SESSION_COOKIE = "voter_session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(VOTER_SESSION_COOKIE)?.value;
    if (sessionToken) {
      await db.voterSession.updateMany({
        where: { sessionToken },
        data: { isActive: false },
      });
    }
    cookieStore.delete(VOTER_SESSION_COOKIE);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Error clearing voter session:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
