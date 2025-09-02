import { StorageProvider, UploadOptions, UploadResult, S3Config, StorageError, UploadFailedError, FileNotFoundError, FileData } from '../types';

/**
  * AWS S3 storage provider using AWS SDK v3
 * Primary cloud storage solution with full S3 features
 * 
 * Note: This implementation requires aws-sdk v3 to be installed:
 * npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */
export class S3StorageProvider implements StorageProvider {
  private s3Client: any; // Will be S3Client instance when properly imported
  private config: S3Config;
  private isInitialized: boolean = false;

  constructor(config: S3Config) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    const required = ['bucket', 'region', 'accessKeyId', 'secretAccessKey'];
    const missing = required.filter(key => !this.config[key as keyof S3Config]);
    
    if (missing.length > 0) {
      throw new Error(`S3 configuration missing required fields: ${missing.join(', ')}`);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamic import of AWS SDK v3
      const { S3Client } = await import('@aws-sdk/client-s3');

      const clientConfig: any = {
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      };

      // Add custom endpoint if specified (for S3-compatible services)
      if (this.config.endpoint) {
        clientConfig.endpoint = this.config.endpoint;
      }

      // Force path style if specified
      if (this.config.forcePathStyle) {
        clientConfig.forcePathStyle = true;
      }

      this.s3Client = new S3Client(clientConfig);
      this.isInitialized = true;
    } catch (error) {
      throw new Error('AWS SDK v3 not found. Please install: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner');
    }
  }

  /**
   * Upload a file to S3
   */
  async upload(file: Buffer, key: string, options: UploadOptions): Promise<UploadResult> {
    await this.ensureInitialized();

    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');

      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: file,
        ContentType: options.contentType,
        // No ACL setting - files are private by default
        CacheControl: options.cacheControl,
        ContentDisposition: options.contentDisposition,
        Metadata: options.metadata,
      });

      // Perform the upload
      const result = await this.s3Client.send(command);

      // Generate URLs - always use signed URLs for security
      const url = await this.getSignedUrl(key, 3600);
      const publicUrl = options.isPublic ? this.getPublicUrl(key) : undefined;

      return {
        key,
        url,
        publicUrl,
        provider: 'S3',
        size: file.length,
        metadata: {
          etag: result.ETag,
          location: this.getPublicUrl(key),
          bucket: this.config.bucket,
          uploadedAt: new Date().toISOString(),
          ...options.metadata,
        },
      };
    } catch (error: any) {
      throw new UploadFailedError(key, 'S3', error);
    }
  }

  // get file from S3
  async getFile(key: string): Promise<FileData> {
    await this.ensureInitialized();

    try {
      const signedUrl = await this.getSignedUrl(key, 3600); // 1 hour expiry

      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new FileNotFoundError(key, 'S3', new Error('File not found in S3'));
      }

      const fileBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const filename = key.split('/').pop() || 'file';

      return {
        buffer: fileBuffer,
        contentType,
        filename,
        size: fileBuffer.byteLength,
      };
    } catch (error: any) {
      if (error instanceof FileNotFoundError) {
        throw error; // Re-throw if already FileNotFoundError
      }
      
      // Check for specific S3 error types
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        throw new FileNotFoundError(key, 'S3', error);
      }
      
      // For other errors, throw generic StorageError
      throw new StorageError(`Failed to get file from S3: ${key}`, 'S3', 'GET_FAILED', error);
    }
  }

  /**
   * Delete a file from S3
   */
  async delete(key: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        throw new FileNotFoundError(key, 'S3', error);
      }
      throw new StorageError(`Failed to delete file: ${key}`, 'S3', error.name, error);
    }
  }

  /**
   * Get signed URL for secure file access
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    await this.ensureInitialized();

    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error: any) {
      throw new StorageError(`Failed to generate signed URL for: ${key}`, 'S3', 'SIGNED_URL_FAILED', error);
    }
  }

  /**
   * Get public URL for a file (only works if file is public)
   */
  getPublicUrl(key: string): string {
    if (this.config.endpoint) {
      // Custom endpoint (S3-compatible service)
      const endpoint = this.config.endpoint.replace(/^https?:\/\//, '');
      return `https://${endpoint}/${this.config.bucket}/${key}`;
    }
    
    // Standard S3 URL
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  /**
   * Health check for S3 connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureInitialized();

      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        MaxKeys: 1,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.warn('S3 health check failed:', error);
      return false;
    }
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata without downloading the file
   */
  async getFileInfo(key: string): Promise<{
    exists: boolean;
    size?: number;
    lastModified?: Date;
    contentType?: string;
    etag?: string;
    metadata?: Record<string, string>;
  }> {
    await this.ensureInitialized();

    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const result = await this.s3Client.send(command);

      return {
        exists: true,
        size: result.ContentLength,
        lastModified: result.LastModified,
        contentType: result.ContentType,
        etag: result.ETag,
        metadata: result.Metadata,
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return { exists: false };
      }
      throw new StorageError(`Failed to get file info for: ${key}`, 'S3', error.name, error);
    }
  }

  /**
   * Generate pre-signed URL for direct client uploads
   */
  async getPresignedUploadUrl(
    key: string, 
    contentType: string, 
    expiresIn = 3600,
    conditions?: { maxFileSize?: number; isPublic?: boolean }
  ): Promise<{ url: string; fields: Record<string, string> }> {
    await this.ensureInitialized();

    try {
      const { createPresignedPost } = await import('@aws-sdk/s3-presigned-post');

      const params: any = {
        Bucket: this.config.bucket,
        Key: key,
        Conditions: [
          ['content-length-range', 0, conditions?.maxFileSize || 10 * 1024 * 1024], // 10MB default
          ['eq', '$Content-Type', contentType],
        ],
        Fields: {
          'Content-Type': contentType,
        },
        Expires: expiresIn,
      };

      const presignedPost = await createPresignedPost(this.s3Client, params);

      return {
        url: presignedPost.url,
        fields: presignedPost.fields,
      };
    } catch (error: any) {
      throw new StorageError(`Failed to generate presigned upload URL for: ${key}`, 'S3', 'PRESIGNED_FAILED', error);
    }
  }
}
