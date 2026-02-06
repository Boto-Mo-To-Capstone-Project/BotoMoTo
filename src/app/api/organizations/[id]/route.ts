import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES, ALLOWED_FILE_TYPES, FILE_LIMITS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { organizationSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { checkOwnership } from "@/lib/helpers/checkOwnership";
import { findOrganizationById } from "@/lib/helpers/findOrganizationById";
import { extname } from 'path';

// Import storage system (replaces fs operations)
import { uploadFile, generatePublicUrl, generatePresignedUrl, generateObjectKey } from "@/lib/storage";

/**
 * Transform organization data to include dynamically generated URLs
 * Uses the new storage system to generate public/presigned URLs from object keys
 */
async function transformOrganizationWithUrls(organization: any) {
  try {
    const transformed = { ...organization };
    
    // Generate logo URL if object key exists
    if (organization.logoObjectKey) {
      transformed.logoUrl = generatePublicUrl(
        organization.logoObjectKey, 
        organization.logoProvider
      );
    }
    
    // Generate letter URL if object key exists (presigned for security)
    if (organization.letterObjectKey) {
      transformed.letterUrl = await generatePresignedUrl(
        organization.letterObjectKey,
        3600, // 1 hour expiration
        organization.letterProvider
      );
    }
    
    return transformed;
  } catch (error) {
    console.error('Error generating URLs for organization:', error);
    // Return organization without dynamic URLs if generation fails
    return organization;
  }
}  

// Handle GET request for specific organization (admin and superadmin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const user = authResult.user;

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

    const { organization, response } = await findOrganizationById(organizationId);
    if (!organization) {
      return response;
    }

    // Admin can only view their own organization, superadmin can view any
    const isOwner = checkOwnership(user, organization.adminId);
    if (!isOwner.allowed) {
      return isOwner.response;
    }

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "ORGANIZATION",
      resourceId: organization.id,
      message: user.role === ROLES.SUPER_ADMIN 
        ? "Viewed organization details (superadmin)"
        : "Viewed own organization details (admin)",
    });

    // Transform organization data to include dynamic URLs
    const transformedOrg = await transformOrganizationWithUrls(organization);

    return apiResponse({
      success: true,
      message: "Organization details fetched successfully",
      data: transformedOrg,
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Get organization error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch organization details",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle PUT request to update specific organization with file uploads
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const user = authResult.user;

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

    const { organization, response } = await findOrganizationById(organizationId);
    if (!organization) return response;

    // Admin can only update their own organization, superadmin can edit others
    const isOwner = checkOwnership(user, organization.adminId);
    if (!isOwner.allowed) {
      return isOwner.response;
    }

    // Parse multipart form data
    const formData = await request.formData();
    
    // Extract text fields
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const membersCount = formData.get('membersCount') as string;
    
    // Extract files (optional for updates)
    const logoFile = formData.get('logo') as File | null;
    const letterFile = formData.get('letter') as File | null;

    // Validate required text fields
    if (!name || !email || !membersCount) {
      return apiResponse({ 
        success: false, 
        message: "Missing required fields: name, email, membersCount", 
        error: "Bad Request", 
        status: 400 
      });
    }

    let logoObjectKey = organization.logoObjectKey; // Keep existing if no new file
    let letterObjectKey = organization.letterObjectKey; // Keep existing if no new file
    let logoProvider = organization.logoProvider; // Keep existing provider
    let letterProvider = organization.letterProvider; // Keep existing provider

    // Handle logo file upload if provided
    if (logoFile && logoFile.size > 0) {
      // Validate logo file
      if (!(ALLOWED_FILE_TYPES.IMAGES as readonly string[]).includes(logoFile.type)) {
        return apiResponse({ 
          success: false, 
          message: "Invalid logo file type. Only images are allowed.", 
          error: "Bad Request", 
          status: 400 
        });
      }

      if (logoFile.size > FILE_LIMITS.IMAGE_MAX_SIZE) {
        return apiResponse({ 
          success: false, 
          message: "Logo file too large", 
          error: "Bad Request", 
          status: 400 
        });
      }

      // Upload new logo using storage system (no metadata stored)
      const logoKey = generateObjectKey('organizations', user.id, 'logo', logoFile.name);
      const logoBuffer = await logoFile.arrayBuffer();
      
      const logoUpload = await uploadFile(Buffer.from(logoBuffer), logoKey, {
        contentType: logoFile.type,
        isPublic: true // Logos are public
      });

      logoObjectKey = logoUpload.key;
      logoProvider = logoUpload.provider;
      
      console.log(`📤 Logo updated - Provider: ${logoUpload.provider}, Key: ${logoUpload.key}`);
    }

    // Handle letter file upload if provided
    if (letterFile && letterFile.size > 0) {
      // Validate letter file
      if (letterFile.type !== ALLOWED_FILE_TYPES.PDF[0]) {
        return apiResponse({ 
          success: false, 
          message: "Invalid letter file type. Only PDF files are allowed.", 
          error: "Bad Request", 
          status: 400 
        });
      }

      if (letterFile.size > FILE_LIMITS.PDF_MAX_SIZE) {
        return apiResponse({ 
          success: false, 
          message: "Letter file too large", 
          error: "Bad Request", 
          status: 400 
        });
      }

      // Upload new letter using storage system (no metadata stored)
      const letterKey = generateObjectKey('organizations', user.id, 'letter', letterFile.name);
      const letterBuffer = await letterFile.arrayBuffer();
      
      const letterUpload = await uploadFile(Buffer.from(letterBuffer), letterKey, {
        contentType: letterFile.type,
        isPublic: false // Letters are private
      });

      letterObjectKey = letterUpload.key;
      letterProvider = letterUpload.provider;
      
      console.log(`📤 Letter updated - Provider: ${letterUpload.provider}, Key: ${letterUpload.key}`);
    }

    // Validate organization data (no URLs needed, we store object keys)
    const orgData = {
      name,
      email,
      membersCount: Number(membersCount),
      // Storage-agnostic fields for validation
      logoObjectKey: logoObjectKey || organization.logoObjectKey,
      logoProvider: logoProvider || organization.logoProvider,
      letterObjectKey: letterObjectKey || organization.letterObjectKey,
      letterProvider: letterProvider || organization.letterProvider,
    };

    const validation = validateWithZod(organizationSchema, orgData);
    if (!('data' in validation)) return validation;

    // Check if organization name already exists (excluding current org)
    const nameExists = await db.organization.findFirst({
      where: {
        name,
        isDeleted: false,
        NOT: {
          id: organizationId
        }
      }
    });

    if (nameExists) {
      return apiResponse({
        success: false,
        message: "Organization name already exists",
        data: null,
        error: "Conflict",
        status: 409
      });
    }

    // Store old data for audit comparison
    const oldData = {
      name: organization.name,
      email: organization.email,
      membersCount: organization.membersCount,
      logoObjectKey: organization.logoObjectKey,
      letterObjectKey: organization.letterObjectKey,
    };

    const updatedOrg = await db.organization.update({
      where: { id: organizationId },
      data: {
        name,
        email,
        membersCount: Number(membersCount),
        // Store object keys and providers instead of URLs
        logoObjectKey,
        letterObjectKey,
        logoProvider,
        letterProvider,
        // metadata fields removed
        // NOTE: removed legacy URL fields; only object keys/providers are stored
      },
      include: { 
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        }
      },
    });

    // Compare and log changed fields
    const changedFields: Record<string, { old: any; new: any }> = {};
    for (const key of ["name", "email", "membersCount", "logoObjectKey", "letterObjectKey"] as const) {
      if (oldData[key] !== updatedOrg[key]) {
        changedFields[key] = { old: oldData[key], new: updatedOrg[key] };
      }
    }

    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "ORGANIZATION",
      resourceId: updatedOrg.id,
      changedFields,
      message: user.role === ROLES.SUPER_ADMIN 
        ? "Updated organization with files (superadmin)"
        : "Updated own organization with files (admin)",
    });

    // Transform organization data to include dynamic URLs
    const transformedOrg = await transformOrganizationWithUrls(updatedOrg);

    return apiResponse({
      success: true,
      message: "Organization updated successfully",
      data: { organization: transformedOrg, audit },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Organization update error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update organization",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to soft-delete specific organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const user = authResult.user;

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

    const { organization, response } = await findOrganizationById(organizationId);
    if (!organization) return response;

    // Admin can only delete their own organization, superadmin can delete others
    const isOwner = checkOwnership(user, organization.adminId);
    if (!isOwner.allowed) {
      return isOwner.response;
    }

    // Check if organization has elections
    if (organization._count.elections > 0) {
      return apiResponse({
        success: false,
        message: "Cannot delete organization that has elections",
        data: { 
          electionCount: organization._count.elections 
        },
        error: "Conflict",
        status: 409
      });
    }

    // Soft delete organization
    const deletedOrg = await db.organization.update({
      where: { id: organizationId },
      data: { 
        isDeleted: true, 
        deletedAt: new Date() 
      }
    });

    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "ORGANIZATION",
      resourceId: deletedOrg.id,
      deletionType: "SOFT",
      message: user.role === ROLES.SUPER_ADMIN 
        ? "Deleted organization (superadmin)"
        : "Deleted own organization (admin)",
    });

    return apiResponse({ success: true, message: "Organization deleted successfully", data: deletedOrg, error: null, status: 200 });
  } catch (error) {
    return apiResponse({ success: false, message: "Failed to delete organization", data: null, error: error instanceof Error ? error.message : "Internal server error", status: 500 });
  }
}
