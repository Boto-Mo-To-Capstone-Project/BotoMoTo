import { NextRequest } from "next/server";
import { withPerformanceLogging } from "@/lib/performance/middleware";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { ROLES } from "@/lib/constants";
import { createAuditLog } from "@/lib/audit";

async function getSurveyResponses(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
  if (!authResult.authorized) return authResult.response;
  const user = authResult.user;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return apiResponse({ 
      success: false, 
      message: "Invalid survey ID", 
      error: "Bad Request", 
      status: 400 
    });
  }

  // Verify the survey exists
  const survey = await db.surveyForm.findFirst({
    where: { 
      id, 
      isDeleted: false 
    },
  });

  if (!survey) {
    return apiResponse({ 
      success: false, 
      message: "Survey not found", 
      error: "Not Found", 
      status: 404 
    });
  }

  // Fetch survey responses with voter information
  const responses = await db.surveyResponse.findMany({
    where: {
      formId: id,
    },
    include: {
      voter: {
        select: {
          id: true,
          code: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  // Format the response data
  const formattedResponses = responses.map(response => ({
    id: response.id,
    voterId: response.voterId,
    voterCode: response.voter.code,
    voterName: `${response.voter.firstName} ${response.voter.lastName}`.trim(),
    submittedAt: response.submittedAt,
    answers: response.answers,
  }));

  // Create audit log
  await createAuditLog({ 
    user, 
    action: "READ", 
    request, 
    resource: "SURVEY_RESPONSE" as any, 
    resourceId: id,
    message: `Viewed responses for survey: ${survey.title}` 
  });

  return apiResponse({ 
    success: true, 
    message: "Survey responses fetched successfully", 
    data: { 
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        formSchema: survey.formSchema,
        isActive: survey.isActive,
      },
      responses: formattedResponses,
      count: formattedResponses.length,
    }, 
    status: 200 
  });
}

export const GET = withPerformanceLogging(getSurveyResponses as any);
