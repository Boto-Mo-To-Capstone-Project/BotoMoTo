# Organizations API Documentation

This document describes the refactored Organizations API endpoints based on the specified requirements.

## API Endpoints Overview

### Collections Endpoints

#### GET /api/organizations
- **Description**: Get all organizations (superadmin only)
- **Access**: Superadmin only
- **Response**: Returns list of all non-deleted organizations with admin details and election counts

#### POST /api/organizations  
- **Description**: Create a new organization (admin only)
- **Access**: Admin only (superadmin should not have affiliated org)
- **Features**:
  - Validates organization data
  - Checks for duplicate names
  - Restores deleted organizations if admin tries to create again
  - Sets status to PENDING by default

#### DELETE /api/organizations
- **Description**: Bulk delete organizations (superadmin only)
- **Access**: Superadmin only
- **Body**: `{ "organizationIds": [1, 2, 3] }`
- **Features**:
  - Soft deletes multiple organizations
  - Prevents deletion of organizations with elections
  - Validates all IDs before deletion

### Specific Organization Endpoints

#### GET /api/organizations/{id}
- **Description**: Get specific organization details
- **Access**: 
  - Admin: Can only get their own organization
  - Superadmin: Can get any organization

#### PUT /api/organizations/{id}
- **Description**: Update specific organization
- **Access**:
  - Admin: Can only update their own organization  
  - Superadmin: Can edit any organization
- **Features**:
  - Validates organization data
  - Checks for duplicate names (excluding current org)
  - Tracks changed fields in audit log

#### DELETE /api/organizations/{id}
- **Description**: Delete specific organization
- **Access**:
  - Admin: Can delete their own organization
  - Superadmin: Can delete any organization
- **Features**:
  - Soft delete only
  - Prevents deletion if organization has elections

### Approval Endpoint

#### PATCH /api/organizations/{id}/approve
- **Description**: Approve or reject organization (superadmin only)
- **Access**: Superadmin only
- **Body**: `{ "action": "approve|reject", "reason": "optional" }`
- **Features**:
  - Only works on PENDING organizations
  - Sets status to APPROVED or REJECTED
  - Tracks reason in audit log

### Bulk Operations Endpoint

#### POST /api/organizations/bulk
- **Description**: Perform bulk operations on organizations (superadmin only)
- **Access**: Superadmin only
- **Operations**:
  - `CREATE_MULTIPLE`: Create multiple organizations
  - `DELETE_MULTIPLE`: Delete multiple organizations
  - `APPROVE_MULTIPLE`: Approve multiple organizations
  - `REJECT_MULTIPLE`: Reject multiple organizations

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
- Admins can only access their own organizations
- Superadmins have full access to all organizations
- Comprehensive input validation

### Data Integrity
- Soft deletion with `isDeleted` and `deletedAt` fields
- Duplicate name prevention
- Relationship validation (admin ownership, elections)
- Restoration of deleted organizations

### Audit Trail
- All operations logged with user, action, and details
- Changed fields tracking for updates
- IP address and user agent logging
- Meaningful audit messages

### Bulk Operations
- Efficient batch processing
- Atomic operations where possible
- Detailed error reporting for failed items
- Validation before processing

## Organization States

- **PENDING**: Newly created, awaiting approval
- **APPROVED**: Approved by superadmin, can create elections
- **REJECTED**: Rejected by superadmin

## Business Rules

1. **One Organization Per Admin**: Each admin can only have one organization
2. **No Superadmin Organizations**: Superadmins should not have affiliated organizations
3. **Election Protection**: Organizations with elections cannot be deleted
4. **Status Transitions**: Only PENDING organizations can be approved/rejected
5. **Soft Deletion**: All deletions are soft deletes for audit purposes
6. **Name Uniqueness**: Organization names must be unique across the system

## Error Handling

- Comprehensive validation with detailed error messages
- Proper HTTP status codes
- Consistent error response format
- Graceful handling of edge cases

This API structure provides a robust, secure, and well-documented interface for managing organizations in the voting system.
