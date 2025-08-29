import { NextRequest, NextResponse } from 'next/server';
import { getStorageService } from '@/lib/storage';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { ROLES } from '@/lib/constants';

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
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: 'Authentication required for file access' },
        { status: 401 }
      );
    }

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
      // For local storage, we'll need to read the file directly
      if (process.env.STORAGE_PROVIDER === 'LOCAL' || !process.env.AWS_S3_BUCKET) {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const localPath = process.env.LOCAL_STORAGE_PATH || './uploads';
        const filePath = path.join(process.cwd(), localPath, objectKey);
        
        // Check if file exists
        try {
          await fs.access(filePath);
        } catch {
          return NextResponse.json(
            { error: 'File not found' },
            { status: 404 }
          );
        }

        // Read file
        const fileBuffer = await fs.readFile(filePath);
        
        // Determine content type from file extension
        const ext = path.extname(objectKey).toLowerCase();
        const contentTypeMap: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.pdf': 'application/pdf',
          '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.txt': 'text/plain',
        };
        
        const contentType = contentTypeMap[ext] || 'application/octet-stream';

        // Return file with appropriate headers
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Disposition': `inline; filename="${path.basename(objectKey)}"`,
          },
        });
      } else {
        // For S3, redirect to the actual S3 URL
        const publicUrl = storage.getPublicUrl(objectKey);
        return NextResponse.redirect(publicUrl);
      }
    } catch (error) {
      console.error('Error serving file:', error);
      return NextResponse.json(
        { error: 'Error serving file' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('File serving error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: 'Access denied. You can only delete your own files.' },
        { status: 403 }
      );
    }

    // Delete file through storage service
    const storage = getStorageService();
    await storage.delete(objectKey);

    return NextResponse.json(
      { success: true, message: 'File deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('File deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
