import { NextRequest, NextResponse } from 'next/server';
import { templateEngine } from '@/lib/email/templates';
import { templateRegistry } from '@/lib/email/templates/registry';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('template');
    
    if (!templateId) {
      // List available templates
      const templates = await templateEngine.list();
      return NextResponse.json({ 
        templates,
        available: Object.keys(templateRegistry)
      });
    }
    
    // Load template if not already registered
    if (!(await templateEngine.exists(templateId))) {
      const template = templateRegistry[templateId];
      if (!template) {
        return NextResponse.json(
          { error: `Template "${templateId}" not found` },
          { status: 404 }
        );
      }
      templateEngine.register(templateId, template);
    }
    
    // Use preview props from template or defaults
    const template = templateRegistry[templateId];
    const variables = template?.previewProps || {
      voterName: 'John Doe',
      electionName: 'Sample Election',
      votingCode: 'ABC123XYZ',
      startDate: 'March 1, 2025',
      endDate: 'March 7, 2025'
    };
    
    // Render template
    const result = await templateEngine.render(templateId, variables);
    
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
