import { StorageService } from './service';
import { StorageLogger } from './logger';
import { storageConfig, logStorageConfig, validateStorageConfig } from './config';
import { UploadOptions, UploadResult, StorageConfig } from './types';

/**
 * Storage abstraction layer - Main entry point
 * Provides a simple, singleton-based API for file storage operations
 * Mirrors the email system's architecture pattern
 */

// Singleton storage service instance
let storageInstance: StorageService | null = null;
let logger: StorageLogger | null = null;

/**
 * Get the storage service instance (singleton pattern)
 */
export function getStorageService(): StorageService {
  if (!storageInstance) {
    // Validate configuration before creating service
    const validation = validateStorageConfig();
    if (!validation.valid) {
      console.error('Storage configuration validation failed:', validation.errors);
      // Log config for debugging
      logStorageConfig();
      throw new Error(`Storage configuration invalid: ${validation.errors.join(', ')}`);
    }

    storageInstance = new StorageService(storageConfig);
    logger = StorageLogger.getInstance();
    
    // Log configuration on first initialization
    if (process.env.NODE_ENV !== 'production') {
      logStorageConfig();
    }
  }
  return storageInstance;
}

/**
 * Get the storage logger instance
 */
export function getStorageLogger(): StorageLogger {
  if (!logger) {
    logger = StorageLogger.getInstance();
  }
  return logger;
}

// ================================
// Convenience Functions
// ================================

/**
 * Upload a file to storage with automatic provider selection and fallback
 * 
 * @param file - File buffer to upload
 * @param key - Storage key/path for the file
 * @param options - Upload options (content type, public access, etc.)
 * @returns Promise with upload result including URLs and metadata
 * 
 * @example
 * ```typescript
 * const result = await uploadFile(
 *   fileBuffer, 
 *   'organizations/123/logo/image.jpg',
 *   {
 *     contentType: 'image/jpeg',
 *     isPublic: true,
 *     metadata: { uploadedBy: 'user123' }
 *   }
 * );
 * console.log('File uploaded:', result.url);
 * ```
 */
export async function uploadFile(
  file: Buffer, 
  key: string, 
  options: UploadOptions
): Promise<UploadResult> {
  const storage = getStorageService();
  const startTime = Date.now();
  
  try {
    const result = await storage.upload(file, key, options);
    
    // Log success
    getStorageLogger().logOperationSuccess('upload', {
      key,
      provider: result.provider,
      duration: Date.now() - startTime,
      fileSize: file.length,
      fallbackUsed: result.fallbackUsed,
    });
    
    return result;
  } catch (error) {
    // Log error
    getStorageLogger().logOperationError('upload', error as Error, {
      key,
      provider: storageConfig.provider,
    });
    throw error;
  }
}

/**
 * Delete a file from storage
 * 
 * @param key - Storage key/path of the file to delete
 * 
 * @example
 * ```typescript
 * await deleteFile('organizations/123/logo/old-image.jpg');
 * ```
 */
export async function deleteFile(key: string): Promise<void> {
  const storage = getStorageService();
  const startTime = Date.now();
  
  try {
    await storage.delete(key);
    
    // Log success
    getStorageLogger().logOperationSuccess('delete', {
      key,
      provider: storageConfig.provider,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    // Log error
    getStorageLogger().logOperationError('delete', error as Error, {
      key,
      provider: storageConfig.provider,
    });
    throw error;
  }
}

/**
 * Get a signed URL for secure file access
 * 
 * @param key - Storage key/path of the file
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Promise with signed URL string
 * 
 * @example
 * ```typescript
 * const signedUrl = await getSignedUrl('organizations/123/letter/private-doc.pdf', 3600);
 * // Use signedUrl for secure download
 * ```
 */
export async function getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const storage = getStorageService();
  const startTime = Date.now();
  
  try {
    const url = await storage.getSignedUrl(key, expiresIn);
    
    // Log success
    getStorageLogger().logOperationSuccess('getSignedUrl', {
      key,
      provider: storageConfig.provider,
      duration: Date.now() - startTime,
    });
    
    return url;
  } catch (error) {
    // Log error
    getStorageLogger().logOperationError('getSignedUrl', error as Error, {
      key,
      provider: storageConfig.provider,
    });
    throw error;
  }
}

/**
 * Get a public URL for a file (only works for public files)
 * 
 * @param key - Storage key/path of the file
 * @returns Public URL string
 * 
 * @example
 * ```typescript
 * const publicUrl = getPublicUrl('organizations/123/logo/image.jpg');
 * // Use publicUrl directly in <img> tags or API responses
 * ```
 */
export function getPublicUrl(key: string): string {
  const storage = getStorageService();
  return storage.getPublicUrl(key);
}

/**
 * Check the health of all storage providers
 * 
 * @returns Promise with health status of primary and fallback providers
 * 
 * @example
 * ```typescript
 * const health = await checkStorageHealth();
 * console.log('Primary healthy:', health.primary.healthy);
 * console.log('Overall healthy:', health.overall);
 * ```
 */
export async function checkStorageHealth(): Promise<{
  primary: { available: boolean; healthy: boolean; provider: string };
  fallback?: { available: boolean; healthy: boolean; provider: string };
  overall: boolean;
}> {
  const storage = getStorageService();
  return storage.healthCheck();
}

/**
 * Get storage service configuration
 * 
 * @returns Current storage configuration
 */
export function getStorageConfig(): StorageConfig {
  return storageConfig;
}

/**
 * Get current provider status
 * 
 * @returns Status of primary and fallback providers
 */
export function getProviderStatus(): {
  primary: { type: string; available: boolean };
  fallback?: { type: string; available: boolean };
  initialized: boolean;
} {
  const storage = getStorageService();
  return storage.getProviderStatus();
}

/**
 * Utility function to generate storage keys with consistent patterns
 * 
 * @param category - File category (e.g., 'organizations', 'users', 'elections')
 * @param entityId - Entity ID (e.g., user ID, organization ID)
 * @param fileType - File type (e.g., 'logo', 'letter', 'avatar')
 * @param filename - Original filename
 * @returns Standardized storage key
 * 
 * @example
 * ```typescript
 * const key = generateStorageKey('organizations', '123', 'logo', 'company-logo.jpg');
 * // Returns: 'organizations/123/logo/1234567890_company-logo.jpg'
 * ```
 */
export function generateStorageKey(
  category: string,
  entityId: string | number,
  fileType: string,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `${category}/${entityId}/${fileType}/${timestamp}_${sanitizedFilename}`;
}

/**
 * Utility function to validate file type and size
 * 
 * @param file - File buffer
 * @param filename - Original filename
 * @param options - Validation options
 * @returns Validation result
 * 
 * @example
 * ```typescript
 * const validation = validateFile(fileBuffer, 'image.jpg', {
 *   allowedTypes: ['image/jpeg', 'image/png'],
 *   maxSize: 5 * 1024 * 1024 // 5MB
 * });
 * 
 * if (!validation.valid) {
 *   throw new Error(validation.error);
 * }
 * ```
 */
export function validateFile(
  file: Buffer,
  filename: string,
  options: {
    allowedTypes?: string[];
    maxSize?: number;
    minSize?: number;
  } = {}
): { valid: boolean; error?: string; contentType?: string } {
  const { allowedTypes, maxSize, minSize } = options;
  
  // Check file size
  if (maxSize && file.length > maxSize) {
    return {
      valid: false,
      error: `File size (${file.length} bytes) exceeds maximum allowed size (${maxSize} bytes)`
    };
  }
  
  if (minSize && file.length < minSize) {
    return {
      valid: false,
      error: `File size (${file.length} bytes) is below minimum required size (${minSize} bytes)`
    };
  }
  
  // Guess content type from filename
  const ext = filename.split('.').pop()?.toLowerCase();
  const contentTypeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
  };
  
  const contentType = ext ? contentTypeMap[ext] : 'application/octet-stream';
  
  // Check allowed types
  if (allowedTypes && !allowedTypes.includes(contentType)) {
    return {
      valid: false,
      error: `File type '${contentType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }
  
  return {
    valid: true,
    contentType
  };
}

// Re-export types and utilities
export * from './types';
export * from './config';
export { StorageService } from './service';
export { StorageLogger, StorageErrorHandler } from './logger';
