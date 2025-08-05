import { NextRequest } from 'next/server';
import { writeFile, mkdir, unlink, stat } from 'fs/promises';
import { join, extname } from 'path';
import { ALLOWED_FILE_TYPES, FILE_LIMITS, AUDIT_ACTIONS } from '@/lib/constants';
import { createAuditLog } from '@/lib/audit';
import { apiResponse } from '@/lib/apiResponse';
import { ROLES } from '@/lib/constants';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { findOrganizationById } from '@/lib/helpers/findOrganizationById';
import { checkOwnership } from '@/lib/helpers/checkOwnership';

const UPLOAD_DIR = 'src/app/assets/onboard/logo/';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return apiResponse({ success: false, message: "Invalid organization ID", error: "Bad Request", status: 400 });
    }

    // Find the organization
    const { organization, response } = await findOrganizationById(organizationId);
    if (!organization) return response;

    // Check if user is authorized to upload letter
    const isOwner = checkOwnership(user.id, organization.admin.id);
    if (!isOwner && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({ success: false, message: "You are not authorized to upload letters for this organization", error: "Forbidden", status: 403 });
    }

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
    const filename = `org-${organizationId}_admin-${user.id}_logo${ext}`;
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

    return apiResponse({ success: true, message: "Logo uploaded successfully", data: { path: `/assets/onboard/logo/${filename}`, audit }, status: 201 });
  } catch (error) {
    console.error("Error uploading logo:", error);
    return apiResponse({ success: false, message: "Error uploading logo", error: error instanceof Error ? error.message : 'Internal Server Error', status: 500 });
  }
}
