# Election Status Management API Documentation

This document provides comprehensive documentation for the Election Status Management API endpoints that control the lifecycle of elections in the RBAC voting system.

## Overview

The election status management system provides granular control over election states with proper validation, audit logging, and access control. Elections can transition through the following states:

- **DRAFT** → **ACTIVE** (Open election)
- **ACTIVE** → **PAUSED** (Pause election)  
- **PAUSED** → **ACTIVE** (Resume election)
- **ACTIVE/PAUSED** → **CLOSED** (Close election)
- **CLOSED** → **ARCHIVED** (Archive election)
- **DRAFT** → **ARCHIVED** (Archive unused draft)

## API Endpoints


### Election Status Management (Unified Endpoint)
**File:** `/src/app/api/elections/[id]/route.ts` (PATCH method)

#### PATCH `/api/elections/[id]`
- **Description:** Update election status (open, close, pause, resume, archive) with strict validation and audit logging
- **Authorization:** Admin (own org's elections), Super Admin (all elections)
- **Body Schema:**
  ```typescript
  {
    status: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED" | "ARCHIVED",
    reason?: string, // Optional reason (max 500 chars)
    forceClose?: boolean // Only for closing early (default: false)
  }
  ```
- **Validation:**
  - Enforces valid status transitions (see below)
  - Readiness checks for opening (ACTIVE)
  - Reason required for PAUSED
  - forceClose required for closing with no votes or before scheduled end
  - Cannot archive ACTIVE/PAUSED; DRAFT with votes must be closed first
- **Returns:** Updated election with transition details and statistics

**Note:** All previous individual status endpoints (`/open`, `/close`, `/pause`, `/resume`, `/archive`, `/status`) have been removed. Use the unified PATCH endpoint above for all status changes.

## Status Transition Rules

### Valid Transitions
```
DRAFT ──────────────→ ACTIVE
                      ↕ (pause/resume)
                    PAUSED
                      ↓
                   CLOSED ──→ ARCHIVED
                      ↑
DRAFT (no activity) ──┘
```

### Transition Restrictions

1. **DRAFT → ACTIVE (Open):**
   - Requires positions, candidates, voters, and valid schedule
   - All readiness checks must pass

2. **ACTIVE → PAUSED (Pause):**
   - Requires reason
   - Only from ACTIVE status

3. **PAUSED → ACTIVE (Resume):**
   - Schedule must still be valid
   - Only from PAUSED status

4. **ACTIVE/PAUSED → CLOSED (Close):**
   - Warns if no votes (unless forceClose)
   - Warns if before scheduled end (unless forceClose)

5. **CLOSED → ARCHIVED (Archive):**
   - Only from CLOSED status
   - Preserves final statistics

6. **DRAFT → ARCHIVED (Archive):**
   - Only if no voting activity
   - Direct archive for unused drafts

## Election Readiness Validation

Before opening an election, the system validates:

### Required Elements
- **Positions:** At least one position must exist
- **Candidates:** Each position must have at least one candidate
- **Voters:** At least one active voter must exist
- **Schedule:** Valid start and end dates must be set

### Schedule Validation
- Start date must not be in the future
- End date must not have passed
- Start date must be before end date

### Data Integrity
- All positions belong to the election
- All candidates belong to valid positions
- All voters are active and not deleted

## Security Features

### Role-Based Access Control
- **Admin:** Can manage only their organization's elections
- **Super Admin:** Can manage any election
- **Voters:** No access to status management

### Organization Validation
- Organization must be APPROVED status
- Admin must own the election
- All operations logged for audit

### Data Protection
- Prevents deletion of elections with votes
- Warns before premature closure
- Validates transitions to prevent invalid states

## Audit Logging

All status changes are logged with:
- User who performed the action
- Old and new status values
- Reason (if provided)
- Timestamp and IP address
- Changed fields details

## Usage Examples

### Opening an Election
```typescript
POST /api/elections/123/open
// No body required
```

### Pausing with Reason
```typescript
POST /api/elections/123/pause
{
  "reason": "Technical maintenance required"
}
```

### Closing Early
```typescript
POST /api/elections/123/close
{
  "reason": "Sufficient participation achieved",
  "forceClose": true
}
```

### Checking Status
```typescript
GET /api/elections/123/status
```

### Generic Status Update
```typescript
PUT /api/elections/123/status
{
  "status": "ACTIVE",
  "reason": "Election ready to begin"
}
```

## Error Handling

### Common Error Scenarios
- **403 Forbidden:** Insufficient permissions or organization not approved
- **400 Bad Request:** Invalid status transition or failed validation
- **404 Not Found:** Election not found or deleted
- **409 Conflict:** Election already in requested status

### Validation Failures
The API provides detailed error messages for:
- Missing requirements (positions, candidates, voters)
- Schedule conflicts
- Invalid transitions
- Organization status issues

### Force Operations
Some operations support force flags to bypass warnings:
- `forceClose: true` - Close election with no votes or before scheduled end
- Future: Additional force operations may be added

## Best Practices

### Election Lifecycle Management
1. **Setup Phase:** Create positions, add candidates, upload voters
2. **Validation Phase:** Check readiness before opening
3. **Active Phase:** Monitor voting progress, pause if needed
4. **Closure Phase:** Close when voting period ends
5. **Archive Phase:** Archive for long-term storage

### Status Monitoring
- Use GET `/status` endpoint to check current state
- Monitor available transitions for UI controls
- Check readiness before attempting to open

### Error Recovery
- Failed opens provide detailed validation results
- Paused elections can be safely resumed
- Force close options for emergency situations

This comprehensive election status management system ensures data integrity, proper validation, and complete audit trails for all election lifecycle operations.
