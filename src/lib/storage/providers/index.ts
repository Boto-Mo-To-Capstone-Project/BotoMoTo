import { StorageProvider, StorageProviderType } from '../types';

/**
 * Provider registry for storage providers
 * This file will import and register all available storage providers
 */

// Provider type definitions (providers will be implemented in Phase 2)
export type S3StorageProvider = StorageProvider;
export type LocalStorageProvider = StorageProvider;
export type GCSStorageProvider = StorageProvider;
export type AzureStorageProvider = StorageProvider;

// Provider constructor types
export type ProviderConstructor<T = any> = new (config: T) => StorageProvider;

/**
 * Registry of available storage providers
 * Providers will be added as they are implemented
 */
export const storageProviders: Record<StorageProviderType, ProviderConstructor | null> = {
  S3: null,       // Will be set in Phase 2.2
  LOCAL: null,    // Will be set in Phase 2.1
  GCS: null,      // Will be set in Phase 9.1 (future)
  AZURE: null,    // Will be set in Phase 9.1 (future)
} as const;

/**
 * Register a storage provider
 */
export function registerStorageProvider<T>(
  type: StorageProviderType,
  providerClass: ProviderConstructor<T>
): void {
  storageProviders[type] = providerClass;
  console.log(`📦 Registered storage provider: ${type}`);
}

/**
 * Check if a provider is available/registered
 */
export function isProviderRegistered(type: StorageProviderType): boolean {
  return storageProviders[type] !== null;
}

/**
 * Get available providers
 */
export function getAvailableProviders(): StorageProviderType[] {
  return Object.entries(storageProviders)
    .filter(([_, provider]) => provider !== null)
    .map(([type]) => type as StorageProviderType);
}

/**
 * Create a storage provider instance
 */
export function createStorageProvider(
  type: StorageProviderType,
  config: any
): StorageProvider {
  const ProviderClass = storageProviders[type];
  
  if (!ProviderClass) {
    throw new Error(
      `Storage provider ${type} is not registered. Available providers: ${getAvailableProviders().join(', ')}`
    );
  }
  
  try {
    return new ProviderClass(config);
  } catch (error) {
    throw new Error(
      `Failed to create ${type} storage provider: ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * Validate provider configuration before creating instance
 */
export function validateProviderConfig(type: StorageProviderType, config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!isProviderRegistered(type)) {
    errors.push(`Provider ${type} is not registered`);
    return { valid: false, errors };
  }
  
  if (!config) {
    errors.push(`Configuration is required for ${type} provider`);
    return { valid: false, errors };
  }
  
  // Provider-specific validation (basic checks)
  switch (type) {
    case 'S3':
      if (!config.bucket) errors.push('S3 bucket is required');
      if (!config.region) errors.push('S3 region is required');
      if (!config.accessKeyId) errors.push('S3 accessKeyId is required');
      if (!config.secretAccessKey) errors.push('S3 secretAccessKey is required');
      break;
      
    case 'LOCAL':
      if (!config.uploadDir) errors.push('Local uploadDir is required');
      if (!config.baseUrl) errors.push('Local baseUrl is required');
      break;
      
    case 'GCS':
      if (!config.projectId) errors.push('GCS projectId is required');
      if (!config.bucket) errors.push('GCS bucket is required');
      if (!config.keyFilename && !config.credentials) {
        errors.push('GCS keyFilename or credentials is required');
      }
      break;
      
    case 'AZURE':
      if (!config.containerName) errors.push('Azure containerName is required');
      if (!config.accountName && !config.connectionString) {
        errors.push('Azure accountName or connectionString is required');
      }
      if (config.accountName && !config.accountKey) {
        errors.push('Azure accountKey is required when using accountName');
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Provider health check registry
 * Each provider can register their own health check logic
 */
export const providerHealthChecks: Record<StorageProviderType, ((provider: StorageProvider) => Promise<boolean>) | null> = {
  S3: null,
  LOCAL: null,
  GCS: null,
  AZURE: null,
};

/**
 * Register a health check function for a provider
 */
export function registerProviderHealthCheck(
  type: StorageProviderType,
  healthCheck: (provider: StorageProvider) => Promise<boolean>
): void {
  providerHealthChecks[type] = healthCheck;
}

/**
 * Run health check for a provider
 */
export async function runProviderHealthCheck(
  type: StorageProviderType,
  provider: StorageProvider
): Promise<boolean> {
  const healthCheck = providerHealthChecks[type];
  
  if (!healthCheck) {
    // If no custom health check, use the provider's built-in one
    return provider.healthCheck();
  }
  
  try {
    return await healthCheck(provider);
  } catch (error) {
    console.warn(`Health check failed for ${type} provider:`, error);
    return false;
  }
}

// Re-export types for convenience
export type { StorageProvider, StorageProviderType } from '../types';
