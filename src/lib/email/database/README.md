# Email Database Schema

The email system includes comprehensive database logging and suppression management to track email delivery, handle bounces, and maintain compliance.

## Database Models

### EmailLog

Tracks all emails sent through the system with detailed delivery information.

**Fields:**
- `id` - Unique identifier
- `messageId` - Provider-specific message ID (for tracking)
- `templateId` - Template used (if any)
- `toEmail` - Primary recipient email
- `toName` - Primary recipient name
- `ccEmails` - CC recipient emails (array)
- `bccEmails` - BCC recipient emails (array)
- `subject` - Email subject line
- `htmlSize` - Size of HTML content in bytes
- `textSize` - Size of text content in bytes
- `attachments` - Number of attachments
- `provider` - Email provider used (resend, ses, gmail-smtp)
- `status` - Current email status
- `queuedAt` - When email was queued
- `sentAt` - When email was sent
- `deliveredAt` - When email was delivered
- `openedAt` - When email was first opened
- `clickedAt` - When email was first clicked
- `error` - Error message if failed
- `retryCount` - Number of retry attempts
- `lastRetryAt` - Last retry timestamp
- `tags` - Custom tracking tags (JSON)
- `campaign` - Campaign identifier
- `organizationId` - Related organization
- `electionId` - Related election

**Status Values:**
- `PENDING` - Queued for sending
- `SENDING` - Currently being sent
- `SENT` - Successfully sent to provider
- `DELIVERED` - Delivered to recipient
- `OPENED` - Email was opened
- `CLICKED` - Email was clicked
- `BOUNCED` - Bounced back
- `COMPLAINED` - Marked as spam
- `FAILED` - Failed to send
- `SUPPRESSED` - Blocked due to suppression

**Indexes:**
- `toEmail, createdAt` - Recipient tracking
- `provider, status, createdAt` - Provider performance
- `templateId, createdAt` - Template usage
- `organizationId, createdAt` - Organization emails
- `electionId, createdAt` - Election emails
- `status, queuedAt` - Queue processing

### EmailSuppression

Manages suppressed email addresses to prevent unwanted sends.

**Fields:**
- `id` - Unique identifier
- `email` - Suppressed email address (unique)
- `reason` - Suppression reason
- `source` - Where suppression came from
- `suppressedAt` - When suppression was added
- `expiresAt` - When suppression expires (null = permanent)
- `bounceType` - Type of bounce (hard, soft, etc.)
- `complaintType` - Type of spam complaint
- `metadata` - Additional provider data (JSON)
- `organizationId` - Related organization

**Suppression Reasons:**
- `BOUNCE` - Email bounced
- `COMPLAINT` - Spam complaint
- `UNSUBSCRIBE` - User unsubscribed
- `MANUAL` - Manually added
- `INVALID` - Invalid email address
- `BLOCKED` - Blocked by provider

**Indexes:**
- `email` - Fast suppression checks
- `reason, suppressedAt` - Reason analysis
- `organizationId, email` - Organization suppressions
- `expiresAt` - Cleanup expired suppressions

## Database Service API

### EmailDatabaseService

**Email Logging:**
```typescript
// Log new email
await emailDatabase.logEmail({
  toEmail: 'user@example.com',
  subject: 'Test Email',
  provider: 'resend',
  organizationId: 1
});

// Update email status
await emailDatabase.updateEmailLog(logId, {
  status: 'DELIVERED',
  deliveredAt: new Date()
});

// Get email logs with filters
const logs = await emailDatabase.getEmailLogs({
  organizationId: 1,
  status: 'DELIVERED',
  limit: 50
});

// Get email statistics
const stats = await emailDatabase.getEmailStats({
  organizationId: 1,
  startDate: new Date('2025-01-01')
});
```

**Suppression Management:**
```typescript
// Check if email is suppressed
const suppression = await emailDatabase.isEmailSuppressed('user@example.com');

// Add email to suppression list
await emailDatabase.suppressEmail({
  email: 'user@example.com',
  reason: 'BOUNCE',
  source: 'webhook'
});

// Remove from suppression list
await emailDatabase.unsuppressEmail('user@example.com');

// Get suppressed emails
const suppressions = await emailDatabase.getSuppressedEmails({
  organizationId: 1,
  limit: 100
});

// Cleanup expired suppressions
const cleaned = await emailDatabase.cleanupExpiredSuppressions();
```

**Retry Management:**
```typescript
// Get failed emails for retry
const failedEmails = await emailDatabase.getFailedEmailsForRetry(3);

// Mark email for retry
await emailDatabase.markEmailForRetry(emailLogId);
```

## API Endpoints

### GET /api/email/logs

Query email logs and statistics.

**Parameters:**
- `action` - Action type (logs, stats, suppressions, cleanup)
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)
- `organizationId` - Filter by organization
- `electionId` - Filter by election
- `status` - Filter by status
- `provider` - Filter by provider
- `toEmail` - Filter by recipient
- `templateId` - Filter by template

**Examples:**
```bash
# Get recent email logs
GET /api/email/logs?limit=20

# Get email statistics for last 7 days
GET /api/email/logs?action=stats&days=7

# Get suppressed emails
GET /api/email/logs?action=suppressions&limit=100

# Cleanup expired suppressions
GET /api/email/logs?action=cleanup
```

## Migration

The database schema was added via Prisma migration:

```bash
npx prisma migrate dev --name add-email-system
```

This creates the `email_logs` and `email_suppressions` tables with proper indexes and relationships.

## Performance Considerations

**Indexes:**
- All queries use appropriate indexes for fast lookups
- Time-based queries use compound indexes with `createdAt`
- Email suppression checks use unique email index

**Cleanup:**
- Expired suppressions should be cleaned up regularly
- Old email logs can be archived after a retention period
- Failed emails have retry limits to prevent infinite loops

**Monitoring:**
- Track email delivery rates by provider
- Monitor bounce and complaint rates
- Alert on high failure rates or suppression additions

## Integration

The database service is automatically integrated with:
- **EmailService** - Logs all sent emails
- **Queue System** - Tracks queue processing
- **Provider Webhooks** - Updates delivery status
- **Admin Dashboard** - Displays logs and statistics

Email logging happens automatically when sending emails through the EmailService without requiring additional code changes.
