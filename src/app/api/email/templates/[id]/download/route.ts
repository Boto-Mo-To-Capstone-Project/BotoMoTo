import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/db';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { ROLES } from '@/lib/constants';

// GET - Download template file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) {
        return authResult.response;
    }
    const user = authResult.user;

    const templateId = (await params).id;

    // Find the template
    const template = await db.emailTemplate.findFirst({
      where: {
        id: templateId,
        organizationId: user.organization.id,
        type: 'CUSTOM'
      },
      select: {
        id: true,
        name: true,
        htmlContent: true
      }
    });

    if (!template || !template.htmlContent) {
      return NextResponse.json(
        { success: false, message: 'Template not found or has no content' },
        { status: 404 }
      );
    }

    // Serve HTML content directly from database
    const htmlBuffer = Buffer.from(template.htmlContent, 'utf-8');
    
    return new NextResponse(htmlBuffer, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${template.name || 'template'}.html"`,
        'Content-Length': htmlBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error downloading template:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to download template' },
      { status: 500 }
    );
  }
}
