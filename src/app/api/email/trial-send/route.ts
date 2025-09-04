import { NextRequest, NextResponse } from 'next/server';
import { ROLES } from "@/lib/constants";
import { createEmailService } from '@/lib/email';
import { requireAuth } from '@/lib/helpers/requireAuth';
import db from "@/lib/db/db";

/**
 * Trial Email Send Endpoint
 * 
 * Sends a test email using the specified template with provided data
 * to a user-specified email address. This allows users to preview
 * how their template will look with real data before sending to all voters.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user

    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) {
        return authResult.response;
    }
    const user = authResult.user;

    const body = await request.json();
    const { templateId, recipientEmail, recipientName, templateData, electionId } = body;


    console.log('[Trial Email Send] Request body:', body);
    
    // Validate required fields
    if (!templateId) {
      return NextResponse.json({
        success: false,
        message: 'Template ID is required'
      }, { status: 400 });
    }

    if (!recipientEmail) {
      return NextResponse.json({
        success: false,
        message: 'Recipient email is required'
      }, { status: 400 });
    }

    // Get organization ID for template lookup
    const organizationId = user.organization?.id;
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        message: 'User is not associated with an organization'
      }, { status: 400 });
    }

    // Enrich template data with real data from database
    const enrichedTemplateData = { ...templateData };
    
    // Always use organization name from user's database record
    enrichedTemplateData.organizationName = user.organization.name;
    
    // If electionId is provided, get real election data
    if (electionId) {
      try {
        const election = await db.election.findFirst({
          where: {
            id: parseInt(electionId),
            orgId: organizationId // Use orgId instead of organization.adminId
          },
          include: {
            schedule: true
          }
        });

        if (election) {
          // Import the schedule formatter
          const { formatElectionSchedule } = await import("@/lib/email/templates/data");
          
          const scheduleData = election.schedule 
            ? formatElectionSchedule(election.schedule.dateStart, election.schedule.dateFinish)
            : { startDate: 'TBD', endDate: 'TBD', expiryDate: 'End of voting period' };

          // Use real election data
          enrichedTemplateData.electionTitle = election.name;
          enrichedTemplateData.startDate = scheduleData.startDate;
          enrichedTemplateData.endDate = scheduleData.endDate;
          enrichedTemplateData.expiryDate = scheduleData.expiryDate;
        }
      } catch (error) {
        console.warn('[Trial Email Send] Could not fetch election data:', error);
      }
    }

    console.log('[Trial Email Send] Starting trial send...', {
      templateId,
      recipientEmail,
      recipientName: recipientName || 'Test User'
    });

    const emailService = await createEmailService();

    // Send the template email
    const result = await emailService.sendTemplate(
      templateId,
      enrichedTemplateData,
      { 
        email: recipientEmail, 
        name: recipientName || 'Test User' 
      },
      { organizationId }
    );

    console.log('[Trial Email Send] Success:', {
      messageId: result.id,
      templateId,
      recipientEmail
    });

    return NextResponse.json({
      success: true,
      message: `Trial email sent successfully to ${recipientEmail}`,
      data: {
        messageId: result.id,
        templateId,
        recipientEmail,
        recipientName: recipientName || 'Test User'
      }
    });

  } catch (error) {
    console.error('[Trial Email Send] Error:', error);
    
    // Handle specific error types
    let errorMessage = 'Failed to send trial email';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle validation errors
      if (error.message.includes('Template') && error.message.includes('not found')) {
        statusCode = 404;
        errorMessage = `Template not found`;
      } else if (error.message.includes('Invalid email')) {
        statusCode = 400;
        errorMessage = 'Invalid recipient email address';
      }
    }

    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: error instanceof Error ? error.message : String(error)
    }, { status: statusCode });
  }
}
