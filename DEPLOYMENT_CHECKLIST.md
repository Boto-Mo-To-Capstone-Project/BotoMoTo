# 🚀 Deployment Checklist for boto-mo-to.online

Complete this checklist before deploying your Next.js RBAC voting system to production.

## 📋 **PRE-DEPLOYMENT CHECKLIST**

### ☑️ **Environment Configuration**
- [ ] Copy `.env.production` to `.env` and fill in all values
- [ ] Replace all `REPLACE_WITH_*` placeholders with actual values
- [ ] Generate secure `AUTH_SECRET`: `openssl rand -base64 32`
- [ ] Validate environment: `npm run env:validate`
- [ ] Test connectivity: `npm run env:test`

### ☑️ **Email Provider Setup**

#### **Resend (Primary)**
- [ ] Create Resend account at https://resend.com
- [ ] Add domain `boto-mo-to.online` in Resend dashboard
- [ ] Get API key and add to `RESEND_API_KEY`
- [ ] Setup webhook: `https://boto-mo-to.online/api/webhooks/resend`
- [ ] Get webhook secret and add to `RESEND_WEBHOOK_SECRET`

#### **AWS SES (Backup)**
- [ ] Create AWS account and access to SES in `ap-southeast-1`
- [ ] Create IAM user with SES permissions
- [ ] Add domain `boto-mo-to.online` to SES
- [ ] Update `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- [ ] Request production access (remove sandbox mode)

### ☑️ **DNS Configuration**
- [ ] Complete DNS setup from `DNS_SETUP_GUIDE.md`
- [ ] Add SPF record: `v=spf1 include:amazonses.com include:_spf.resend.com ~all`
- [ ] Add DMARC record: `v=DMARC1; p=none; rua=mailto:dmarc@boto-mo-to.online`
- [ ] Add DKIM records for both Resend and SES
- [ ] Verify domain in both providers
- [ ] Test DNS propagation: `dig TXT boto-mo-to.online`

### ☑️ **Database Setup**
- [ ] Production database configured and accessible
- [ ] Run migrations: `npm run db:deploy`
- [ ] Create super admin: `npm run create-superadmin`
- [ ] Test database connection
- [ ] Setup automated backups

### ☑️ **Queue System**
- [ ] Create AWS SQS queue for production
- [ ] Configure `SQS_QUEUE_URL` in environment
- [ ] Test queue permissions and connectivity
- [ ] Setup worker process for production

### ☑️ **OAuth Configuration**
- [ ] Configure Google OAuth for production domain
- [ ] Configure Facebook OAuth for production domain
- [ ] Update redirect URIs: `https://boto-mo-to.online/api/auth/callback/*`
- [ ] Test OAuth login flow

---

## 🌐 **DEPLOYMENT STEPS**

### **Option 1: Vercel Deployment (Recommended)**

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Connect Repository:**
   ```bash
   vercel link
   ```

3. **Add Environment Variables:**
   - Go to Vercel dashboard → Project → Settings → Environment Variables
   - Add all variables from `.env.production`
   - Or use CLI: `vercel env add VARIABLE_NAME`

4. **Deploy:**
   ```bash
   vercel --prod
   ```

### **Option 2: Docker Deployment**

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and Deploy:**
   ```bash
   docker build -t botomoto-voting .
   docker run -d --env-file .env.production -p 3000:3000 botomoto-voting
   ```

### **Option 3: Traditional VPS**

1. **Setup Server:**
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   npm install -g pm2
   ```

2. **Deploy Application:**
   ```bash
   git clone <your-repo>
   cd next-rbac
   npm ci
   cp .env.production .env
   npm run build
   pm2 start npm --name "botomoto" -- start
   pm2 save
   pm2 startup
   ```

---

## ✅ **POST-DEPLOYMENT VALIDATION**

### **1. Basic Functionality Test**
```bash
# Test application health
curl https://boto-mo-to.online/api/health

# Test email system
curl -X GET "https://boto-mo-to.online/api/email/test"
```

### **2. Email Delivery Test**
```bash
# Test email sending
curl -X POST "https://boto-mo-to.online/api/email/test" \
  -H "Content-Type: application/json" \
  -d '{"to": "your-test-email@example.com", "subject": "Production Test"}'
```

### **3. Template System Test**
```bash
# Test voting code template
curl "https://boto-mo-to.online/api/email/template/voting-code/preview"
```

### **4. Authentication Test**
- [ ] Visit `https://boto-mo-to.online`
- [ ] Test email/password login
- [ ] Test Google OAuth login
- [ ] Test Facebook OAuth login
- [ ] Login as super admin
- [ ] Create test organization and verify approval flow

### **5. Voting Flow Test**
- [ ] Create test election
- [ ] Add test voters
- [ ] Send voting codes via email
- [ ] Verify email delivery and template rendering
- [ ] Test voting process end-to-end

### **6. Webhook Validation**
- [ ] Check Resend webhook receives events
- [ ] Check SES webhook receives events (if configured)
- [ ] Verify email status updates in database

---

## 🔧 **PRODUCTION MONITORING SETUP**

### **Error Monitoring**
- [ ] Setup Sentry for error tracking
- [ ] Configure alerts for critical errors
- [ ] Monitor email delivery failures

### **Performance Monitoring**
- [ ] Setup application performance monitoring
- [ ] Monitor database query performance
- [ ] Track email sending rates and failures

### **Email Monitoring**
- [ ] Monitor bounce rates (<5%)
- [ ] Monitor complaint rates (<0.1%)
- [ ] Setup alerts for high failure rates
- [ ] Monitor domain reputation

### **Security Monitoring**
- [ ] Monitor failed login attempts
- [ ] Setup rate limiting
- [ ] Configure security headers
- [ ] SSL certificate monitoring

---

## 🚨 **PRODUCTION MAINTENANCE**

### **Daily Checks**
- [ ] Monitor application health
- [ ] Check email delivery stats
- [ ] Review error logs

### **Weekly Checks**
- [ ] Database backup verification
- [ ] Email reputation monitoring
- [ ] Performance metrics review

### **Monthly Checks**
- [ ] Rotate secrets and API keys
- [ ] Review and clean up email suppression lists
- [ ] Update dependencies

---

## 📞 **TROUBLESHOOTING GUIDE**

### **Email Delivery Issues**
1. Check DNS propagation: `dig TXT boto-mo-to.online`
2. Verify domain status in provider dashboards
3. Check suppression lists
4. Review bounce/complaint rates

### **Authentication Problems**
1. Verify OAuth app configurations
2. Check redirect URIs
3. Validate environment variables
4. Test with different browsers/devices

### **Database Connection Issues**
1. Check connection string format
2. Verify SSL certificates
3. Test database credentials
4. Check firewall rules

### **Queue Processing Problems**
1. Check SQS queue permissions
2. Verify worker process is running
3. Monitor queue metrics
4. Check for dead letter queues

---

## 🎯 **SUCCESS CRITERIA**

Your deployment is successful when:

- ✅ Application loads at `https://boto-mo-to.online`
- ✅ Email system sends and delivers emails
- ✅ Authentication (email/OAuth) works
- ✅ Voting code emails are delivered with proper templates
- ✅ Admin can create elections and manage voters
- ✅ Real-time email status updates work
- ✅ Webhooks are receiving and processing events
- ✅ Database operations are functional
- ✅ All monitoring systems are active

---

## 📚 **ADDITIONAL RESOURCES**

- **Environment Setup:** `ENVIRONMENT_SETUP_GUIDE.md`
- **DNS Configuration:** `DNS_SETUP_GUIDE.md`
- **API Documentation:** `API_TESTING_GUIDE.md`
- **Email Templates:** `src/lib/email/templates/README.md`

---

**🎉 Ready for Production! Your boto-mo-to.online voting system is now live!**
