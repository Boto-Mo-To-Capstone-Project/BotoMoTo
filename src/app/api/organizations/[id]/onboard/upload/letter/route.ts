import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { writeFile, mkdir, unlink, stat } from 'fs/promises';
import { join, extname } from 'path';
import { ALLOWED_FILE_TYPES, FILE_LIMITS, AUDIT_ACTIONS } from '@/lib/constants';
import { createAuditLog } from '@/lib/audit';
import { apiResponse } from '@/lib/apiResponse';
import { ROLES } from '@/lib/constants';
import db from '@/lib/db/db';

const UPLOAD_DIR = 'src/app/assets/onboard/letter/';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(); 
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to upload a letter",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    const { id } = await params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return apiResponse({
        success: false,
        message: "Invalid organization ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const organization = await db.organization.findUnique({
      where: { 
        id: organizationId,
        isDeleted: false
      },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        },
        elections: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            elections: true
          }
        }
      },
    });

    if (!organization) {
      return apiResponse({
        success: false,
        message: "Organization not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Admin can only upload on their own organization, superadmin can upload n
    if (user.role === ROLES.ADMIN && organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only upload on your own organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Only admin and superadmin can access this endpoint
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "You do not have permission to view organization details",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const adminId = session.user.id || 'unknownadmin';

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File) || !file.name || file.size === 0) {
      return apiResponse({ success: false, message: 'No file uploaded', data: null, error: 'Bad Request', status: 400 });
    }
    
    if (file.type !== ALLOWED_FILE_TYPES.PDF[0]) {
      return apiResponse({ success: false, message: 'Invalid file type', data: null, error: 'Bad Request', status: 400 });
    }

    if (file.size > FILE_LIMITS.PDF_MAX_SIZE) {
      return apiResponse({ success: false, message: 'File too large', data: null, error: 'Bad Request', status: 400 });
    }

    const ext = extname(file.name).toLowerCase();
    const filename = `org-${organizationId}_admin-${adminId}_letter${ext}`;
    const saveDir = join(process.cwd(), UPLOAD_DIR);
    const savePath = join(saveDir, filename);

    await mkdir(saveDir, { recursive: true });

    try {
      await stat(savePath);
      await unlink(savePath);
    } catch {
      // File doesn't exist, no need to delete
    }

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(savePath, Buffer.from(arrayBuffer));

    const audit = await createAuditLog({
      user,
      action: "UPLOAD",
      request,
      resource: "ORGANIZATION",
      resourceId: organizationId,
      newData: { filename, path: `/assets/onboard/letter/${filename}` },
      message: `Uploaded organization letter for org ${organizationId}`,
    });

    return apiResponse({
      success: true,
      message: "Letter uploaded successfully",
      data: { 
        path: `/assets/onboard/letter/${filename}`,
        audit
      },
      error: null,
      status: 201
    });
  } catch (error) {
    console.error("Error uploading letter:", error);
    return apiResponse({
      success: false,
      message: "Error uploading letter",
      data: null,
      error: typeof error === 'string' ? error : 'Internal Server Error',
      status: 500
    });
  }
}
