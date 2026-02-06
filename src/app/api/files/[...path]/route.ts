import { NextRequest, NextResponse } from 'next/server';
import { FileNotFoundError, getStorageService } from '@/lib/storage';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { ROLES } from '@/lib/constants';
import { apiResponse } from '@/lib/apiResponse';
import { LocalStorageProvider } from '@/lib/storage/providers/local';

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

    // Check for signed URL token (LOCAL provider) and validate it. If valid, allow access without requiring auth.
    const urlObj = new URL(request.url);
    const token = urlObj.searchParams.get('token');
    const expiresParam = urlObj.searchParams.get('expires');
    let hasValidToken = false;
    if (token && expiresParam) {
      const expiry = parseInt(expiresParam, 10);
      // Validate the token using LocalStorageProvider's helper (static method)
      try {
        if (LocalStorageProvider.validateToken(objectKey, token, expiry)) {
          hasValidToken = true;
        } else {
          return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }
      } catch (e) {
        console.error('Error validating signed URL token:', e);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    // Extract user ID from path based on the file category
    // Format: organizations/USER_ID/fileType/filename
    // Format: candidates/USER_ID/fileType/filename
    const pathParts = path;
    let fileOwnerUserId: string | null = null;
    const isCandidates = pathParts[0] === 'candidates';
    const isOrganizations = pathParts[0] === 'organizations';
    if (pathParts.length >= 2 && (isOrganizations || isCandidates)) {
      fileOwnerUserId = pathParts[1]; // User ID from URL
    }
    
    if (isCandidates){
      // Candidate files are public within the election context
    } else {
      // If we already validated a signed token, skip auth checks
      if (!hasValidToken) {
        // All files of organizations are private
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
      }
    }
      
    // Try to get the file through the storage service
    try {
      const fileData = await storage.getFile(objectKey);

      return new NextResponse(fileData.buffer, {
        status: 200,
        headers: {
          'Content-Type': fileData.contentType,
          'Cache-Control': 'private, max-age=3600', // Same for all providers
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
    const { path } = await params;
    const objectKey = path.join('/');
    
    if (!objectKey) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Extract user ID from path for ownership verification
    // Format: organizations/USER_ID/fileType/filename  
    // Format: candidates/USER_ID/fileType/filename
    const pathParts = path;
    let fileOwnerUserId: string | null = null;
    const isCandidates = pathParts[0] === 'candidates';
    const isOrganizations = pathParts[0] === 'organizations';
    if (pathParts.length >= 2 && (isOrganizations || isCandidates)) {
      fileOwnerUserId = pathParts[1]; // User ID from URL
    }

    if (isCandidates) {
      // Candidate files are public within the election context
    } else {
      // Require admin authentication for file deletion
      const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
      if (!authResult.authorized) {
        return authResult.response;
      }
      const user = authResult.user;
      
      // Check if user can delete this file (organizations files)
      const canDelete = 
        user.role === ROLES.SUPER_ADMIN || // Super admin can delete any file
        (fileOwnerUserId && user.id === fileOwnerUserId); // User can only delete their own files
      
      if (!canDelete) {
        return apiResponse({ success: false, message: 'Access denied. You can only delete your own files.', data: null, status: 403 });
      }
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
