import { NextRequest, NextResponse } from 'next/server';
import { emailDatabase } from '@/lib/email/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'logs';
    
    if (action === 'stats') {
      // Get email statistics
      const organizationId = searchParams.get('organizationId');
      const electionId = searchParams.get('electionId');
      const days = parseInt(searchParams.get('days') || '7');
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const stats = await emailDatabase.getEmailStats({
        organizationId: organizationId ? parseInt(organizationId) : undefined,
        electionId: electionId ? parseInt(electionId) : undefined,
        startDate,
      });
      
      return NextResponse.json({ stats });
    }
    
    if (action === 'suppressions') {
      // Get suppressed emails
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');
      const organizationId = searchParams.get('organizationId');
      
      const suppressions = await emailDatabase.getSuppressedEmails({
        organizationId: organizationId ? parseInt(organizationId) : undefined,
        limit,
        offset,
      });
      
      return NextResponse.json({ suppressions });
    }
    
    if (action === 'cleanup') {
      // Cleanup expired suppressions
      const cleaned = await emailDatabase.cleanupExpiredSuppressions();
      return NextResponse.json({ 
        message: `Cleaned up ${cleaned} expired suppressions`,
        cleaned 
      });
    }
    
    // Default: Get email logs
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const organizationId = searchParams.get('organizationId');
    const electionId = searchParams.get('electionId');
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const toEmail = searchParams.get('toEmail');
    const templateId = searchParams.get('templateId');
    
    const logs = await emailDatabase.getEmailLogs({
      organizationId: organizationId ? parseInt(organizationId) : undefined,
      electionId: electionId ? parseInt(electionId) : undefined,
      status: status as any,
      provider: provider || undefined,
      toEmail: toEmail || undefined,
      templateId: templateId || undefined,
      limit,
      offset,
    });
    
    return NextResponse.json({ logs });
    
  } catch (error) {
    console.error('Email database API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database operation failed' },
      { status: 500 }
    );
  }
}
