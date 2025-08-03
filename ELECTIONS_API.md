# Elections API Documentation

This document describes the refactored Elections API endpoints based on the specified requirements.

## API Endpoints Overview

### Collections Endpoints

#### GET /api/elections
- **Description**: Get all elections (superadmin only)
- **Access**: Superadmin only
- **Response**: Returns list of all non-deleted elections with organization details and counts

#### POST /api/elections  
- **Description**: Create a new election (admin only)
- **Access**: Admin only (superadmin should not have associated elections)
- **Features**:
  - Validates election data
  - Checks for duplicate names within organization
  - Only approved organizations can create elections
  - Sets status to DRAFT by default

### Specific Election Endpoints

#### GET /api/elections/{id}
- **Description**: Get specific election details
- **Access**: 
  - Admin: Can only get their own organization's elections
  - Superadmin: Can get any election

#### PUT /api/elections/{id}
- **Description**: Update specific election
- **Access**:
  - Admin: Can only update their own organization's elections
  - Superadmin: Can edit any election
- **Features**:
  - Validates election data
  - Checks for duplicate names (excluding current election)
  - Tracks changed fields in audit log

#### DELETE /api/elections/{id}
- **Description**: Delete specific election
- **Access**:
  - Admin: Can delete their own organization's elections
  - Superadmin: Can delete any election
- **Features**:
  - Soft delete only
  - Prevents deletion if election has votes

#### PATCH /api/elections/{id}
- **Description**: Change election status (combined endpoint for all status changes)
- **Access**:
  - Admin: Can change status of their own organization's elections
  - Superadmin: Can change status of any election
- **Actions**:
  - `close`: ACTIVE/PAUSED → CLOSED
  - `archive`: CLOSED → ARCHIVED
  - `open`: DRAFT → ACTIVE
  - `pause`: ACTIVE → PAUSED
  - `resume`: PAUSED → ACTIVE
- **Body**: `{ "action": "close|archive|open|pause|resume" }`
- **Features**:
  - Validates status transitions
  - Prevents invalid state changes
  - Tracks status changes in audit log

### Bulk Operations Endpoint

#### POST /api/elections/bulk
- **Description**: Perform bulk operations on elections
- **Access**: Admin and Superadmin
- **Operations**:
  - `CREATE_MULTIPLE`: Create multiple elections
  - `DELETE_MULTIPLE`: Delete multiple elections

#### DELETE /api/elections/bulk
- **Description**: Bulk delete elections
- **Access**: 
  - Admin: Can bulk delete elections from their organization
  - Superadmin: Can bulk delete any elections

## Election Status Transitions

### Valid Status Transitions
- **DRAFT** → **ACTIVE** (open)
- **ACTIVE** → **PAUSED** (pause)
- **PAUSED** → **ACTIVE** (resume)
- **ACTIVE/PAUSED** → **CLOSED** (close)
- **CLOSED** → **ARCHIVED** (archive)

### Status Descriptions
- **DRAFT**: Newly created, being set up
- **ACTIVE**: Live election, accepting votes
- **PAUSED**: Temporarily stopped, can be resumed
- **CLOSED**: Voting ended, results available
- **ARCHIVED**: Historical record, read-only

## Request/Response Format

All endpoints use consistent API response format:
```json
{
  "success": boolean,
  "message": string,
  "data": object | null,
  "error": string | null,
  "status": number
}
```

## Key Features

### Security & Authorization
- Role-based access control (Admin vs Superadmin)
- Admins can only access their organization's elections
- Superadmins have full access to all elections
- Comprehensive input validation

### Data Integrity
- Soft deletion with `isDeleted` and `deletedAt` fields
- Duplicate name prevention within organizations
- Relationship validation (organization ownership, votes)
- Status transition validation

### Audit Trail
- All operations logged with user, action, and details
- Changed fields tracking for updates
- Status change tracking
- IP address and user agent logging
- Meaningful audit messages

### Bulk Operations
- Efficient batch processing for creation and deletion
- Atomic operations where possible
- Detailed error reporting for failed items
- Validation before processing

## Election States & Business Rules

1. **Organization Dependency**: Elections belong to organizations and admins can only manage their organization's elections
2. **Approved Organizations Only**: Only approved organizations can create elections
3. **Name Uniqueness**: Election names must be unique within each organization
4. **Vote Protection**: Elections with votes cannot be deleted
5. **Status Transitions**: Strict status transition rules prevent invalid state changes
6. **Soft Deletion**: All deletions are soft deletes for audit purposes

## Status Change Examples

### Opening an Election
```bash
PATCH /api/elections/123
{
  "action": "open"
}
```

### Closing an Election
```bash
PATCH /api/elections/123
{
  "action": "close"
}
```

### Bulk Creation
```bash
POST /api/elections/bulk
{
  "operation": "CREATE_MULTIPLE",
  "elections": [
    {
      "name": "Student Council Election",
      "description": "Annual student council election",
      "orgId": 1  // Only for superadmin
    },
    {
      "name": "Board Elections",
      "description": "Board member elections"
    }
  ]
}
```

## Error Handling

- Comprehensive validation with detailed error messages
- Proper HTTP status codes
- Consistent error response format
- Graceful handling of edge cases
- Clear status transition error messages

This API structure provides a robust, secure, and well-documented interface for managing elections in the voting system, with clear separation of concerns between admin and superadmin roles.
