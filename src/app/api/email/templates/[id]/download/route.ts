import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/db';
import path from 'path';
import fs from 'fs/promises';
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
      }
    });

    if (!template || !template.filePath) {
      return NextResponse.json(
        { success: false, message: 'Template file not found' },
        { status: 404 }
      );
    }

    // Read file from disk
    const fullPath = path.join(process.cwd(), 'public', template.filePath);
    
    try {
      const fileBuffer = await fs.readFile(fullPath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="${template.fileName || 'template.html'}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    } catch (error) {
      console.error('Error reading template file:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to read template file' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error downloading template:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to download template' },
      { status: 500 }
    );
  }
}
