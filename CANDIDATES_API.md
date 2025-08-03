# Candidates API Documentation

This document provides an overview of the comprehensive Candidates API that has been created for the RBAC voting system.

## API Endpoints

### 1. Main Candidates Endpoint
**File:** `/src/app/api/candidates/route.ts`

#### GET `/api/candidates`
- **Description:** Fetch candidates with filtering, pagination, and search
- **Query Parameters:**
  - `electionId` (required): ID of the election
  - `positionId` (optional): Filter by position
  - `partyId` (optional): Filter by party
  - `votingScopeId` (optional): Filter by voting scope
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10, max: 50)
  - `search` (optional): Search by name or email
- **Authorization:** All authenticated users
- **Access Control:** Admins can only view candidates from their organization's elections

#### POST `/api/candidates`
- **Description:** Create a new candidate
- **Body Schema:** `candidateSchema`
- **Required Fields:**
  - `electionId`: Election ID
  - `voterId`: Voter ID (must be unique candidate)
  - `positionId`: Position ID
- **Optional Fields:**
  - `partyId`: Party ID
  - `imageUrl`: Candidate photo URL
  - `bio`: Candidate biography
  - `isNew`: Whether candidate is new
  - `leaderships[]`: Leadership experience array
  - `workExperiences[]`: Work experience array
  - `educations[]`: Education background array
- **Authorization:** Admin and Super Admin only
- **Validation:** Comprehensive validation including voter uniqueness, election ownership

### 2. Individual Candidate Endpoint
**File:** `/src/app/api/candidates/[id]/route.ts`

#### GET `/api/candidates/[id]`
- **Description:** Fetch detailed information about a specific candidate
- **Returns:** Complete candidate profile with experiences and vote counts

#### PUT `/api/candidates/[id]`
- **Description:** Update a candidate's information
- **Body Schema:** `candidateUpdateSchema`
- **Features:** Can update experiences (replaces existing records)

#### DELETE `/api/candidates/[id]`
- **Description:** Soft delete a candidate
- **Protection:** Cannot delete candidates who have received votes

### 3. Candidates Statistics
**File:** `/src/app/api/candidates/stats/route.ts`

#### GET `/api/candidates/stats`
- **Description:** Comprehensive statistics about candidates in an election
- **Query Parameters:**
  - `electionId` (required): Election ID
- **Returns:**
  - Summary statistics (totals, averages, completion rates)
  - Position distribution and competition analysis
  - Party distribution
  - Experience metrics
  - Candidates needing attention (missing bio, image, experience)
  - Profile completion analysis

### 4. Candidates Search
**File:** `/src/app/api/candidates/search/route.ts`

#### GET `/api/candidates/search`
- **Description:** Advanced search and filtering for candidates
- **Query Parameters:**
  - `electionId` (required): Election ID
  - `query` (optional): Search text (searches name, email, bio, position, party)
  - `positionId` (optional): Filter by position
  - `partyId` (optional): Filter by party (use 'independent' for no party)
  - `isNew` (optional): Filter by new candidate status
  - `hasImage` (optional): Filter by image presence
  - `hasBio` (optional): Filter by bio presence
  - `hasExperience` (optional): Filter by experience presence
  - `page`, `limit`: Pagination
- **Returns:** 
  - Filtered candidates with limited experience data
  - Available filter options with counts
  - Applied filters summary

### 5. Bulk Operations
**File:** `/src/app/api/candidates/bulk/route.ts`

#### POST `/api/candidates/bulk`
- **Description:** Create multiple candidates at once
- **Limit:** Maximum 50 candidates per operation
- **Validation:** Validates all voters, positions, and parties before creation

#### PUT `/api/candidates/bulk`
- **Description:** Update multiple candidates at once
- **Limit:** Maximum 50 updates per operation

#### DELETE `/api/candidates/bulk`
- **Description:** Delete multiple candidates at once
- **Protection:** Cannot delete candidates with votes
- **Limit:** Maximum 50 deletions per operation

## Schema Definitions

### New Schemas Added to `/src/lib/schema.ts`:

1. **candidateLeadershipSchema**
   - `organization`: Organization name
   - `position`: Position held
   - `dateRange`: Date range string
   - `description`: Optional description

2. **candidateWorkExperienceSchema**
   - `company`: Company name
   - `role`: Role/position
   - `dateRange`: Date range string
   - `description`: Optional description

3. **candidateEducationSchema**
   - `school`: School/institution name
   - `educationLevel`: Level of education
   - `dateRange`: Date range string
   - `description`: Optional description

4. **candidateSchema** (for creation)
   - All required and optional fields for candidate creation
   - Includes arrays for experiences

5. **candidateUpdateSchema** (for updates)
   - All fields optional except validation rules
   - Supports updating experiences (replaces existing)

## Key Features

### 1. **Comprehensive RBAC**
- Role-based access control throughout all endpoints
- Organization ownership validation
- Super admin bypass capabilities

### 2. **Data Validation**
- Zod schema validation for all inputs
- Comprehensive error messages
- Type safety throughout

### 3. **Relationship Management**
- Validates voter uniqueness (one candidate per voter)
- Checks election, position, and party relationships
- Maintains data integrity

### 4. **Experience Management**
- Support for leadership, work, and education experiences
- Bulk operations for experience updates
- Flexible experience data structure

### 5. **Advanced Search & Filtering**
- Full-text search across multiple fields
- Multiple filter combinations
- Efficient pagination

### 6. **Statistics & Analytics**
- Comprehensive candidate statistics
- Competition analysis
- Profile completion tracking
- Attention areas identification

### 7. **Audit Logging**
- All operations logged for audit trail
- Detailed action descriptions
- User activity tracking

### 8. **Vote Protection**
- Prevents deletion/modification of candidates with votes
- Maintains election integrity

### 9. **Performance Optimization**
- Efficient database queries
- Proper indexing considerations
- Pagination for large datasets

## Usage Examples

### Creating a Candidate
```typescript
POST /api/candidates
{
  "electionId": 1,
  "voterId": 123,
  "positionId": 5,
  "partyId": 2,
  "bio": "Experienced leader with 10 years in student government",
  "leaderships": [
    {
      "organization": "Student Council",
      "position": "President",
      "dateRange": "2020-2022",
      "description": "Led student body initiatives"
    }
  ]
}
```

### Searching Candidates
```typescript
GET /api/candidates/search?electionId=1&query=john&hasExperience=true&positionId=5
```

### Getting Statistics
```typescript
GET /api/candidates/stats?electionId=1
```

This API provides a complete solution for managing candidates in the voting system with robust validation, security, and feature completeness.
