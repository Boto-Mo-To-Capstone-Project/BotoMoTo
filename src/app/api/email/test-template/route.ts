import { NextRequest, NextResponse } from 'next/server';
import { createEmailService, initializeTemplates } from '@/lib/email';

/**
 * Test template email sending endpoint
 * 
 * Uses Resend's official test email addresses to avoid domain reputation issues:
 * - delivered@resend.dev - Tests successful delivery
 * - delivered+label@resend.dev - Tests with labeling for tracking
 * 
 * GET /api/email/test-template
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'send';
    
    // Initialize templates
    initializeTemplates();
    
    // Get email service
    const emailService = createEmailService();
    
    if (action === 'verify') {
      // Test provider health
      const health = await emailService.verifyProviders();
      return NextResponse.json({ providers: health });
    }
    
    if (action === 'template') {
      // Test template rendering with Resend's test email
      const result = await emailService.sendTemplate(
        'voting-code',
        {
          voterName: 'Test User',
          electionName: 'Test Election',
          votingCode: 'TEST123',
          startDate: 'March 1, 2025',
          endDate: 'March 7, 2025',
        },
        { email: 'delivered+template@resend.dev', name: 'Test User' }
      );
      
      return NextResponse.json({ 
        success: true, 
        messageId: result.id,
        message: 'Template email sent successfully'
      });
    }
    
    // Regular test email with Resend's test address
    const result = await emailService.send({
      to: { email: 'delivered+test@resend.dev', name: 'Test User' },
      subject: 'Test Email from Template System',
      html: '<h1>Test Email</h1><p>This is a test email from the new template system.</p>',
      text: 'Test Email\n\nThis is a test email from the new template system.',
    });
    
    return NextResponse.json({ 
      success: true, 
      messageId: result.id,
      message: 'Email sent successfully'
    });
    
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Email test failed',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
