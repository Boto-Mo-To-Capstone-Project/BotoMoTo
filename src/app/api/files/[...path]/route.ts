import { NextRequest, NextResponse } from 'next/server';
import { FileNotFoundError, getStorageService } from '@/lib/storage';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { ROLES } from '@/lib/constants';
import { apiResponse } from '@/lib/apiResponse';

/**
 * Private file serving API endpoint for local storage provider
 * This endpoint serves PRIVATE files stored locally when S3 is not available
 * Public files should be served directly by Vercel or S3 public URLs
 * Enforces user-based access control - users can only access their own files
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const objectKey = path.join('/');
    
    if (!objectKey) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Get the storage service
    const storage = getStorageService();
    
    // Extract user ID from path (format: organizations/USER_ID/fileType/filename)
    const pathParts = path;
    let fileOwnerUserId: string | null = null;
    
    if (pathParts.length >= 2 && pathParts[0] === 'organizations') {
      fileOwnerUserId = pathParts[1]; // User ID from URL
    }
    
    // All files served through this route are considered private
    // Public files should be served directly by Vercel from /public or S3
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;
    
    // Check if user can access this file
    const canAccess = 
      user.role === ROLES.SUPER_ADMIN || // Super admin can access any file
      (fileOwnerUserId && user.id === fileOwnerUserId); // User can only access their own files
    
    if (!canAccess) {
      return NextResponse.json(
        { error: 'Access denied. You can only access your own files.' },
        { status: 403 }
      );
    }
    
    // Try to get the file through the storage service
    try {
      const fileData = await storage.getFile(objectKey);

      return new NextResponse(fileData.buffer, {
        status: 200,
        headers: {
          'Content-Type': fileData.contentType,
          'Cache-Control': 'public, max-age=3600', // Same for all providers
          'Content-Disposition': `inline; filename="${fileData.filename}"`,
        },
      });
    } catch (error) {
      console.error('Error serving file:', error);
      if (error instanceof FileNotFoundError) {
        return apiResponse({ success: false, message: 'File not found', data: null, status: 404 });
      }
      return apiResponse({ success: false, message: 'Error serving file', data: null, status: 500 });
    }
  } catch (error) {
    console.error('File serving error:', error);
    return apiResponse({ success: false, message: 'Internal server error', data: null, status: 500 });
  }
}

// Export other HTTP methods if needed for file management
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Require admin authentication for file deletion
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { path } = await params;
    const objectKey = path.join('/');
    
    if (!objectKey) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Extract user ID from path for ownership verification
    const pathParts = path;
    let fileOwnerUserId: string | null = null;
    
    if (pathParts.length >= 2 && pathParts[0] === 'organizations') {
      fileOwnerUserId = pathParts[1]; // User ID from URL
    }

    const user = authResult.user;
    
    // Check if user can delete this file
    const canDelete = 
      user.role === ROLES.SUPER_ADMIN || // Super admin can delete any file
      (fileOwnerUserId && user.id === fileOwnerUserId); // User can only delete their own files
    
    if (!canDelete) {
      return apiResponse({ success: false, message: 'Access denied. You can only delete your own files.', data: null, status: 403 });
    }

    // Delete file through storage service
    const storage = getStorageService();
    await storage.delete(objectKey);

    return apiResponse({ success: true, message: 'File deleted successfully', data: null, status: 200 });
  } catch (error) {
    console.error('File deletion error:', error);
    return apiResponse({ success: false, message: 'Failed to delete file', data: null, status: 500 });
  }
}
