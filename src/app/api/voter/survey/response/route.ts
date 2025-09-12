import { NextRequest } from "next/server";
import { withPerformanceLogging } from "@/lib/performance/middleware";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const surveyResponseSchema = z.object({
  formId: z.number(),
  answers: z.record(z.any()), // Survey answers as key-value pairs
  voterCode: z.string(), // Voter code for verification
});

async function submitSurveyResponse(request: NextRequest) {
  const body = await request.json();
  const validation = validateWithZod(surveyResponseSchema, body);
  if (!(validation as any).success) return validation as any;
  const { formId, answers, voterCode } = (validation as any).data;

  // Verify the voter exists using the provided voter code
  const voter = await db.voter.findFirst({
    where: { 
      code: voterCode,
      isDeleted: false 
    },
  });

  if (!voter) {
    return apiResponse({ 
      success: false, 
      message: "Invalid voter code", 
      status: 403 
    });
  }

  // Verify the survey exists and is active
  const survey = await db.surveyForm.findFirst({
    where: { 
      id: formId,
      isActive: true, 
      isDeleted: false 
    },
  });

  if (!survey) {
    return apiResponse({ 
      success: false, 
      message: "Survey not found or not active", 
      status: 404 
    });
  }

  // Check if voter has already submitted a response to this survey
  const existingResponse = await db.surveyResponse.findFirst({
    where: {
      formId,
      voterId: voter.id,
    },
  });

  if (existingResponse) {
    return apiResponse({ 
      success: false, 
      message: "You have already submitted a response to this survey", 
      status: 400 
    });
  }

  // Create the survey response
  const surveyResponse = await db.surveyResponse.create({
    data: {
      formId,
      voterId: voter.id,
      answers,
    },
  });

  // Create audit log for the survey submission
  await createAuditLog({ 
    user: voter, 
    action: "CREATE", 
    request, 
    resource: "SURVEY_RESPONSE" as any, 
    resourceId: surveyResponse.id,
    newData: {
      formId,
      voterId: voter.id,
      answersCount: Object.keys(answers).length, // Store count instead of full answers for privacy
    },
    message: `Voter submitted survey response for survey: ${survey.title}` 
  });

  return apiResponse({ 
    success: true, 
    message: "Survey response submitted successfully", 
    data: { response: surveyResponse }, 
    status: 201 
  });
}

export const POST = withPerformanceLogging(submitSurveyResponse as any);
