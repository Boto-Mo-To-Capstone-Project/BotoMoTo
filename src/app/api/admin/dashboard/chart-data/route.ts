import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/helpers/requireAuth";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";

/**
 * GET /api/admin/dashboard/chart-data
 * 
 * Returns chart data for election turnout trends
 * Shows voter turnout trends for template elections across years
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user - admin only
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Get admin's organization
    const organization = await db.organization.findUnique({
      where: { 
        adminId: user.id,
        isDeleted: false 
      },
      select: { id: true }
    });

    if (!organization) {
      return apiResponse({
        success: false,
        message: "Organization not found for admin",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Get all templates with their instances (including template as first instance)
    const templates = await db.election.findMany({
      where: { 
        orgId: organization.id,
        isTemplate: true,
        isDeleted: false
      },
      select: {
        id: true,
        name: true,
        instanceYear: true, // Template's own year (serves as first instance)
        status: true,
        voters: {
          where: { isDeleted: false },
          select: {
            id: true,
            voteResponses: {
              select: { id: true }
            }
          }
        },
        // Get instances (elections created from this template)
        instances: {
          where: { 
            status: ELECTION_STATUS.CLOSED, // Only completed elections
            isDeleted: false 
          },
          select: {
            id: true,
            instanceYear: true,
            instanceName: true,
            voters: {
              where: { isDeleted: false },
              select: {
                id: true,
                voteResponses: {
                  select: { id: true }
                }
              }
            }
          },
          orderBy: { instanceYear: 'asc' }
        }
      }
    });

    // Transform data for chart
    const chartData = {
      categories: [] as number[],
      series: [] as Array<{
        name: string;
        data: (number | null)[];
      }>
    };

    // Get all unique years from all templates and instances
    const allYears = new Set<number>();
    templates.forEach(template => {
      // Include template's own year if it exists and is completed
      if (template.instanceYear && template.status === ELECTION_STATUS.CLOSED) {
        allYears.add(template.instanceYear);
      }
      // Include instance years
      template.instances.forEach(instance => {
        if (instance.instanceYear) {
          allYears.add(instance.instanceYear);
        }
      });
    });

    const sortedYears = Array.from(allYears).sort();
    chartData.categories = sortedYears;

    // Create series for each template that has data (template itself or instances)
    templates.forEach(template => {
      const hasTemplateData = template.instanceYear && template.status === ELECTION_STATUS.CLOSED;
      const hasInstanceData = template.instances.length > 0;
      
      if (hasTemplateData || hasInstanceData) {
        const templateData = {
          name: template.name,
          data: [] as (number | null)[]
        };

        // For each year, find the turnout for this template
        sortedYears.forEach(year => {
          let turnout: number | null = null;

          // Check if this year matches the template's own year
          if (template.instanceYear === year && template.status === ELECTION_STATUS.CLOSED) {
            const totalVoters = template.voters.length;
            const votersWithResponses = template.voters.filter(v => v.voteResponses.length > 0).length;
            turnout = totalVoters > 0 ? Number(((votersWithResponses / totalVoters) * 100).toFixed(2)) : 0;
          } else {
            // Check instances for this year
            const instance = template.instances.find(i => i.instanceYear === year);
            if (instance) {
              const totalVoters = instance.voters.length;
              const votersWithResponses = instance.voters.filter(v => v.voteResponses.length > 0).length;
              turnout = totalVoters > 0 ? Number(((votersWithResponses / totalVoters) * 100).toFixed(2)) : 0;
            }
          }

          templateData.data.push(turnout);
        });

        chartData.series.push(templateData);
      }
    });

    return apiResponse({
      success: true,
      message: "Chart data retrieved successfully",
      data: { chartData },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Chart data error:", error);
    return apiResponse({
      success: false,
      message: "Failed to retrieve chart data",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
