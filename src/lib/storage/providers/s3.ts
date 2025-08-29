import { StorageProvider, UploadOptions, UploadResult, S3Config, StorageError, UploadFailedError, FileNotFoundError } from '../types';

/**
 * AWS S3 storage provider
 * Primary cloud storage solution with full S3 features
 * 
 * Note: This implementation requires aws-sdk to be installed:
 * npm install aws-sdk @types/aws-sdk
 */
export class S3StorageProvider implements StorageProvider {
  private s3: any; // Will be AWS.S3 instance when properly imported
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
      // Dynamic import of AWS SDK
      const AWS = await import('aws-sdk');
      const AWSInstance = AWS.default || AWS;

      const s3Config: any = {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        region: this.config.region,
      };

      // Add custom endpoint if specified (for S3-compatible services)
      if (this.config.endpoint) {
        s3Config.endpoint = this.config.endpoint;
      }

      // Force path style if specified
      if (this.config.forcePathStyle) {
        s3Config.s3ForcePathStyle = true;
      }

      this.s3 = new AWSInstance.S3(s3Config);
      this.isInitialized = true;
    } catch (error) {
      throw new Error('AWS SDK not found. Please install: npm install aws-sdk @types/aws-sdk');
    }
  }

  /**
   * Upload a file to S3
   */
  async upload(file: Buffer, key: string, options: UploadOptions): Promise<UploadResult> {
    await this.ensureInitialized();

    try {
      const uploadParams: any = {
        Bucket: this.config.bucket,
        Key: key,
        Body: file,
        ContentType: options.contentType,
        ACL: options.isPublic ? 'public-read' : 'private',
      };

      // Add cache control if specified
      if (options.cacheControl) {
        uploadParams.CacheControl = options.cacheControl;
      }

      // Add content disposition if specified
      if (options.contentDisposition) {
        uploadParams.ContentDisposition = options.contentDisposition;
      }

      // Add metadata
      if (options.metadata) {
        uploadParams.Metadata = options.metadata;
      }

      // Perform the upload
      const result = await this.s3.upload(uploadParams).promise();

      // Generate URLs
      const url = options.isPublic ? result.Location : await this.getSignedUrl(key, 3600);
      const publicUrl = options.isPublic ? result.Location : undefined;

      return {
        key,
        url,
        publicUrl,
        provider: 'S3',
        size: file.length,
        metadata: {
          etag: result.ETag,
          location: result.Location,
          bucket: this.config.bucket,
          uploadedAt: new Date().toISOString(),
          ...options.metadata,
        },
      };
    } catch (error: any) {
      throw new UploadFailedError(key, 'S3', error);
    }
  }

  /**
   * Delete a file from S3
   */
  async delete(key: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.s3.deleteObject({
        Bucket: this.config.bucket,
        Key: key,
      }).promise();
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
        throw new FileNotFoundError(key, 'S3', error);
      }
      throw new StorageError(`Failed to delete file: ${key}`, 'S3', error.code, error);
    }
  }

  /**
   * Get signed URL for secure file access
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    await this.ensureInitialized();

    try {
      const url = this.s3.getSignedUrl('getObject', {
        Bucket: this.config.bucket,
        Key: key,
        Expires: expiresIn,
      });

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

      // Try to list objects in the bucket (this checks credentials and bucket access)
      await this.s3.listObjectsV2({
        Bucket: this.config.bucket,
        MaxKeys: 1,
      }).promise();

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
      await this.s3.headObject({
        Bucket: this.config.bucket,
        Key: key,
      }).promise();
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
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
      const result = await this.s3.headObject({
        Bucket: this.config.bucket,
        Key: key,
      }).promise();

      return {
        exists: true,
        size: result.ContentLength,
        lastModified: result.LastModified,
        contentType: result.ContentType,
        etag: result.ETag,
        metadata: result.Metadata,
      };
    } catch (error: any) {
      if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
        return { exists: false };
      }
      throw new StorageError(`Failed to get file info for: ${key}`, 'S3', error.code, error);
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
      const params: any = {
        Bucket: this.config.bucket,
        Fields: {
          key,
          'Content-Type': contentType,
        },
        Expires: expiresIn,
      };

      // Add ACL if public
      if (conditions?.isPublic) {
        params.Fields.acl = 'public-read';
      }

      // Add file size condition
      if (conditions?.maxFileSize) {
        params.Conditions = [
          ['content-length-range', 0, conditions.maxFileSize],
        ];
      }

      const presignedPost = await new Promise<{ url: string; fields: Record<string, string> }>((resolve, reject) => {
        this.s3.createPresignedPost(params, (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      return presignedPost;
    } catch (error: any) {
      throw new StorageError(`Failed to generate presigned upload URL for: ${key}`, 'S3', 'PRESIGNED_FAILED', error);
    }
  }
}
