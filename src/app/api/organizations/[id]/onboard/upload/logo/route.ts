import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth'; // ✅ new v5 way
import { writeFile, mkdir, unlink, stat } from 'fs/promises';
import { join, extname } from 'path';
import { ALLOWED_FILE_TYPES, FILE_LIMITS, AUDIT_ACTIONS } from '@/lib/constants';
import { createAuditLog } from '@/lib/audit';
import { apiResponse } from '@/lib/apiResponse';
import { ROLES } from '@/lib/constants';

const UPLOAD_DIR = 'src/app/assets/onboard/logo/';

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
        message: "You must be logged in to upload a logo",
        
        error: "Unauthorized",
        status: 401
      });
    }

    // Only admin users can upload logos (superadmin should not have affiliated org)
    if (user.role !== ROLES.ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can upload logos",
        
        error: "Forbidden",
        status: 403
      });
    }

    const { id } = await params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return apiResponse({
        success: false,
        message: "Invalid organization ID",
        
        error: "Bad Request",
        status: 400
      });
    }

    const adminId = user.id || 'unknownadmin';

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File) || !file.name || file.size === 0) {      
      return apiResponse({ success: false, message: 'No file uploaded', error: 'Bad Request', status: 400 });
    }

    if (!(ALLOWED_FILE_TYPES.IMAGES as readonly string[]).includes(file.type)) {
      return apiResponse({ success: false, message: 'Invalid file type', error: 'Bad Request', status: 400 });
    }

    if (file.size > FILE_LIMITS.IMAGE_MAX_SIZE) {
      return apiResponse({ success: false, message: 'File too large', error: 'Bad Request', status: 400 });
    }

    const ext = extname(file.name).toLowerCase();
    const filename = `org-${organizationId}_admin-${adminId}_logo${ext}`;
    const saveDir = join(process.cwd(), UPLOAD_DIR);
    const savePath = join(saveDir, filename);

    await mkdir(saveDir, { recursive: true });

    try {
      await stat(savePath);
      await unlink(savePath);
    } catch {
      // File doesn't exist, no problem
    }

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(savePath, Buffer.from(arrayBuffer));

    const audit = await createAuditLog({
      user,
      action: "UPLOAD",
      request,
      resource: "ORGANIZATION",
      resourceId: organizationId,
      newData: {filename, path: `/assets/onboard/logo/${filename}` },
      message: `Uploaded organization logo for org ${organizationId}`,
    });

    return apiResponse({
      success: true,
      message: "Logo uploaded successfully",
      data: { 
        path: `/assets/onboard/logo/${filename}`,
        audit 
      },
      
      status: 201
    });
  } catch (error) {
    console.error("Error uploading logo:", error);
    return apiResponse({
      success: false,
      message: "Error uploading logo",
      
      error: typeof error === 'string' ? error : 'Internal Server Error',
      status: 500
    });
  }
}
