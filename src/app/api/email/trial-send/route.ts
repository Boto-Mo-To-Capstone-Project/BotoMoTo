import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/lib/email';

/**
 * Trial Email Send Endpoint
 * 
 * Sends a test email using the specified template with provided data
 * to a user-specified email address. This allows users to preview
 * how their template will look with real data before sending to all voters.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, recipientEmail, recipientName, templateData } = body;

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

    if (!templateData) {
      return NextResponse.json({
        success: false,
        message: 'Template data is required'
      }, { status: 400 });
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
      templateData,
      { 
        email: recipientEmail, 
        name: recipientName || 'Test User' 
      }
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
