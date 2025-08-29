import { StorageProvider, UploadOptions, UploadResult, StorageConfig, StorageError, ProviderNotAvailableError } from './types';
import { createStorageProvider, isProviderRegistered, runProviderHealthCheck } from './providers';
import { storageConfig } from './config';

/**
 * Main storage service that orchestrates multiple storage providers
 * Handles automatic fallback, retry logic, and provider management
 * Mirrors the email service architecture pattern
 */
export class StorageService {
  private primaryProvider: StorageProvider | null = null;
  private fallbackProvider: StorageProvider | null = null;
  private config: StorageConfig;
  private isInitialized: boolean = false;

  constructor(config: StorageConfig = storageConfig) {
    this.config = config;
  }

  /**
   * Initialize storage providers lazily
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize primary provider
      await this.initializePrimaryProvider();
      
      // Initialize fallback provider if different from primary
      await this.initializeFallbackProvider();
      
      this.isInitialized = true;
      console.log(`🗄️  Storage service initialized - Primary: ${this.config.provider}, Fallback: ${this.config.fallback || 'None'}`);
    } catch (error) {
      console.error('Storage service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize primary storage provider
   */
  private async initializePrimaryProvider(): Promise<void> {
    const providerType = this.config.provider;
    
    if (!isProviderRegistered(providerType)) {
      throw new ProviderNotAvailableError(providerType);
    }

    try {
      const providerConfig = this.config[providerType.toLowerCase() as keyof StorageConfig];
      this.primaryProvider = createStorageProvider(providerType, providerConfig);
      console.log(`✅ Primary storage provider (${providerType}) initialized successfully`);
    } catch (error) {
      console.warn(`❌ Failed to initialize primary provider (${providerType}):`, error);
      
      // If primary fails, we'll try fallback
      if (this.config.fallback) {
        console.log(`🔄 Will attempt to use fallback provider: ${this.config.fallback}`);
      } else {
        throw new ProviderNotAvailableError(providerType, error as Error);
      }
    }
  }

  /**
   * Initialize fallback storage provider
   */
  private async initializeFallbackProvider(): Promise<void> {
    if (!this.config.fallback) return;
    if (this.config.fallback === this.config.provider && this.primaryProvider) return;

    const fallbackType = this.config.fallback;
    
    if (!isProviderRegistered(fallbackType)) {
      console.warn(`Fallback provider ${fallbackType} not registered, skipping`);
      return;
    }

    try {
      const fallbackConfig = this.config[fallbackType.toLowerCase() as keyof StorageConfig];
      this.fallbackProvider = createStorageProvider(fallbackType, fallbackConfig);
      console.log(`✅ Fallback storage provider (${fallbackType}) initialized successfully`);
    } catch (error) {
      console.warn(`❌ Failed to initialize fallback provider (${fallbackType}):`, error);
      // Fallback failure is not fatal
    }
  }

  /**
   * Upload a file with automatic retry and fallback
   */
  async upload(file: Buffer, key: string, options: UploadOptions): Promise<UploadResult> {
    await this.ensureInitialized();
    
    const retryAttempts = this.config.retryAttempts || 3;
    let lastError: Error | null = null;

    // Try primary provider with retries
    if (this.primaryProvider) {
      for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
          console.log(`📤 Attempting upload with ${this.config.provider} (attempt ${attempt}/${retryAttempts})`);
          const result = await this.primaryProvider.upload(file, key, options);
          
          console.log(`✅ Upload successful with ${this.config.provider} provider`);
          return { ...result, provider: this.config.provider };
        } catch (error) {
          lastError = error as Error;
          console.warn(`❌ ${this.config.provider} upload attempt ${attempt} failed:`, error);
          
          if (attempt < retryAttempts) {
            const delay = this.calculateBackoffDelay(attempt);
            console.log(`⏳ Retrying in ${delay}ms...`);
            await this.delay(delay);
          }
        }
      }
    }

    // Fallback to secondary provider
    if (this.fallbackProvider && this.config.fallback) {
      try {
        console.log(`🔄 Falling back to ${this.config.fallback} provider...`);
        const result = await this.fallbackProvider.upload(file, key, options);
        
        console.log(`✅ Upload successful with ${this.config.fallback} fallback provider`);
        return { 
          ...result, 
          provider: this.config.fallback,
          fallbackUsed: true 
        };
      } catch (fallbackError) {
        console.error(`❌ Fallback provider also failed:`, fallbackError);
        throw new StorageError(
          `Both primary (${this.config.provider}) and fallback (${this.config.fallback}) storage failed`,
          'STORAGE_SERVICE',
          'ALL_PROVIDERS_FAILED',
          fallbackError as Error
        );
      }
    }

    // No providers available or all failed
    throw new StorageError(
      `Storage upload failed after ${retryAttempts} attempts`,
      this.config.provider,
      'UPLOAD_FAILED',
      lastError || undefined
    );
  }

  /**
   * Delete a file with automatic fallback
   */
  async delete(key: string): Promise<void> {
    await this.ensureInitialized();

    let deleted = false;
    const errors: Error[] = [];

    // Try primary provider
    if (this.primaryProvider) {
      try {
        await this.primaryProvider.delete(key);
        deleted = true;
        console.log(`✅ File deleted from ${this.config.provider} provider`);
      } catch (error) {
        console.warn(`❌ Failed to delete from ${this.config.provider}:`, error);
        errors.push(error as Error);
      }
    }

    // Try fallback provider if primary failed
    if (!deleted && this.fallbackProvider && this.config.fallback) {
      try {
        await this.fallbackProvider.delete(key);
        deleted = true;
        console.log(`✅ File deleted from ${this.config.fallback} fallback provider`);
      } catch (error) {
        console.warn(`❌ Failed to delete from ${this.config.fallback}:`, error);
        errors.push(error as Error);
      }
    }

    if (!deleted && errors.length > 0) {
      throw new StorageError(
        `Failed to delete file from all available providers`,
        'STORAGE_SERVICE',
        'DELETE_FAILED',
        errors[0]
      );
    }
  }

  /**
   * Get signed URL with automatic fallback
   */
  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    await this.ensureInitialized();

    // Try primary provider first
    if (this.primaryProvider) {
      try {
        return await this.primaryProvider.getSignedUrl(key, expiresIn);
      } catch (error) {
        console.warn(`❌ Failed to get signed URL from ${this.config.provider}:`, error);
      }
    }

    // Try fallback provider
    if (this.fallbackProvider && this.config.fallback) {
      try {
        return await this.fallbackProvider.getSignedUrl(key, expiresIn);
      } catch (error) {
        console.warn(`❌ Failed to get signed URL from ${this.config.fallback}:`, error);
      }
    }

    throw new StorageError(
      `Failed to generate signed URL from all available providers`,
      'STORAGE_SERVICE',
      'SIGNED_URL_FAILED'
    );
  }

  /**
   * Get public URL (uses primary provider)
   */
  getPublicUrl(key: string): string {
    if (this.primaryProvider) {
      return this.primaryProvider.getPublicUrl(key);
    }
    
    if (this.fallbackProvider && this.config.fallback) {
      return this.fallbackProvider.getPublicUrl(key);
    }

    throw new StorageError(
      'No storage providers available to generate public URL',
      'STORAGE_SERVICE',
      'NO_PROVIDERS'
    );
  }

  /**
   * Health check for all providers
   */
  async healthCheck(): Promise<{ 
    primary: { available: boolean; healthy: boolean; provider: string };
    fallback?: { available: boolean; healthy: boolean; provider: string };
    overall: boolean;
  }> {
    await this.ensureInitialized();

    const result = {
      primary: {
        available: !!this.primaryProvider,
        healthy: false,
        provider: this.config.provider
      },
      fallback: this.config.fallback ? {
        available: !!this.fallbackProvider,
        healthy: false,
        provider: this.config.fallback
      } : undefined,
      overall: false
    };

    // Check primary provider health
    if (this.primaryProvider) {
      try {
        result.primary.healthy = await runProviderHealthCheck(this.config.provider, this.primaryProvider);
      } catch (error) {
        console.warn(`Primary provider health check failed:`, error);
      }
    }

    // Check fallback provider health
    if (this.fallbackProvider && this.config.fallback && result.fallback) {
      try {
        result.fallback.healthy = await runProviderHealthCheck(this.config.fallback, this.fallbackProvider);
      } catch (error) {
        console.warn(`Fallback provider health check failed:`, error);
      }
    }

    // Overall health: at least one provider must be healthy
    result.overall = result.primary.healthy || (result.fallback?.healthy || false);

    return result;
  }

  /**
   * Get storage configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Get current provider status
   */
  getProviderStatus(): {
    primary: { type: string; available: boolean };
    fallback?: { type: string; available: boolean };
    initialized: boolean;
  } {
    return {
      primary: {
        type: this.config.provider,
        available: !!this.primaryProvider
      },
      fallback: this.config.fallback ? {
        type: this.config.fallback,
        available: !!this.fallbackProvider
      } : undefined,
      initialized: this.isInitialized
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add some jitter to avoid thundering herd
    const jitter = Math.random() * 0.3; // ±30%
    return Math.floor(delay * (1 + jitter));
  }

  /**
   * Delay utility function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
