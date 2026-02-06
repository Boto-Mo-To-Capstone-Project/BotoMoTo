import { writeFile, mkdir, unlink, access, stat, readFile } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { StorageProvider, UploadOptions, UploadResult, LocalConfig, StorageError, UploadFailedError, FileNotFoundError, FileData } from '../types';

/**
 * Local file system storage provider
 * Used as fallback when cloud storage is unavailable
 */
export class LocalStorageProvider implements StorageProvider {
  private config: LocalConfig;

  constructor(config: LocalConfig) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.uploadDir) {
      throw new Error('Local storage uploadDir is required');
    }
    if (!this.config.baseUrl) {
      throw new Error('Local storage baseUrl is required');
    }
  }

  /**
   * Upload a file to local storage
   */
  async upload(file: Buffer, key: string, options: UploadOptions): Promise<UploadResult> {
    try {
      // Validate file size if configured
      if (this.config.maxFileSize && file.length > this.config.maxFileSize) {
        throw new UploadFailedError(
          key,
          'LOCAL',
          new Error(`File size ${file.length} exceeds maximum ${this.config.maxFileSize}`)
        );
      }

      // Construct full file path
      const filePath = join(this.config.uploadDir, key);
      const dir = dirname(filePath);
      
      // Create directory if it doesn't exist
      await mkdir(dir, { recursive: true });
      
      // Write file to disk
      await writeFile(filePath, file);
      
      // Construct URLs
      const url = this.constructUrl(key, options.isPublic);
      const publicUrl = options.isPublic ? url : undefined;
      
      // Get file stats
      const stats = await stat(filePath);
      
      return {
        key,
        url,
        publicUrl,
        provider: 'LOCAL',
        size: stats.size,
        metadata: {
          filePath,
          uploadedAt: new Date().toISOString(),
          contentType: options.contentType,
          ...options.metadata,
        },
      };
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new UploadFailedError(key, 'LOCAL', error as Error);
    }
  }

  // getting a file
  async getFile(key: string): Promise<FileData> {
    const filePath = join(this.config.uploadDir, key);
    try {
      // check if file exists
      await access(filePath);

      const fileBuffer = await readFile(filePath);
      const contentType = this.guessContentType(extname(key));
      const filename = key.split('/').pop() || key;

      return {
        buffer: Buffer.from(fileBuffer).buffer, // convert to ArrayBuffer
        contentType,
        filename,
        size: fileBuffer.byteLength
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new FileNotFoundError(key, 'LOCAL', error);
      }
      throw new StorageError(`Failed to read file: ${key}`, 'LOCAL', 'READ_FAILED', error);
    }
  }

  /**
   * Delete a file from local storage
   */
  async delete(key: string): Promise<void> {
    try {
      const filePath = join(this.config.uploadDir, key);
      
      // Check if file exists first
      try {
        await access(filePath);
      } catch (error) {
        throw new FileNotFoundError(key, 'LOCAL', error as Error);
      }
      
      // Delete the file
      await unlink(filePath);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to delete file: ${key}`, 'LOCAL', 'DELETE_FAILED', error as Error);
    }
  }

  /**
   * Get signed URL for file access
   * For local storage, this is a simplified implementation with expiry token
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const filePath = join(this.config.uploadDir, key);
      
      // Check if file exists
      try {
        await access(filePath);
      } catch (error) {
        throw new FileNotFoundError(key, 'LOCAL', error as Error);
      }
      
      // Create a signed URL with expiry timestamp
      const expiryTime = Date.now() + (expiresIn * 1000);
      const token = this.generateSimpleToken(key, expiryTime);
      
      return `${this.config.baseUrl}/${key}?token=${token}&expires=${expiryTime}`;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to generate signed URL for: ${key}`, 'LOCAL', 'SIGNED_URL_FAILED', error as Error);
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    if (this.config.publicPath) {
      return `${this.config.publicPath}/${key}`;
    }
    return `${this.config.baseUrl}/${key}`;
  }

  /**
   * Health check for local storage
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if upload directory exists or can be created
      await mkdir(this.config.uploadDir, { recursive: true });
      
      // Try to write a test file
      const testKey = '.health-check';
      const testPath = join(this.config.uploadDir, testKey);
      const testContent = Buffer.from('health-check');
      
      await writeFile(testPath, testContent);
      
      // Try to read it back
      await access(testPath);
      
      // Clean up test file
      await unlink(testPath);
      
      return true;
    } catch (error) {
      console.warn('Local storage health check failed:', error);
      return false;
    }
  }

  /**
   * Construct URL based on file type and configuration
   */
  private constructUrl(key: string, isPublic: boolean = false): string {
    if (isPublic && this.config.publicPath) {
      return `${this.config.publicPath}/${key}`;
    }
    return `${this.config.baseUrl}/${key}`;
  }

  /**
   * Generate a simple token for signed URLs
   * Note: This is a basic implementation. For production, consider using JWT or similar
   */
  private generateSimpleToken(key: string, expiryTime: number): string {
    const data = `${key}:${expiryTime}`;
    // Simple base64 encoding - in production, you'd want proper signing
    return Buffer.from(data).toString('base64');
  }

  /**
   * Validate a signed URL token (for use in file serving endpoint)
   */
  static validateToken(key: string, token: string, expiryTime: number): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [tokenKey, tokenExpiry] = decoded.split(':');
      
      if (tokenKey !== key) return false;
      if (parseInt(tokenExpiry) !== expiryTime) return false;
      if (Date.now() > expiryTime) return false;
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file information without reading the entire file
   */
  async getFileInfo(key: string): Promise<{ exists: boolean; size?: number; lastModified?: Date; contentType?: string }> {
    try {
      const filePath = join(this.config.uploadDir, key);
      const stats = await stat(filePath);
      
      // Guess content type from extension
      const ext = extname(key).toLowerCase();
      const contentType = this.guessContentType(ext);
      
      return {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
        contentType,
      };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * Simple content type guessing based on file extension
   */
  private guessContentType(ext: string): string {
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
}
