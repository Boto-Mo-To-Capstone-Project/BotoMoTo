import { NextRequest } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { apiResponse } from '@/lib/apiResponse';
import { ROLES } from '@/lib/constants';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { findOrganizationById } from '@/lib/helpers/findOrganizationById';
import { checkOwnership } from '@/lib/helpers/checkOwnership';

// this route serves files uploaded by organizations, such as logos and letters
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; type: string; filename: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id, type, filename } = await params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return apiResponse({ success: false, message: "Invalid organization ID", error: "Bad Request", status: 400 });
    }

    // Validate file type
    if (!['logo', 'letter'].includes(type)) {
      return apiResponse({ success: false, message: "Invalid file type", error: "Bad Request", status: 400 });
    }

    // Find the organization
    const { organization, response } = await findOrganizationById(organizationId);
    if (!organization) return response;

    // Check if user is authorized to view files
    const isOwner = checkOwnership(user.id, organization.admin.id);
    if (!isOwner && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({ success: false, message: "You are not authorized to view files for this organization", error: "Forbidden", status: 403 });
    }

    // Construct file path
    const baseDir = `src/app/assets/onboard/${type}/`;
    const filePath = join(process.cwd(), baseDir, filename);

    try {
      // Check if file exists
      await stat(filePath);
      
      // Read the file
      const fileBuffer = await readFile(filePath);
      
      // Determine content type based on file extension
      let contentType = 'application/octet-stream';
      if (filename.toLowerCase().endsWith('.pdf')) {
        contentType = 'application/pdf';
      } else if (filename.toLowerCase().endsWith('.png')) {
        contentType = 'image/png';
      } else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (filename.toLowerCase().endsWith('.gif')) {
        contentType = 'image/gif';
      } else if (filename.toLowerCase().endsWith('.webp')) {
        contentType = 'image/webp';
      }

      // Return the file with appropriate headers
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'private, max-age=0, no-cache, no-store, must-revalidate',
          'Content-Disposition': `inline; filename="${filename}"`,
        },
      });
    } catch (fileError) {
      console.error("File not found:", filePath);
      return apiResponse({ success: false, message: "File not found", error: "Not Found", status: 404 });
    }
  } catch (error) {
    console.error("Error serving file:", error);
    return apiResponse({ success: false, message: "Error serving file", error: error instanceof Error ? error.message : 'Internal Server Error', status: 500 });
  }
}
