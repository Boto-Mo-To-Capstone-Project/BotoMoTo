# BotoMoTo - RBAC Voting System

A comprehensive Role-Based Access Control (RBAC) voting system built with Next.js, TypeScript, NextAuth, and Prisma. Designed for organizational elections with secure authentication, real-time voting, and comprehensive audit trails.

## 🚀 Quick Start (3 minutes)

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup Steps

1. **Clone and Install**

   ```bash
   git clone <repository-url>
   cd next-rbac
   npm install
   ```

2. **Environment Setup**
   Create `.env.local`:

   ```env
   DATABASE_URL_SQLITE="file:./prisma/dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"

   # Optional OAuth
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

3. **Database Setup**

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Create SuperAdmin**

   ```bash
   node scripts/create-superadmin.mjs
   ```

   > Creates: `superadmin@botomoto.com` / `superadmin123`

5. **Start Development**
   ```bash
   npm run dev
   ```

## 🎯 Features

### 🔐 Authentication & Authorization

- **Multi-provider Authentication**: NextAuth with Credentials, Google, and Facebook
- **Role-Based Access Control**: SuperAdmin, Admin, Voter roles
- **Organization Approval Workflow**: Admins must be approved by SuperAdmin
- **Two-Factor Authentication (2FA)**: Multiple options for extra security: login with your email, email OTP, SMS OTP, or passphrase. (See voter routes: `/voter/login/2fa-email`, `/voter/login/2fa-text`, `/voter/login/2fa-passphrase`, `/voter/login/2fa-email`)
- **Secure Session Management**: Database-based sessions

### 👥 User Roles

**SuperAdmin**

- Full system oversight and control
- Approve/reject organization registrations
- View all organizations, elections, and tickets globally
- Access to comprehensive audit logs
- Manage support tickets from all admins
- No onboarding required - direct access to dashboard

**Admin**

- Register and create organization (first-time onboarding required)
- Manage multiple elections for their organization
- Register voters via form or CSV upload
- Generate unique voter codes
- Create positions, candidates, and parties
- Configure 2FA methods per election (applies to all voters in that election)
- Real-time vote monitoring and analytics
- Ballot preview and live dashboard management
- Email distribution and election toggle controls
- Submit support tickets
- Completely isolated from other admins

**Voter**

- Access voting via unique 6-digit codes
- Election-based two-factor authentication (2FA) options: email, SMS, or passphrase (configurable per election by admin)
- Submit votes through secure ballot forms
- Complete post-vote surveys
- View real-time results (requires authentication)

### 🗳️ Election Management

- **Election Lifecycle**: Draft → Active → Paused → Closed → Archived
- **Real-time Voting**: Live vote counts with WebSocket/SSE support
- **Vote Integrity**: Encrypted votes with chain hashing
- **Voting Scopes**: Hierarchical voting areas
- **Party Voting**: Optional party-based voting
- **Candidate Profiles**: Rich candidate information
- **2FA Configuration**: Per-election 2FA method selection
- **Ballot Preview**: Admin can preview and customize ballot forms
- **Live Dashboard**: Real-time election monitoring
- **Email Distribution**: Automated voter code and notification sending

### 📊 Analytics & Reporting

- **Real-time Dashboards**: Live vote counts and participation metrics
- **PDF Reports**: Generate comprehensive election results
- **Email Notifications**: Automated voter code distribution
- **Audit Trails**: Complete system activity logging
- **Support System**: Ticket-based support for admins

## 🔄 Workflow

### Organization Setup

1. Admin registers with email/password or OAuth
2. Admin goes through onboarding process (first time only)
3. Admin creates organization profile
4. SuperAdmin reviews and approves organization
5. Admin gains access to election management dashboard
6. Admin creates elections and manages:
   - Voting scopes and hierarchical areas
   - Political parties and affiliations
   - Voter registration and code generation
   - Position definitions and requirements
   - Candidate profiles and information
   - 2FA method selection (applies to all voters in that election)
7. Admin manages elections:
   - Ballot preview and customization
   - Receipt form configuration
   - Survey form setup
   - Email distribution to voters
   - Live dashboard monitoring
   - Election toggle (on/off control)
8. Admin submit support tickets and system issues

### Voter System

- 6-digit alphanumeric codes (globally unique)
- Generated individually or via CSV upload
- Supports email/SMS distribution
- Election-based multi-factor authentication
- Live dashboard access (requires authentication)

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Authentication**: NextAuth.js v4
- **Database**: SQLite (development), PostgreSQL (production)
- **File Storage**: Supabase Storage
- **Real-time**: WebSocket / Server-Sent Events

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── admin/             # Admin pages
│   ├── superadmin/        # SuperAdmin pages
│   ├── voter/             # Voter interface
│   └── public/            # Public pages
├── components/            # Reusable components
├── lib/                  # Utility libraries
├── types/                # TypeScript definitions
└── generated/            # Generated Prisma client
```

## 🛣️ Route Structure

### Authentication Routes
```
/auth/login              # Admin login
/auth/signup             # Admin registration
/auth/forgot-password    # Password reset
/auth/forgot-password/otp # Password reset OTP
```

### Admin Routes
```
/admin/onboard/          # Onboarding (first-time admin)
/admin/onboard/add-org   # Create organization
/admin/onboard/processing # Approval pending

/admin/dashboard/elections # Main elections dashboard
/admin/dashboard/elections/create # Create new election
/admin/dashboard/elections/[id]/setup # Election setup wizard
├── /scope/              # Voting scope setup
├── /party/              # Party management
├── /voter/              # Voter registration
├── /position/           # Position definition
└── /candidates/         # Candidate management

/admin/dashboard/elections/[id]/manage # Election management
├── /ballot-preview/     # Ballot customization
├── /email-send/         # Email distribution
├── /live-dashboard/     # Real-time monitoring
└── /2fa-settings/       # 2FA method selection

/admin/dashboard/tickets # Support tickets
```

### SuperAdmin Routes
```
/superadmin/dashboard    # Main dashboard with sidebar navigation
├── /org-request         # Organization approval
├── /elections           # Election oversight
├── /tickets             # Support ticket management
├── /audits              # System audit logs
└── /survey-form         # Survey management
```

### Voter Routes
```
/voter/login             # Voter code entry
/voter/login/2fa-email   # Email 2FA
/voter/login/2fa-otp     # OTP 2FA
/voter/login/2fa-text    # SMS 2FA
/voter/login/2fa-passphrase # Passphrase 2FA
/voter/election-status   # Election status
/voter/election-terms-conditions # Terms and conditions
/voter/ballot-form       # Voting interface
/voter/receipt           # Vote receipt
/voter/survey-form       # Post-vote survey
/voter/live-dashboard    # Live results (requires auth)
```

### Public Routes
```
/                       # Landing page
/public/about-us        # About page
/public/contact         # Contact page
```

## 🏗️ TypeScript Interface Organization

This project follows industry best practices for organizing TypeScript interfaces and type definitions. All types are centralized in the `src/types/` directory with clear separation of concerns.

### 📂 Type Structure

```
src/types/
├── index.ts              # Main type exports (barrel export)
├── auth.ts               # Authentication & user-related types
├── api.ts                # API request/response types
├── components.ts         # Component prop types
├── database.ts           # Database model types
└── next-auth.d.ts        # NextAuth extensions
```

### 🎯 Interface Categories

#### **1. Authentication Types** (`auth.ts`)

```typescript
// Core user and authentication interfaces
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isApproved: boolean;
  organization?: Organization;
}

// Form data interfaces
interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Type unions for better type safety
type UserRole = "ADMIN" | "VOTER" | "SUPER_ADMIN";
type OrganizationStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
```

#### **2. API Types** (`api.ts`)

```typescript
// Generic API response wrapper
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
}

// Pagination interfaces
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Request/Response interfaces
interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: string;
}
```

#### **3. Component Types** (`components.ts`)

```typescript
// Component prop interfaces
interface ButtonProps {
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: PaginationProps;
}
```

#### **4. Database Types** (`database.ts`)

```typescript
// Prisma model interfaces (matching schema)
interface PrismaUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: string;
  isApproved: boolean;
  organizationId?: number;
  organization?: PrismaOrganization;
  createdAt: Date;
  updatedAt: Date;
}

// Database transaction types
interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role: string;
  organizationId?: number;
}
```

#### **5. Barrel Exports** (`index.ts`)

**What are Barrel Exports?** 🛢️

Barrel exports get their name from the **barrel metaphor** - like a barrel that collects multiple items from different sources and provides one convenient spout to access everything. This pattern collects exports from multiple files and distributes them through a single entry point.

**Benefits:**

- **Cleaner imports**: One import statement instead of multiple
- **Easier refactoring**: Move types between files without changing imports
- **Better organization**: Acts as a "table of contents" for all types

**Before Barrel Exports:**

```typescript
// ❌ Multiple import statements
import { User } from "@/types/auth";
import { ApiResponse } from "@/types/api";
import { ButtonProps } from "@/types/components";
import { PrismaUser } from "@/types/database";
```

**After Barrel Exports:**

```typescript
// ✅ Single import statement
import { User, ApiResponse, ButtonProps, PrismaUser } from "@/types";
```

**Implementation:**

```typescript
// Main types index - exports all interfaces
export * from "./auth";
export * from "./api";
export * from "./components";
export * from "./database";

// Legacy types (keeping for backward compatibility)
export type Candidate = {
  name: string;
  party: string;
  credentials: string;
  img: string;
  position: string;
};

// Re-export commonly used types for convenience
export type { User, Organization, UserRole, OrganizationStatus } from "./auth";
export type { ApiResponse, PaginatedResponse, Election } from "./api";
export type { ButtonProps, InputProps, TableProps } from "./components";
export type {
  PrismaUser,
  PrismaOrganization,
  PrismaElection,
} from "./database";
```

#### **6. NextAuth Extensions** (`next-auth.d.ts`)

```typescript
// NextAuth module extensions
declare module "next-auth" {
  interface Session {
    user: SessionUser & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    isApproved: boolean;
    organization?: {
      id: number;
      name: string;
      status: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    id: string;
    isApproved: boolean;
    organization?: {
      id: number;
      name: string;
      status: string;
    };
  }
}
```

### 📋 Best Practices

#### **Naming Conventions**

- **PascalCase** for interfaces: `User`, `ApiResponse`
- **Descriptive names**: `CreateUserRequest`, `PaginatedResponse`
- **Suffix conventions**:
  - `Props` for component interfaces
  - `Request`/`Response` for API interfaces
  - `Data` for database operations

#### **Organization Principles**

1. **Single Responsibility**: Each file handles one domain
2. **Reusability**: Generic interfaces where possible
3. **Type Safety**: Union types and strict typing
4. **Extensibility**: Easy to extend and maintain
5. **Documentation**: Clear comments explaining purpose

#### **Usage Examples**

**In Components:**

```typescript
import { ButtonProps, User } from "@/types";

const MyComponent = ({ user, ...props }: ButtonProps & { user: User }) => {
  // Type-safe component implementation
};
```

**In API Routes:**

```typescript
import { CreateUserRequest, ApiResponse } from "@/types";

export async function POST(request: Request) {
  const data: CreateUserRequest = await request.json();
  // Type-safe API handling
}
```

**In Database Operations:**

```typescript
import { PrismaUser, CreateUserData } from "@/types";

const createUser = async (data: CreateUserData): Promise<PrismaUser> => {
  // Type-safe database operations
};
```

### 🔄 Adding New Types

When adding new types, follow these guidelines:

1. **Choose the right file** based on the domain
2. **Use descriptive names** that clearly indicate purpose
3. **Add JSDoc comments** for complex interfaces
4. **Export from index.ts** for easy importing
5. **Follow existing patterns** for consistency

### 🎯 Benefits

- **Maintainability**: Easy to find and update types
- **Reusability**: Types can be shared across components
- **Type Safety**: Catch errors at compile time
- **Documentation**: Self-documenting code
- **Scalability**: Easy to add new types as project grows
- **Team Collaboration**: Clear structure for multiple developers

## 📚 API Endpoints

### Authentication

- `POST /api/auth/signin` - User login
- `POST /api/auth/signup` - User registration

### Admin

- `GET /api/admin/elections` - List elections
- `POST /api/admin/elections` - Create election
- `POST /api/admin/voters` - Register voters

### SuperAdmin

- `GET /api/superadmin/organizations` - List organizations
- `PUT /api/superadmin/organizations/:id/approve` - Approve organization

### Voter

- `POST /api/voter/verify-code` - Verify voter code
- `POST /api/voter/submit-vote` - Submit vote

## 🔒 Security

- Password hashing with bcrypt
- Database session management
- Input sanitization and validation
- SQL injection prevention via Prisma
- Encrypted vote storage
- Chain hashing for audit trails
- Role-based access control
- Election-based 2FA configuration

## 🚀 Deployment

### Vercel

1. Connect repository to Vercel
2. Set environment variables
3. Deploy automatically

### Production Database

```env
DATABASE_URL="postgresql://user:password@localhost:5432/botomoto"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- Create an issue in the GitHub repository
- Check the documentation in `/docs`
- Review the API documentation

---

**BotoMoTo** - Secure, Scalable, and Modern Voting Solutions
