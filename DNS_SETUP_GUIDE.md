# Domain Setup & DNS Configuration Guide
# For boto-mo-to.online (Namecheap Domain)

This guide covers setting up your Namecheap domain `boto-mo-to.online` for email delivery with Resend and AWS SES.

## Step 1: Basic DNS Records

### A. Add these DNS records in your Namecheap dashboard:

```
Type: CNAME
Host: www
Value: boto-mo-to.online
TTL: Automatic

Type: A
Host: @
Value: [Your server IP address]
TTL: Automatic
```

## Step 2: Email Provider Setup

### A. Resend Domain Verification

1. **Add Domain in Resend Dashboard:**
   - Go to https://resend.com/domains
   - Add domain: `boto-mo-to.online`

2. **Add Required DNS Records:**
   ```
   Type: TXT
   Host: @
   Value: resend-domain-verification=[verification-code-from-resend]
   TTL: Automatic

   Type: MX
   Host: @
   Value: feedback-smtp.resend.com
   Priority: 10
   TTL: Automatic

   Type: TXT
   Host: @
   Value: v=spf1 include:_spf.resend.com ~all
   TTL: Automatic

   Type: CNAME
   Host: resend._domainkey
   Value: [DKIM-value-from-resend-dashboard]
   TTL: Automatic
   ```

### B. AWS SES Domain Verification (Backup Provider)

1. **Add Domain in AWS SES (ap-southeast-1):**
   - Go to AWS SES Console → Verified identities
   - Add domain: `boto-mo-to.online`

2. **Add Required DNS Records:**
   ```
   Type: TXT
   Host: _amazonses.boto-mo-to.online
   Value: [verification-token-from-aws]
   TTL: Automatic

   Type: CNAME
   Host: [dkim-subdomain1]._domainkey
   Value: [dkim-value1].dkim.amazonses.com
   TTL: Automatic

   Type: CNAME
   Host: [dkim-subdomain2]._domainkey
   Value: [dkim-value2].dkim.amazonses.com
   TTL: Automatic

   Type: CNAME
   Host: [dkim-subdomain3]._domainkey
   Value: [dkim-value3].dkim.amazonses.com
   TTL: Automatic
   ```

## Step 3: Security Records

### A. SPF Record (combines both providers)
```
Type: TXT
Host: @
Value: v=spf1 include:amazonses.com include:_spf.resend.com ~all
TTL: Automatic
```

### B. DMARC Record
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@boto-mo-to.online; ruf=mailto:dmarc@boto-mo-to.online; fo=1
TTL: Automatic
```

## Step 4: Email Addresses Setup

### A. Verified Email Addresses
In both Resend and AWS SES, verify these addresses:
- `noreply@boto-mo-to.online` (for system emails)
- `admin@boto-mo-to.online` (for admin notifications)
- `support@boto-mo-to.online` (for user support)

## Step 5: Subdomain for App (Optional)

If you want to serve your app from a subdomain:

```
Type: CNAME
Host: app
Value: your-deployment-url (e.g., your-app.vercel.app)
TTL: Automatic

Type: CNAME
Host: api
Value: your-api-url
TTL: Automatic
```

## Step 6: SSL Certificate

### A. For Custom Domain SSL:
- If using Vercel/Netlify: SSL is automatic
- If using custom server: Use Let's Encrypt or Cloudflare

## Step 7: Testing Email Delivery

After DNS propagation (up to 48 hours), test:

1. **Domain Verification Status:**
   - Check Resend dashboard
   - Check AWS SES console

2. **DNS Propagation:**
   ```bash
   dig TXT boto-mo-to.online
   dig MX boto-mo-to.online
   nslookup -type=TXT _dmarc.boto-mo-to.online
   ```

3. **Email Delivery Test:**
   Use your `/api/email/test` endpoint to send test emails

## Step 8: Monitoring Setup

### A. Email Delivery Monitoring
- Monitor bounce/complaint rates in provider dashboards
- Set up CloudWatch alarms for SES (if using)
- Monitor Resend webhook events

### B. DNS Monitoring
- Use tools like DNSChecker.org to verify propagation
- Monitor uptime and DNS resolution

## Important Notes:

1. **DNS Propagation:** Changes can take up to 48 hours to fully propagate
2. **Provider Priority:** Configure Resend as primary, SES as backup
3. **Rate Limits:** 
   - Resend: 100 emails/day (free), 3,000/day (paid)
   - AWS SES: Starts at 200 emails/day, request limit increases
4. **Domain Reputation:** Start with low volume and gradually increase
5. **Backup Strategy:** Having both providers ensures delivery reliability

## Troubleshooting:

1. **Domain Not Verified:**
   - Check DNS records are correct
   - Wait for propagation (up to 48 hours)
   - Use DNS checking tools

2. **Emails Going to Spam:**
   - Verify SPF, DKIM, and DMARC records
   - Check domain reputation
   - Start with low sending volume

3. **Delivery Failures:**
   - Check suppression lists
   - Verify recipient email addresses
   - Monitor bounce/complaint rates

## Environment Variables:

Update your `.env` file with actual values from your provider dashboards:

```bash
EMAIL_FROM_ADDRESS=noreply@boto-mo-to.online
RESEND_API_KEY=your_actual_resend_api_key
AWS_ACCESS_KEY_ID=your_actual_aws_access_key
AWS_SECRET_ACCESS_KEY=your_actual_aws_secret_key
```
