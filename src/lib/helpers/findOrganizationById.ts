// lib/helpers/findOrganizationById.ts
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";

interface FindOrganizationResult {
  organization: any | null;
  response: Response; // ✅ always Response
}

export async function findOrganizationById(id: number): Promise<FindOrganizationResult> {
  const organization = await db.organization.findUnique({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      elections: {
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          elections: true,
        },
      },
    },
  });

  if (!organization) {
    return {
      organization: null,
      response: apiResponse({
        success: false,
        message: "Organization not found or has been deleted",
        error: "Not Found",
        status: 404,
      }),
    };
  }

  return {
    organization,
    response: apiResponse({
      success: true,
      message: "Organization found",
      data: organization,
      status: 200,
    }),
  };
}
