# IdToken-Based Authentication in CitrineOS Core (OCPP 1.6)

This document provides a comprehensive analysis of how idToken-based authentication works in the CitrineOS Core system for OCPP 1.6.

## Table of Contents

1. [Entry Points - Which Messages Trigger Authentication](#entry-points)
2. [IdToken Validation and Processing](#validation-and-processing)
3. [Authentication Flow](#authentication-flow)
4. [Differences Between OCPP 1.6 and 2.0.1](#differences-ocpp-versions)
5. [Database/Cache Interactions](#database-interactions)
6. [Key Files and Functions](#key-files)
7. [Authorization Status Types](#status-types)
8. [Configuration & Settings](#configuration)
9. [Request/Response Message Formats](#message-formats)
10. [Complete Authentication Flow Diagram](#flow-diagram)
11. [Error Handling](#error-handling)
12. [Tenant & Multi-Tenancy](#multi-tenancy)

---

## 1. Entry Points - Which Messages Trigger Authentication {#entry-points}

### OCPP 1.6 Authorization Entry Points

#### 1.1 Authorize Request
**Location:** `03_Modules/EVDriver/src/module/module.ts:735-818`

- **Handler:** `_handleOCPP16Authorize()`
- **Triggered when:** EV driver sends Authorize message before transaction
- **Contains:** Single idTag (string only, no type field in OCPP 1.6)

#### 1.2 StartTransaction Request
**Location:** `03_Modules/Transactions/src/module/module.ts:583-630`

- **Handler:** `_handleOcpp16StartTransaction()`
- **Triggered when:** Charging station initiates a transaction
- **Contains:** idTag field in request payload
- **Flow:** Authorization validation → Transaction creation

#### 1.3 RemoteStartTransaction Request

- **Handler:** Response handler only (request sent via API)
- **Contains:** idTag in request
- **Sent from:** CSMS to charging station (command)
- **Validation:** Occurs via Authorize or StartTransaction flows

#### 1.4 StopTransaction Request
**Location:** `03_Modules/Transactions/src/module/module.ts:632-732`

- **Handler:** `_handleOcpp16StopTransaction()`
- **Optional:** idTag field for additional authorization lookup
- **Used for:** Cost calculation and post-transaction authorization info

---

## 2. IdToken Validation and Processing {#validation-and-processing}

### 2.1 Database Query Process

**Location:** `01_Data/src/layers/sequelize/repository/Authorization.ts:20-66`

```typescript
// Authorization lookup queries
await this._authorizeRepository.readAllByQuerystring(tenantId, {
  idToken: request.idTag,
  type: null  // OCPP 1.6 ignores type field
});
```

**Query Construction Logic:**
- Searches Authorization table by `idToken` field (exact match)
- Ignores idTokenType for OCPP 1.6 (type parameter set to null)
- Returns array of matching Authorization records

### 2.2 Validation Steps in OCPP 1.6 Authorize Flow

**Handler Location:** `03_Modules/EVDriver/src/module/module.ts:735-818`

1. **Record Lookup:**
   - Query Authorization table with idToken
   - Expect exactly 1 record (error if 0 or >1)

2. **Status Check:**
   - If status is null → Accept (assumed valid)
   - If status is Accepted → Continue validation
   - If status is other (Blocked, Expired, Invalid, etc.) → Return that status

3. **Cache Expiry Check:**
   ```typescript
   if (cacheExpiryDateTime && new Date() > new Date(cacheExpiryDateTime)) {
     response.idTagInfo.status = OCPP1_6.AuthorizeResponseStatus.Expired;
   }
   ```

4. **Parent Authorization Lookup:**
   - If `groupAuthorizationId` exists, fetch parent Authorization
   - Include `parentIdTag` in response

5. **Authorizer Pipeline:**
   - Apply RealTimeAuthorizer and custom authorizers
   - Stops at first non-Accepted status

### 2.3 Database Schema

**Location:** `01_Data/src/layers/sequelize/model/Authorization/Authorization.ts`

Key fields:
```typescript
declare idToken: string;                        // The token itself
declare idTokenType?: IdTokenType | null;       // Token type (for OCPP 2.0.1)
declare status: AuthorizationStatusType;        // Current auth status
declare cacheExpiryDateTime?: string | null;    // Expiration timestamp
declare groupAuthorizationId?: number | null;   // Parent auth reference
declare concurrentTransaction?: boolean;        // Allow concurrent txns
declare allowedConnectorTypes?: string[];       // Type restrictions
declare disallowedEvseIdPrefixes?: string[];    // EVSE restrictions
declare realTimeAuthUrl?: string;               // Real-time auth endpoint
declare realTimeAuth?: AuthorizationWhitelistType; // Whitelist policy
```

---

## 3. Authentication Flow for OCPP 1.6 Messages {#authentication-flow}

### 3.1 Authorize Message Flow

```
Charging Station (Authorize Request with idTag)
        ↓
  EVDriver Module
  _handleOCPP16Authorize()
        ↓
  Query Authorization DB by idToken
        ↓
  Status check (null → Accepted, others → returned)
        ↓
  Cache expiry check (if expired → Expired status)
        ↓
  Parent ID lookup (if groupAuthorizationId exists)
        ↓
  Apply Authorizers Pipeline
        ├→ RealTimeAuthorizer (if configured)
        └→ Custom Authorizers
        ↓
  Return idTagInfo with final status
```

**Response Format:**
```typescript
{
  idTagInfo: {
    status: AuthorizeResponseStatus (Accepted|Blocked|Expired|Invalid),
    expiryDate?: string,        // From cacheExpiryDateTime
    parentIdTag?: string        // From parent authorization
  }
}
```

### 3.2 StartTransaction Message Flow

**Location:** `03_Modules/Transactions/src/module/module.ts:168-249`

```
Charging Station (StartTransaction Request with idTag + meterStart)
        ↓
  Transactions Module
  _handleOcpp16StartTransaction()
        ↓
  Call: authorizeOcpp16IdToken(context, idTag)
  TransactionService._AuthorizeOcpp16IdToken
        ↓
  Query Authorization DB by idToken
        ↓
  Authorization validation:
  ├→ No status → Accepted
  ├→ Non-Accepted status → Return that status
  ├→ Expired check (cache expiry)
  ├→ Concurrent transaction check
  └→ Apply authorizers pipeline
        ↓
  If Accepted: Create Transaction record
        ↓
  Return response with transactionId
```

**Authorization Checks Detail:**
- **Status mapping:** `AuthorizationStatusType` → `StartTransactionResponseStatus`
  - Accepted → Accepted
  - Blocked → Blocked
  - ConcurrentTx → ConcurrentTx
  - Expired → Expired
  - Invalid → Invalid

### 3.3 Concurrent Transaction Validation

**Location:** `03_Modules/Transactions/src/module/module.ts:328-339`

```typescript
private async _hasConcurrentTransactions(
  tenantId: number,
  authorizationId: number,
): Promise<boolean> {
  const activeTransactions = await this._transactionEventRepository
    .readAllActiveTransactionsByAuthorizationId(tenantId, authorizationId);
  return activeTransactions.length > 0;
}
```

Only applies if `authorization.concurrentTransaction === false` (default)

---

## 4. Differences Between OCPP 1.6 and 2.0.1 {#differences-ocpp-versions}

### OCPP 1.6 Characteristics

- **IdToken field:** String only (simple identifier)
- **Type field:** Not present in OCPP 1.6 specification
- **Supported messages:** Authorize, StartTransaction, RemoteStartTransaction, StopTransaction
- **Status values:** Accepted, Blocked, Expired, Invalid, ConcurrentTx
- **Response format:** Single idTagInfo with status, expiryDate, parentIdTag
- **Authorization locations:** Via Authorize message OR embedded in StartTransaction

### OCPP 2.0.1 Differences

- **IdToken field:** Complex object with:
  - `idToken`: string
  - `type`: IdTokenEnumType (Central, eMAID, ISO14443, ISO15693, KeyCode, Local, MacAddress, NoAuthorization)
  - `additionalInfo[]`: Optional array of additional identifiers
- **Type-aware lookups:** Query includes type field for precise matching
- **Message:** TransactionEvent (replaces StartTransaction)
- **Status values:** Additional statuses (NoCredit, NotAllowedTypeEVSE, NotAtThisLocation, NotAtThisTime, Unknown)
- **Response format:** More comprehensive IdTokenInfo with:
  - cacheExpiryDateTime
  - chargingPriority
  - language1, language2
  - personalMessage
  - groupIdToken (with nested idToken and type)

### Key Handler Differences

**OCPP 1.6 Authorize** (`03_Modules/EVDriver/src/module/module.ts:735-818`):
```typescript
const authorizations = await this._authorizeRepository.readAllByQuerystring(
  context.tenantId,
  { idToken: request.idTag, type: null }  // Type explicitly ignored
);
```

**OCPP 2.0.1 Authorize** (`03_Modules/EVDriver/src/module/module.ts:255-454`):
```typescript
const authorization = await this._authorizeRepository.readOnlyOneByQuerystring(
  context.tenantId,
  {
    idToken: request.idToken.idToken,
    type: request.idToken.type  // Type is part of lookup
  }
);
```

**OCPP 2.0.1 TransactionEvent** (`03_Modules/Transactions/src/module/module.ts:271-396`):
- Includes connector type and EVSE ID restrictions validation
- Uses `disallowedEvseIdPrefixes` and `allowedConnectorTypes`
- More granular location-based access control

---

## 5. Database/Cache Interactions {#database-interactions}

### 5.1 Authorization Repository

**Location:** `01_Data/src/layers/sequelize/repository/Authorization.ts`

Core methods:
```typescript
async readAllByQuerystring(
  tenantId: number,
  query: AuthorizationQuerystring
): Promise<Authorization[]>
// Returns: Array of matching Authorization records

async readOnlyOneByQuerystring(
  tenantId: number,
  query: AuthorizationQuerystring
): Promise<Authorization | undefined>
// Returns: Single Authorization or undefined
```

### 5.2 Real-Time Authorization Cache

**Location:** `02_Util/src/authorizer/RealTimeAuthorizer.ts`

Process:

1. **Whitelist Check:**
   - `AuthorizationWhitelistType.Allowed` → Skip real-time auth
   - `AuthorizationWhitelistType.AllowedOffline` → Accept if offline
   - `AuthorizationWhitelistType.Never` → Always check

2. **HTTP Request to Real-Time Auth URL:**
```typescript
const response = await fetch(authorization.realTimeAuthUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenantPartnerId: authorization.tenantPartnerId,
    idToken: authorization.idToken,
    idTokenType: authorization.idTokenType,
    locationId: chargingStation.locationId,
    stationId: context.stationId
  })
});
```

3. **Response Mapping:**
```
"ALLOWED" → Accepted
"BLOCKED" → Blocked
"EXPIRED" → Expired
"NO_CREDIT" → NoCredit
"NOT_ALLOWED" → NotAtThisLocation
```

### 5.3 Local Authorization List (OCPP 2.0.1)

**Location:** `03_Modules/EVDriver/src/module/LocalAuthListService.ts`

- Manages SendLocalList requests
- Validates list version numbers
- Prevents duplicate authorizations
- Enforces max list size constraints
- Updates local DB with provided authorizations

---

## 6. Key Files and Functions Summary {#key-files}

| Component | Location | Purpose |
|-----------|----------|---------|
| **OCPP 1.6 Authorize Handler** | `03_Modules/EVDriver/src/module/module.ts:735-818` | Main authorization entry point |
| **OCPP 1.6 StartTransaction Handler** | `03_Modules/Transactions/src/module/module.ts:583-630` | Transaction initiation with auth |
| **Authorization Service** | `03_Modules/Transactions/src/module/TransactionService.ts:168-249` | Core idToken validation logic |
| **Authorization DB Model** | `01_Data/src/layers/sequelize/model/Authorization/Authorization.ts` | Database schema |
| **Authorization Repository** | `01_Data/src/layers/sequelize/repository/Authorization.ts` | Data access layer |
| **OCPP 1.6 Mapper** | `01_Data/src/layers/sequelize/mapper/1.6/AuthorizationMapper.ts` | Status type conversions |
| **RealTimeAuthorizer** | `02_Util/src/authorizer/RealTimeAuthorizer.ts` | Real-time auth plugin |
| **OCPP 1.6 Models** | `00_Base/src/ocpp/model/1.6/types/` | Request/response types |
| **Authorization DTO** | `00_Base/src/interfaces/dto/authorization.dto.ts` | Data transfer object |

---

## 7. Authorization Status Types {#status-types}

**Defined in:** `00_Base/src/interfaces/dto/enum/index.ts`

```typescript
enum AuthorizationStatusType {
  Accepted = 'Accepted',              // Valid, can charge
  Blocked = 'Blocked',                // Explicitly blocked
  ConcurrentTx = 'ConcurrentTx',      // Already has active transaction
  Expired = 'Expired',                // Cache/token expired
  Invalid = 'Invalid',                // Unknown or invalid token
  NoCredit = 'NoCredit',              // No credit available (OCPP 2.0.1)
  NotAllowedTypeEVSE = 'NotAllowedTypeEVSE',    // Wrong EVSE type
  NotAtThisLocation = 'NotAtThisLocation',      // Location restricted
  NotAtThisTime = 'NotAtThisTime',              // Time restricted
  Unknown = 'Unknown'                 // Unknown status
}
```

---

## 8. Configuration & Settings {#configuration}

Key Authorization Configuration Parameters:

- **realTimeAuthUrl:** URL for real-time authorization checks
- **realTimeAuth:** Whitelist policy (Never, Allowed, AllowedOffline)
- **cacheExpiryDateTime:** When the authorization expires in local cache
- **concurrentTransaction:** Whether token can have multiple active transactions
- **allowedConnectorTypes:** Array of allowed connector types
- **disallowedEvseIdPrefixes:** EVSE ID prefixes that are NOT allowed
- **groupAuthorizationId:** Reference to parent/group authorization

---

## 9. Request/Response Message Formats {#message-formats}

### OCPP 1.6 Authorize Request
```json
{
  "idTag": "string"
}
```

### OCPP 1.6 Authorize Response
```json
{
  "idTagInfo": {
    "status": "Accepted|Blocked|Expired|Invalid|ConcurrentTx",
    "expiryDate": "2025-12-31T23:59:59Z",
    "parentIdTag": "string (optional)"
  }
}
```

### OCPP 1.6 StartTransaction Request
```json
{
  "connectorId": 1,
  "idTag": "string",
  "meterStart": 1000,
  "timestamp": "2025-11-11T10:00:00Z",
  "reservationId": 123
}
```

### OCPP 1.6 StartTransaction Response
```json
{
  "transactionId": 42,
  "idTagInfo": {
    "status": "Accepted|Blocked|Expired|Invalid|ConcurrentTx",
    "expiryDate": "2025-12-31T23:59:59Z",
    "parentIdTag": "string (optional)"
  }
}
```

---

## 10. Complete Authentication Flow Diagram {#flow-diagram}

```
EV Driver / Charging Station
        |
        | Authorize Request (idTag)
        v
    EVDriver Module
    _handleOCPP16Authorize()
        |
        +--→ DB Query: Authorization by idToken
        |
        +--→ Validation Checks:
        |    ├─ Record exists? (1 record required)
        |    ├─ Status check (null→Accept, others→return)
        |    ├─ Cache expired? (if yes→Expired)
        |    └─ Apply Authorizers
        |       └─ RealTimeAuthorizer
        |          └─ HTTP POST to realTimeAuthUrl
        |             └─ Map response to status
        |
        v
    Authorize Response
    (idTagInfo with status, expiryDate, parentIdTag)
        |
        |
        | StartTransaction Request (idTag + meterStart)
        v
    Transactions Module
    _handleOcpp16StartTransaction()
        |
        +--→ Call TransactionService.authorizeOcpp16IdToken()
        |
        +--→ Validation Checks:
        |    ├─ DB Query: Authorization by idToken
        |    ├─ Status check
        |    ├─ Cache expiry
        |    ├─ Concurrent transaction check
        |    └─ Apply authorizers
        |
        +--→ If Accepted:
        |    +--→ Create Transaction record
        |    +--→ Get transactionId
        |
        v
    StartTransaction Response
    (transactionId + idTagInfo)
        |
        |
        | Charging...
        |
        | StopTransaction Request
        v
    Transactions Module
    _handleOcpp16StopTransaction()
        |
        +--→ Optional: Query Authorization by idTag
        +--→ Record metrics (energy, cost)
        |
        v
    StopTransaction Response
    (optional idTagInfo)
```

---

## 11. Error Handling {#error-handling}

**Default Authorization Errors:**

- **0 authorizations found** → Invalid status
- **>1 authorizations found** → Invalid status (ambiguous)
- **Exception during lookup** → Invalid status (logged)
- **Cache expired** → Expired status
- **Real-time auth unreachable** → Depends on `AuthorizationWhitelistType`:
  - Never → Invalid (reject)
  - AllowedOffline → Accepted (offline fallback)
  - Allowed → Already whitelisted (skip auth)

---

## 12. Tenant & Multi-Tenancy {#multi-tenancy}

All queries are tenant-scoped:
```typescript
await this._authorizeRepository.readAllByQuerystring(
  tenantId,  // Tenant isolation
  { idToken: request.idTag, type: null }
);
```

Each authorization record includes:
- `tenantId`: Ownership
- `tenantPartnerId`: Optional reference to upstream partner (e.g., eMSP)

---

## Recent Changes

Based on recent commits, the `idTag` type was made **optional** to better support OCPP 1.6 (commit `0bcebac6`), improving compatibility with the specification.

---

## Summary

OCPP 1.6 uses simple string-based `idTag` identifiers with type-agnostic database lookups. The authentication flow validates tokens against the Authorization database, checks cache expiry, optionally performs real-time authorization via external HTTP endpoints, and returns status information that determines whether charging can proceed. This is simpler than OCPP 2.0.1, which uses structured idToken objects with type-specific validation and more granular access controls.
