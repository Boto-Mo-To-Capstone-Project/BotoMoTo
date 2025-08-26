# Environment Configuration Guide
# Complete setup for production and development environments

This guide provides step-by-step instructions for configuring all environment variables for your Next.js RBAC voting system with the new email functionality.

## 📋 **Environment Files Overview**

- `.env` - Your actual environment variables (never commit to git)
- `.env.example` - Template file (safe to commit)
- `.env.local` - Alternative local development file
- `.env.production` - Production-specific variables

---

## 🏗️ **STEP 1: Copy Environment Template**

```bash
# Copy the example file to create your environment file
cp .env.example .env

# Edit with your actual values
nano .env  # or code .env
```

---

## 📧 **STEP 2: Email Provider Configuration**

### **A. Resend (Primary Provider)**

1. **Get API Key:**
   ```
   1. Go to https://resend.com
   2. Sign up/Login
   3. Go to API Keys → Create API Key
   4. Copy the key (starts with 're_')
   ```

2. **Get Webhook Secret:**
   ```
   1. In Resend dashboard, go to Webhooks
   2. Create webhook: https://yourdomain.com/api/webhooks/resend
   3. Select events: email.sent, email.delivered, email.bounced, email.complained
   4. Copy the webhook secret
   ```

3. **Configure Domain:**
   ```
   1. Go to Domains → Add Domain
   2. Add: boto-mo-to.online
   3. Follow DNS setup from DNS_SETUP_GUIDE.md
   ```

**Environment Variables:**
```bash
RESEND_API_KEY=re_YourActualApiKey
RESEND_WEBHOOK_SECRET=whsec_YourWebhookSecret
```

### **B. AWS SES (Backup Provider)**

1. **Create IAM User:**
   ```
   1. Go to AWS IAM Console
   2. Users → Create User → "ses-email-user"
   3. Attach policy: AmazonSESFullAccess
   4. Create access key for programmatic access
   ```

2. **Configure SES:**
   ```
   1. Go to AWS SES Console (ap-southeast-1 region)
   2. Verified identities → Create identity → Domain
   3. Add: boto-mo-to.online
   4. Follow DNS setup instructions
   ```

3. **Setup SNS for Webhooks (Optional):**
   ```
   1. Create SNS topic for SES events
   2. Configure webhook endpoint: https://yourdomain.com/api/webhooks/ses
   3. Subscribe to bounce/complaint notifications
   ```

**Environment Variables:**
```bash
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=YourSecretAccessKey
SES_FROM_EMAIL=noreply@boto-mo-to.online
```

### **C. Gmail SMTP (Development/Backup)**

1. **Enable 2FA on Gmail:**
   ```
   1. Go to Google Account settings
   2. Security → 2-Step Verification → Turn on
   ```

2. **Generate App Password:**
   ```
   1. Security → 2-Step Verification → App passwords
   2. Select app: Mail, device: Other (custom name)
   3. Generate password (16 characters)
   ```

**Environment Variables:**
```bash
GMAIL_SMTP_EMAIL=youremail@gmail.com
GMAIL_SMTP_PASSWORD=abcdwxyzabcdwxyz  # 16-character app password
```

---

## 🔄 **STEP 3: Queue System Configuration**

### **A. Development (In-Memory)**
```bash
QUEUE_BACKEND=inmemory
```

### **B. Local Development (Graphile Worker)**
```bash
QUEUE_BACKEND=graphile
QUEUE_DATABASE_URL=postgresql://user:password@localhost:5432/next_rbac
# or use your main DATABASE_URL
```

### **C. Production (AWS SQS)**

1. **Create SQS Queue:**
   ```
   1. Go to AWS SQS Console
   2. Create queue: "botomoto-email-queue"
   3. Configure: Standard queue, default settings
   4. Note the queue URL
   ```

2. **IAM Permissions:**
   ```
   Add SQS permissions to your IAM user:
   - sqs:SendMessage
   - sqs:ReceiveMessage
   - sqs:DeleteMessage
   - sqs:GetQueueAttributes
   ```

**Environment Variables:**
```bash
QUEUE_BACKEND=sqs
SQS_QUEUE_URL=https://sqs.ap-southeast-1.amazonaws.com/123456789/botomoto-email-queue
```

---

## 🗄️ **STEP 4: Database Configuration**

### **A. Production (Supabase/PostgreSQL)**
```bash
DATABASE_URL="postgresql://user:password@host:port/database?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:port/database?sslmode=require"
```

### **B. Local Development**
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/next_rbac"
DIRECT_URL="postgresql://postgres:password@localhost:5432/next_rbac"
```

### **C. SQLite (Development)**
```bash
DATABASE_URL="file:./prisma/dev.db"
```

---

## 🔐 **STEP 5: Authentication Configuration**

### **A. NextAuth Configuration**
```bash
NEXTAUTH_URL=https://yourdomain.com  # Production URL
AUTH_SECRET=your_super_secure_random_string_here  # Generate with: openssl rand -base64 32
AUTH_TRUST_HOST=true
```

### **B. OAuth Providers**

**Google OAuth:**
1. Go to Google Cloud Console
2. APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Authorized redirect URIs: `https://yourdomain.com/api/auth/callback/google`

```bash
AUTH_GOOGLE_ID=123456789-abcdefg.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-YourGoogleSecret
```

**Facebook OAuth:**
1. Go to Facebook Developers
2. Create App → Consumer
3. Facebook Login → Settings
4. Valid OAuth Redirect URIs: `https://yourdomain.com/api/auth/callback/facebook`

```bash
AUTH_FACEBOOK_ID=123456789012345
AUTH_FACEBOOK_SECRET=your_facebook_app_secret
```

---

## 👤 **STEP 6: Super Admin Configuration**

```bash
SUPERADMIN_EMAIL=admin@boto-mo-to.online
SUPERADMIN_PASSWORD=YourSecurePassword123!
```

**Security Note:** Use a strong password with:
- At least 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Not used anywhere else

---

## 🌍 **STEP 7: Environment-Specific Configuration**

### **Development (.env.local)**
```bash
# === Development Settings ===
NEXTAUTH_URL=http://localhost:3000
EMAIL_PROVIDER=gmail  # Use Gmail for dev testing
QUEUE_BACKEND=inmemory
NODE_ENV=development

# Test email addresses
EMAIL_FROM_ADDRESS=test@boto-mo-to.online
EMAIL_FROM_NAME="BotoMoTo Dev"
```

### **Production (.env.production)**
```bash
# === Production Settings ===
NEXTAUTH_URL=https://boto-mo-to.online
EMAIL_PROVIDER=resend
QUEUE_BACKEND=sqs
NODE_ENV=production

# Production email settings
EMAIL_FROM_ADDRESS=noreply@boto-mo-to.online
EMAIL_FROM_NAME="Boto Mo To Voting System"

# Rate limiting
EMAIL_RATE_LIMIT=1000  # emails per hour
```

### **Staging (.env.staging)**
```bash
# === Staging Settings ===
NEXTAUTH_URL=https://staging.boto-mo-to.online
EMAIL_PROVIDER=resend
QUEUE_BACKEND=graphile
NODE_ENV=staging

# Staging email settings
EMAIL_FROM_ADDRESS=staging@boto-mo-to.online
EMAIL_FROM_NAME="BotoMoTo Staging"
```

---

## 🔧 **STEP 8: Additional Configuration**

### **A. Monitoring & Logging**
```bash
# Optional: External monitoring
SENTRY_DSN=https://your-sentry-dsn
LOGFLARE_API_KEY=your_logflare_key
LOGFLARE_SOURCE_TOKEN=your_source_token

# Email monitoring
EMAIL_BOUNCE_WEBHOOK=https://yourdomain.com/api/webhooks/bounces
EMAIL_COMPLAINT_WEBHOOK=https://yourdomain.com/api/webhooks/complaints
```

### **B. Performance & Caching**
```bash
# Redis for caching (optional)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# Upload limits
MAX_FILE_SIZE=5242880  # 5MB in bytes
MAX_ATTACHMENTS=5
```

### **C. Security Headers**
```bash
# CORS settings
ALLOWED_ORIGINS=https://boto-mo-to.online,https://app.boto-mo-to.online
CORS_CREDENTIALS=true

# Rate limiting
RATE_LIMIT_MAX=100  # requests per window
RATE_LIMIT_WINDOW=15  # minutes
```

---

## ✅ **STEP 9: Environment Validation**

Create a script to validate your environment:

```bash
# Create validation script
npm run env:validate

# Or manually test:
curl -X GET "http://localhost:3000/api/email/test"
```

### **Validation Checklist:**
- [ ] Database connection works
- [ ] Email providers are configured
- [ ] Queue system is operational
- [ ] OAuth providers are working
- [ ] Domain DNS is configured
- [ ] Webhooks are receiving events
- [ ] Super admin account exists

---

## 🚀 **STEP 10: Deployment Configuration**

### **Vercel Deployment**
```bash
# Install Vercel CLI
npm i -g vercel

# Add environment variables in Vercel dashboard
vercel env add EMAIL_PROVIDER
vercel env add RESEND_API_KEY
# ... add all production variables

# Deploy
vercel --prod
```

### **Docker Deployment**
```dockerfile
# Use environment file
docker run -d \
  --env-file .env.production \
  -p 3000:3000 \
  your-app-image
```

### **Railway/Render Deployment**
1. Connect your repository
2. Add environment variables in dashboard
3. Set build command: `npm run build`
4. Set start command: `npm run start`

---

## 🔍 **STEP 11: Testing & Verification**

### **Email System Test**
```bash
# Test email providers
curl -X POST "https://yourdomain.com/api/email/test" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "Test Email"}'

# Test template system
curl "https://yourdomain.com/api/email/template/voting-code/preview"

# Test webhook endpoints
curl -X POST "https://yourdomain.com/api/webhooks/resend" \
  -H "Content-Type: application/json" \
  -d '{"type": "email.sent", "data": {"email_id": "test"}}'
```

### **Queue System Test**
```bash
# Check queue health
curl "https://yourdomain.com/api/health/queue"

# Send bulk emails
curl -X POST "https://yourdomain.com/api/voters/bulk" \
  -H "Content-Type: application/json" \
  -d '{"operation": "send_codes", "voterIds": [1,2,3]}'
```

---

## 📚 **Environment Variables Reference**

### **Required Variables**
```bash
DATABASE_URL=                 # Database connection string
NEXTAUTH_URL=                 # Your app URL
AUTH_SECRET=                  # Random secret for NextAuth
EMAIL_PROVIDER=               # resend|ses|gmail
EMAIL_FROM_ADDRESS=           # Your sending email
QUEUE_BACKEND=                # inmemory|graphile|sqs
```

### **Email Provider Variables**
```bash
# Resend
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=

# AWS SES
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SES_FROM_EMAIL=

# Gmail SMTP
GMAIL_SMTP_EMAIL=
GMAIL_SMTP_PASSWORD=
```

### **Queue System Variables**
```bash
# SQS
SQS_QUEUE_URL=

# Graphile Worker
QUEUE_DATABASE_URL=
```

### **Optional Variables**
```bash
EMAIL_FROM_NAME=              # Display name for emails
EMAIL_REPLY_TO=               # Reply-to address
SUPERADMIN_EMAIL=             # Super admin email
SUPERADMIN_PASSWORD=          # Super admin password
AUTH_GOOGLE_ID=               # Google OAuth
AUTH_GOOGLE_SECRET=           # Google OAuth
AUTH_FACEBOOK_ID=             # Facebook OAuth
AUTH_FACEBOOK_SECRET=         # Facebook OAuth
```

---

## 🚨 **Security Best Practices**

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use different secrets** for each environment
3. **Rotate secrets regularly** (quarterly)
4. **Use IAM roles** instead of access keys when possible
5. **Enable monitoring** for failed authentication attempts
6. **Set up alerts** for bounce/complaint rates
7. **Use HTTPS everywhere** in production
8. **Validate environment** on startup

---

## 📞 **Support & Troubleshooting**

### **Common Issues:**

1. **Email delivery failures:**
   - Check DNS configuration
   - Verify domain reputation
   - Check provider dashboards

2. **Queue processing stuck:**
   - Check queue visibility timeout
   - Verify worker is running
   - Check database connections

3. **Authentication errors:**
   - Verify OAuth app settings
   - Check redirect URIs
   - Validate secrets

4. **Database connection issues:**
   - Check connection string format
   - Verify SSL settings
   - Check firewall rules

### **Debug Commands:**
```bash
# Check environment loading
npm run env:check

# Test database connection
npm run db:test

# Validate email configuration
npm run email:validate

# Check queue status
npm run queue:status
```

---

**🎉 Environment configuration complete! Your system is ready for production deployment.**
