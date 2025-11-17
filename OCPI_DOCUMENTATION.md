# OCPI (Open Charge Point Interface) Documentation for CitrineOS

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Setup Instructions](#setup-instructions)
4. [Configuration](#configuration)
5. [Authentication & Authorization](#authentication--authorization)
6. [Data Models](#data-models)
7. [Capabilities](#capabilities)
8. [Workflows & Scenarios](#workflows--scenarios)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is OCPI?

OCPI (Open Charge Point Interface) is an open protocol that enables automated roaming for EV charging between different Charge Point Operators (CPOs) and e-Mobility Service Providers (eMSPs). It allows for seamless charging experiences across different networks without requiring multiple accounts or RFID cards.

### OCPI in CitrineOS

CitrineOS implements OCPI to enable multi-tenant charging network operations with partner integrations. The implementation provides:

- **Multi-tenant support** - Each tenant can operate as a CPO with their own party identification
- **Partner management** - Connect with multiple OCPI partners (eMSPs, other CPOs, Hubs)
- **Token synchronization** - Async job processing for fetching and managing authorization tokens
- **Standards compliance** - Currently supports OCPI version 2.2.1

### Supported OCPI Version

- **OCPI 2.2.1** (defined in `00_Base/src/interfaces/dto/enum/index.ts`)

### Key Use Cases

1. **Roaming between networks** - Allow drivers from partner networks to charge at your stations
2. **Token management** - Synchronize authorization tokens from partner eMSPs
3. **Location data exchange** - Share charging station location and availability data
4. **Multi-tenant operations** - Manage multiple CPO organizations within a single CitrineOS instance

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CitrineOS Core                           │
│                                                             │
│  ┌──────────────┐     ┌──────────────┐   ┌──────────────┐ │
│  │ OCPP Server  │     │ OCPI Server  │   │ Tenant Module│ │
│  │ (8080-8082)  │     │   (8085)     │   │              │ │
│  └──────────────┘     └──────────────┘   └──────────────┘ │
│         │                    │                   │         │
│         └────────────────────┴───────────────────┘         │
│                              │                             │
│                    ┌─────────▼─────────┐                  │
│                    │   Data Layer      │                  │
│                    │  - Tenant         │                  │
│                    │  - TenantPartner  │                  │
│                    │  - AsyncJobStatus │                  │
│                    │  - Authorization  │                  │
│                    └───────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ OCPI Protocol
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌─────▼────┐         ┌─────▼────┐
   │  eMSP   │          │   CPO    │         │   Hub    │
   │ Partner │          │ Partner  │         │ Partner  │
   └─────────┘          └──────────┘         └──────────┘
```

### Component Architecture

#### 1. **Tenant Module** (`03_Modules/Tenant/`)
- Manages tenant configurations and OCPI profiles
- Provides REST API for tenant data operations
- Handles tenant-specific OCPI server profiles

#### 2. **Data Layer** (`01_Data/`)
- **Tenant** - Represents a CPO organization with OCPI server profile
- **TenantPartner** - Represents OCPI partner connections (eMSPs, other CPOs)
- **AsyncJobStatus** - Tracks async OCPI operations (e.g., token fetching)
- **Authorization** - Links authorization tokens to tenants and partners

#### 3. **Base Interfaces** (`00_Base/`)
- OCPI registration interfaces and DTOs
- Version enumerations
- Configuration schemas

#### 4. **OCPI Server** (Port 8085)
- Configured but endpoint handlers need implementation
- Listens on configurable host and port
- Handles OCPI protocol requests/responses

---

## Setup Instructions

### Prerequisites

1. **PostgreSQL Database** - Required for storing tenant and partner data
2. **RabbitMQ** - Required for message broker functionality
3. **Node.js** - Version compatible with the project
4. **Database Migrations** - Must be run to create OCPI tables

### Step 1: Database Setup

Ensure your PostgreSQL database is running and configured in your environment.

### Step 2: Run Database Migrations

The following migrations create OCPI-related tables:

```bash
# These migrations are automatically applied during database initialization
# They create the necessary OCPI tables:
# - 20250714120500: Creates TenantPartners table
# - 20250714121000: Adds OCPI fields to Tenants table
# - 20250715000000: Creates AsyncJobStatuses table
# - 20250821103100: Schema normalization and fixes
```

**Migration Details:**

1. **TenantPartners Table** - Stores partner OCPI connections
   - `partyId` - Partner's OCPI party identifier
   - `countryCode` - Partner's country code (ISO 3166-1 alpha-2)
   - `partnerProfileOCPI` - JSONB field containing partner profile

2. **Tenants Table Additions**
   - `partyId` - Tenant's OCPI party identifier (default: 'default')
   - `countryCode` - Tenant's country code (default: 'US')
   - `url` - Tenant's base URL
   - `serverProfileOCPI` - JSONB field containing server profile

3. **AsyncJobStatuses Table** - Tracks async OCPI jobs
   - `jobId` - UUID for job tracking
   - `jobName` - Type of job (e.g., FETCH_OCPI_TOKENS)
   - `tenantPartnerId` - Reference to partner
   - `paginationParams` - Pagination state for resumable jobs
   - `totalObjects` - Total count of objects to process

### Step 3: Configure OCPI Server

Edit your configuration file (e.g., `Server/src/config/envs/local.ts`):

```typescript
export function createLocalConfig() {
  return defineConfig({
    // ... other config
    ocpiServer: {
      host: '0.0.0.0',  // Listen on all interfaces
      port: 8085,        // OCPI server port
    },
    // ... other config
  });
}
```

**Configuration Options:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `host` | string | 'localhost' | Host address for OCPI server |
| `port` | number | 8085 | Port number for OCPI server |

### Step 4: Configure Tenant as CPO

Each tenant needs to be configured with OCPI server profile information:

```typescript
// Example Tenant configuration
{
  id: 1,
  name: "My Charging Network",
  partyId: "ABC",           // Your CPO party ID (3 characters)
  countryCode: "US",        // ISO 3166-1 alpha-2 country code
  url: "https://my-cpo.com",
  serverProfileOCPI: {
    credentialsRole: {
      role: "CPO",
      businessDetails: {
        name: "My Charging Network Inc.",
        website: "https://my-cpo.com",
        logo: {
          url: "https://my-cpo.com/logo.png",
          type: "png",
          category: "OPERATOR"
        }
      }
    },
    versionDetails: [
      {
        version: "2.2.1",
        versionDetailsUrl: "https://my-cpo.com/ocpi/versions/2.2.1"
      }
    ],
    versionEndpoints: {
      "2.2.1": [
        {
          identifier: "credentials",
          url: "https://my-cpo.com/ocpi/2.2.1/credentials"
        },
        {
          identifier: "locations",
          url: "https://my-cpo.com/ocpi/2.2.1/cpo/locations"
        },
        {
          identifier: "tokens",
          url: "https://my-cpo.com/ocpi/2.2.1/cpo/tokens"
        }
      ]
    }
  }
}
```

### Step 5: Start the Server

```bash
# Start CitrineOS with OCPI support
npm run start

# The OCPI server will be available at:
# http://localhost:8085
```

### Step 6: Verify Setup

Check that the OCPI server is running:

```bash
# Check if OCPI port is listening
netstat -an | grep 8085

# Or using lsof
lsof -i :8085
```

---

## Configuration

### Environment-Specific Configuration

CitrineOS supports multiple environment configurations:

| Environment | Config File | Description |
|-------------|-------------|-------------|
| Local Development | `Server/src/config/envs/local.ts` | Development environment |
| Docker | `Server/src/config/envs/docker.ts` | Docker containerized setup |
| Swarm | `Server/src/config/envs/swarm.docker.ts` | Docker Swarm deployment |
| Directus Docker | `Server/src/config/envs/directus.docker.ts` | With Directus integration |

### Tenant Module Configuration

Located in module configuration under `modules.tenant`:

```typescript
tenant: {
  endpointPrefix: '/tenant',  // REST API endpoint prefix
  responses: [],               // No OCPP responses handled
  requests: [],                // No OCPP requests handled
}
```

### OCPI Server Configuration Schema

Defined in `00_Base/src/config/types.ts:261-264`:

```typescript
ocpiServer: z.object({
  host: z.string().default('localhost').optional(),
  port: z.number().int().positive().default(8085).optional(),
})
```

**Validation Rules:**
- `host` - Must be a valid string (hostname or IP address)
- `port` - Must be a positive integer

### Default Values

```typescript
{
  host: 'localhost',  // Change to '0.0.0.0' for external access
  port: 8085
}
```

---

## Authentication & Authorization

### OCPI Authentication Model

OCPI uses token-based authentication for all requests. CitrineOS implements this through the following mechanisms:

### 1. Credentials Exchange (Handshake)

The OCPI credentials flow establishes trust between partners:

```
┌────────┐                                    ┌─────────┐
│  CPO   │                                    │  eMSP   │
│(Server)│                                    │(Client) │
└────┬───┘                                    └────┬────┘
     │                                             │
     │  1. POST /credentials                       │
     │     (eMSP sends token A)                    │
     │◄────────────────────────────────────────────│
     │                                             │
     │  2. Response: versionsUrl + token B         │
     │─────────────────────────────────────────────►
     │                                             │
     │  3. GET /versions                           │
     │     (eMSP uses token B)                     │
     │◄────────────────────────────────────────────│
     │                                             │
     │  4. Response: Available versions            │
     │─────────────────────────────────────────────►
     │                                             │
     │  5. GET /versions/2.2.1                     │
     │◄────────────────────────────────────────────│
     │                                             │
     │  6. Response: Endpoint details              │
     │─────────────────────────────────────────────►
     │                                             │
```

### 2. Credentials Data Structure

**Server Credentials** (Stored in Tenant.serverProfileOCPI):

```typescript
interface ServerProfile {
  credentialsRole: {
    role: 'CPO' | 'EMSP' | 'HUB' | 'NAP' | 'NSP' | 'SCSP';
    businessDetails: {
      name: string;
      website?: string;
      logo?: {
        url: string;
        type: string;
        category: string;
        width?: number;
        height?: number;
      };
    };
  };
  versionDetails: Array<{
    version: '2.2.1';
    versionDetailsUrl?: string;
  }>;
  versionEndpoints: Record<string, Array<{
    identifier: string;
    url: string;
  }>>;
}
```

**Partner Credentials** (Stored in TenantPartner.partnerProfileOCPI):

```typescript
interface PartnerProfile {
  version: {
    version: '2.2.1';
    versionDetailsUrl?: string;
  };
  serverCredentials: {
    versionsUrl: string;
    token?: string;
    certificateRef?: string;
  };
  roles?: Array<{
    role: 'CPO' | 'EMSP' | 'HUB' | 'NAP' | 'NSP' | 'SCSP';
    businessDetails: BusinessDetails;
  }>;
  credentials?: {
    versionsUrl: string;
    token?: string;
    certificateRef?: string;
  };
  endpoints?: Array<{
    identifier: string;
    url: string;
  }>;
}
```

### 3. Token-Based Request Authentication

All OCPI requests include an authorization header:

```http
GET /ocpi/2.2.1/cpo/locations HTTP/1.1
Host: my-cpo.com
Authorization: Token abc123def456
Content-Type: application/json
```

**Token Storage:**
- Server tokens: `TenantPartner.partnerProfileOCPI.serverCredentials.token`
- Partner tokens: `TenantPartner.partnerProfileOCPI.credentials.token`

### 4. Authorization Data Model

Located in `01_Data/src/layers/sequelize/model/Authorization/Authorization.ts`:

The Authorization model links tokens to:
- **Tenant** - The CPO organization
- **TenantPartner** - The specific OCPI partner

This enables:
- Per-tenant-partner token isolation
- Role-based access control
- Token lifecycle management

### 5. Authentication Flow by Role

#### As CPO (Charge Point Operator)

When CitrineOS acts as a CPO:

1. **Receive eMSP Registration**
   - eMSP sends POST to `/credentials` with their token
   - CitrineOS validates and stores in `TenantPartner.partnerProfileOCPI.serverCredentials`
   - Returns CPO's credentials including new token for eMSP to use

2. **Validate Incoming Requests**
   - Extract token from `Authorization` header
   - Lookup in `TenantPartner` records
   - Verify against stored `serverCredentials.token`
   - Apply tenant-specific authorization rules

3. **Make Outbound Requests to eMSP**
   - Use token from `partnerProfileOCPI.credentials.token`
   - Include in Authorization header
   - Access eMSP endpoints (e.g., to push charging session data)

#### As eMSP (e-Mobility Service Provider)

When CitrineOS acts as an eMSP:

1. **Register with CPO**
   - Send POST to CPO's `/credentials` endpoint
   - Include tenant's token in Authorization header
   - Store CPO's response in `TenantPartner.partnerProfileOCPI`

2. **Fetch CPO Data**
   - Use CPO's token from `serverCredentials.token`
   - Make requests to CPO endpoints
   - Example: GET locations, GET tokens

3. **Receive CPO Requests**
   - CPO uses tenant's provided token
   - Validate against `Tenant.serverProfileOCPI` configuration

### 6. Certificate-Based Authentication

OCPI also supports certificate-based authentication as an alternative to tokens:

```typescript
interface Credentials {
  versionsUrl: string;
  token?: string;
  certificateRef?: string;  // Reference to certificate
}
```

When using certificates:
- `certificateRef` points to a stored certificate
- Mutual TLS (mTLS) validates both parties
- More secure for production environments

### 7. Security Best Practices

1. **Token Generation**
   - Use cryptographically secure random generators
   - Minimum 32 characters recommended
   - Rotate tokens periodically

2. **Token Storage**
   - Store in JSONB fields (encrypted at rest)
   - Never log tokens in plaintext
   - Implement token revocation mechanism

3. **HTTPS Required**
   - All OCPI communication must use HTTPS
   - Validate SSL certificates
   - Use TLS 1.2 or higher

4. **Rate Limiting**
   - Implement per-partner rate limits
   - Protect against brute force attacks
   - Monitor for anomalous request patterns

5. **Audit Logging**
   - Log all authentication attempts
   - Track token usage
   - Monitor for unauthorized access

---

## Data Models

### Overview

CitrineOS uses Sequelize ORM with PostgreSQL for data persistence. All OCPI-related data is stored in JSONB columns for flexibility.

### 1. Tenant Model

**File:** `01_Data/src/layers/sequelize/model/Tenant.ts`

Represents a CPO organization operating charging stations.

```typescript
class Tenant {
  id: number;                                    // Primary key
  name: string;                                  // Organization name
  url: string;                                   // Base URL
  partyId: string;                               // OCPI party ID (3 chars)
  countryCode: string;                           // ISO 3166-1 alpha-2
  serverProfileOCPI?: OCPIRegistration.ServerProfile | null;

  // Relationships
  tenantPartners: TenantPartner[];               // OCPI partners
  authorizations: Authorization[];               // Auth tokens
  chargingStations: ChargingStation[];          // Charging infrastructure
  locations: Location[];                         // OCPI locations
  // ... many other relationships
}
```

**OCPI-Specific Fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `partyId` | string | OCPI party identifier | "ABC" |
| `countryCode` | string | ISO 3166-1 alpha-2 code | "US" |
| `url` | string | Tenant's base URL | "https://cpo.com" |
| `serverProfileOCPI` | JSONB | Server OCPI profile | See ServerProfile interface |

**Database Table:** `Tenants`

**Default Values:**
- `partyId`: 'default'
- `countryCode`: 'US'

### 2. TenantPartner Model

**File:** `01_Data/src/layers/sequelize/model/TenantPartner.ts`

Represents an OCPI partner connection (eMSP, other CPO, or Hub).

```typescript
class TenantPartner {
  id: number;                                    // Primary key
  partyId: string;                               // Partner's party ID
  countryCode: string;                           // Partner's country code
  tenantId: number;                              // Foreign key to Tenant
  partnerProfileOCPI: OCPIRegistration.PartnerProfile;

  // Relationships
  tenant: Tenant;                                // Parent tenant
  authorizations: Authorization[];               // Partner-specific tokens
  asyncJobStatuses: AsyncJobStatus[];           // Running jobs
}
```

**OCPI-Specific Fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `partyId` | string | Partner's party ID | "XYZ" |
| `countryCode` | string | Partner's country | "DE" |
| `partnerProfileOCPI` | JSONB | Partner profile | See PartnerProfile interface |

**Database Table:** `TenantPartners`

**Unique Constraint:** (tenantId, partyId, countryCode)

### 3. AsyncJobStatus Model

**File:** `01_Data/src/layers/sequelize/model/AsyncJob/AsyncJobStatus.ts`

Tracks long-running OCPI operations like token synchronization.

```typescript
class AsyncJobStatus {
  jobId: string;                                 // UUID (primary key)
  jobName: AsyncJobName;                         // Job type
  tenantPartnerId: number;                       // Foreign key to partner
  tenantId: number;                              // Inherited from base
  finishedAt?: Date;                             // Completion timestamp
  stoppedAt?: Date | null;                       // Manual stop time
  stopScheduled: boolean;                        // Stop flag
  isFailed: boolean;                             // Failure flag
  paginationParams: PaginatedParams;             // Resume state
  totalObjects?: number;                         // Total count

  // Relationships
  tenantPartner: TenantPartner;                  // Associated partner
}
```

**Job Types (AsyncJobName enum):**

| Job Name | Description |
|----------|-------------|
| `FETCH_OCPI_TOKENS` | Fetch authorization tokens from partner eMSP |

**Pagination Parameters:**

```typescript
interface PaginatedParams {
  offset?: number;      // Current offset
  limit?: number;       // Page size
  dateFrom?: Date;      // Filter start date
  dateTo?: Date;        // Filter end date
}
```

**Database Table:** `AsyncJobStatuses`

**Use Cases:**
- Resume interrupted token fetches
- Track progress of large data synchronizations
- Monitor job health and failures
- Implement graceful shutdown

### 4. Authorization Model

**File:** `01_Data/src/layers/sequelize/model/Authorization/Authorization.ts`

Links authorization tokens to tenants and partners.

```typescript
class Authorization {
  id: number;                                    // Primary key
  tenantId: number;                              // Foreign key to Tenant
  tenantPartnerId?: number;                      // Foreign key to TenantPartner
  // ... other authorization fields

  // Relationships
  tenant: Tenant;                                // CPO tenant
  tenantPartner?: TenantPartner;                 // OCPI partner (optional)
}
```

**Database Table:** `Authorizations`

**Key Points:**
- Can belong to a tenant directly (local authorization)
- Can belong to a tenant partner (roaming authorization)
- Enables multi-tenant token isolation

### 5. Location and ChargingStation Models

**Files:**
- `01_Data/src/layers/sequelize/model/Location/Location.ts`
- `01_Data/src/layers/sequelize/model/Location/ChargingStation.ts`

These models will be mapped to OCPI Location and EVSE data structures:

```typescript
// From Location.ts comments:
// "will be analogous to an OCPI Location"

// From ChargingStation.ts comments:
// "will be analogous to an OCPI ChargingStation"
```

**Future OCPI Mapping:**
- CitrineOS Location → OCPI Location
- CitrineOS ChargingStation → OCPI EVSE
- CitrineOS Connector → OCPI Connector

---

## Capabilities

### Current Implementation Status

CitrineOS has laid the foundation for OCPI support with the following capabilities:

### ✅ Implemented

#### 1. **Multi-Tenant Infrastructure**
- Complete tenant data model with OCPI fields
- JSONB storage for flexible OCPI profiles
- Tenant isolation and management

**Location:** `01_Data/src/layers/sequelize/model/Tenant.ts`

#### 2. **Partner Management**
- TenantPartner model for storing partner connections
- Support for multiple partners per tenant
- Partner profile storage (credentials, endpoints, versions)

**Location:** `01_Data/src/layers/sequelize/model/TenantPartner.ts`

#### 3. **Async Job Processing**
- AsyncJobStatus model for long-running operations
- Pagination support for resumable jobs
- Job lifecycle tracking (created, running, finished, failed, stopped)

**Location:** `01_Data/src/layers/sequelize/model/AsyncJob/AsyncJobStatus.ts`

**Supported Jobs:**
- `FETCH_OCPI_TOKENS` - Asynchronously fetch tokens from partner eMSP

#### 4. **OCPI Data Structures**
- Complete TypeScript interfaces for OCPI 2.2.1
- ServerProfile and PartnerProfile interfaces
- Credentials, Version, Endpoint interfaces

**Location:** `00_Base/src/interfaces/dto/json/ocpi.registration.ts`

#### 5. **Configuration System**
- OCPI server configuration schema
- Environment-specific configurations
- Validation with Zod schema

**Location:** `00_Base/src/config/types.ts`

#### 6. **Database Migrations**
- Complete migration scripts for OCPI tables
- Schema versioning and evolution support

**Location:** `migrations/`

#### 7. **Repository Layer**
- Tenant repository with CRUD operations
- AsyncJobStatus repository with job management methods
- Sequelize-based data access layer

**Locations:**
- `01_Data/src/layers/sequelize/repository/Tenant.ts`
- `01_Data/src/layers/sequelize/repository/AsyncJobStatus.ts`

#### 8. **Tenant Module**
- Abstract module implementation
- REST API foundation via TenantDataApi
- Message broker integration (RabbitMQ)

**Location:** `03_Modules/Tenant/src/`

### 🚧 Partially Implemented / Foundation Laid

#### 9. **OCPI Server**
- Server configuration on port 8085
- No active endpoint handlers yet
- Infrastructure ready for implementation

**Configuration:** All environment configs include ocpiServer settings

#### 10. **Authentication Framework**
- Data models support token storage
- Authorization model links to partners
- Token-based auth structure defined
- Actual validation logic needs implementation

### ❌ Not Yet Implemented

The following OCPI modules need implementation:

#### 11. **Credentials Module**
Handles partner registration and token exchange.

**Required Endpoints:**
- `POST /ocpi/2.2.1/credentials` - Register new partner
- `PUT /ocpi/2.2.1/credentials` - Update credentials
- `DELETE /ocpi/2.2.1/credentials` - Unregister partner
- `GET /ocpi/2.2.1/versions` - List supported versions
- `GET /ocpi/2.2.1/versions/2.2.1` - Get version details

#### 12. **Locations Module**
Share charging station location and availability data.

**Required Endpoints (CPO):**
- `GET /ocpi/2.2.1/cpo/locations` - List all locations
- `GET /ocpi/2.2.1/cpo/locations/:locationId` - Get location details
- `GET /ocpi/2.2.1/cpo/locations/:locationId/:evseId` - Get EVSE details
- `GET /ocpi/2.2.1/cpo/locations/:locationId/:evseId/:connectorId` - Get connector

**Required Endpoints (eMSP):**
- `PUT /ocpi/2.2.1/emsp/locations/:locationId` - Receive location updates
- `PATCH /ocpi/2.2.1/emsp/locations/:locationId` - Partial location update

#### 13. **Tokens Module**
Manage authorization tokens for roaming users.

**Required Endpoints (CPO):**
- `GET /ocpi/2.2.1/cpo/tokens/:countryCode/:partyId/:tokenUid` - Authorize token
- `POST /ocpi/2.2.1/cpo/tokens/:countryCode/:partyId/:tokenUid/authorize` - Real-time authorization

**Required Endpoints (eMSP):**
- `GET /ocpi/2.2.1/emsp/tokens` - List all tokens (paginated)
- `PUT /ocpi/2.2.1/emsp/tokens/:countryCode/:partyId/:tokenUid` - Receive token update

#### 14. **Sessions Module**
Exchange charging session information.

**Required Endpoints (CPO):**
- `GET /ocpi/2.2.1/cpo/sessions` - List sessions
- `PUT /ocpi/2.2.1/cpo/sessions/:sessionId` - Update session

**Required Endpoints (eMSP):**
- `GET /ocpi/2.2.1/emsp/sessions` - Get session updates
- `PATCH /ocpi/2.2.1/emsp/sessions/:sessionId` - Partial session update

#### 15. **CDRs Module**
Share Charge Detail Records for billing.

**Required Endpoints (CPO):**
- `GET /ocpi/2.2.1/cpo/cdrs` - List CDRs
- `GET /ocpi/2.2.1/cpo/cdrs/:cdrId` - Get CDR details

**Required Endpoints (eMSP):**
- `POST /ocpi/2.2.1/emsp/cdrs` - Receive new CDR
- `GET /ocpi/2.2.1/emsp/cdrs/:cdrId` - Get CDR

#### 16. **Tariffs Module**
Share pricing information.

**Required Endpoints (CPO):**
- `GET /ocpi/2.2.1/cpo/tariffs` - List tariffs
- `GET /ocpi/2.2.1/cpo/tariffs/:tariffId` - Get tariff

**Required Endpoints (eMSP):**
- `PUT /ocpi/2.2.1/emsp/tariffs/:tariffId` - Receive tariff update

#### 17. **Commands Module**
Send remote commands to charge points.

**Required Endpoints (CPO):**
- `POST /ocpi/2.2.1/cpo/commands/START_SESSION` - Start charging session
- `POST /ocpi/2.2.1/cpo/commands/STOP_SESSION` - Stop session
- `POST /ocpi/2.2.1/cpo/commands/UNLOCK_CONNECTOR` - Unlock connector
- `POST /ocpi/2.2.1/cpo/commands/RESERVE_NOW` - Reserve connector

**Required Endpoints (eMSP):**
- Similar endpoints for receiving command results

---

## Workflows & Scenarios

### Scenario 1: Partner Registration (Credentials Handshake)

This is the first step when establishing an OCPI connection between a CPO and eMSP.

#### Prerequisites
- CPO (CitrineOS) is configured with tenant and serverProfileOCPI
- eMSP has generated a secure token (Token A)
- eMSP knows CPO's credentials endpoint URL

#### Workflow Diagram

```
eMSP                                           CPO (CitrineOS)
 │                                                    │
 │  1. Generate secure Token A                       │
 │     (e.g., "emsp-abc-123-xyz")                    │
 │                                                    │
 │  2. POST /ocpi/2.2.1/credentials                  │
 │     Authorization: Token emsp-abc-123-xyz         │
 │     {                                              │
 │       "token": "emsp-abc-123-xyz",                │
 │       "url": "https://emsp.com/ocpi/versions"     │
 │     }                                              │
 ├───────────────────────────────────────────────────►
 │                                                    │
 │                              3. Validate request  │
 │                              4. Generate Token B  │
 │                                 ("cpo-def-456")   │
 │                              5. Create TenantPartner:
 │                                 - partyId: "XYZ"  │
 │                                 - countryCode: "DE"
 │                                 - partnerProfileOCPI: {
 │                                     serverCredentials: {
 │                                       token: "emsp-abc-123-xyz"
 │                                       versionsUrl: "https://emsp.com/ocpi/versions"
 │                                     }
 │                                     credentials: {
 │                                       token: "cpo-def-456"
 │                                     }
 │                                   }
 │                                                    │
 │  6. Response:                                     │
 │     200 OK                                         │
 │     {                                              │
 │       "token": "cpo-def-456",                     │
 │       "url": "https://cpo.com/ocpi/versions"      │
 │     }                                              │
 │◄───────────────────────────────────────────────────┤
 │                                                    │
 │  7. Store Token B                                 │
 │     (for future requests to CPO)                  │
 │                                                    │
 │  8. GET /ocpi/versions                            │
 │     Authorization: Token cpo-def-456              │
 ├───────────────────────────────────────────────────►
 │                                                    │
 │                              9. Validate Token B  │
 │                              10. Return versions  │
 │                                                    │
 │  11. Response:                                    │
 │      [{"version": "2.2.1", "url": "..."}]        │
 │◄───────────────────────────────────────────────────┤
 │                                                    │
 │  12. GET /ocpi/versions/2.2.1                     │
 │      Authorization: Token cpo-def-456             │
 ├───────────────────────────────────────────────────►
 │                                                    │
 │  13. Response: Endpoint details                   │
 │      {                                             │
 │        "endpoints": [                              │
 │          {"identifier": "locations", "url": "..."},
 │          {"identifier": "tokens", "url": "..."}   │
 │        ]                                           │
 │      }                                             │
 │◄───────────────────────────────────────────────────┤
 │                                                    │
 │  14. Store endpoint URLs                          │
 │      Partner registration complete!               │
 │                                                    │
```

#### Data Changes

**Before:**
- No TenantPartner record exists

**After:**
```sql
-- TenantPartners table
INSERT INTO "TenantPartners" (
  "partyId",
  "countryCode",
  "tenantId",
  "partnerProfileOCPI"
) VALUES (
  'XYZ',
  'DE',
  1,
  '{
    "version": {
      "version": "2.2.1"
    },
    "serverCredentials": {
      "token": "emsp-abc-123-xyz",
      "versionsUrl": "https://emsp.com/ocpi/versions"
    },
    "credentials": {
      "token": "cpo-def-456",
      "versionsUrl": "https://cpo.com/ocpi/versions"
    },
    "endpoints": [
      {"identifier": "locations", "url": "https://cpo.com/ocpi/2.2.1/cpo/locations"},
      {"identifier": "tokens", "url": "https://cpo.com/ocpi/2.2.1/cpo/tokens"}
    ]
  }'::jsonb
);
```

#### Authentication Details

1. **Initial Request (eMSP → CPO)**
   - Header: `Authorization: Token emsp-abc-123-xyz`
   - CPO receives and stores this as `partnerProfileOCPI.serverCredentials.token`
   - This token will be used by eMSP for all future requests to CPO

2. **Response Token (CPO → eMSP)**
   - CPO generates new token: `cpo-def-456`
   - Stored in `partnerProfileOCPI.credentials.token`
   - eMSP will use this for accessing CPO endpoints

3. **Subsequent Requests**
   - eMSP includes: `Authorization: Token cpo-def-456`
   - CPO validates against `TenantPartner.partnerProfileOCPI.credentials.token`

---

### Scenario 2: Token Synchronization (Async Job)

eMSPs maintain lists of authorized tokens (RFID cards, mobile app credentials). CPOs need to fetch and cache these tokens for real-time authorization.

#### Prerequisites
- Partner registration completed (Scenario 1)
- eMSP has tokens endpoint configured
- AsyncJobStatus repository is available

#### Workflow Diagram

```
Admin/System                CitrineOS                    eMSP
     │                          │                          │
     │  1. Trigger token sync   │                          │
     │     POST /tenant/partners/:id/sync-tokens          │
     │     {                     │                          │
     │       "dateFrom": "2025-01-01",                     │
     │       "limit": 100        │                          │
     │     }                     │                          │
     ├──────────────────────────►│                          │
     │                           │                          │
     │                           │  2. Create AsyncJobStatus:
     │                           │     - jobId: uuid()      │
     │                           │     - jobName: FETCH_OCPI_TOKENS
     │                           │     - paginationParams: {
     │                           │         offset: 0        │
     │                           │         limit: 100       │
     │                           │         dateFrom: "2025-01-01"
     │                           │       }                  │
     │                           │     - stopScheduled: false
     │                           │     - isFailed: false    │
     │                           │                          │
     │  3. Response: Job created │                          │
     │     {                     │                          │
     │       "jobId": "550e8400-...",                       │
     │       "status": "running" │                          │
     │     }                     │                          │
     │◄──────────────────────────┤                          │
     │                           │                          │
     │                           │  4. GET /ocpi/2.2.1/emsp/tokens?offset=0&limit=100&date_from=2025-01-01
     │                           │     Authorization: Token emsp-abc-123-xyz
     │                           ├─────────────────────────►│
     │                           │                          │
     │                           │                     5. Query tokens
     │                           │                     6. Return page 1
     │                           │                          │
     │                           │  7. Response:            │
     │                           │     {                    │
     │                           │       "data": [          │
     │                           │         {                │
     │                           │           "uid": "012345",
     │                           │           "type": "RFID",│
     │                           │           "valid": true  │
     │                           │         },               │
     │                           │         ... 100 tokens   │
     │                           │       ],                 │
     │                           │       "total": 532       │
     │                           │     }                    │
     │                           │◄─────────────────────────┤
     │                           │                          │
     │                           │  8. Store tokens in Authorization table
     │                           │  9. Update AsyncJobStatus:
     │                           │     - paginationParams.offset: 100
     │                           │     - totalObjects: 532  │
     │                           │                          │
     │                           │  10. GET /tokens?offset=100&limit=100
     │                           ├─────────────────────────►│
     │                           │◄─────────────────────────┤
     │                           │  11. Store 100 more      │
     │                           │  12. Update offset: 200  │
     │                           │                          │
     │                           │  ... Continue pagination ...
     │                           │                          │
     │                           │  N. All tokens fetched   │
     │                           │     Update AsyncJobStatus:
     │                           │     - finishedAt: now()  │
     │                           │     - offset: 532        │
     │                           │                          │
     │  Check status             │                          │
     │  GET /jobs/:jobId         │                          │
     ├──────────────────────────►│                          │
     │                           │                          │
     │  Response:                │                          │
     │  {                        │                          │
     │    "jobId": "550e8400-...",                          │
     │    "status": "completed", │                          │
     │    "totalObjects": 532,   │                          │
     │    "finishedAt": "2025-11-17T10:30:00Z"             │
     │  }                        │                          │
     │◄──────────────────────────┤                          │
     │                           │                          │
```

#### Resumable Job Handling

If the job is interrupted (server restart, network error), it can resume:

```
System Restart
     │
     │  1. On startup, query AsyncJobStatus
     │     WHERE finishedAt IS NULL
     │       AND stoppedAt IS NULL
     │
     │  2. Found job: jobId="550e8400-..."
     │     - paginationParams.offset: 200
     │     - totalObjects: 532
     │
     │  3. Resume from offset 200
     │     GET /tokens?offset=200&limit=100
     │
     │  4. Continue until offset >= totalObjects
     │
```

#### Job Cancellation

```
Admin                     CitrineOS
  │                           │
  │  POST /jobs/:jobId/stop   │
  ├──────────────────────────►│
  │                           │
  │                           │  Update AsyncJobStatus:
  │                           │  - stopScheduled: true
  │                           │
  │                           │  On next iteration:
  │                           │  - Check stopScheduled
  │                           │  - If true, update:
  │                           │    - stoppedAt: now()
  │                           │    - Exit loop
  │                           │
```

#### Data Changes

**AsyncJobStatus Record Lifecycle:**

```sql
-- Initial creation
INSERT INTO "AsyncJobStatuses" (...) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',  -- jobId
  'FETCH_OCPI_TOKENS',                      -- jobName
  5,                                        -- tenantPartnerId
  1,                                        -- tenantId
  '{"offset": 0, "limit": 100, "dateFrom": "2025-01-01"}'::json,
  false,                                    -- stopScheduled
  false,                                    -- isFailed
  NULL,                                     -- finishedAt
  NULL,                                     -- stoppedAt
  NULL                                      -- totalObjects
);

-- After first page
UPDATE "AsyncJobStatuses" SET
  "paginationParams" = '{"offset": 100, "limit": 100, "dateFrom": "2025-01-01"}'::json,
  "totalObjects" = 532
WHERE "jobId" = '550e8400-e29b-41d4-a716-446655440000';

-- After completion
UPDATE "AsyncJobStatuses" SET
  "paginationParams" = '{"offset": 532, "limit": 100, "dateFrom": "2025-01-01"}'::json,
  "finishedAt" = NOW()
WHERE "jobId" = '550e8400-e29b-41d4-a716-446655440000';
```

#### Authentication Details

- All requests to eMSP use: `Authorization: Token emsp-abc-123-xyz`
- Token retrieved from: `TenantPartner.partnerProfileOCPI.serverCredentials.token`
- Each request is authenticated by eMSP before returning data

---

### Scenario 3: Real-Time Authorization

When a driver presents an RFID card at a charging station, the CPO must authorize the token in real-time.

#### Prerequisites
- Partner registration completed
- Tokens may or may not be cached locally
- OCPP connection established with charging station

#### Workflow Diagram

```
Charging Station        CitrineOS (CPO)           eMSP
       │                      │                     │
       │  1. OCPP: Authorize  │                     │
       │     {                │                     │
       │       "idTag": "012345"                    │
       │     }                │                     │
       ├─────────────────────►│                     │
       │                      │                     │
       │                      │  2. Check local cache (Authorization table)
       │                      │     WHERE idTag = "012345"
       │                      │                     │
       │                      │  3. If found and valid:
       │                      │     - Return Accepted
       │                      │  4. If not found:
       │                      │     - Proceed to real-time check
       │                      │                     │
       │                      │  5. Identify token owner
       │                      │     - Parse countryCode & partyId from token
       │                      │     - Or: Try all partners
       │                      │                     │
       │                      │  6. POST /ocpi/2.2.1/cpo/tokens/DE/XYZ/012345/authorize
       │                      │     Authorization: Token emsp-abc-123-xyz
       │                      │     {               │
       │                      │       "locationId": "LOC1",
       │                      │       "evseId": "EVSE1"
       │                      │     }               │
       │                      ├────────────────────►│
       │                      │                     │
       │                      │              7. Validate token
       │                      │              8. Check user account
       │                      │              9. Check business rules
       │                      │                     │
       │                      │  10. Response:      │
       │                      │      {              │
       │                      │        "allowed": "ALLOWED",
       │                      │        "location": {│
       │                      │          "id": "LOC1",
       │                      │          "evse_uid": "EVSE1"
       │                      │        },            │
       │                      │        "info": {     │
       │                      │          "language": "en",
       │                      │          "text": "Charging authorized"
       │                      │        }             │
       │                      │      }               │
       │                      │◄────────────────────┤
       │                      │                     │
       │                      │  11. Cache result (optional)
       │                      │      INSERT INTO Authorizations
       │                      │                     │
       │                      │  12. Map to OCPP response
       │                      │                     │
       │  13. OCPP Response:  │                     │
       │      {               │                     │
       │        "idTagInfo": {│                     │
       │          "status": "Accepted"              │
       │        }             │                     │
       │      }               │                     │
       │◄─────────────────────┤                     │
       │                      │                     │
       │  14. Start charging  │                     │
       │                      │                     │
```

#### Decision Tree for Authorization

```
Token received: "012345"
│
├─ Check local cache
│  │
│  ├─ Found & valid ────────► Return: Accepted
│  │
│  └─ Not found or expired
│     │
│     └─ Real-time check required
│        │
│        ├─ Parse token identifier
│        │  - CountryCode: DE
│        │  - PartyId: XYZ
│        │  - UID: 012345
│        │
│        ├─ Find TenantPartner
│        │  WHERE countryCode = "DE"
│        │    AND partyId = "XYZ"
│        │
│        ├─ Found partner?
│        │  │
│        │  ├─ Yes ──► POST /authorize to partner
│        │  │          │
│        │  │          ├─ Response: ALLOWED ──► Return: Accepted
│        │  │          │
│        │  │          ├─ Response: BLOCKED ──► Return: Blocked
│        │  │          │
│        │  │          └─ Response: NOT_ALLOWED ─► Return: Invalid
│        │  │
│        │  └─ No ───► Try all partners (fallback)
│        │             │
│        │             ├─ Any partner accepts ──► Return: Accepted
│        │             │
│        │             └─ All reject ──► Return: Invalid
│        │
│        └─ Network error ──► Return: Offline (allow charging)
```

#### Performance Optimization

**Caching Strategy:**

1. **Pre-fetch tokens** via async job (Scenario 2)
2. **Cache hits** - Respond in < 100ms
3. **Cache misses** - Real-time check (< 2 seconds)
4. **Update cache** after real-time checks

**Cache Expiry:**
- Valid tokens: Cache for 24 hours
- Invalid tokens: Cache for 1 hour (may change status)
- Real-time responses: Always cache

#### Authentication Details

- **Outbound request to eMSP**: `Authorization: Token emsp-abc-123-xyz`
- **Token source**: `TenantPartner.partnerProfileOCPI.serverCredentials.token`
- **Endpoint**: `TenantPartner.partnerProfileOCPI.endpoints` (identifier: "tokens")

---

### Scenario 4: Location Data Push

CPO (CitrineOS) pushes charging station location updates to eMSP partners.

#### Prerequisites
- Partner registration completed
- Partner has registered for location updates
- Charging station data is available in CitrineOS

#### Workflow Diagram

```
Charging Station        CitrineOS (CPO)           eMSP
       │                      │                     │
       │  1. OCPP: StatusNotification             │
       │     {                │                     │
       │       "status": "Available",              │
       │       "connectorId": 1                    │
       │     }                │                     │
       ├─────────────────────►│                     │
       │                      │                     │
       │                      │  2. Update internal database
       │                      │     - Location model
       │                      │     - ChargingStation model
       │                      │     - StatusNotification
       │                      │                     │
       │                      │  3. Map to OCPI Location format
       │                      │     - Location → OCPI Location
       │                      │     - ChargingStation → OCPI EVSE
       │                      │     - Connector → OCPI Connector
       │                      │                     │
       │                      │  4. For each registered partner:
       │                      │     Query TenantPartners
       │                      │                     │
       │                      │  5. PUT /ocpi/2.2.1/emsp/locations/LOC1
       │                      │     Authorization: Token emsp-abc-123-xyz
       │                      │     {               │
       │                      │       "id": "LOC1", │
       │                      │       "name": "Main Street Station",
       │                      │       "address": "123 Main St",
       │                      │       "city": "Springfield",
       │                      │       "postal_code": "12345",
       │                      │       "country": "USA",
       │                      │       "coordinates": {
       │                      │         "latitude": "39.7",
       │                      │         "longitude": "-104.8"
       │                      │       },             │
       │                      │       "evses": [     │
       │                      │         {            │
       │                      │           "uid": "EVSE1",
       │                      │           "evse_id": "US*ABC*E1",
       │                      │           "status": "AVAILABLE",
       │                      │           "connectors": [
       │                      │             {        │
       │                      │               "id": "1",
       │                      │               "standard": "IEC_62196_T2",
       │                      │               "format": "CABLE",
       │                      │               "power_type": "AC_3_PHASE",
       │                      │               "max_voltage": 230,
       │                      │               "max_amperage": 32
       │                      │             }        │
       │                      │           ]          │
       │                      │         }            │
       │                      │       ]              │
       │                      │     }                │
       │                      ├────────────────────►│
       │                      │                     │
       │                      │              6. Validate request
       │                      │              7. Update eMSP database
       │                      │              8. Notify eMSP apps
       │                      │                     │
       │                      │  9. Response:       │
       │                      │     200 OK          │
       │                      │     {               │
       │                      │       "status_code": 1000,
       │                      │       "timestamp": "2025-11-17T10:00:00Z"
       │                      │     }               │
       │                      │◄────────────────────┤
       │                      │                     │
       │                      │  10. Log success    │
       │                      │                     │
```

#### Data Mapping: CitrineOS → OCPI

**Location Model → OCPI Location:**

```typescript
// CitrineOS Location (01_Data/src/layers/sequelize/model/Location/Location.ts)
{
  id: number,
  name: string,
  address: string,
  city: string,
  postalCode: string,
  country: string,
  coordinates: { latitude: string, longitude: string }
}

// Maps to OCPI Location
{
  id: string,                    // Location.id.toString()
  name: string,                  // Location.name
  address: string,               // Location.address
  city: string,                  // Location.city
  postal_code: string,           // Location.postalCode
  country: string,               // Location.country (ISO 3166-1 alpha-3)
  coordinates: {
    latitude: string,            // Location.coordinates.latitude
    longitude: string            // Location.coordinates.longitude
  },
  evses: EVSE[]                  // From ChargingStation model
}
```

**ChargingStation Model → OCPI EVSE:**

```typescript
// CitrineOS ChargingStation
{
  id: string,
  locationId: number,
  evseId: string,
  // ... connector information
}

// Maps to OCPI EVSE
{
  uid: string,                   // ChargingStation.id
  evse_id: string,               // ChargingStation.evseId (e.g., "US*ABC*E1")
  status: EVSEStatus,            // From StatusNotification
  connectors: Connector[],       // From Connector model
  physical_reference: string,    // Optional: Physical location reference
  floor_level: string            // Optional: Building floor
}
```

**Connector Model → OCPI Connector:**

```typescript
// CitrineOS Connector
{
  id: number,
  connectorId: number,
  type: string,
  maxVoltage: number,
  maxAmperage: number
}

// Maps to OCPI Connector
{
  id: string,                    // Connector.connectorId.toString()
  standard: ConnectorType,       // Map from Connector.type
  format: ConnectorFormat,       // Determine from type (CABLE/SOCKET)
  power_type: PowerType,         // AC_1_PHASE, AC_3_PHASE, or DC
  max_voltage: number,           // Connector.maxVoltage
  max_amperage: number,          // Connector.maxAmperage
  max_electric_power: number     // Calculated: voltage * amperage
}
```

#### Update Triggers

Location updates should be pushed to partners when:

1. **New location created** - `INSERT INTO Locations`
2. **Location details changed** - `UPDATE Locations`
3. **EVSE status changed** - New `StatusNotification`
4. **Connector added/removed** - `INSERT/DELETE Connectors`
5. **Pricing changed** - `UPDATE Tariffs`

#### Authentication Details

- **Outbound request**: `Authorization: Token emsp-abc-123-xyz`
- **Token source**: `TenantPartner.partnerProfileOCPI.serverCredentials.token`
- **Endpoint**: `TenantPartner.partnerProfileOCPI.endpoints` (identifier: "locations")

---

### Scenario 5: Credential Update/Rotation

Partners may need to rotate tokens for security.

#### Workflow Diagram

```
eMSP                                    CPO (CitrineOS)
 │                                             │
 │  1. Generate new Token C                   │
 │     (replacing Token A)                    │
 │                                             │
 │  2. PUT /ocpi/2.2.1/credentials            │
 │     Authorization: Token cpo-def-456       │
 │     {                                       │
 │       "token": "emsp-new-token-C",         │
 │       "url": "https://emsp.com/ocpi/versions"
 │     }                                       │
 ├────────────────────────────────────────────►│
 │                                             │
 │                          3. Validate Token B (cpo-def-456)
 │                          4. Generate new Token D
 │                          5. Update TenantPartner:
 │                             partnerProfileOCPI.serverCredentials.token
 │                             = "emsp-new-token-C"
 │                          6. Update TenantPartner:
 │                             partnerProfileOCPI.credentials.token
 │                             = "cpo-new-token-D"
 │                                             │
 │  7. Response:                               │
 │     200 OK                                  │
 │     {                                       │
 │       "token": "cpo-new-token-D",          │
 │       "url": "https://cpo.com/ocpi/versions"
 │     }                                       │
 │◄────────────────────────────────────────────┤
 │                                             │
 │  8. Replace Token B with Token D           │
 │                                             │
 │  9. Verify with new token                  │
 │     GET /ocpi/versions                     │
 │     Authorization: Token cpo-new-token-D   │
 ├────────────────────────────────────────────►│
 │                                             │
 │  10. Success - both tokens rotated!        │
 │◄────────────────────────────────────────────┤
 │                                             │
```

#### Token Lifecycle

```
Token A (eMSP → CPO)
  ├─ Initial: "emsp-abc-123-xyz"
  ├─ Valid for: 90 days (recommended)
  ├─ Rotated to: "emsp-new-token-C"
  └─ Old token invalidated immediately

Token B (CPO → eMSP)
  ├─ Initial: "cpo-def-456"
  ├─ Valid for: 90 days (recommended)
  ├─ Rotated to: "cpo-new-token-D"
  └─ Old token invalidated immediately
```

#### Best Practices

1. **Rotation Schedule**: Every 90 days
2. **No Overlap Period**: Old tokens invalidated immediately
3. **Coordinated Rotation**: Both parties rotate together
4. **Audit Logging**: Log all token rotations
5. **Monitoring**: Alert on failed requests after rotation

---

## API Reference

### OCPI Server Endpoints

The OCPI server is configured to run on port **8085** (configurable).

#### Base URL Structure

```
https://<host>:<port>/ocpi/<version>/<role>/<module>
```

Example:
```
https://my-cpo.com:8085/ocpi/2.2.1/cpo/locations
```

### Versions Module

#### GET /ocpi/versions

List all supported OCPI versions.

**Authentication:** Required (Token from credentials exchange)

**Request:**
```http
GET /ocpi/versions HTTP/1.1
Host: my-cpo.com:8085
Authorization: Token abc123def456
```

**Response:**
```json
{
  "data": [
    {
      "version": "2.2.1",
      "url": "https://my-cpo.com:8085/ocpi/versions/2.2.1"
    }
  ],
  "status_code": 1000,
  "status_message": "Success",
  "timestamp": "2025-11-17T10:00:00Z"
}
```

#### GET /ocpi/versions/:version

Get details for a specific version.

**Authentication:** Required

**Request:**
```http
GET /ocpi/versions/2.2.1 HTTP/1.1
Host: my-cpo.com:8085
Authorization: Token abc123def456
```

**Response:**
```json
{
  "data": {
    "version": "2.2.1",
    "endpoints": [
      {
        "identifier": "credentials",
        "role": "SENDER",
        "url": "https://my-cpo.com:8085/ocpi/2.2.1/credentials"
      },
      {
        "identifier": "locations",
        "role": "SENDER",
        "url": "https://my-cpo.com:8085/ocpi/2.2.1/cpo/locations"
      },
      {
        "identifier": "tokens",
        "role": "RECEIVER",
        "url": "https://my-cpo.com:8085/ocpi/2.2.1/cpo/tokens"
      }
    ]
  },
  "status_code": 1000,
  "status_message": "Success",
  "timestamp": "2025-11-17T10:00:00Z"
}
```

### Credentials Module

#### POST /ocpi/2.2.1/credentials

Register a new partner (credentials handshake).

**Authentication:** Initial token provided by partner

**Request:**
```http
POST /ocpi/2.2.1/credentials HTTP/1.1
Host: my-cpo.com:8085
Authorization: Token emsp-initial-token
Content-Type: application/json

{
  "token": "emsp-initial-token",
  "url": "https://emsp.com/ocpi/versions",
  "roles": [
    {
      "role": "EMSP",
      "business_details": {
        "name": "eMobility Provider Inc.",
        "website": "https://emsp.com"
      },
      "party_id": "XYZ",
      "country_code": "DE"
    }
  ]
}
```

**Response:**
```json
{
  "data": {
    "token": "cpo-response-token",
    "url": "https://my-cpo.com:8085/ocpi/versions",
    "roles": [
      {
        "role": "CPO",
        "business_details": {
          "name": "My Charging Network",
          "website": "https://my-cpo.com"
        },
        "party_id": "ABC",
        "country_code": "US"
      }
    ]
  },
  "status_code": 1000,
  "status_message": "Success",
  "timestamp": "2025-11-17T10:00:00Z"
}
```

**Data Changes:**
- Creates new `TenantPartner` record
- Stores partner token in `partnerProfileOCPI.serverCredentials.token`
- Stores generated token in `partnerProfileOCPI.credentials.token`

#### PUT /ocpi/2.2.1/credentials

Update existing credentials (token rotation).

**Authentication:** Required (existing token)

**Request:**
```http
PUT /ocpi/2.2.1/credentials HTTP/1.1
Host: my-cpo.com:8085
Authorization: Token cpo-response-token
Content-Type: application/json

{
  "token": "emsp-new-token",
  "url": "https://emsp.com/ocpi/versions"
}
```

**Response:**
```json
{
  "data": {
    "token": "cpo-new-token",
    "url": "https://my-cpo.com:8085/ocpi/versions"
  },
  "status_code": 1000,
  "status_message": "Success",
  "timestamp": "2025-11-17T10:00:00Z"
}
```

**Data Changes:**
- Updates `TenantPartner.partnerProfileOCPI.serverCredentials.token`
- Updates `TenantPartner.partnerProfileOCPI.credentials.token`
- Invalidates old tokens

#### DELETE /ocpi/2.2.1/credentials

Unregister partner connection.

**Authentication:** Required

**Request:**
```http
DELETE /ocpi/2.2.1/credentials HTTP/1.1
Host: my-cpo.com:8085
Authorization: Token cpo-response-token
```

**Response:**
```json
{
  "status_code": 1000,
  "status_message": "Success",
  "timestamp": "2025-11-17T10:00:00Z"
}
```

**Data Changes:**
- Deletes `TenantPartner` record
- Optionally deletes associated `Authorization` records
- Invalidates all tokens

### Locations Module (CPO Role)

#### GET /ocpi/2.2.1/cpo/locations

List all locations with pagination.

**Authentication:** Required (partner token)

**Request:**
```http
GET /ocpi/2.2.1/cpo/locations?offset=0&limit=25 HTTP/1.1
Host: my-cpo.com:8085
Authorization: Token partner-token
```

**Response:**
```json
{
  "data": [
    {
      "id": "LOC1",
      "type": "ON_STREET",
      "name": "Main Street Station",
      "address": "123 Main St",
      "city": "Springfield",
      "postal_code": "12345",
      "country": "USA",
      "coordinates": {
        "latitude": "39.7000",
        "longitude": "-104.8000"
      },
      "time_zone": "America/Denver",
      "opening_times": {
        "twentyfourseven": true
      },
      "evses": [
        {
          "uid": "EVSE1",
          "evse_id": "US*ABC*E1",
          "status": "AVAILABLE",
          "connectors": [
            {
              "id": "1",
              "standard": "IEC_62196_T2",
              "format": "CABLE",
              "power_type": "AC_3_PHASE",
              "max_voltage": 230,
              "max_amperage": 32,
              "tariff_ids": ["TAR1"]
            }
          ],
          "last_updated": "2025-11-17T10:00:00Z"
        }
      ],
      "last_updated": "2025-11-17T10:00:00Z"
    }
  ],
  "status_code": 1000,
  "status_message": "Success",
  "timestamp": "2025-11-17T10:00:00Z"
}
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| offset | integer | Pagination offset (default: 0) |
| limit | integer | Page size (default: 25, max: 100) |
| date_from | datetime | Filter locations updated after this date |
| date_to | datetime | Filter locations updated before this date |

#### GET /ocpi/2.2.1/cpo/locations/:locationId

Get specific location details.

**Authentication:** Required

**Request:**
```http
GET /ocpi/2.2.1/cpo/locations/LOC1 HTTP/1.1
Host: my-cpo.com:8085
Authorization: Token partner-token
```

**Response:**
```json
{
  "data": {
    "id": "LOC1",
    "type": "ON_STREET",
    "name": "Main Street Station",
    ...
  },
  "status_code": 1000,
  "status_message": "Success",
  "timestamp": "2025-11-17T10:00:00Z"
}
```

### Tokens Module (CPO Role)

#### POST /ocpi/2.2.1/cpo/tokens/:country_code/:party_id/:token_uid/authorize

Real-time token authorization.

**Authentication:** Required (partner token)

**Request:**
```http
POST /ocpi/2.2.1/cpo/tokens/DE/XYZ/012345/authorize HTTP/1.1
Host: my-cpo.com:8085
Authorization: Token partner-token
Content-Type: application/json

{
  "location_id": "LOC1",
  "evse_uids": ["EVSE1"]
}
```

**Response (Allowed):**
```json
{
  "data": {
    "allowed": "ALLOWED",
    "location": {
      "id": "LOC1",
      "evse_uids": ["EVSE1"]
    },
    "authorization_reference": "AUTH-12345",
    "info": {
      "language": "en",
      "text": "Charging authorized"
    }
  },
  "status_code": 1000,
  "status_message": "Success",
  "timestamp": "2025-11-17T10:00:00Z"
}
```

**Response (Not Allowed):**
```json
{
  "data": {
    "allowed": "NOT_ALLOWED",
    "info": {
      "language": "en",
      "text": "Token is invalid or expired"
    }
  },
  "status_code": 1000,
  "status_message": "Success",
  "timestamp": "2025-11-17T10:00:00Z"
}
```

### Async Job Management

These are CitrineOS-specific endpoints for managing async OCPI jobs.

#### POST /tenant/partners/:partnerId/sync-tokens

Trigger async token synchronization job.

**Authentication:** Admin/System

**Request:**
```http
POST /tenant/partners/5/sync-tokens HTTP/1.1
Host: my-cpo.com:8080
Content-Type: application/json

{
  "dateFrom": "2025-01-01T00:00:00Z",
  "limit": 100
}
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "jobName": "FETCH_OCPI_TOKENS",
  "tenantPartnerId": 5,
  "status": "running",
  "createdAt": "2025-11-17T10:00:00Z"
}
```

#### GET /jobs/:jobId

Get async job status.

**Authentication:** Admin/System

**Request:**
```http
GET /jobs/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: my-cpo.com:8080
```

**Response (Running):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "jobName": "FETCH_OCPI_TOKENS",
  "tenantPartnerId": 5,
  "status": "running",
  "paginatedParams": {
    "offset": 200,
    "limit": 100,
    "dateFrom": "2025-01-01T00:00:00Z"
  },
  "totalObjects": 532,
  "createdAt": "2025-11-17T10:00:00Z"
}
```

**Response (Completed):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "jobName": "FETCH_OCPI_TOKENS",
  "tenantPartnerId": 5,
  "status": "completed",
  "paginatedParams": {
    "offset": 532,
    "limit": 100,
    "dateFrom": "2025-01-01T00:00:00Z"
  },
  "totalObjects": 532,
  "createdAt": "2025-11-17T10:00:00Z",
  "finishedAt": "2025-11-17T10:15:00Z"
}
```

#### POST /jobs/:jobId/stop

Stop a running async job.

**Authentication:** Admin/System

**Request:**
```http
POST /jobs/550e8400-e29b-41d4-a716-446655440000/stop HTTP/1.1
Host: my-cpo.com:8080
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "stopScheduled": true,
  "message": "Job will stop after current iteration"
}
```

---

## Troubleshooting

### Common Issues

#### 1. OCPI Server Not Starting

**Symptom:** Port 8085 not listening

**Possible Causes:**
- Port already in use
- Configuration not loaded
- Server module not initialized

**Solutions:**

```bash
# Check if port is in use
lsof -i :8085
netstat -an | grep 8085

# Check configuration
grep -r "ocpiServer" Server/src/config/

# Verify configuration is valid
npm run build
```

**Fix port conflict:**
```typescript
// Edit config file
ocpiServer: {
  host: '0.0.0.0',
  port: 8086,  // Use different port
}
```

#### 2. Authentication Failures

**Symptom:** 401 Unauthorized responses

**Possible Causes:**
- Invalid token
- Token not found in database
- Token expired
- Wrong authorization header format

**Solutions:**

```sql
-- Check if partner token exists
SELECT
  tp.id,
  tp."partyId",
  tp."countryCode",
  tp."partnerProfileOCPI"->'serverCredentials'->>'token' as partner_token,
  tp."partnerProfileOCPI"->'credentials'->>'token' as our_token
FROM "TenantPartners" tp
WHERE tp."partyId" = 'XYZ';
```

**Check authorization header format:**
```
✓ Correct: Authorization: Token abc123def456
✗ Wrong:   Authorization: Bearer abc123def456
✗ Wrong:   Token: abc123def456
```

#### 3. Partner Registration Fails

**Symptom:** POST /credentials returns error

**Possible Causes:**
- Invalid JSONB data
- Missing required fields
- Duplicate party ID

**Solutions:**

```sql
-- Check for duplicate partners
SELECT
  tp.id,
  tp."partyId",
  tp."countryCode",
  t."name" as tenant_name
FROM "TenantPartners" tp
JOIN "Tenants" t ON tp."tenantId" = t.id
WHERE tp."partyId" = 'XYZ'
  AND tp."countryCode" = 'DE';
```

**Check JSONB validity:**
```sql
-- Test JSONB parsing
SELECT
  "partnerProfileOCPI"->>'version' as version,
  jsonb_typeof("partnerProfileOCPI"->'serverCredentials') as creds_type
FROM "TenantPartners"
WHERE id = 5;
```

#### 4. Async Job Stuck

**Symptom:** Job never completes, offset not increasing

**Possible Causes:**
- Network error to partner
- Partner endpoint returning errors
- Database connection lost
- Job process crashed

**Solutions:**

```sql
-- Check job status
SELECT
  "jobId",
  "jobName",
  "createdAt",
  "finishedAt",
  "stoppedAt",
  "isFailed",
  "paginationParams",
  "totalObjects"
FROM "AsyncJobStatuses"
WHERE "finishedAt" IS NULL
ORDER BY "createdAt" DESC;

-- Manually stop stuck job
UPDATE "AsyncJobStatuses"
SET "stopScheduled" = true
WHERE "jobId" = '550e8400-...';

-- Or mark as failed
UPDATE "AsyncJobStatuses"
SET
  "isFailed" = true,
  "finishedAt" = NOW()
WHERE "jobId" = '550e8400-...';
```

**Resume stuck job:**
```sql
-- Reset pagination to retry
UPDATE "AsyncJobStatuses"
SET
  "paginationParams" = jsonb_set(
    "paginationParams",
    '{offset}',
    '0'::jsonb
  ),
  "isFailed" = false,
  "finishedAt" = NULL
WHERE "jobId" = '550e8400-...';
```

#### 5. Token Sync Returns No Data

**Symptom:** Async job completes but no authorizations created

**Possible Causes:**
- Partner has no tokens
- Date filter too restrictive
- Partner endpoint not implemented
- Authorization parsing error

**Solutions:**

```bash
# Test partner endpoint directly
curl -X GET \
  "https://emsp.com/ocpi/2.2.1/emsp/tokens?offset=0&limit=10" \
  -H "Authorization: Token emsp-token-123"
```

```sql
-- Check if authorizations were created
SELECT
  COUNT(*) as auth_count,
  tp."partyId",
  tp."countryCode"
FROM "Authorizations" a
JOIN "TenantPartners" tp ON a."tenantPartnerId" = tp.id
WHERE tp.id = 5
GROUP BY tp."partyId", tp."countryCode";
```

#### 6. Database Migration Errors

**Symptom:** OCPI tables not created

**Possible Causes:**
- Migrations not run
- Migration failed partway through
- Database permissions

**Solutions:**

```bash
# Check migration status
npm run migration:status

# Run migrations
npm run migration:up

# Check specific migration
npm run migration:show 20250714120500
```

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('Tenants', 'TenantPartners', 'AsyncJobStatuses');

-- Check table structure
\d "TenantPartners"
```

#### 7. CORS Errors

**Symptom:** Browser requests blocked by CORS policy

**Solution:**

OCPI servers typically don't serve browser requests. Ensure:
- Requests come from server-to-server
- If browser access needed, configure CORS in FastifyServer

```typescript
// Add CORS support (if needed)
server.register(require('@fastify/cors'), {
  origin: ['https://trusted-domain.com'],
  credentials: true
});
```

#### 8. Location Data Not Syncing

**Symptom:** eMSP not receiving location updates

**Possible Causes:**
- Push mechanism not implemented
- Partner endpoints not configured
- Status notifications not triggering updates

**Solutions:**

```sql
-- Check if partner has location endpoint
SELECT
  tp."partyId",
  tp."partnerProfileOCPI"->'endpoints' as endpoints
FROM "TenantPartners" tp
WHERE tp.id = 5;

-- Verify location data exists
SELECT
  l.id,
  l.name,
  COUNT(cs.id) as charging_stations
FROM "Locations" l
LEFT JOIN "ChargingStations" cs ON cs."locationId" = l.id
WHERE l."tenantId" = 1
GROUP BY l.id, l.name;
```

### Debugging Tips

#### Enable Debug Logging

```typescript
// In configuration
logLevel: 0,  // Trace level (most verbose)
```

#### Monitor Database Changes

```sql
-- Watch AsyncJobStatuses table
SELECT
  "jobId",
  "jobName",
  "paginationParams"->>'offset' as offset,
  "totalObjects",
  NOW() - "createdAt" as running_duration
FROM "AsyncJobStatuses"
WHERE "finishedAt" IS NULL
ORDER BY "createdAt" DESC;
```

#### Test OCPI Endpoints

```bash
# Test credentials endpoint
curl -X POST https://my-cpo.com:8085/ocpi/2.2.1/credentials \
  -H "Authorization: Token test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-token",
    "url": "https://emsp.com/ocpi/versions"
  }'

# Test versions endpoint
curl -X GET https://my-cpo.com:8085/ocpi/versions \
  -H "Authorization: Token partner-token"
```

### Performance Monitoring

```sql
-- Monitor authorization cache hit rate
SELECT
  COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '1 hour') as recent_auths,
  COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '24 hours') as daily_auths,
  tp."partyId"
FROM "Authorizations" a
JOIN "TenantPartners" tp ON a."tenantPartnerId" = tp.id
GROUP BY tp."partyId";

-- Monitor job completion times
SELECT
  "jobName",
  AVG(EXTRACT(EPOCH FROM ("finishedAt" - "createdAt"))) as avg_duration_seconds,
  COUNT(*) as completed_jobs
FROM "AsyncJobStatuses"
WHERE "finishedAt" IS NOT NULL
  AND "isFailed" = false
GROUP BY "jobName";
```

---

## Additional Resources

### OCPI Specification

- **OCPI 2.2.1 Specification:** https://github.com/ocpi/ocpi/releases/tag/2.2.1
- **OCPI GitHub:** https://github.com/ocpi/ocpi
- **OCPI Website:** https://evroaming.org/

### CitrineOS Documentation

- **Main Repository:** https://github.com/citrineos/citrineos-core
- **API Documentation:** Available via Swagger at `/docs` endpoint
- **OCPP Documentation:** See main README.md

### Related Standards

- **ISO 15118:** Plug & Charge protocol
- **OCPP 1.6/2.0.1:** Open Charge Point Protocol
- **ISO 3166-1:** Country codes
- **ISO 4217:** Currency codes

---

## Appendix

### A. OCPI Roles

| Role | Description | Example |
|------|-------------|---------|
| CPO | Charge Point Operator | Operates charging stations |
| EMSP | e-Mobility Service Provider | Provides charging services to EV drivers |
| HUB | Roaming Hub | Aggregates multiple CPOs/eMSPs |
| NAP | National Access Point | Government data hub |
| NSP | Navigation Service Provider | Provides routing to charging stations |
| SCSP | Smart Charging Service Provider | Manages smart charging |

### B. OCPI Modules

| Module | Sender | Receiver | Description |
|--------|--------|----------|-------------|
| Credentials | Both | Both | Partner registration |
| Locations | CPO | eMSP | Charging station locations |
| Tokens | eMSP | CPO | Authorization tokens |
| Sessions | CPO | eMSP | Charging sessions |
| CDRs | CPO | eMSP | Charge Detail Records |
| Tariffs | CPO | eMSP | Pricing information |
| Commands | eMSP | CPO | Remote commands |
| Charging Profiles | SCSP | CPO | Smart charging profiles |

### C. Database Schema Summary

```sql
-- Tenants table (CPO organizations)
CREATE TABLE "Tenants" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "url" VARCHAR(255),
  "partyId" VARCHAR(3) DEFAULT 'default',
  "countryCode" VARCHAR(2) DEFAULT 'US',
  "serverProfileOCPI" JSONB,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

-- TenantPartners table (OCPI partners)
CREATE TABLE "TenantPartners" (
  "id" SERIAL PRIMARY KEY,
  "partyId" VARCHAR(3) NOT NULL,
  "countryCode" VARCHAR(2) NOT NULL,
  "tenantId" INTEGER NOT NULL REFERENCES "Tenants"(id) ON DELETE CASCADE,
  "partnerProfileOCPI" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE ("tenantId", "partyId", "countryCode")
);

-- AsyncJobStatuses table (async operations)
CREATE TABLE "AsyncJobStatuses" (
  "jobId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "jobName" VARCHAR(50) NOT NULL,
  "tenantPartnerId" INTEGER NOT NULL REFERENCES "TenantPartners"(id),
  "tenantId" INTEGER NOT NULL REFERENCES "Tenants"(id),
  "finishedAt" TIMESTAMP,
  "stoppedAt" TIMESTAMP,
  "stopScheduled" BOOLEAN DEFAULT false,
  "isFailed" BOOLEAN DEFAULT false,
  "paginationParams" JSON NOT NULL,
  "totalObjects" INTEGER,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);
```

### D. Example Configuration

**Complete local.ts configuration with OCPI:**

```typescript
export function createLocalConfig() {
  return defineConfig({
    env: 'development',

    // Central System (OCPP server)
    centralSystem: {
      host: '::',
      port: 8080,
    },

    // OCPI Server
    ocpiServer: {
      host: '0.0.0.0',
      port: 8085,
    },

    // Modules configuration
    modules: {
      tenant: {
        endpointPrefix: '/tenant',
        responses: [],
        requests: [],
      },
      // ... other modules
    },

    // Utilities
    util: {
      cache: {
        memory: true,
      },
      messageBroker: {
        amqp: {
          url: 'amqp://guest:guest@localhost:5672',
          exchange: 'citrineos',
        },
      },
      authProvider: {
        localByPass: true,  // Disable for production!
      },
      swagger: {
        path: '/docs',
        exposeData: true,
        exposeMessage: true,
      },
    },

    logLevel: 2,  // 0=trace, 1=debug, 2=info, 3=warn, 4=error
  });
}
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-17
**CitrineOS Version:** Based on current main branch
**OCPI Version:** 2.2.1
