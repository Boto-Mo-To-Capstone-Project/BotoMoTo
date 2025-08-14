import { NextRequest } from "next/server";
import { withPerformanceLogging } from "@/lib/performance/middleware";
import { requireAuth } from "@/lib/helpers/requireAuth";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";
import { surveyFormCreateSchema } from "@/lib/schema";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import { ROLES } from "@/lib/constants";

async function listSurveys(request: NextRequest) {
  const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
  if (!authResult.authorized) return authResult.response;
  const user = authResult.user;

  const surveys = await db.surveyForm.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "desc" },
  });

  await createAuditLog({ user, action: "READ", request, resource: "ELECTION" as any, message: "List surveys" });

  return apiResponse({ success: true, message: "Surveys fetched", data: { surveys }, status: 200 });
}

async function createSurvey(request: NextRequest) {
  const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
  if (!authResult.authorized) return authResult.response;
  const user = authResult.user;

  const body = await request.json();
  const validation = validateWithZod(surveyFormCreateSchema, body);
  if (!(validation as any).success) return validation as any;
  const { title, description = "", formSchema, isActive = false } = (validation as any).data;

  const survey = await db.surveyForm.create({
    data: {
      title,
      description,
      formSchema,
      isActive,
    },
  });

  await createAuditLog({ user, action: "CREATE", request, resource: "ELECTION" as any, resourceId: survey.id, newData: survey, message: `Created survey: ${title}` });

  return apiResponse({ success: true, message: "Survey created", data: { survey }, status: 201 });
}

export const GET = withPerformanceLogging(listSurveys as any);
export const POST = withPerformanceLogging(createSurvey as any);
