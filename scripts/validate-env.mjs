#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates all required environment variables for the email system
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple dotenv parser
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    }
  }
}

// Load environment variables
loadEnv();

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateEnvironment() {
  log('\n🔍 Environment Validation Starting...', 'blue');
  log('='.repeat(50), 'blue');

  const errors = [];
  const warnings = [];
  const success = [];

  // Required variables
  const requiredVars = {
    'DATABASE_URL': 'Database connection string',
    'NEXTAUTH_URL': 'NextAuth URL for authentication',
    'AUTH_SECRET': 'NextAuth secret key',
    'EMAIL_PROVIDERS': 'Email provider configuration',
    'EMAIL_FROM_ADDRESS': 'From email address',
    'QUEUE_BACKEND': 'Queue backend selection'
  };

  // Email provider specific variables
  const emailProviders = (process.env.EMAIL_PROVIDERS || '').split(',').map(p => p.trim());
  
  const providerVars = {
    'resend': ['RESEND_API_KEY'],
    'ses': ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
    'gmail': ['GMAIL_USER', 'GMAIL_PASS']
  };

  // Storage provider specific variables
  const storageProviders = (process.env.STORAGE_PROVIDER || 'AUTO').toLowerCase();
  const storageVars = {
    's3': ['AWS_S3_BUCKET', 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
    'local': ['LOCAL_STORAGE_PATH', 'LOCAL_BASE_URL'],
    'auto': [] // AUTO detects available providers
  };

  // Queue backend specific variables
  const queueVars = {
    'sqs': ['SQS_QUEUE_URL'],
    'graphile': ['QUEUE_DATABASE_URL']
  };

  log('\n📋 Checking Required Variables...', 'bold');
  
  // Check required variables
  for (const [varName, description] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    if (!value) {
      errors.push(`❌ ${varName}: ${description} - MISSING`);
    } else {
      success.push(`✅ ${varName}: Found`);
    }
  }

  // Check email provider variables
  log('\n📧 Checking Email Provider Configuration...', 'bold');
  
  if (emailProviders.length === 0) {
    errors.push('❌ EMAIL_PROVIDERS: No email providers configured');
  } else {
    for (const provider of emailProviders) {
      if (providerVars[provider]) {
        log(`\n  Checking ${provider.toUpperCase()} provider:`, 'yellow');
        for (const varName of providerVars[provider]) {
          const value = process.env[varName];
          if (!value) {
            errors.push(`❌ ${varName}: Required for ${provider} provider - MISSING`);
          } else {
            success.push(`✅ ${varName}: Found for ${provider}`);
          }
        }
      } else {
        warnings.push(`⚠️  Unknown email provider: ${provider}`);
      }
    }
  }

  // Check storage provider variables
  log('\n📦 Checking Storage Provider Configuration...', 'bold');
  
  if (storageProviders === 'auto') {
    success.push('✅ STORAGE_PROVIDER: AUTO - Detecting available providers');
  } else if (storageVars[storageProviders]) {
    log(`\n  Checking ${storageProviders.toUpperCase()} storage provider:`, 'yellow');
    for (const varName of storageVars[storageProviders]) {
      const value = process.env[varName];
      if (!value) {
        errors.push(`❌ ${varName}: Required for ${storageProviders} storage provider - MISSING`);
      } else {
        success.push(`✅ ${varName}: Found for ${storageProviders}`);
      }
    }
  } else {
    warnings.push(`⚠️  Unknown storage provider: ${storageProviders}`);
  }

  // Check queue backend variables
  log('\n🔄 Checking Queue Configuration...', 'bold');
  
  const queueBackend = process.env.QUEUE_BACKEND;
  if (queueBackend && queueVars[queueBackend]) {
    for (const varName of queueVars[queueBackend]) {
      const value = process.env[varName];
      if (!value) {
        errors.push(`❌ ${varName}: Required for ${queueBackend} queue backend - MISSING`);
      } else {
        success.push(`✅ ${varName}: Found for ${queueBackend}`);
      }
    }
  }

  // Check OAuth configuration (optional)
  log('\n🔐 Checking OAuth Configuration (Optional)...', 'bold');
  
  const oauthVars = {
    'AUTH_GOOGLE_ID': 'AUTH_GOOGLE_SECRET',
    'AUTH_FACEBOOK_ID': 'AUTH_FACEBOOK_SECRET'
  };

  for (const [idVar, secretVar] of Object.entries(oauthVars)) {
    const id = process.env[idVar];
    const secret = process.env[secretVar];
    
    if (id && secret) {
      success.push(`✅ ${idVar.split('_')[1]} OAuth: Configured`);
    } else if (id || secret) {
      warnings.push(`⚠️  ${idVar.split('_')[1]} OAuth: Partially configured (missing ${id ? secretVar : idVar})`);
    }
  }

  // Validate specific values
  log('\n🔍 Validating Configuration Values...', 'bold');
  
  // Check email format
  const emailFrom = process.env.EMAIL_FROM_ADDRESS;
  if (emailFrom && !emailFrom.includes('@')) {
    errors.push('❌ EMAIL_FROM_ADDRESS: Invalid email format');
  }

  // Check URL format
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl && !nextAuthUrl.startsWith('http')) {
    errors.push('❌ NEXTAUTH_URL: Must start with http:// or https://');
  }

  // Check AUTH_SECRET strength
  const authSecret = process.env.AUTH_SECRET;
  if (authSecret && authSecret.length < 32) {
    warnings.push('⚠️  AUTH_SECRET: Should be at least 32 characters long');
  }

  // Check for development defaults in production
  if (process.env.NODE_ENV === 'production') {
    const prodChecks = [
      ['AUTH_SECRET', 'your_auth_secret_here'],
      ['RESEND_API_KEY', 'your_resend_api_key_here'],
      ['AWS_ACCESS_KEY_ID', 'your_aws_access_key_here'],
      ['SUPERADMIN_PASSWORD', 'your_secure_password']
    ];

    for (const [varName, defaultValue] of prodChecks) {
      const value = process.env[varName];
      if (value && value.includes(defaultValue.split('_')[0])) {
        errors.push(`❌ ${varName}: Using default/placeholder value in production`);
      }
    }
  }

  // Display results
  log('\n' + '='.repeat(50), 'blue');
  log('📊 VALIDATION RESULTS', 'bold');
  log('='.repeat(50), 'blue');

  if (success.length > 0) {
    log('\n✅ SUCCESSFUL CHECKS:', 'green');
    success.forEach(msg => log(`  ${msg}`, 'green'));
  }

  if (warnings.length > 0) {
    log('\n⚠️  WARNINGS:', 'yellow');
    warnings.forEach(msg => log(`  ${msg}`, 'yellow'));
  }

  if (errors.length > 0) {
    log('\n❌ ERRORS:', 'red');
    errors.forEach(msg => log(`  ${msg}`, 'red'));
  }

  log('\n' + '='.repeat(50), 'blue');
  
  if (errors.length === 0) {
    log('🎉 ENVIRONMENT VALIDATION PASSED!', 'green');
    log('Your configuration is ready for deployment.', 'green');
    return true;
  } else {
    log('💥 ENVIRONMENT VALIDATION FAILED!', 'red');
    log(`Found ${errors.length} error(s) and ${warnings.length} warning(s).`, 'red');
    log('Please fix the errors before deploying.', 'red');
    return false;
  }
}

// Run validation
if (import.meta.url === `file://${process.argv[1]}`) {
  const isValid = validateEnvironment();
  process.exit(isValid ? 0 : 1);
}

export default validateEnvironment;
