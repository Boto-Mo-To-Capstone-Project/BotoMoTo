/**
 * Storage abstraction types and interfaces
 * Provides a provider-agnostic storage system with fallback support
 */

export interface StorageProvider {
  /**
   * Upload a file to storage
   */
  upload(file: Buffer, key: string, options: UploadOptions): Promise<UploadResult>;
  
  /**
   * Delete a file from storage
   */
  delete(key: string): Promise<void>;
  
  /**
   * Get a signed URL for secure file access (for private files)
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  
  /**
   * Get public URL for a file (for public files)
   */
  getPublicUrl(key: string): string;
  
  /**
   * Check if the storage provider is healthy/accessible
   */
  healthCheck(): Promise<boolean>;
}

export interface UploadOptions {
  /**
   * MIME type of the file
   */
  contentType: string;
  
  /**
   * Whether the file should be publicly accessible
   * @default false
   */
  isPublic?: boolean;
  
  /**
   * Additional metadata to store with the file
   */
  metadata?: Record<string, string>;
  
  /**
   * Custom cache control headers
   */
  cacheControl?: string;
  
  /**
   * Custom content disposition
   */
  contentDisposition?: string;
}

export interface UploadResult {
  /**
   * The storage key/path where the file was stored (STORE THIS IN DB)
   */
  key: string;
  
  /**
   * The provider that was used for storage (STORE THIS IN DB)
   */
  provider: string;
  
  /**
   * File size in bytes (STORE THIS IN DB)
   */
  size?: number;
  
  /**
   * Whether fallback storage was used
   */
  fallbackUsed?: boolean;
  
  /**
   * Additional metadata returned by the provider
   */
  metadata?: Record<string, any>;
  
  // THESE SHOULD NOT BE STORED IN DB - Generate dynamically when needed
  /**
   * Generated URL to access the file (DO NOT store in DB)
   * Use generatePublicUrl() or generatePresignedUrl() instead
   */
  url?: string;
  
  /**
   * Public URL if the file is public (DO NOT store in DB)
   * Use generatePublicUrl() instead
   */
  publicUrl?: string;
}

export type StorageProviderType = 'S3' | 'LOCAL' | 'GCS' | 'AZURE';

export interface StorageConfig {
  /**
   * Primary storage provider to use
   */
  provider: StorageProviderType;
  
  /**
   * Fallback provider if primary fails
   */
  fallback?: StorageProviderType;
  
  /**
   * Number of retry attempts before falling back
   * @default 3
   */
  retryAttempts?: number;
  
  /**
   * S3 configuration
   */
  s3?: S3Config;
  
  /**
   * Local storage configuration
   */
  local?: LocalConfig;
  
  /**
   * Google Cloud Storage configuration
   */
  gcs?: GCSConfig;
  
  /**
   * Azure Blob Storage configuration
   */
  azure?: AzureConfig;
}

export interface S3Config {
  /**
   * S3 bucket name
   */
  bucket: string;
  
  /**
   * AWS region
   */
  region: string;
  
  /**
   * AWS access key ID
   */
  accessKeyId: string;
  
  /**
   * AWS secret access key
   */
  secretAccessKey: string;
  
  /**
   * Custom S3 endpoint (for S3-compatible services)
   */
  endpoint?: string;
  
  /**
   * Force path style URLs
   */
  forcePathStyle?: boolean;
}

export interface LocalConfig {
  /**
   * Directory to store uploaded files
   */
  uploadDir: string;
  
  /**
   * Base URL for serving files
   */
  baseUrl: string;
  
  /**
   * Public path for static file serving
   */
  publicPath?: string;
  
  /**
   * Maximum file size in bytes
   */
  maxFileSize?: number;
}

export interface GCSConfig {
  /**
   * Google Cloud project ID
   */
  projectId: string;
  
  /**
   * Path to service account key file
   */
  keyFilename?: string;
  
  /**
   * Service account credentials object
   */
  credentials?: object;
  
  /**
   * GCS bucket name
   */
  bucket: string;
}

export interface AzureConfig {
  /**
   * Azure storage account name
   */
  accountName: string;
  
  /**
   * Azure storage account key
   */
  accountKey: string;
  
  /**
   * Azure blob container name
   */
  containerName: string;
  
  /**
   * Azure storage connection string (alternative to account name/key)
   */
  connectionString?: string;
}

/**
 * Storage error types for better error handling
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class ProviderNotAvailableError extends StorageError {
  constructor(provider: string, cause?: Error) {
    super(`Storage provider ${provider} is not available`, provider, 'PROVIDER_UNAVAILABLE', cause);
    this.name = 'ProviderNotAvailableError';
  }
}

export class FileNotFoundError extends StorageError {
  constructor(key: string, provider: string, cause?: Error) {
    super(`File not found: ${key}`, provider, 'FILE_NOT_FOUND', cause);
    this.name = 'FileNotFoundError';
  }
}

export class UploadFailedError extends StorageError {
  constructor(key: string, provider: string, cause?: Error) {
    super(`Upload failed for: ${key}`, provider, 'UPLOAD_FAILED', cause);
    this.name = 'UploadFailedError';
  }
}

/**
 * Reference to a stored file for database storage
 * Store this in your database instead of full URLs
 */
export interface StoredFileReference {
  /** Object key/path in storage (store this in DB) */
  key: string;
  
  /** Storage provider used */
  provider: string;
  
  /** File size in bytes */
  size?: number;
  
  /** When the file was uploaded */
  uploadedAt: string;
  
  /** Content type of the file */
  contentType?: string;
  
  /** Additional metadata */
  metadata?: Record<string, string>;
}

/**
 * URL generation options for stored files
 */
export interface URLGenerationOptions {
  /** Whether to use CloudFront CDN if available */
  useCDN?: boolean;
  
  /** Custom domain to use for URLs */
  customDomain?: string;
  
  /** For presigned URLs - expiration time in seconds */
  expiresIn?: number;
  
  /** Force HTTPS */
  secure?: boolean;
}
