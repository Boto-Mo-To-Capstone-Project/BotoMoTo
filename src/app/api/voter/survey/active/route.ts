import { NextRequest } from "next/server";
import { withPerformanceLogging } from "@/lib/performance/middleware";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";

async function getActiveSurvey(request: NextRequest) {
  const activeSurvey = await db.surveyForm.findFirst({
    where: { 
      isActive: true, 
      isDeleted: false 
    },
    orderBy: { createdAt: "desc" },
  });

  if (!activeSurvey) {
    return apiResponse({ 
      success: false, 
      message: "No active survey found", 
      data: { survey: null }, 
      status: 404 
    });
  }

  return apiResponse({ 
    success: true, 
    message: "Active survey fetched", 
    data: { survey: activeSurvey }, 
    status: 200 
  });
}

export const GET = withPerformanceLogging(getActiveSurvey as any);
