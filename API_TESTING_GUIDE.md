# API Testing Guide

This guide provides comprehensive instructions for testing all APIs in the RBAC voting system using the seeded data.

## 🚀 Quick Setup

### 1. Reset and Seed Database
```bash
# Option 1: Quick seed (recommended for API testing)
npm run seed:quick

# Option 2: Full comprehensive seed
npm run seed

# Option 3: Reset existing data first
npm run db:reset-data && npm run seed:quick
```

### 2. Test Credentials

After running the quick seed:
- **Super Admin**: Check your .env for `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD`
- **Test Admin**: `testadmin@example.com` / `TestAdmin@123`

## 📊 Seeded Data Overview

### Quick Seed Data:
- **Organizations**: 1 (Test University)
- **Elections**: 1 (Active election)
- **Positions**: 3 (President, Vice President, Secretary)
- **Parties**: 2 (Progressive Party, Unity Party)
- **Voters**: 20 (10 have voted, 10 haven't)
- **Candidates**: 9 (3 per position, some with parties, some independent)
- **Voting Scopes**: 1 (All Students)

## 🔐 Authentication

### 1. Login as Admin
```bash
POST /api/auth/signin
Content-Type: application/json

{
  "email": "testadmin@example.com",
  "password": "TestAdmin@123"
}
```

## 🗳️ Elections API Testing

### Base URL: `/api/elections`

### 1. List Elections
```bash
GET /api/elections
```

### 2. Get Election Details
```bash
GET /api/elections/1
```

### 3. Election Status Management
```bash
# Get election status
GET /api/elections/1/status

# Open election (if draft)
POST /api/elections/1/open

# Pause election
POST /api/elections/1/pause
Content-Type: application/json
{
  "reason": "Technical maintenance required"
}

# Resume election
POST /api/elections/1/resume

# Close election
POST /api/elections/1/close
Content-Type: application/json
{
  "reason": "Voting period ended",
  "forceClose": false
}

# Archive election
POST /api/elections/1/archive
Content-Type: application/json
{
  "reason": "End of academic year"
}
```

## 👥 Candidates API Testing

### Base URL: `/api/candidates`

### 1. List Candidates
```bash
# Get all candidates for election
GET /api/candidates?electionId=1

# Filter by position
GET /api/candidates?electionId=1&positionId=1

# Filter by party
GET /api/candidates?electionId=1&partyId=1

# Search candidates
GET /api/candidates?electionId=1&search=Voter1

# Pagination
GET /api/candidates?electionId=1&page=1&limit=5
```

### 2. Get Candidate Details
```bash
GET /api/candidates/1
```

### 3. Create New Candidate
```bash
POST /api/candidates
Content-Type: application/json

{
  "electionId": 1,
  "voterId": 15,
  "positionId": 1,
  "partyId": 1,
  "bio": "Experienced leader with strong vision for student body",
  "imageUrl": "https://example.com/new-candidate.jpg",
  "leaderships": [
    {
      "organization": "Debate Club",
      "position": "President",
      "dateRange": "2023-2024",
      "description": "Led successful debate competitions"
    }
  ],
  "workExperiences": [
    {
      "company": "Campus Library",
      "role": "Student Assistant",
      "dateRange": "2023-Present",
      "description": "Customer service and organization"
    }
  ],
  "educations": [
    {
      "school": "Test University",
      "educationLevel": "Bachelor's in Progress",
      "dateRange": "2022-Present",
      "description": "Business Administration major"
    }
  ]
}
```

### 4. Update Candidate
```bash
PUT /api/candidates/1
Content-Type: application/json

{
  "bio": "Updated biography with new achievements",
  "leaderships": [
    {
      "organization": "Student Government",
      "position": "Vice President",
      "dateRange": "2024-Present",
      "description": "Current leadership role"
    }
  ]
}
```

### 5. Delete Candidate
```bash
DELETE /api/candidates/1
```

### 6. Candidate Statistics
```bash
GET /api/candidates/stats?electionId=1
```

### 7. Advanced Search
```bash
# Search with multiple filters
GET /api/candidates/search?electionId=1&query=leader&hasExperience=true&partyId=1

# Search for independent candidates
GET /api/candidates/search?electionId=1&partyId=independent

# Search for new candidates
GET /api/candidates/search?electionId=1&isNew=true

# Search with profile completion filters
GET /api/candidates/search?electionId=1&hasBio=true&hasImage=true
```

### 8. Bulk Operations
```bash
# Bulk create candidates
POST /api/candidates/bulk
Content-Type: application/json

{
  "candidates": [
    {
      "electionId": 1,
      "voterId": 16,
      "positionId": 2,
      "bio": "First bulk candidate"
    },
    {
      "electionId": 1,
      "voterId": 17,
      "positionId": 2,
      "partyId": 2,
      "bio": "Second bulk candidate"
    }
  ]
}

# Bulk update candidates
PUT /api/candidates/bulk
Content-Type: application/json

{
  "updates": [
    {
      "id": 1,
      "bio": "Updated via bulk operation"
    },
    {
      "id": 2,
      "imageUrl": "https://example.com/updated-image.jpg"
    }
  ]
}

# Bulk delete candidates
DELETE /api/candidates/bulk
Content-Type: application/json

{
  "candidateIds": [8, 9]
}
```

## 👤 Users API Testing

### Base URL: `/api/users`

### 1. List Users (Super Admin only)
```bash
GET /api/users
```

### 2. Get User Details
```bash
GET /api/users/[userId]
```

### 3. Update User
```bash
PUT /api/users/[userId]
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

## 🏢 Organizations API Testing

### Base URL: `/api/organizations`

### 1. List Organizations
```bash
GET /api/organizations
```

### 2. Get Organization Details
```bash
GET /api/organizations/1
```

### 3. Approve Organization (Super Admin only)
```bash
POST /api/organizations/1/approve
```

## 🏛️ Positions API Testing

### Base URL: `/api/positions`

### 1. List Positions
```bash
GET /api/positions?electionId=1
```

### 2. Create Position
```bash
POST /api/positions
Content-Type: application/json

{
  "electionId": 1,
  "name": "Public Relations Officer",
  "description": "Manages external communications",
  "voteLimit": 1,
  "numOfWinners": 1,
  "order": 4,
  "votingScopeId": 1
}
```

### 3. Bulk Position Operations
```bash
# Bulk create
POST /api/positions/bulk
Content-Type: application/json

{
  "positions": [
    {
      "electionId": 1,
      "name": "Event Coordinator",
      "description": "Organizes student events",
      "voteLimit": 1,
      "numOfWinners": 2,
      "order": 5
    }
  ]
}
```

## 🎭 Parties API Testing

### Base URL: `/api/parties`

### 1. List Parties
```bash
GET /api/parties?electionId=1
```

### 2. Create Party
```bash
POST /api/parties
Content-Type: application/json

{
  "electionId": 1,
  "name": "Innovation Party",
  "color": "#FF6B6B",
  "description": "Focused on technological innovation",
  "logoUrl": "https://example.com/innovation-logo.png"
}
```

## 🗳️ Voters API Testing

### Base URL: `/api/voter`

### 1. List Voters
```bash
GET /api/voter?electionId=1
```

### 2. Create Voter
```bash
POST /api/voter
Content-Type: application/json

{
  "electionId": 1,
  "firstName": "New",
  "lastName": "Voter",
  "email": "newvoter@testuniversity.edu",
  "contactNum": "+15550001234",
  "address": "123 New Street",
  "votingScopeId": 1
}
```

## 📍 Voting Scopes API Testing

### Base URL: `/api/voting-scopes`

### 1. List Voting Scopes
```bash
GET /api/voting-scopes?electionId=1
```

### 2. Create Voting Scope
```bash
POST /api/voting-scopes
Content-Type: application/json

{
  "electionId": 1,
  "type": "DEPARTMENT",
  "name": "Engineering Department",
  "description": "All engineering students"
}
```

## 🔍 Testing Tips

### 1. Use Browser DevTools
- Open Network tab to see request/response details
- Check response status codes and error messages
- Verify authorization headers are included

### 2. Test RBAC
- Try accessing endpoints with different user roles
- Verify admin users can only access their organization's data
- Test super admin privileges

### 3. Test Validation
- Send invalid data to test Zod validation
- Try creating duplicates to test unique constraints
- Test required field validation

### 4. Test Edge Cases
- Try deleting candidates with votes
- Test election status transitions
- Try bulk operations with invalid data

### 5. Test Pagination
- Request different page sizes
- Test with large datasets
- Verify pagination metadata

## 🐛 Common Issues

### 1. Authentication Errors
- Ensure you're logged in before testing protected endpoints
- Check session cookies are being sent

### 2. Permission Denied
- Verify the user role has permission for the action
- Check organization ownership for admin users

### 3. Validation Errors
- Check required fields are included
- Verify data types match schema requirements
- Ensure foreign key relationships exist

### 4. Not Found Errors
- Verify IDs exist in the database
- Check soft deletion status (isDeleted field)

## 📈 Monitoring

Use these endpoints to monitor your testing:
```bash
# View audit logs (check database directly)
# Check vote counts
GET /api/candidates/stats?electionId=1

# Monitor election status
GET /api/elections/1/status
```

This guide covers all major API endpoints with realistic test scenarios using the seeded data!
