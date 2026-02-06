import { URLGenerationOptions } from './types';
import { getStorageService } from './index';

/**
 * URL generation utilities for stored file object keys
 * Following the object key strategy discussed by the team
 */

/**
 * Generate public URL from stored object key
 * Use this for public files like logos that don't need expiration
 * 
 * @param key - Object key stored in database
 * @param provider - Storage provider (optional, defaults to current primary)
 * @param options - URL generation options
 * @returns Public URL for the file
 * 
 * @example
 * ```typescript
 * // From database: { logoKey: 'organizations/123/logo/1234567890.jpg', logoProvider: 'S3' }
 * const logoUrl = generatePublicUrl(organization.logoKey, organization.logoProvider);
 * // Returns: https://bucket.s3.region.amazonaws.com/organizations/123/logo/1234567890.jpg
 * 
 * // With CloudFront
 * const cdnUrl = generatePublicUrl(organization.logoKey, 'S3', { useCDN: true });
 * // Returns: https://d1234567890.cloudfront.net/organizations/123/logo/1234567890.jpg
 * ```
 */
export function generatePublicUrl(
  key: string, 
  provider?: string, 
  options: URLGenerationOptions = {}
): string {
  if (!key) {
    throw new Error('Object key is required to generate URL');
  }

  const effectiveProvider = provider || process.env.STORAGE_PROVIDER || 'S3';
  
  if (effectiveProvider === 'S3') {
    return generateS3PublicUrl(key, options);
  }
  
  if (effectiveProvider === 'LOCAL') {
    return generateLocalPublicUrl(key, options);
  }
  
  throw new Error(`Unsupported provider for public URL: ${effectiveProvider}`);
}

/**
 * Generate presigned URL from stored object key
 * Use this for private files that need temporary access with expiration
 * 
 * @param key - Object key stored in database
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @param provider - Storage provider (optional, defaults to current primary)
 * @returns Promise with presigned URL
 * 
 * @example
 * ```typescript
 * // From database: { letterKey: 'organizations/123/letter/1234567890.pdf', letterProvider: 'S3' }
 * const letterUrl = await generatePresignedUrl(organization.letterKey, 7200); // 2 hours
 * // Returns: https://bucket.s3.region.amazonaws.com/organizations/123/letter/1234567890.pdf?X-Amz-Signature=...
 * ```
 */
export async function generatePresignedUrl(
  key: string, 
  expiresIn: number = 3600,
  provider?: string
): Promise<string> {
  if (!key) {
    throw new Error('Object key is required to generate presigned URL');
  }

  const storage = getStorageService();
  return storage.getSignedUrl(key, expiresIn);
}

/**
 * Generate S3 public URL
 */
function generateS3PublicUrl(key: string, options: URLGenerationOptions): string {
  const { useCDN, customDomain, secure = true } = options;
  const protocol = secure ? 'https' : 'http';
  
  // Use custom domain if provided
  if (customDomain) {
    return `${protocol}://${customDomain}/${key}`;
  }
  
  // Use CloudFront if configured and requested
  if (useCDN && process.env.CLOUDFRONT_DOMAIN) {
    return `${protocol}://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
  }
  
  // Use direct S3 URL
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || 'us-east-1';
  
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET environment variable is required for S3 URLs');
  }
  
  return `${protocol}://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Generate local storage public URL
 */
function generateLocalPublicUrl(key: string, options: URLGenerationOptions): string {
  const { customDomain, secure = true } = options;
  const protocol = secure ? 'https' : 'http';
  
  if (customDomain) {
    return `${protocol}://${customDomain}/${key}`;
  }
  
  const baseUrl = process.env.LOCAL_BASE_URL || '/api/files';
  const publicPath = process.env.LOCAL_PUBLIC_PATH || '/uploads';
  
  // For relative URLs, use publicPath
  if (baseUrl.startsWith('/')) {
    return `${publicPath}/${key}`;
  }
  
  // For absolute URLs, use baseUrl
  return `${baseUrl}/${key}`;
}

/**
 * Parse object key from full URL (for migration from URL-based storage)
 * Use this when migrating from storing full URLs to object keys
 * 
 * @param url - Full URL to parse
 * @returns Object key extracted from URL
 * 
 * @example
 * ```typescript
 * // Migrate existing data
 * const oldUrl = 'https://bucket.s3.us-east-1.amazonaws.com/organizations/123/logo/image.jpg';
 * const objectKey = parseObjectKeyFromUrl(oldUrl);
 * // Returns: 'organizations/123/logo/image.jpg'
 * 
 * // Update database
 * await db.organization.update({
 *   where: { id: 123 },
 *   data: {
 *     logoKey: objectKey,
 *     logoProvider: 'S3'
 *   }
 * });
 * ```
 */
export function parseObjectKeyFromUrl(url: string): string {
  if (!url) {
    throw new Error('URL is required to parse object key');
  }

  try {
    const urlObj = new URL(url);
    
    // Handle S3 direct URLs (bucket.s3.region.amazonaws.com)
    if (urlObj.hostname.includes('.s3.') && urlObj.hostname.includes('.amazonaws.com')) {
      return urlObj.pathname.startsWith('/') 
        ? urlObj.pathname.slice(1) 
        : urlObj.pathname;
    }
    
    // Handle S3 path-style URLs (s3.region.amazonaws.com/bucket)
    if (urlObj.hostname.includes('s3.') && urlObj.hostname.includes('.amazonaws.com')) {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        // Remove bucket name from path
        return pathParts.slice(1).join('/');
      }
    }
    
    // Handle CloudFront URLs
    if (urlObj.hostname.includes('cloudfront.net') || urlObj.hostname.includes(process.env.CLOUDFRONT_DOMAIN || '')) {
      return urlObj.pathname.startsWith('/') 
        ? urlObj.pathname.slice(1) 
        : urlObj.pathname;
    }
    
    // Handle local URLs
    if (urlObj.pathname.startsWith('/api/files/')) {
      return urlObj.pathname.replace('/api/files/', '');
    }
    
    if (urlObj.pathname.startsWith('/uploads/')) {
      return urlObj.pathname.replace('/uploads/', '');
    }
    
    // Handle custom domains
    if (process.env.CUSTOM_STORAGE_DOMAIN && urlObj.hostname.includes(process.env.CUSTOM_STORAGE_DOMAIN)) {
      return urlObj.pathname.startsWith('/') 
        ? urlObj.pathname.slice(1) 
        : urlObj.pathname;
    }
    
    throw new Error(`Unrecognized URL format: ${url}`);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse object key from URL: ${error.message}`);
    }
    throw new Error(`Failed to parse object key from URL: ${url}`);
  }
}

/**
 * Validate object key format
 * Ensures object keys follow best practices
 * 
 * @param key - Object key to validate
 * @returns Validation result
 * 
 * @example
 * ```typescript
 * const validation = validateObjectKey('organizations/123/logo/image.jpg');
 * if (!validation.valid) {
 *   throw new Error(validation.error);
 * }
 * ```
 */
export function validateObjectKey(key: string): { valid: boolean; error?: string } {
  if (!key) {
    return { valid: false, error: 'Object key cannot be empty' };
  }
  
  // Check for invalid characters
  const invalidChars = /[^a-zA-Z0-9._\-\/]/;
  if (invalidChars.test(key)) {
    return { 
      valid: false, 
      error: 'Object key contains invalid characters. Use only alphanumeric, dots, hyphens, underscores, and forward slashes.' 
    };
  }
  
  // Check length (S3 limit is 1024 characters)
  if (key.length > 1024) {
    return { valid: false, error: 'Object key exceeds maximum length of 1024 characters' };
  }
  
  // Check for double slashes
  if (key.includes('//')) {
    return { valid: false, error: 'Object key cannot contain consecutive forward slashes' };
  }
  
  // Check for leading/trailing slashes
  if (key.startsWith('/') || key.endsWith('/')) {
    return { valid: false, error: 'Object key cannot start or end with forward slashes' };
  }
  
  return { valid: true };
}

/**
 * Generate object key with best practices
 * Creates a standardized object key following the pattern: category/entityId/fileType/timestamp_filename
 * 
 * @param category - File category (e.g., 'organizations', 'users', 'elections')
 * @param entityId - Entity ID (e.g., user ID, organization ID)
 * @param fileType - File type (e.g., 'logo', 'letter', 'avatar')
 * @param filename - Original filename
 * @returns Standardized object key
 * 
 * @example
 * ```typescript
 * const key = generateObjectKey('organizations', '123', 'logo', 'company-logo.jpg');
 * // Returns: 'organizations/123/logo/1703123456789_company-logo.jpg'
 * ```
 */
export function generateObjectKey(
  category: string,
  entityId: string | number,
  fileType: string,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Replace invalid characters
    .replace(/_{2,}/g, '_')            // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '');         // Remove leading/trailing underscores
  
  const objectKey = `${category}/${entityId}/${fileType}/${timestamp}_${sanitizedFilename}`;
  
  // Validate the generated key
  const validation = validateObjectKey(objectKey);
  if (!validation.valid) {
    throw new Error(`Generated object key is invalid: ${validation.error}`);
  }
  
  return objectKey;
}

/**
 * Extract metadata from object key
 * Parses information from standardized object keys
 * 
 * @param key - Object key to parse
 * @returns Parsed metadata
 * 
 * @example
 * ```typescript
 * const metadata = extractMetadataFromKey('organizations/123/logo/1703123456789_company-logo.jpg');
 * // Returns: {
 * //   category: 'organizations',
 * //   entityId: '123',
 * //   fileType: 'logo',
 * //   timestamp: 1703123456789,
 * //   originalFilename: 'company-logo.jpg'
 * // }
 * ```
 */
export function extractMetadataFromKey(key: string): {
  category?: string;
  entityId?: string;
  fileType?: string;
  timestamp?: number;
  originalFilename?: string;
} {
  const parts = key.split('/');
  
  if (parts.length < 4) {
    return {}; // Not a standard format
  }
  
  const [category, entityId, fileType, filenameWithTimestamp] = parts;
  
  // Extract timestamp and original filename
  const timestampMatch = filenameWithTimestamp.match(/^(\d+)_(.+)$/);
  if (timestampMatch) {
    const [, timestampStr, originalFilename] = timestampMatch;
    return {
      category,
      entityId,
      fileType,
      timestamp: parseInt(timestampStr, 10),
      originalFilename
    };
  }
  
  return {
    category,
    entityId,
    fileType,
    originalFilename: filenameWithTimestamp
  };
}
