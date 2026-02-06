import { StorageError, UploadFailedError, FileNotFoundError, ProviderNotAvailableError } from './types';

/**
 * Storage operation logger for monitoring and debugging
 * Provides structured logging for all storage operations
 */
export class StorageLogger {
  private static instance: StorageLogger | null = null;
  
  private constructor() {}
  
  static getInstance(): StorageLogger {
    if (!StorageLogger.instance) {
      StorageLogger.instance = new StorageLogger();
    }
    return StorageLogger.instance;
  }

  /**
   * Log storage operation start
   */
  logOperationStart(operation: string, details: {
    key?: string;
    provider: string;
    attempt?: number;
    maxAttempts?: number;
    fileSize?: number;
  }): void {
    const timestamp = new Date().toISOString();
    const attemptInfo = details.attempt && details.maxAttempts 
      ? ` (attempt ${details.attempt}/${details.maxAttempts})`
      : '';
    
    console.log(`🗄️  [${timestamp}] Storage ${operation} started${attemptInfo}`, {
      provider: details.provider,
      key: details.key,
      fileSize: details.fileSize,
    });
  }

  /**
   * Log storage operation success
   */
  logOperationSuccess(operation: string, details: {
    key?: string;
    provider: string;
    duration: number;
    fileSize?: number;
    fallbackUsed?: boolean;
  }): void {
    const timestamp = new Date().toISOString();
    const fallbackFlag = details.fallbackUsed ? ' [FALLBACK]' : '';
    
    console.log(`✅ [${timestamp}] Storage ${operation} succeeded${fallbackFlag}`, {
      provider: details.provider,
      key: details.key,
      duration: `${details.duration}ms`,
      fileSize: details.fileSize,
    });
  }

  /**
   * Log storage operation error
   */
  logOperationError(operation: string, error: Error, details: {
    key?: string;
    provider: string;
    attempt?: number;
    maxAttempts?: number;
    willRetry?: boolean;
    willFallback?: boolean;
  }): void {
    const timestamp = new Date().toISOString();
    const attemptInfo = details.attempt && details.maxAttempts 
      ? ` (attempt ${details.attempt}/${details.maxAttempts})`
      : '';
    const nextAction = details.willRetry ? ' - Will retry' : 
                      details.willFallback ? ' - Will fallback' : 
                      ' - Final failure';
    
    console.error(`❌ [${timestamp}] Storage ${operation} failed${attemptInfo}${nextAction}`, {
      provider: details.provider,
      key: details.key,
      error: error.message,
      errorType: error.constructor.name,
    });
  }

  /**
   * Log provider health check
   */
  logHealthCheck(provider: string, healthy: boolean, duration: number): void {
    const timestamp = new Date().toISOString();
    const status = healthy ? '✅ Healthy' : '❌ Unhealthy';
    
    console.log(`🔍 [${timestamp}] Provider ${provider} health check: ${status} (${duration}ms)`);
  }

  /**
   * Log provider initialization
   */
  logProviderInit(provider: string, success: boolean, error?: Error): void {
    const timestamp = new Date().toISOString();
    
    if (success) {
      console.log(`🚀 [${timestamp}] Provider ${provider} initialized successfully`);
    } else {
      console.error(`💥 [${timestamp}] Provider ${provider} initialization failed:`, error?.message);
    }
  }

  /**
   * Log storage service statistics
   */
  logStatistics(stats: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    fallbackUsage: number;
    averageUploadTime: number;
    primaryProviderHealth: boolean;
    fallbackProviderHealth?: boolean;
  }): void {
    const timestamp = new Date().toISOString();
    const successRate = stats.totalOperations > 0 
      ? ((stats.successfulOperations / stats.totalOperations) * 100).toFixed(2)
      : '0';
    
    console.log(`📊 [${timestamp}] Storage Service Statistics:`, {
      totalOperations: stats.totalOperations,
      successRate: `${successRate}%`,
      fallbackUsage: `${stats.fallbackUsage} operations`,
      averageUploadTime: `${stats.averageUploadTime}ms`,
      primaryHealth: stats.primaryProviderHealth ? '✅' : '❌',
      fallbackHealth: stats.fallbackProviderHealth !== undefined 
        ? (stats.fallbackProviderHealth ? '✅' : '❌') 
        : 'N/A',
    });
  }
}

/**
 * Enhanced error handler for storage operations
 * Provides consistent error handling and recovery strategies
 */
export class StorageErrorHandler {
  private static instance: StorageErrorHandler | null = null;
  private logger: StorageLogger;
  
  private constructor() {
    this.logger = StorageLogger.getInstance();
  }
  
  static getInstance(): StorageErrorHandler {
    if (!StorageErrorHandler.instance) {
      StorageErrorHandler.instance = new StorageErrorHandler();
    }
    return StorageErrorHandler.instance;
  }

  /**
   * Handle and classify storage errors
   */
  handleError(error: Error, context: {
    operation: string;
    provider: string;
    key?: string;
    attempt?: number;
    maxAttempts?: number;
  }): {
    shouldRetry: boolean;
    shouldFallback: boolean;
    retryDelay?: number;
    errorType: string;
    userMessage: string;
  } {
    // Log the error
    this.logger.logOperationError(context.operation, error, {
      ...context,
      willRetry: false, // Will be updated below
      willFallback: false, // Will be updated below
    });

    // Classify error type and determine action
    if (error instanceof UploadFailedError) {
      return this.handleUploadError(error, context);
    }
    
    if (error instanceof FileNotFoundError) {
      return this.handleFileNotFoundError(error, context);
    }
    
    if (error instanceof ProviderNotAvailableError) {
      return this.handleProviderError(error, context);
    }
    
    if (error instanceof StorageError) {
      return this.handleStorageError(error, context);
    }
    
    // Generic error handling
    return this.handleGenericError(error, context);
  }

  /**
   * Handle upload-specific errors
   */
  private handleUploadError(error: UploadFailedError, context: any): any {
    const isLastAttempt = context.attempt === context.maxAttempts;
    
    // Check for specific error conditions
    if (error.message.includes('File size') || error.message.includes('too large')) {
      return {
        shouldRetry: false,
        shouldFallback: false,
        errorType: 'FILE_TOO_LARGE',
        userMessage: 'File size exceeds the maximum allowed limit.',
      };
    }
    
    if (error.message.includes('Invalid credentials') || error.message.includes('Access denied')) {
      return {
        shouldRetry: false,
        shouldFallback: true,
        errorType: 'AUTHENTICATION_ERROR',
        userMessage: 'Storage authentication failed. Please check your configuration.',
      };
    }
    
    if (error.message.includes('Network') || error.message.includes('timeout')) {
      return {
        shouldRetry: !isLastAttempt,
        shouldFallback: isLastAttempt,
        retryDelay: this.calculateRetryDelay(context.attempt || 1),
        errorType: 'NETWORK_ERROR',
        userMessage: 'Network error occurred. Retrying...',
      };
    }
    
    // Default upload error handling
    return {
      shouldRetry: !isLastAttempt,
      shouldFallback: isLastAttempt,
      retryDelay: this.calculateRetryDelay(context.attempt || 1),
      errorType: 'UPLOAD_ERROR',
      userMessage: 'Upload failed. Retrying with fallback storage...',
    };
  }

  /**
   * Handle file not found errors
   */
  private handleFileNotFoundError(error: FileNotFoundError, context: any): any {
    return {
      shouldRetry: false,
      shouldFallback: true, // Try checking fallback storage
      errorType: 'FILE_NOT_FOUND',
      userMessage: 'The requested file was not found.',
    };
  }

  /**
   * Handle provider unavailable errors
   */
  private handleProviderError(error: ProviderNotAvailableError, context: any): any {
    return {
      shouldRetry: false,
      shouldFallback: true,
      errorType: 'PROVIDER_UNAVAILABLE',
      userMessage: 'Primary storage provider is unavailable. Using backup storage.',
    };
  }

  /**
   * Handle general storage errors
   */
  private handleStorageError(error: StorageError, context: any): any {
    const isLastAttempt = context.attempt === context.maxAttempts;
    
    switch (error.code) {
      case 'QUOTA_EXCEEDED':
        return {
          shouldRetry: false,
          shouldFallback: true,
          errorType: 'QUOTA_EXCEEDED',
          userMessage: 'Storage quota exceeded. Using backup storage.',
        };
        
      case 'RATE_LIMITED':
        return {
          shouldRetry: !isLastAttempt,
          shouldFallback: isLastAttempt,
          retryDelay: this.calculateRetryDelay(context.attempt || 1, true), // Longer delay for rate limiting
          errorType: 'RATE_LIMITED',
          userMessage: 'Rate limit exceeded. Retrying...',
        };
        
      default:
        return {
          shouldRetry: !isLastAttempt,
          shouldFallback: isLastAttempt,
          retryDelay: this.calculateRetryDelay(context.attempt || 1),
          errorType: 'STORAGE_ERROR',
          userMessage: 'Storage operation failed. Retrying...',
        };
    }
  }

  /**
   * Handle generic errors
   */
  private handleGenericError(error: Error, context: any): any {
    const isLastAttempt = context.attempt === context.maxAttempts;
    
    return {
      shouldRetry: !isLastAttempt,
      shouldFallback: isLastAttempt,
      retryDelay: this.calculateRetryDelay(context.attempt || 1),
      errorType: 'UNKNOWN_ERROR',
      userMessage: 'An unexpected error occurred. Retrying...',
    };
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, isRateLimit: boolean = false): number {
    const baseDelay = isRateLimit ? 5000 : 1000; // 5s for rate limits, 1s for others
    const maxDelay = isRateLimit ? 60000 : 10000; // 1min for rate limits, 10s for others
    
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 0.3; // ±30%
    return Math.floor(delay * (1 + jitter));
  }

  /**
   * Create user-friendly error message
   */
  createUserMessage(errorType: string, operation: string): string {
    const messages: Record<string, Record<string, string>> = {
      upload: {
        FILE_TOO_LARGE: 'The file you selected is too large. Please choose a smaller file.',
        NETWORK_ERROR: 'Network connection issue. Please check your internet and try again.',
        AUTHENTICATION_ERROR: 'Storage service authentication failed. Please contact support.',
        QUOTA_EXCEEDED: 'Storage quota exceeded. Please contact your administrator.',
        RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
        UNKNOWN_ERROR: 'An unexpected error occurred during upload. Please try again.',
      },
      delete: {
        FILE_NOT_FOUND: 'The file you are trying to delete does not exist.',
        AUTHENTICATION_ERROR: 'Permission denied. You do not have access to delete this file.',
        UNKNOWN_ERROR: 'An error occurred while deleting the file. Please try again.',
      },
      download: {
        FILE_NOT_FOUND: 'The requested file could not be found.',
        AUTHENTICATION_ERROR: 'You do not have permission to access this file.',
        UNKNOWN_ERROR: 'An error occurred while accessing the file. Please try again.',
      }
    };
    
    return messages[operation]?.[errorType] || 'An unexpected error occurred. Please try again.';
  }
}
