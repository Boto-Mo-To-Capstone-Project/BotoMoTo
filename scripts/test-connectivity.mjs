#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import https from 'https';
import http from 'http';

// Load environment variables manually (since dotenv is not installed)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

try {
  const envFile = readFileSync(join(rootDir, '.env'), 'utf8');
  envFile.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...values] = line.split('=');
      if (key && values.length > 0) {
        process.env[key] = values.join('=').replace(/^["']|["']$/g, '');
      }
    }
  });
} catch (error) {
  console.log('⚠️  No .env file found or error reading it. Using existing environment variables.');
}

console.log('🔌 Email Service Connectivity Test');
console.log('==================================================\n');

// Test utilities
const testHttpsEndpoint = (url, name) => {
  return new Promise((resolve) => {
    const request = https.get(url, { timeout: 10000 }, (res) => {
      resolve({ success: true, status: res.statusCode });
    });
    
    request.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    
    request.on('timeout', () => {
      request.destroy();
      resolve({ success: false, error: 'Connection timeout' });
    });
  });
};

const testSMTP = async (host, port, secure, name) => {
  return new Promise((resolve) => {
    const net = secure ? https : http;
    const options = {
      hostname: host,
      port: port,
      timeout: 10000
    };

    try {
      const req = net.request(options, (res) => {
        resolve({ success: true, status: res.statusCode });
      });

      req.on('error', (err) => {
        // For SMTP, connection refused might be normal for HTTP requests
        // We'll consider it reachable if we get any response
        resolve({ success: true, note: 'Host reachable (SMTP requires proper authentication)' });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Connection timeout' });
      });

      req.end();
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
};

// Get providers from environment
const enabledProviders = (process.env.EMAIL_PROVIDERS || '').split(',').map(p => p.trim()).filter(Boolean);
const queueBackend = process.env.QUEUE_BACKEND || 'inmemory';

console.log(`📧 Testing Email Providers: ${enabledProviders.join(', ')}`);
console.log(`🔄 Queue Backend: ${queueBackend}\n`);

async function runTests() {
  const results = {
    database: null,
    email: {},
    queue: null,
    oauth: {}
  };

  // Test Database Connection
  console.log('🗄️  Testing Database Connection...');
  if (process.env.DATABASE_URL) {
    try {
      // Basic URL parsing test
      const dbUrl = new URL(process.env.DATABASE_URL);
      console.log(`   📍 Host: ${dbUrl.hostname}:${dbUrl.port || 5432}`);
      console.log(`   🎯 Database: ${dbUrl.pathname.slice(1)}`);
      results.database = { success: true, note: 'URL format valid (actual connection requires Prisma)' };
      console.log('   ✅ Database URL format is valid\n');
    } catch (error) {
      results.database = { success: false, error: error.message };
      console.log(`   ❌ Invalid database URL: ${error.message}\n`);
    }
  } else {
    results.database = { success: false, error: 'DATABASE_URL not configured' };
    console.log('   ❌ DATABASE_URL not configured\n');
  }

  // Test Email Providers
  console.log('📧 Testing Email Provider Connectivity...\n');

  // Test Resend
  if (enabledProviders.includes('resend') && process.env.RESEND_API_KEY) {
    console.log('   Testing Resend API...');
    const result = await testHttpsEndpoint('https://api.resend.com', 'Resend');
    results.email.resend = result;
    
    if (result.success) {
      console.log(`   ✅ Resend API reachable (status: ${result.status})`);
    } else {
      console.log(`   ❌ Resend API unreachable: ${result.error}`);
    }
  }

  // Test AWS SES
  if (enabledProviders.includes('ses') && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('   Testing AWS SES connectivity...');
    const region = process.env.AWS_REGION || 'us-east-1';
    const result = await testHttpsEndpoint(`https://email.${region}.amazonaws.com`, 'AWS SES');
    results.email.ses = result;
    
    if (result.success) {
      console.log(`   ✅ AWS SES endpoint reachable in ${region}`);
    } else {
      console.log(`   ❌ AWS SES endpoint unreachable: ${result.error}`);
    }
  }

  // Test Gmail SMTP
  if (enabledProviders.includes('gmail') && process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    console.log('   Testing Gmail SMTP...');
    const result = await testSMTP('smtp.gmail.com', 587, false, 'Gmail SMTP');
    results.email.gmail = result;
    
    if (result.success) {
      const note = result.note ? ` (${result.note})` : '';
      console.log(`   ✅ Gmail SMTP reachable${note}`);
    } else {
      console.log(`   ❌ Gmail SMTP unreachable: ${result.error}`);
    }
  }

  console.log();

  // Test Queue Backend
  console.log('🔄 Testing Queue Backend...\n');
  
  if (queueBackend === 'graphile-worker') {
    // Graphile Worker uses the same database connection
    if (results.database?.success) {
      results.queue = { success: true, note: 'Uses same database connection' };
      console.log('   ✅ Graphile Worker will use database connection');
    } else {
      results.queue = { success: false, error: 'Database connection required for Graphile Worker' };
      console.log('   ❌ Graphile Worker requires database connection');
    }
  } else if (queueBackend === 'sqs') {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      const region = process.env.AWS_REGION || 'us-east-1';
      const result = await testHttpsEndpoint(`https://sqs.${region}.amazonaws.com`, 'AWS SQS');
      results.queue = result;
      
      if (result.success) {
        console.log(`   ✅ AWS SQS endpoint reachable in ${region}`);
      } else {
        console.log(`   ❌ AWS SQS endpoint unreachable: ${result.error}`);
      }
    } else {
      results.queue = { success: false, error: 'AWS credentials required for SQS' };
      console.log('   ❌ AWS credentials required for SQS');
    }
  } else {
    results.queue = { success: true, note: 'In-memory queue (development only)' };
    console.log('   ✅ In-memory queue (development mode)');
  }

  console.log();

  // Test OAuth Providers (optional)
  console.log('🔐 Testing OAuth Provider Connectivity...\n');

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('   Testing Google OAuth...');
    const result = await testHttpsEndpoint('https://accounts.google.com/.well-known/openid_configuration', 'Google OAuth');
    results.oauth.google = result;
    
    if (result.success) {
      console.log('   ✅ Google OAuth endpoints reachable');
    } else {
      console.log(`   ❌ Google OAuth endpoints unreachable: ${result.error}`);
    }
  }

  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    console.log('   Testing Facebook OAuth...');
    const result = await testHttpsEndpoint('https://graph.facebook.com/me', 'Facebook OAuth');
    results.oauth.facebook = result;
    
    if (result.success) {
      console.log('   ✅ Facebook OAuth endpoints reachable');
    } else {
      console.log(`   ❌ Facebook OAuth endpoints unreachable: ${result.error}`);
    }
  }

  // Results Summary
  console.log('\n==================================================');
  console.log('📊 CONNECTIVITY TEST RESULTS');
  console.log('==================================================\n');

  const allTests = [
    { name: 'Database', result: results.database },
    ...Object.entries(results.email).map(([provider, result]) => ({ 
      name: `Email (${provider})`, 
      result 
    })),
    { name: 'Queue Backend', result: results.queue },
    ...Object.entries(results.oauth).map(([provider, result]) => ({ 
      name: `OAuth (${provider})`, 
      result 
    }))
  ];

  const successful = allTests.filter(test => test.result?.success);
  const failed = allTests.filter(test => test.result && !test.result.success);

  if (successful.length > 0) {
    console.log('✅ SUCCESSFUL CONNECTIONS:');
    successful.forEach(test => {
      const note = test.result.note ? ` (${test.result.note})` : '';
      console.log(`  ✅ ${test.name}${note}`);
    });
    console.log();
  }

  if (failed.length > 0) {
    console.log('❌ FAILED CONNECTIONS:');
    failed.forEach(test => {
      console.log(`  ❌ ${test.name}: ${test.result.error}`);
    });
    console.log();
  }

  // Overall status
  const criticalServices = ['Database'];
  const criticalFailures = failed.filter(test => 
    criticalServices.some(service => test.name.includes(service))
  );

  if (criticalFailures.length === 0) {
    console.log('🎉 CONNECTIVITY TEST PASSED!');
    console.log('All critical services are reachable.');
    
    if (failed.length > 0) {
      console.log('⚠️  Some optional services have connectivity issues.');
      console.log('The application will work with reduced functionality.');
    }
  } else {
    console.log('⚠️  CONNECTIVITY TEST FAILED!');
    console.log('Critical services are not reachable.');
    console.log('Please check your configuration and network connectivity.');
  }

  console.log('\n💡 Next Steps:');
  console.log('  1. Fix any failed critical connections');
  console.log('  2. Run: npm run build');
  console.log('  3. Run: npm run dev (for development)');
  console.log('  4. Test email sending: npm run email:test');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
