import { NextRequest, NextResponse } from 'next/server';
import { createEmailService, initializeTemplates } from '@/lib/email';

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
      // Test template rendering
      const result = await emailService.sendTemplate(
        'voting-code',
        {
          voterName: 'Test User',
          electionName: 'Test Election',
          votingCode: 'TEST123',
          startDate: 'March 1, 2025',
          endDate: 'March 7, 2025',
        },
        { email: 'test@example.com', name: 'Test User' }
      );
      
      return NextResponse.json({ 
        success: true, 
        messageId: result.id,
        message: 'Template email sent successfully'
      });
    }
    
    // Regular test email
    const result = await emailService.send({
      to: { email: 'test@example.com', name: 'Test User' },
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
