import { NextRequest } from "next/server";
import { withPerformanceLogging } from "@/lib/performance/middleware";
import { requireAuth } from "@/lib/helpers/requireAuth";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";
import { surveyFormUpdateSchema } from "@/lib/schema";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import { ROLES } from "@/lib/constants";

async function getSurvey(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
  if (!authResult.authorized) return authResult.response;
  const user = authResult.user;

  const id = Number(params.id);
  if (!Number.isFinite(id)) return apiResponse({ success: false, message: "Invalid id", error: "Bad Request", status: 400 });

  const survey = await db.surveyForm.findFirst({ where: { id, isDeleted: false } });
  if (!survey) return apiResponse({ success: false, message: "Survey not found", error: "Not Found", status: 404 });

  await createAuditLog({ user, action: "READ", request, resource: "ELECTION" as any, resourceId: id, message: "Get survey" });

  return apiResponse({ success: true, message: "Survey fetched", data: { survey }, status: 200 });
}

async function updateSurvey(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
  if (!authResult.authorized) return authResult.response;
  const user = authResult.user;

  const id = Number(params.id);
  if (!Number.isFinite(id)) return apiResponse({ success: false, message: "Invalid id", error: "Bad Request", status: 400 });

  const body = await request.json();
  const validation = validateWithZod(surveyFormUpdateSchema, body);
  if (!(validation as any).success) return validation as any;
  const { data } = validation as any;

  // Special handling for publishing (isActive = true)
  if (data.isActive === true) {
    // First, set all other surveys to inactive
    await db.surveyForm.updateMany({
      where: { isDeleted: false },
      data: { isActive: false },
    });
  }

  const survey = await db.surveyForm.update({
    where: { id },
    data,
  });

  await createAuditLog({ user, action: "UPDATE", request, resource: "ELECTION" as any, resourceId: id, newData: survey, message: "Update survey" });

  return apiResponse({ success: true, message: "Survey updated", data: { survey }, status: 200 });
}

async function deleteSurvey(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
  if (!authResult.authorized) return authResult.response;
  const user = authResult.user;

  const id = Number(params.id);
  if (!Number.isFinite(id)) return apiResponse({ success: false, message: "Invalid id", error: "Bad Request", status: 400 });

  const existingSurvey = await db.surveyForm.findFirst({ where: { id, isDeleted: false } });
  if (!existingSurvey) return apiResponse({ success: false, message: "Survey not found", error: "Not Found", status: 404 });

  // Soft delete survey
  const deletedSurvey = await db.surveyForm.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  const audit = await createAuditLog({
    user,
    action: "DELETE",
    request,
    resource: "ELECTION" as any,
    resourceId: deletedSurvey.id,
    message: `Soft deleted survey: ${existingSurvey.title}`,
  });

  return apiResponse({
    success: true,
    message: "Survey soft deleted successfully",
    data: {
      survey: deletedSurvey,
      audit,
    },
    error: null,
    status: 200,
  });
}

export const GET = withPerformanceLogging(getSurvey as any);
export const PUT = withPerformanceLogging(updateSurvey as any);
export const PATCH = withPerformanceLogging(updateSurvey as any);
export const DELETE = withPerformanceLogging(deleteSurvey as any);
