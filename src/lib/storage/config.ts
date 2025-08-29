import { StorageConfig, StorageProviderType } from './types';

/**
 * Storage configuration based on environment variables
 * Mirrors the email system's configuration pattern
 */

function getRequiredEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

function getOptionalEnvVar(key: string, fallback?: string): string | undefined {
  return process.env[key] || fallback;
}

function validateS3Config() {
  const requiredVars = ['AWS_S3_BUCKET', 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const missing = requiredVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`S3 configuration incomplete. Missing: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

function validateLocalConfig() {
  // Local config always has defaults, so it's always valid
  return true;
}

// wala pa ngayon
function validateGCSConfig() {
  const hasProjectId = !!process.env.GCP_PROJECT_ID;
  const hasCredentials = !!(process.env.GCP_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const hasBucket = !!process.env.GCS_BUCKET;
  
  return hasProjectId && hasCredentials && hasBucket;
}

// wala pa ngayon
function validateAzureConfig() {
  const hasAccountInfo = !!(process.env.AZURE_ACCOUNT_NAME && process.env.AZURE_ACCOUNT_KEY);
  const hasConnectionString = !!process.env.AZURE_CONNECTION_STRING;
  const hasContainer = !!process.env.AZURE_CONTAINER;
  
  return (hasAccountInfo || hasConnectionString) && hasContainer;
}

/**
 * Determine the best available storage provider based on configuration
 */
function determineBestProvider(): StorageProviderType {
  const preferredProvider = (process.env.STORAGE_PROVIDER as StorageProviderType) || 'S3';
  
  // Check if preferred provider is properly configured
  switch (preferredProvider) {
    case 'S3':
      if (validateS3Config()) return 'S3';
      break;
    case 'GCS':
      if (validateGCSConfig()) return 'GCS';
      break;
    case 'AZURE':
      if (validateAzureConfig()) return 'AZURE';
      break;
    case 'LOCAL':
      return 'LOCAL'; // Local is always available
  }
  
  // Fallback logic: try other providers
  if (preferredProvider !== 'S3' && validateS3Config()) {
    console.warn(`Preferred provider ${preferredProvider} not available, falling back to S3`);
    return 'S3';
  }
  
  if (preferredProvider !== 'GCS' && validateGCSConfig()) {
    console.warn(`Preferred provider ${preferredProvider} not available, falling back to GCS`);
    return 'GCS';
  }
  
  if (preferredProvider !== 'AZURE' && validateAzureConfig()) {
    console.warn(`Preferred provider ${preferredProvider} not available, falling back to Azure`);
    return 'AZURE';
  }
  
  // Final fallback to local storage
  console.warn(`No cloud storage providers configured, using local storage`);
  return 'LOCAL';
}

/**
 * Create storage configuration from environment variables
 */
export function createStorageConfig(): StorageConfig {
  const provider = determineBestProvider();
  
  const config: StorageConfig = {
    provider,
    fallback: 'LOCAL', // Always fallback to local
    retryAttempts: parseInt(getOptionalEnvVar('STORAGE_RETRY_ATTEMPTS', '3') || '3'),
  };
  
  // S3 Configuration
  if (provider === 'S3' || validateS3Config()) {
    config.s3 = {
      bucket: getRequiredEnvVar('AWS_S3_BUCKET'),
      region: getRequiredEnvVar('AWS_REGION', 'us-east-1'),
      accessKeyId: getRequiredEnvVar('AWS_ACCESS_KEY_ID'),
      secretAccessKey: getRequiredEnvVar('AWS_SECRET_ACCESS_KEY'),
      endpoint: getOptionalEnvVar('AWS_S3_ENDPOINT'),
      forcePathStyle: getOptionalEnvVar('AWS_S3_FORCE_PATH_STYLE') === 'true',
    };
  }
  
  // Local Configuration (always available as fallback)
  config.local = {
    uploadDir: getOptionalEnvVar('LOCAL_UPLOAD_DIR', 'uploads') || 'uploads',
    baseUrl: getOptionalEnvVar('LOCAL_BASE_URL', '/api/files') || '/api/files',
    publicPath: getOptionalEnvVar('LOCAL_PUBLIC_PATH', '/uploads'),
    maxFileSize: parseInt(getOptionalEnvVar('LOCAL_MAX_FILE_SIZE', '10485760') || '10485760'), // 10MB default
  };
  
  // GCS Configuration
  if (provider === 'GCS' || validateGCSConfig()) {
    config.gcs = {
      projectId: getRequiredEnvVar('GCP_PROJECT_ID'),
      keyFilename: getOptionalEnvVar('GCP_KEY_FILE'),
      bucket: getRequiredEnvVar('GCS_BUCKET'),
    };
    
    // If no key file, check for application credentials
    if (!config.gcs.keyFilename && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      config.gcs.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
  }
  
  // Azure Configuration
  if (provider === 'AZURE' || validateAzureConfig()) {
    config.azure = {
      accountName: getRequiredEnvVar('AZURE_ACCOUNT_NAME'),
      accountKey: getRequiredEnvVar('AZURE_ACCOUNT_KEY'),
      containerName: getRequiredEnvVar('AZURE_CONTAINER'),
      connectionString: getOptionalEnvVar('AZURE_CONNECTION_STRING'),
    };
  }
  
  return config;
}

/**
 * Default storage configuration instance
 */
export const storageConfig: StorageConfig = createStorageConfig();

/**
 * Log current storage configuration (for debugging)
 */
export function logStorageConfig(): void {
  console.log('🗄️  Storage Configuration:');
  console.log(`   Primary Provider: ${storageConfig.provider}`);
  console.log(`   Fallback Provider: ${storageConfig.fallback}`);
  console.log(`   Retry Attempts: ${storageConfig.retryAttempts}`);
  
  if (storageConfig.s3) {
    console.log(`   S3 Bucket: ${storageConfig.s3.bucket}`);
    console.log(`   S3 Region: ${storageConfig.s3.region}`);
  }
  
  if (storageConfig.local) {
    console.log(`   Local Upload Dir: ${storageConfig.local.uploadDir}`);
    console.log(`   Local Base URL: ${storageConfig.local.baseUrl}`);
  }
  
  if (storageConfig.gcs) {
    console.log(`   GCS Bucket: ${storageConfig.gcs.bucket}`);
    console.log(`   GCS Project: ${storageConfig.gcs.projectId}`);
  }
  
  if (storageConfig.azure) {
    console.log(`   Azure Container: ${storageConfig.azure.containerName}`);
    console.log(`   Azure Account: ${storageConfig.azure.accountName}`);
  }
}

/**
 * Validate that the current configuration is usable
 */
export function validateStorageConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check primary provider
  switch (storageConfig.provider) {
    case 'S3':
      if (!storageConfig.s3) {
        errors.push('S3 provider selected but configuration is missing');
      }
      break;
    case 'GCS':
      if (!storageConfig.gcs) {
        errors.push('GCS provider selected but configuration is missing');
      }
      break;
    case 'AZURE':
      if (!storageConfig.azure) {
        errors.push('Azure provider selected but configuration is missing');
      }
      break;
    case 'LOCAL':
      if (!storageConfig.local) {
        errors.push('Local provider selected but configuration is missing');
      }
      break;
  }
  
  // Check fallback provider
  if (storageConfig.fallback === 'LOCAL' && !storageConfig.local) {
    errors.push('Local fallback configured but local configuration is missing');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
