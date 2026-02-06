import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { uploadFile, generateObjectKey } from "@/lib/storage";

// Handle PUT request for profile image upload
export async function PUT(request: NextRequest) {
  try {
    // Authenticate the user - any logged in user can update their own profile image
    const authResult = await requireAuth([ROLES.VOTER, ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const formData = await request.formData();
    const imageFile = formData.get('profileImage') as File | null;

    if (!imageFile) {
      return apiResponse({
        success: false,
        message: "No image file provided",
        status: 400,
      });
    }

    // Validate file type and size
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'];
    
    if (imageFile.size > maxSize) {
      return apiResponse({
        success: false,
        message: "File size must be less than 5MB",
        status: 400,
      });
    }
    
    if (!allowedTypes.includes(imageFile.type)) {
      return apiResponse({
        success: false,
        message: "Please upload a valid image file (PNG, JPG, JPEG, GIF, WebP)",
        status: 400,
      });
    }

    // Generate standardized object key for storage
    const imageKey = generateObjectKey('profiles', user.id, 'avatar', imageFile.name);
    
    // Convert file to buffer
    const imageBuffer = await imageFile.arrayBuffer();
    
    // Upload file using storage-agnostic system (S3 + local fallback)
    const imageUpload = await uploadFile(Buffer.from(imageBuffer), imageKey, {
      contentType: imageFile.type,
      metadata: { 
        userId: user.id.toString(),
        originalName: imageFile.name,
        uploadType: 'profile_image'
      }
    });

    // Log which provider was used (for monitoring)
    console.log(`📤 Profile image uploaded - Provider: ${imageUpload.provider}`);

    // Get current user data for audit log
    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: { image: true }
    });

    // Update user's profile image in database (store S3 key for session-based signed URLs)
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { image: imageUpload.key }, // Store S3 key, session will generate signed URLs
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            membersCount: true,
            status: true
          }
        }
      }
    });

    // Create audit log for profile image update
    await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "USER",
      resourceId: user.id,
      changedFields: {
        image: { old: currentUser?.image, new: imageUpload.key }
      },
      message: "Profile image updated"
    });

    return apiResponse({
      success: true,
      message: "Profile image updated successfully",
      data: updatedUser,
      status: 200,
    });

  } catch (error) {
    console.error("Error updating profile image:", error);
    return apiResponse({
      success: false,
      message: "Failed to update profile image",
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    });
  }
}

// Handle DELETE request to remove profile image
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.VOTER, ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Get current user data for audit log
    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: { image: true }
    });

    // Update user's profile image to null
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { image: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            membersCount: true,
            status: true
          }
        }
      }
    });

    // Create audit log for profile image removal
    await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "USER",
      resourceId: user.id,
      changedFields: {
        image: { old: currentUser?.image, new: null }
      },
      message: "Profile image removed"
    });

    return apiResponse({
      success: true,
      message: "Profile image removed successfully",
      data: updatedUser,
      status: 200,
    });

  } catch (error) {
    console.error("Error removing profile image:", error);
    return apiResponse({
      success: false,
      message: "Failed to remove profile image",
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    });
  }
}
