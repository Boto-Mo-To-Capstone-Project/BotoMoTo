import { NextRequest, NextResponse } from 'next/server';
import { templateEngine } from '@/lib/email/templates';
import { templateRegistry } from '@/lib/email/templates/registry';
import db from '@/lib/db/db';
import { requireAuth } from "@/lib/helpers/requireAuth";
import { ROLES } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const user = authResult.user;
    const organizationId = user?.organization.id;

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('template');
    
    if (!templateId) {
      // List available templates (both system and custom)
      const systemTemplates = Object.keys(templateRegistry);
      
      let customTemplates: string[] = [];
      if (organizationId) {
        const customTemplateRecords = await db.emailTemplate.findMany({
          where: {
            organizationId: organizationId
          },
          select: {
            templateId: true
          }
        });
        customTemplates = customTemplateRecords.map(t => t.templateId);
      }
      
      const allTemplates = [...systemTemplates, ...customTemplates];
      
      return NextResponse.json({ 
        templates: allTemplates,
        available: allTemplates
      });
    }
    // Use enhanced render method that can load custom templates
    let variables;
    const systemTemplate = templateRegistry[templateId];
    
    // Always use our custom variables for preview, even if system template has previewProps
    variables = {
      voterName: 'Juan Dela Cruzlsakfjl',
      votingCode: '260422',
      electionTitle: 'Student Council Elections 2024',
      organizationName: 'Sample University',
      expiryDate: 'December 31, 2024 at 11:59 PM',
      startDate: 'December 1, 2024 at 8:00 AM',
      endDate: 'December 15, 2024 at 6:00 PM',
      instructions: 'Visit the voting portal and enter your 6-digit code when prompted.'
    };

    // Try direct render first if it's a system template
    let result;
    if (templateId in templateRegistry) {
      console.log('Attempting direct render of system template');
      try {
        result = await templateEngine.render(templateId, variables);
      } catch (directError) {
        console.log('Direct render failed, attempting render with custom loader', directError);
        result = await templateEngine.renderWithCustomLoader(templateId, variables, organizationId);
      }
    } else {
      console.log('Attempting render with custom loader');
      result = await templateEngine.renderWithCustomLoader(templateId, variables, organizationId);
    }
    
    // Return HTML for preview
    const mode = searchParams.get('mode') || 'html';
    
    if (mode === 'text') {
      return new NextResponse(result.text, {
        headers: { 'Content-Type': 'text/plain' },
      });
    } else if (mode === 'json') {
      return NextResponse.json({
        html: result.html,
        text: result.text,
        subject: result.subject,
        variables
      });
    } else {
      return new NextResponse(result.html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
  } catch (error) {
    console.error('Template preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Template rendering failed' },
      { status: 500 }
    );
  }
}
