// Import necessary modules and constants
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS, ALLOWED_FILE_TYPES, FILE_LIMITS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { organizationSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { checkOwnership } from "@/lib/helpers/checkOwnership";
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';

// Import performance logging middleware
import { withPerformanceLogging } from "@/lib/performance/middleware";

// Handle GET request to fetch organizations (filtered by role)
async function getOrganizations(request: NextRequest) {
  try {
    // Authenticate the user - allow both admin and superadmin
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    let organizations;
    let message;

    if (user.role === ROLES.SUPER_ADMIN) {
      // Super admin can see all organizations
      organizations = await db.organization.findMany({
        where: { isDeleted: false },
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
            },
          },
          _count: {
            select: {
              elections: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
      });
      message = "All organizations fetched successfully (superadmin)";
    } else {
      // Admin can only see their own organization
      organizations = await db.organization.findMany({
        where: { 
          adminId: user.id,
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
            },
          },
          _count: {
            select: {
              elections: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
      });
      message = "Your organizations fetched successfully (admin)";
    }

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "ORGANIZATION",
      message: user.role === ROLES.SUPER_ADMIN 
        ? "Viewed all organizations (superadmin)"
        : "Viewed own organizations (admin)",
    });

    return apiResponse({
      success: true,
      message,
      data: {
        organizations,
        totalCount: organizations.length,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Get organizations error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch organizations",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle POST request to create a new organization with file uploads (admin only)
async function createOrganization(request: NextRequest) {
  try {
    // Authenticate the user - allow both admin and superadmin
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Parse multipart form data
    const formData = await request.formData();
    
    // Extract text fields
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const membersCount = formData.get('membersCount') as string;
    
    // Extract files
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

    // Validate files are provided
    if (!logoFile || !letterFile) {
      return apiResponse({ 
        success: false, 
        message: "Both logo and letter files are required", 
        error: "Bad Request", 
        status: 400 
      });
    }

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

    // Check if the admin already has an organization (including deleted ones)
    const existingOrg = await db.organization.findUnique({
      where: { adminId: user.id },
      include: { admin: true },
    });

    if (existingOrg && !existingOrg.isDeleted) {
      return apiResponse({ 
        success: false, 
        message: "Admin already has an organization", 
        data: { organization: existingOrg }, 
        error: "Conflict", 
        status: 409 
      });
    }

    // Upload files first and get their paths
    const logoExt = extname(logoFile.name).toLowerCase();
    const letterExt = extname(letterFile.name).toLowerCase();
    const timestamp = Date.now();
    
    const logoFilename = `org_${user.id}_${timestamp}_logo${logoExt}`;
    const letterFilename = `org_${user.id}_${timestamp}_letter${letterExt}`;
    
    const logoDir = join(process.cwd(), 'src/app/assets/onboard/logo/');
    const letterDir = join(process.cwd(), 'src/app/assets/onboard/letter/');
    
    const logoPath = join(logoDir, logoFilename);
    const letterPath = join(letterDir, letterFilename);

    // Create directories if they don't exist
    await mkdir(logoDir, { recursive: true });
    await mkdir(letterDir, { recursive: true });

    // Save files
    const logoBuffer = await logoFile.arrayBuffer();
    const letterBuffer = await letterFile.arrayBuffer();
    
    await writeFile(logoPath, Buffer.from(logoBuffer));
    await writeFile(letterPath, Buffer.from(letterBuffer));

    // Create file URLs for database
    const photoUrl = `/assets/onboard/logo/${logoFilename}`;
    const letterUrl = `/assets/onboard/letter/${letterFilename}`;

    // Validate organization data with file URLs
    const orgData = {
      name,
      email,
      membersCount: Number(membersCount),
      photoUrl,
      letterUrl
    };

    const validation = validateWithZod(organizationSchema, orgData);
    if (!('data' in validation)) return validation;

    // If exists but deleted, restore it with new data
    if (existingOrg?.isDeleted) {
      const restoredOrg = await db.organization.update({
        where: { id: existingOrg.id },
        data: { 
          isDeleted: false,
          deletedAt: null,
          name,
          email,
          membersCount: Number(membersCount),
          photoUrl,
          letterUrl,
          status: ORGANIZATION_STATUS.PENDING,
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

      const audit = await createAuditLog({
        user,
        action: "RESTORE",
        request,
        resource: "ORGANIZATION",
        resourceId: restoredOrg.id,
        newData: restoredOrg,
        message: `Restored organization for admin ${user.id}`,
      });

      return apiResponse({
        success: true,
        message: "Organization restored and updated successfully",
        data: { organization: restoredOrg, audit },
        error: null,
        status: 200
      });
    }

    // Check if organization name already exists
    const nameExists = await db.organization.findFirst({
      where: { name, isDeleted: false }
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

    // Create a new organization with uploaded file paths
    const organization = await db.organization.create({
      data: {
        adminId: user.id,
        name,
        email,
        membersCount: Number(membersCount),
        photoUrl,
        letterUrl,
        status: ORGANIZATION_STATUS.PENDING,
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

    const audit = await createAuditLog({
      user,
      action: "CREATE",
      request,
      resource: "ORGANIZATION",
      resourceId: organization.id,
      newData: organization,
      message: `Created organization with files for admin ${user.id}`,
    });

    return apiResponse({ 
      success: true, 
      message: "Organization created successfully with files", 
      data: { organization, audit }, 
      error: null, 
      status: 201 
    });
  } catch (error) {
    console.error("Organization creation error:", error);
    return apiResponse({ success: false, message: "Failed to create organization", data: null, error: typeof error === "string" ? error : "Internal server error", status: 500 });
  }
}

// Apply performance logging middleware to both endpoints
export const GET = withPerformanceLogging(getOrganizations as any);
export const POST = withPerformanceLogging(createOrganization as any);

/*
PERFORMANCE LOGGING ADDED! 🎉

What this captures for Organizations API:
✅ GET /api/organizations - How long it takes to fetch organization data
✅ POST /api/organizations - How long it takes to create organizations (including file uploads)

Metrics captured:
- Response times (will show file upload performance)
- Success/error rates 
- User activity (which admins are most active)
- Peak usage times
- Error patterns

Data will appear in your superadmin analytics dashboard!
*/
