# OCPP 1.6 to 2.x Migration Guide for CitrineOS

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Protocol Version Overview](#protocol-version-overview)
3. [Breaking Changes](#breaking-changes)
4. [Transaction Model Changes](#transaction-model-changes)
5. [Authorization Changes](#authorization-changes)
6. [Configuration Model Changes](#configuration-model-changes)
7. [Status Notification Changes](#status-notification-changes)
8. [Boot Process Changes](#boot-process-changes)
9. [Data Structure Changes](#data-structure-changes)
10. [Step-by-Step Migration Process](#step-by-step-migration-process)
11. [Testing and Validation](#testing-and-validation)
12. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## Executive Summary

Migrating a charging station from OCPP 1.6 to OCPP 2.0.1 is a **significant upgrade** that involves fundamental changes to how messages are structured, how transactions are managed, and how the charging station communicates with the Central System (now called CSMS - Charging Station Management System).

### Key Differences at a Glance

| Aspect | OCPP 1.6 | OCPP 2.0.1 | Impact |
|--------|----------|------------|--------|
| **Transaction Model** | StartTransaction/StopTransaction (separate messages) | TransactionEvent (unified with eventType) | **HIGH** - Complete redesign |
| **Authorization** | Simple idTag (string, max 20 chars) | IdToken object with type | **HIGH** - Structure change |
| **Configuration** | Key-value pairs (GetConfiguration/ChangeConfiguration) | Component/Variable model (GetVariables/SetVariables) | **HIGH** - Complete redesign |
| **Connector Identification** | connectorId (integer) | EVSE + Connector objects | **MEDIUM** - Structural change |
| **Status Reporting** | 9 status values | 5 status values (simplified) | **MEDIUM** - Mapping required |
| **Boot Process** | Simple with GetConfiguration | Complex with GetBaseReport | **MEDIUM** - Additional steps |
| **Authorization Statuses** | 5 statuses | 10 statuses (more granular) | **LOW** - Backward compatible |

---

## Protocol Version Overview

### OCPP 1.6 Characteristics
- **Released**: 2015
- **Message Count**: 31 operations
- **Architecture**: Simple request/response pattern
- **Configuration**: Flat key-value pairs
- **Transaction**: Sequential messages (Start → MeterValues → Stop)
- **Identification**: Connector-based (integer IDs)

### OCPP 2.0.1 Characteristics
- **Released**: 2020
- **Message Count**: 56 operations (significantly expanded)
- **Architecture**: Event-driven with rich metadata
- **Configuration**: Hierarchical Component/Variable model
- **Transaction**: Unified TransactionEvent with state machine
- **Identification**: EVSE + Connector hierarchy
- **New Features**: Device model, variable monitoring, certificate management, ISO 15118 support

---

## Breaking Changes

### 1. Transaction Messages (CRITICAL)

**OCPP 1.6:**
```json
// StartTransaction
{
  "connectorId": 1,
  "idTag": "RFID123",
  "meterStart": 0,
  "timestamp": "2023-01-01T00:00:00Z"
}

// StopTransaction
{
  "transactionId": 12345,
  "idTag": "RFID123",
  "meterStop": 25000,
  "timestamp": "2023-01-01T01:00:00Z"
}
```

**OCPP 2.0.1:**
```json
// TransactionEvent (replaces both Start and Stop)
{
  "eventType": "Started",  // or "Updated", "Ended"
  "timestamp": "2023-01-01T00:00:00Z",
  "triggerReason": "Authorized",
  "seqNo": 0,
  "transactionInfo": {
    "transactionId": "TXN-12345",
    "chargingState": "Charging"
  },
  "evse": {
    "id": 1,
    "connectorId": 1
  },
  "idToken": {
    "idToken": "RFID123",
    "type": "ISO14443"
  },
  "meterValue": [...]
}
```

**Migration Impact:**
- **Charger firmware MUST support TransactionEvent** instead of StartTransaction/StopTransaction
- **Transaction IDs change from integer to string**
- **Meter values are included in TransactionEvent** (no separate MeterValues messages during transaction lifecycle)
- **Sequence numbers required** for event ordering
- **21 trigger reasons** to indicate why the event was sent

### 2. Authorization Structure (CRITICAL)

**OCPP 1.6:**
```json
// Authorize Request
{
  "idTag": "RFID123"  // Simple string, max 20 characters
}

// Response
{
  "idTagInfo": {
    "status": "Accepted",  // Accepted, Blocked, Expired, Invalid, ConcurrentTx
    "expiryDate": "2024-12-31T23:59:59Z",
    "parentIdTag": "GROUP01"
  }
}
```

**OCPP 2.0.1:**
```json
// Authorize Request
{
  "idToken": {
    "idToken": "RFID123",
    "type": "ISO14443"  // REQUIRED: Central, eMAID, ISO14443, ISO15693, KeyCode, Local, MacAddress, NoAuthorization
  }
}

// Response
{
  "idTokenInfo": {
    "status": "Accepted",  // 10 possible statuses (see below)
    "cacheExpiryDateTime": "2024-12-31T23:59:59Z",
    "chargingPriority": 5,
    "language1": "en",
    "personalMessage": {...}
  }
}
```

**Authorization Statuses in 2.0.1:**
1. `Accepted` - Token is valid
2. `Blocked` - Token is blocked
3. `ConcurrentTx` - Token already in use
4. `Expired` - Token has expired
5. `Invalid` - Token is invalid
6. `NoCredit` - Insufficient credit (NEW)
7. `NotAllowedTypeEVSE` - Not allowed at this EVSE type (NEW)
8. `NotAtThisLocation` - Not allowed at this location (NEW)
9. `NotAtThisTime` - Not allowed at this time (NEW)
10. `Unknown` - Token unknown (NEW)

**Migration Impact:**
- **IdToken type MUST be specified** - chargers need to know what type of token they're using
- **More granular rejection reasons** allow better user feedback
- **No parentIdTag in 2.0.1** - group authorization handled differently

### 3. Configuration Model (CRITICAL)

**OCPP 1.6:**
```json
// GetConfiguration
{
  "key": ["HeartbeatInterval", "MeterValueSampleInterval"]
}

// Response
{
  "configurationKey": [
    {
      "key": "HeartbeatInterval",
      "readonly": false,
      "value": "300"
    }
  ]
}

// ChangeConfiguration
{
  "key": "HeartbeatInterval",
  "value": "600"
}
```

**OCPP 2.0.1:**
```json
// GetVariables
{
  "getVariableData": [
    {
      "component": {
        "name": "OCPPCommCtrlr"
      },
      "variable": {
        "name": "HeartbeatInterval"
      }
    }
  ]
}

// Response
{
  "getVariableResult": [
    {
      "attributeStatus": "Accepted",
      "component": {
        "name": "OCPPCommCtrlr"
      },
      "variable": {
        "name": "HeartbeatInterval"
      },
      "attributeValue": "300",
      "attributeType": "Actual"
    }
  ]
}

// SetVariables
{
  "setVariableData": [
    {
      "attributeValue": "600",
      "component": {
        "name": "OCPPCommCtrlr"
      },
      "variable": {
        "name": "HeartbeatInterval"
      }
    }
  ]
}
```

**Key Configuration Mapping Examples:**

| OCPP 1.6 Key | OCPP 2.0.1 Component | OCPP 2.0.1 Variable |
|--------------|---------------------|---------------------|
| HeartbeatInterval | OCPPCommCtrlr | HeartbeatInterval |
| MeterValueSampleInterval | SampledDataCtrlr | TxUpdatedInterval |
| ClockAlignedDataInterval | AlignedDataCtrlr | Interval |
| ConnectionTimeOut | OCPPCommCtrlr | NetworkConfigurationPriority |
| AuthorizeRemoteTxRequests | AuthCtrlr | AuthorizeRemoteStart |

**Migration Impact:**
- **Complete redesign of configuration structure** - flat key-value pairs become hierarchical
- **Component/Variable model** requires understanding the standardized component names
- **Configuration keys need to be mapped** - see OCPP 2.0.1 Appendix 2 for complete mapping
- **More metadata available** (dataType, mutability, characteristics)

### 4. Connector Identification (HIGH IMPACT)

**OCPP 1.6:**
```json
{
  "connectorId": 1  // Simple integer, 0 = charge point, 1+ = connectors
}
```

**OCPP 2.0.1:**
```json
{
  "evse": {
    "id": 1,              // EVSE ID (Electric Vehicle Supply Equipment)
    "connectorId": 1      // Connector within the EVSE (optional)
  }
}
```

**Conceptual Change:**
- **OCPP 1.6**: Flat connector list (connectorId: 1, 2, 3, 4)
- **OCPP 2.0.1**: Hierarchical structure (EVSE 1 with connectors 1,2; EVSE 2 with connectors 1,2)

**Migration Impact:**
- **Firmware must understand EVSE concept** - multiple connectors per EVSE
- **Simple mapping possible** for single-connector chargers: `connectorId: 1` → `evse: {id: 1}`
- **Complex mapping required** for multi-connector chargers

---

## Transaction Model Changes

### Transaction Lifecycle Comparison

**OCPP 1.6 Flow:**
```
1. Authorize (optional)
   → AuthorizeResponse

2. StartTransaction
   → StartTransactionResponse (includes transactionId)

3. MeterValues (periodic, during charging)
   → MeterValuesResponse

4. StopTransaction
   → StopTransactionResponse
```

**OCPP 2.0.1 Flow:**
```
1. Authorize (optional)
   → AuthorizeResponse

2. TransactionEvent (eventType: Started, seqNo: 0)
   → TransactionEventResponse

3. TransactionEvent (eventType: Updated, seqNo: 1, 2, 3...)
   → TransactionEventResponse (may include cost updates)

4. TransactionEvent (eventType: Ended, seqNo: n)
   → TransactionEventResponse (final cost)
```

### TransactionEvent Trigger Reasons (21 types)

Understanding trigger reasons is **critical** for proper transaction handling:

| Trigger Reason | Description | When to Send |
|----------------|-------------|--------------|
| **Authorized** | Token was authorized | After successful authorization |
| **CablePluggedIn** | Cable connected to vehicle | On cable detection |
| **ChargingRateChanged** | Charging power changed | When EVSE changes power |
| **ChargingStateChanged** | Charging state changed | On state machine transition |
| **Deauthorized** | Token was deauthorized | When authorization revoked |
| **EnergyLimitReached** | Energy limit hit | When configured limit reached |
| **EVCommunicationLost** | Lost communication with EV | On ISO 15118 disconnect |
| **EVConnectTimeout** | EV didn't connect in time | Timeout after authorization |
| **MeterValueClock** | Clock-aligned meter value | On clock interval |
| **MeterValuePeriodic** | Periodic meter value | On configured interval |
| **TimeLimitReached** | Time limit hit | When configured time reached |
| **Trigger** | CSMS triggered the event | In response to TriggerMessage |
| **UnlockCommand** | Unlock command received | After RemoteStopTransaction |
| **StopAuthorized** | Stop authorized by token | When stop token presented |
| **EVDeparted** | EV disconnected | Cable unplugged |
| **EVDetected** | EV detected | EV ready to charge |
| **RemoteStop** | Remote stop requested | CSMS sent RemoteStopTransaction |
| **RemoteStart** | Remote start requested | CSMS sent RemoteStartTransaction |
| **AbnormalCondition** | Error occurred | On fault condition |
| **SignedDataReceived** | Signed meter data available | For calibration law compliance |
| **ResetCommand** | Reset command received | Before/after reset |

### Transaction State Machine

**OCPP 2.0.1 Charging States** (in `transactionInfo.chargingState`):

1. **Charging** - Active power transfer
2. **EVConnected** - EV connected, not charging
3. **SuspendedEV** - EV requested pause
4. **SuspendedEVSE** - EVSE paused charging
5. **Idle** - No EV connected

### Implementation Changes Required

**In Charging Station Firmware:**

1. **Remove StartTransaction/StopTransaction handlers**
2. **Implement TransactionEvent handler** with:
   - Event type determination (Started/Updated/Ended)
   - Sequence number tracking
   - Trigger reason logic
   - Charging state tracking
   - Meter value inclusion in events

3. **Add sequence number management:**
```c
// Pseudo-code
int transaction_sequence = 0;

void send_transaction_started() {
    transaction_sequence = 0;
    send_transaction_event("Started", transaction_sequence++, "Authorized");
}

void send_meter_value() {
    send_transaction_event("Updated", transaction_sequence++, "MeterValuePeriodic");
}

void send_transaction_ended() {
    send_transaction_event("Ended", transaction_sequence++, "EVDeparted");
}
```

4. **Handle offline transaction buffering** - `offline` flag in TransactionEvent

**In CitrineOS (Already Implemented):**

✅ TransactionEvent handler: `03_Modules/Transactions/src/module/module.ts:271-396`
✅ Transaction creation/update: Repository handles Started/Updated/Ended events
✅ Cost calculation: Automatic for Updated and Ended events
✅ Meter value processing: Included in TransactionEvent
✅ Sequence validation: Events processed in order

---

## Authorization Changes

### IdToken Structure

**What Changed:**
- **OCPP 1.6**: `idTag` is a simple string
- **OCPP 2.0.1**: `idToken` is an object with `idToken` and `type`

### IdToken Types

Charging stations **MUST** specify the token type:

| Type | Description | Example Use Case |
|------|-------------|------------------|
| **Central** | Token from central system | Remote start operations |
| **eMAID** | e-Mobility Account ID | ISO 15118 Plug & Charge |
| **ISO14443** | RFID card (13.56 MHz) | Most RFID cards |
| **ISO15693** | RFID card (13.56 MHz) | Alternative RFID standard |
| **KeyCode** | PIN code | Keypad entry |
| **Local** | Locally stored token | Whitelist entries |
| **MacAddress** | MAC address | Wireless authorization |
| **NoAuthorization** | No auth required | Free charging |

### Authorization Status Mapping

**When maintaining backward compatibility:**

| Internal Status | OCPP 1.6 Response | OCPP 2.0.1 Response |
|-----------------|-------------------|---------------------|
| Accepted | `Accepted` | `Accepted` |
| Blocked | `Blocked` | `Blocked` |
| Expired | `Expired` | `Expired` |
| Invalid | `Invalid` | `Invalid` |
| ConcurrentTx | `ConcurrentTx` | `ConcurrentTx` |
| NoCredit | `Invalid` (mapped) | `NoCredit` |
| NotAllowedTypeEVSE | `Invalid` (mapped) | `NotAllowedTypeEVSE` |
| NotAtThisLocation | `Invalid` (mapped) | `NotAtThisLocation` |
| NotAtThisTime | `Invalid` (mapped) | `NotAtThisTime` |
| Unknown | `Invalid` (mapped) | `Unknown` |

**Implementation in CitrineOS:**

✅ Authorization mappers exist for both versions:
- `01_Data/src/layers/sequelize/mapper/1.6/AuthorizationMapper.ts`
- `01_Data/src/layers/sequelize/mapper/2.0.1/AuthorizationMapper.ts`

✅ Authorization logic handles both OCPP versions:
- `03_Modules/Transactions/src/module/TransactionService.ts:72-249`

### Charger Implementation Requirements

**OCPP 1.6 Authorize:**
```c
// Pseudo-code
void authorize() {
    char* rfid_tag = read_rfid();  // "RFID123"
    send_authorize(rfid_tag);
}
```

**OCPP 2.0.1 Authorize:**
```c
// Pseudo-code
void authorize() {
    char* rfid_tag = read_rfid();  // "RFID123"
    IdTokenType token_type = ISO14443;  // MUST determine token type
    send_authorize(rfid_tag, token_type);
}
```

**Critical Change:**
- **Token type detection required** - charger must identify whether it's reading ISO14443, ISO15693, KeyCode, etc.
- **Type stored in authorization database** - cannot be assumed

---

## Configuration Model Changes

### Component/Variable Model Explained

OCPP 2.0.1 introduces a **hierarchical device model** based on Components and Variables.

**Conceptual Structure:**
```
Charging Station
├── Component: OCPPCommCtrlr (OCPP Communication Controller)
│   ├── Variable: HeartbeatInterval
│   ├── Variable: NetworkConfigurationPriority
│   └── Variable: MessageTimeout
├── Component: SampledDataCtrlr (Sampled Data Controller)
│   ├── Variable: TxUpdatedInterval
│   └── Variable: TxEndedInterval
├── EVSE 1
│   ├── Component: PowerSwitch
│   │   └── Variable: Available
│   └── Connector 1
│       ├── Component: Connector
│       │   └── Variable: Available
│       └── Component: EvseManager
│           └── Variable: ChargeProtocol
└── EVSE 2
    └── ...
```

### Standard Components (from OCPP 2.0.1 Part 2)

Key components every charging station should support:

| Component | Purpose | Key Variables |
|-----------|---------|---------------|
| **OCPPCommCtrlr** | OCPP communication | HeartbeatInterval, WebSocketPingInterval |
| **SecurityCtrlr** | Security settings | BasicAuthPassword, SecurityProfile |
| **AuthCtrlr** | Authorization control | AuthorizeRemoteStart, LocalAuthorizeOffline |
| **ClockCtrlr** | Time management | DateTime, TimeZone |
| **SampledDataCtrlr** | Meter value sampling | TxUpdatedInterval, TxEndedInterval |
| **AlignedDataCtrlr** | Clock-aligned data | Interval, Measurands |
| **SmartChargingCtrlr** | Smart charging | ChargingScheduleChargingRateUnit |
| **TxCtrlr** | Transaction control | StopTxOnEVSideDisconnect, MaxEnergyOnInvalidId |

### Variable Attributes

Each variable can have multiple attributes:

| Attribute Type | Description | Example |
|----------------|-------------|---------|
| **Actual** | Current value | `HeartbeatInterval: 300` |
| **Target** | Desired value (for writable vars) | `HeartbeatInterval: 600` (pending) |
| **MinSet** | Minimum allowed value | `HeartbeatInterval: 60` |
| **MaxSet** | Maximum allowed value | `HeartbeatInterval: 3600` |

### Variable Characteristics

Metadata about each variable:

```json
{
  "component": {"name": "OCPPCommCtrlr"},
  "variable": {"name": "HeartbeatInterval"},
  "variableCharacteristics": {
    "dataType": "integer",
    "unit": "s",
    "minLimit": 60,
    "maxLimit": 3600,
    "supportsMonitoring": true
  },
  "variableAttribute": [
    {
      "type": "Actual",
      "value": "300",
      "mutability": "ReadWrite",
      "persistent": true
    }
  ]
}
```

### Boot Process and GetBaseReport

**OCPP 1.6 Boot Sequence:**
```
1. BootNotification
   → BootNotificationResponse (status: Accepted)

2. GetConfiguration (if status: Pending)
   → GetConfigurationResponse

3. ChangeConfiguration (multiple messages)
   → ChangeConfigurationResponse
```

**OCPP 2.0.1 Boot Sequence:**
```
1. BootNotification (reason: PowerUp)
   → BootNotificationResponse (status: Accepted or Pending)

2. GetBaseReport (if status: Pending)
   Request:
   {
     "requestId": 1,
     "reportBase": "FullInventory"  // or "ConfigurationInventory", "SummaryInventory"
   }

3. NotifyReport (multiple messages, can be very large)
   Request (from charger):
   {
     "requestId": 1,
     "generatedAt": "2023-01-01T00:00:00Z",
     "seqNo": 0,
     "tbc": true,  // "to be continued" - more messages coming
     "reportData": [
       {
         "component": {"name": "OCPPCommCtrlr"},
         "variable": {"name": "HeartbeatInterval"},
         "variableAttribute": [...],
         "variableCharacteristics": {...}
       }
     ]
   }

4. SetVariables (after receiving all NotifyReport messages)
   {
     "setVariableData": [...]
   }
```

**Key Differences:**

1. **GetBaseReport replaces GetConfiguration**
   - `reportBase` parameter determines what to report:
     - `FullInventory`: All components, variables, and characteristics
     - `ConfigurationInventory`: Only configuration variables
     - `SummaryInventory`: Component list only

2. **NotifyReport is sent BY THE CHARGER** (reversed direction)
   - Can span multiple messages (tbc flag)
   - Much richer information than GetConfiguration response

3. **Report sequencing** with seqNo and tbc flags

### Configuration Key Mapping Table

**Critical mappings for common configurations:**

| OCPP 1.6 Key | OCPP 2.0.1 Location | Notes |
|--------------|---------------------|-------|
| `HeartbeatInterval` | OCPPCommCtrlr.HeartbeatInterval | Direct mapping |
| `MeterValueSampleInterval` | SampledDataCtrlr.TxUpdatedInterval | Renamed |
| `MeterValuesSampledData` | SampledDataCtrlr.TxUpdatedMeasurands | Format changed |
| `ClockAlignedDataInterval` | AlignedDataCtrlr.Interval | Direct mapping |
| `StopTransactionOnInvalidId` | TxCtrlr.StopTxOnInvalidId | Direct mapping |
| `AuthorizeRemoteTxRequests` | AuthCtrlr.AuthorizeRemoteStart | Renamed |
| `LocalAuthorizeOffline` | AuthCtrlr.LocalAuthorizeOffline | Direct mapping |
| `NumberOfConnectors` | N/A (use EVSE count) | Structural change |
| `WebSocketPingInterval` | OCPPCommCtrlr.WebSocketPingInterval | Direct mapping |

**Complete mapping available in:** OCPP 2.0.1 specification, Appendix 2

### Charger Firmware Requirements

**Must Implement:**

1. **GetBaseReport handler**
   - Generate device model inventory
   - Support all three report bases (FullInventory, ConfigurationInventory, SummaryInventory)
   - Handle requestId for correlation

2. **NotifyReport sender**
   - Send complete device model
   - Implement message chunking (tbc flag)
   - Maintain seqNo sequence
   - Handle large reports (can be 100+ components)

3. **SetVariables handler**
   - Apply configuration changes to components
   - Return status for each variable (Accepted, Rejected, NotSupportedAttributeType, etc.)
   - Persist changes if variable is persistent

4. **GetVariables handler**
   - Return current values for requested variables
   - Support attribute types (Actual, Target, MinSet, MaxSet)

**Example SetVariables Response:**
```json
{
  "setVariableResult": [
    {
      "attributeStatus": "Accepted",
      "component": {"name": "OCPPCommCtrlr"},
      "variable": {"name": "HeartbeatInterval"}
    },
    {
      "attributeStatus": "RebootRequired",
      "component": {"name": "SecurityCtrlr"},
      "variable": {"name": "SecurityProfile"}
    },
    {
      "attributeStatus": "Rejected",
      "component": {"name": "OCPPCommCtrlr"},
      "variable": {"name": "NetworkConfigurationPriority"},
      "attributeStatusInfo": {
        "reasonCode": "OutOfRange"
      }
    }
  ]
}
```

---

## Status Notification Changes

### Connector Status Mapping

**OCPP 1.6 has 9 connector statuses:**

| Status | Description |
|--------|-------------|
| `Available` | Ready to charge |
| `Preparing` | Preparing to charge (after authorization) |
| `Charging` | Actively charging |
| `SuspendedEVSE` | EVSE paused charging |
| `SuspendedEV` | EV requested pause |
| `Finishing` | Charging stopped, finalizing |
| `Reserved` | Reserved for specific user |
| `Unavailable` | Out of service |
| `Faulted` | Error condition |

**OCPP 2.0.1 has 5 connector statuses (SIMPLIFIED):**

| Status | Description | Maps from 1.6 |
|--------|-------------|---------------|
| `Available` | Ready to charge | Available |
| `Occupied` | In use | Preparing, Charging, SuspendedEVSE, SuspendedEV, Finishing |
| `Reserved` | Reserved | Reserved |
| `Unavailable` | Out of service | Unavailable |
| `Faulted` | Error condition | Faulted |

**Key Change:** OCPP 2.0.1 **simplified** connector statuses - detailed charging state is now in `TransactionEvent.transactionInfo.chargingState`

### Status Notification Message Changes

**OCPP 1.6:**
```json
{
  "connectorId": 1,
  "errorCode": "NoError",
  "status": "Charging",
  "timestamp": "2023-01-01T00:00:00Z",
  "info": "Charging at 7.4kW",
  "vendorId": "VendorX",
  "vendorErrorCode": "0"
}
```

**OCPP 2.0.1:**
```json
{
  "timestamp": "2023-01-01T00:00:00Z",
  "connectorStatus": "Occupied",
  "evseId": 1,
  "connectorId": 1
}
```

**Changes:**
- **No errorCode** - errors reported differently in 2.0.1 (NotifyEvent)
- **No info/vendorId/vendorErrorCode** - use NotifyEvent for detailed diagnostics
- **evseId added** - hierarchical identification
- **Simpler** - just status, timestamp, and location

### Error Reporting Changes

**OCPP 1.6:** Errors reported in StatusNotification.errorCode

**OCPP 2.0.1:** Errors reported via **NotifyEvent** message

```json
{
  "generatedAt": "2023-01-01T00:00:00Z",
  "seqNo": 0,
  "eventData": [
    {
      "eventId": 1,
      "timestamp": "2023-01-01T00:00:00Z",
      "trigger": "Alerting",
      "actualValue": "OverCurrentFailure",
      "eventNotificationType": "HardWiredNotification",
      "component": {"name": "Connector", "evse": {"id": 1, "connectorId": 1}},
      "variable": {"name": "Problem"}
    }
  ]
}
```

---

## Boot Process Changes

### BootNotification Request Changes

**OCPP 1.6:**
```json
{
  "chargePointVendor": "VendorX",
  "chargePointModel": "Model-ABC",
  "chargePointSerialNumber": "SN123456",
  "chargeBoxSerialNumber": "CB123456",
  "firmwareVersion": "1.0.0",
  "iccid": "89012345678901234567",
  "imsi": "310150123456789",
  "meterType": "EnergyMeter",
  "meterSerialNumber": "EM123456"
}
```

**OCPP 2.0.1:**
```json
{
  "reason": "PowerUp",  // or "FirmwareUpdate", "RemoteReset", "LocalReset", "ScheduledReset", "Triggered", "Unknown", "Watchdog"
  "chargingStation": {
    "model": "Model-ABC",
    "vendorName": "VendorX",
    "serialNumber": "SN123456",
    "firmwareVersion": "2.0.0",
    "modem": {
      "iccid": "89012345678901234567",
      "imsi": "310150123456789"
    }
  }
}
```

**Changes:**
- **Boot reason required** - why is the charger booting?
- **Structure nested** - chargingStation object
- **Modem info nested** - if applicable
- **No meterType/meterSerialNumber** - this info in device model instead

### BootNotification Response Changes

**OCPP 1.6:**
```json
{
  "status": "Accepted",  // or "Pending", "Rejected"
  "currentTime": "2023-01-01T00:00:00Z",
  "interval": 300  // Heartbeat interval if Accepted, retry interval if Pending/Rejected
}
```

**OCPP 2.0.1:**
```json
{
  "status": "Accepted",  // or "Pending", "Rejected"
  "currentTime": "2023-01-01T00:00:00Z",
  "interval": 300,
  "statusInfo": {
    "reasonCode": "ConfigurationPending",
    "additionalInfo": "Configuration will be sent after GetBaseReport"
  }
}
```

**Changes:**
- **StatusInfo added** - more context for Pending/Rejected
- **Semantics same** - status meanings unchanged

### Boot Status Management

**Implementation in CitrineOS (same for both versions):**

✅ `03_Modules/Configuration/src/module/BootNotificationService.ts`
- OCPP 1.6: `determineOcpp16BootStatus()` (lines 227-257)
- OCPP 2.0.1: `determineOcpp201BootStatus()` (lines 276-306)

**Boot Status Logic:**

1. **Accepted**: Charger fully configured, ready to operate
2. **Pending**: Configuration needed, will send GetConfiguration (1.6) or GetBaseReport (2.0.1)
3. **Rejected**: Charger not allowed to connect

**Action Blacklisting:**

When boot status is **Pending** or **Rejected**, CitrineOS blacklists all charger operations except BootNotification.

✅ Implementation: `03_Modules/Configuration/src/module/BootNotificationService.ts:286-319`

---

## Data Structure Changes

### Common Data Type Changes

| Data | OCPP 1.6 | OCPP 2.0.1 | Migration Notes |
|------|----------|------------|-----------------|
| **Transaction ID** | Integer | String | Change data type in charger |
| **Timestamps** | ISO 8601 string | ISO 8601 string | No change |
| **Connector ID** | Integer | Integer (within EVSE) | Add EVSE hierarchy |
| **Meter Value** | Array of MeterValue | Array of MeterValue | Structure slightly different |
| **IdTag** | String (max 20 chars) | IdToken object | Structure change required |
| **Custom Data** | Not standard | customData field | Optional extension point |

### MeterValue Changes

**OCPP 1.6:**
```json
{
  "timestamp": "2023-01-01T00:00:00Z",
  "sampledValue": [
    {
      "value": "12.5",
      "context": "Sample.Periodic",
      "format": "Raw",
      "measurand": "Energy.Active.Import.Register",
      "phase": "L1",
      "location": "Outlet",
      "unit": "Wh"
    }
  ]
}
```

**OCPP 2.0.1:**
```json
{
  "timestamp": "2023-01-01T00:00:00Z",
  "sampledValue": [
    {
      "value": 12.5,  // Number, not string
      "context": "Sample.Periodic",
      "measurand": "Energy.Active.Import.Register",
      "phase": "L1",
      "location": "Outlet",
      "unitOfMeasure": {
        "unit": "Wh",
        "multiplier": 0  // 10^0 = 1
      },
      "signedMeterValue": {
        "signedMeterData": "...",
        "signingMethod": "ECDSA",
        "encodingMethod": "Base64",
        "publicKey": "..."
      }
    }
  ]
}
```

**Changes:**
- **Value is number** (not string) in 2.0.1
- **No format field** in 2.0.1
- **unitOfMeasure is object** with multiplier
- **Signed meter values** supported for calibration law compliance

### Measurand Standardization

Both versions support similar measurands, but 2.0.1 has more:

**Common measurands:**
- Energy.Active.Import.Register (kWh consumed)
- Power.Active.Import (kW)
- Current.Import (A)
- Voltage (V)
- SoC (State of Charge, %)
- Temperature (°C)

**New in 2.0.1:**
- Energy.Reactive.Import.Register
- Energy.Active.Export.Register
- Power.Active.Export
- Frequency
- And more...

---

## Step-by-Step Migration Process

### Phase 1: Assessment and Planning

**1. Inventory Current Implementation**

Document your OCPP 1.6 implementation:
- [ ] Which messages are implemented?
- [ ] Which configuration keys are used?
- [ ] How many connectors per charger?
- [ ] What IdToken types are used? (assume ISO14443 for RFID if unknown)
- [ ] Is offline transaction buffering used?
- [ ] Are reservations used?
- [ ] Is smart charging (charging profiles) used?

**2. Map Configuration Keys**

Create a mapping table for your configuration:

| Current 1.6 Key | 2.0.1 Component | 2.0.1 Variable | Priority |
|-----------------|-----------------|----------------|----------|
| HeartbeatInterval | OCPPCommCtrlr | HeartbeatInterval | HIGH |
| MeterValueSampleInterval | SampledDataCtrlr | TxUpdatedInterval | HIGH |
| ... | ... | ... | ... |

**3. Identify Hardware Constraints**

- Can firmware be updated?
- What is the charger's computational capacity?
- Can the charger handle GetBaseReport (large reports)?
- Does the charger support TLS 1.2+ (required for OCPP 2.0.1)?

### Phase 2: Firmware Development

**1. Implement Device Model**

Create the hierarchical Component/Variable structure:

```c
// Pseudo-code
struct Component {
    char* name;
    int evseId;  // Optional
    int connectorId;  // Optional
};

struct Variable {
    char* name;
    char* instance;  // Optional
};

struct VariableAttribute {
    enum AttributeType type;  // Actual, Target, MinSet, MaxSet
    char* value;
    enum Mutability mutability;  // ReadOnly, WriteOnly, ReadWrite
    bool persistent;
};

// Example device model
Component ocppCommCtrlr = {"OCPPCommCtrlr", 0, 0};
Variable heartbeatInterval = {"HeartbeatInterval", NULL};
VariableAttribute heartbeatActual = {ACTUAL, "300", READ_WRITE, true};
```

**2. Implement TransactionEvent**

Replace StartTransaction/StopTransaction:

```c
// Pseudo-code
void send_transaction_event(EventType type, int seqNo, TriggerReason reason) {
    TransactionEvent event;
    event.eventType = type;
    event.timestamp = get_current_time();
    event.triggerReason = reason;
    event.seqNo = seqNo;
    event.transactionInfo.transactionId = current_transaction_id;
    event.transactionInfo.chargingState = get_charging_state();
    event.evse.id = 1;
    event.evse.connectorId = 1;

    if (type == STARTED || type == ENDED) {
        event.idToken.idToken = current_rfid_token;
        event.idToken.type = ISO14443;
    }

    if (type == UPDATED || type == ENDED) {
        event.meterValue = get_current_meter_values();
    }

    send_ocpp_message("TransactionEvent", &event);
}
```

**3. Implement GetBaseReport/NotifyReport**

```c
// Pseudo-code
void handle_get_base_report(GetBaseReportRequest* req) {
    ReportBase reportBase = req->reportBase;

    // Generate report data
    ReportData* reportData = generate_device_model(reportBase);
    int totalItems = count_report_items(reportData);
    int itemsPerMessage = 50;  // Chunk size
    int seqNo = 0;

    // Send in chunks
    for (int offset = 0; offset < totalItems; offset += itemsPerMessage) {
        NotifyReportRequest notify;
        notify.requestId = req->requestId;
        notify.generatedAt = get_current_time();
        notify.seqNo = seqNo++;
        notify.tbc = (offset + itemsPerMessage < totalItems);
        notify.reportData = get_report_chunk(reportData, offset, itemsPerMessage);

        send_ocpp_message("NotifyReport", &notify);
    }
}
```

**4. Implement SetVariables/GetVariables**

```c
// Pseudo-code
void handle_set_variables(SetVariablesRequest* req) {
    SetVariablesResponse response;

    for (int i = 0; i < req->setVariableDataCount; i++) {
        SetVariableData* data = &req->setVariableData[i];
        SetVariableResult result;

        // Find component and variable
        Component* component = find_component(data->component.name);
        Variable* variable = find_variable(component, data->variable.name);

        if (variable == NULL) {
            result.attributeStatus = UNKNOWN_VARIABLE;
        } else if (!is_writable(variable)) {
            result.attributeStatus = REJECTED;
        } else {
            // Apply the change
            set_variable_value(variable, data->attributeValue);
            result.attributeStatus = ACCEPTED;

            // Check if reboot required
            if (requires_reboot(variable)) {
                result.attributeStatus = REBOOT_REQUIRED;
            }
        }

        result.component = data->component;
        result.variable = data->variable;
        response.setVariableResult[i] = result;
    }

    send_ocpp_response("SetVariables", &response);
}
```

**5. Update Authorization**

Add IdToken type support:

```c
// Pseudo-code
void handle_rfid_scan() {
    char* token = read_rfid();
    IdTokenType type = determine_token_type(token);  // NEW: detect type

    AuthorizeRequest req;
    req.idToken.idToken = token;
    req.idToken.type = type;

    send_ocpp_message("Authorize", &req);
}

IdTokenType determine_token_type(char* token) {
    // Logic to determine token type based on card technology
    // For most RFID cards: ISO14443
    // This depends on your RFID reader hardware

    if (is_iso14443_card()) {
        return ISO14443;
    } else if (is_iso15693_card()) {
        return ISO15693;
    } else {
        return LOCAL;  // Default
    }
}
```

**6. Update BootNotification**

Add boot reason:

```c
// Pseudo-code
void send_boot_notification(BootReason reason) {
    BootNotificationRequest req;
    req.reason = reason;  // NEW in 2.0.1
    req.chargingStation.model = "Model-ABC";
    req.chargingStation.vendorName = "VendorX";
    req.chargingStation.serialNumber = get_serial_number();
    req.chargingStation.firmwareVersion = "2.0.0";

    if (has_modem()) {
        req.chargingStation.modem.iccid = get_iccid();
        req.chargingStation.modem.imsi = get_imsi();
    }

    send_ocpp_message("BootNotification", &req);
}

void on_power_up() {
    send_boot_notification(POWER_UP);
}

void on_firmware_update_complete() {
    send_boot_notification(FIRMWARE_UPDATE);
}
```

**7. Update StatusNotification**

Simplify status handling:

```c
// Pseudo-code mapping
ConnectorStatus map_to_ocpp201_status(ChargerState state) {
    switch (state) {
        case IDLE:
            return AVAILABLE;
        case AUTHORIZED:
        case PREPARING:
        case CHARGING:
        case SUSPENDED_EV:
        case SUSPENDED_EVSE:
        case FINISHING:
            return OCCUPIED;
        case RESERVED:
            return RESERVED;
        case UNAVAILABLE:
            return UNAVAILABLE;
        case FAULTED:
            return FAULTED;
        default:
            return UNAVAILABLE;
    }
}

void send_status_notification(ChargerState state) {
    StatusNotificationRequest req;
    req.timestamp = get_current_time();
    req.connectorStatus = map_to_ocpp201_status(state);
    req.evseId = 1;
    req.connectorId = 1;

    send_ocpp_message("StatusNotification", &req);
}
```

### Phase 3: Testing

**1. Unit Testing**

Test individual message handlers:
- [ ] BootNotification with all boot reasons
- [ ] GetBaseReport with all report bases
- [ ] NotifyReport chunking (test with >100 components)
- [ ] SetVariables with valid and invalid data
- [ ] GetVariables with different attribute types
- [ ] TransactionEvent with all event types and trigger reasons
- [ ] Authorize with all IdToken types
- [ ] StatusNotification with all statuses

**2. Integration Testing with CitrineOS**

Test complete flows:
- [ ] Boot sequence (BootNotification → GetBaseReport → NotifyReport → SetVariables)
- [ ] Authorization (Authorize → TransactionEvent Started)
- [ ] Transaction (Started → Updated → Ended)
- [ ] Configuration changes (SetVariables → Reboot → BootNotification)
- [ ] Status changes (StatusNotification)
- [ ] Error conditions (NotifyEvent)
- [ ] Offline transaction buffering
- [ ] Concurrent transactions (if supported)

**3. Conformance Testing**

Use OCPP 2.0.1 conformance tests:
- OCA (Open Charge Alliance) test suite
- Verify all required messages implemented
- Verify all required components in device model
- Test interoperability with other CSMS systems

**4. Field Testing**

Deploy to test chargers:
- [ ] Monitor for 48 hours continuous operation
- [ ] Test real charging sessions
- [ ] Test network interruptions
- [ ] Test firmware updates
- [ ] Test configuration changes
- [ ] Monitor memory usage and performance

### Phase 4: Deployment

**1. Gradual Rollout**

- Start with 5-10 chargers in controlled environment
- Monitor for 1 week
- Expand to 10% of fleet
- Monitor for 2 weeks
- Full rollout

**2. Monitoring**

Set up monitoring for:
- Message success rates
- Transaction completion rates
- Authorization failures
- Configuration synchronization
- Boot failures
- Network connectivity

**3. Rollback Plan**

Prepare rollback procedure:
- Keep OCPP 1.6 firmware available
- Document rollback process
- Test rollback on dev charger
- Have support team ready

---

## Testing and Validation

### Test Scenarios

**Scenario 1: Basic Transaction**
```
1. Boot charger → BootNotification (reason: PowerUp)
2. CSMS sends GetBaseReport
3. Charger sends NotifyReport (multiple messages)
4. CSMS sends SetVariables
5. Scan RFID → Authorize (idToken with type)
6. Plug in cable → TransactionEvent (Started, reason: Authorized)
7. Charging begins → TransactionEvent (Updated, reason: ChargingStateChanged)
8. Periodic meter → TransactionEvent (Updated, reason: MeterValuePeriodic)
9. Unplug cable → TransactionEvent (Ended, reason: EVDeparted)
```

**Scenario 2: Remote Start**
```
1. CSMS sends RemoteStartTransaction (with idToken)
2. Charger authorizes token internally
3. Charger sends TransactionEvent (Started, reason: RemoteStart)
4. User plugs in → TransactionEvent (Updated, reason: CablePluggedIn)
5. Charging → TransactionEvent (Updated, reason: ChargingStateChanged)
6. Complete → TransactionEvent (Ended, reason: EnergyLimitReached)
```

**Scenario 3: Configuration Change**
```
1. CSMS sends GetVariables (OCPPCommCtrlr.HeartbeatInterval)
2. Charger responds with current value
3. CSMS sends SetVariables (new value: 600)
4. Charger responds (status: Accepted or RebootRequired)
5. If RebootRequired: charger reboots → BootNotification (reason: LocalReset)
6. CSMS sends GetVariables to verify
```

**Scenario 4: Error Handling**
```
1. Charger detects overcurrent fault
2. Charger sends StatusNotification (status: Faulted)
3. Charger sends NotifyEvent (Problem: OverCurrentFailure)
4. Charging stopped → TransactionEvent (Ended, reason: AbnormalCondition)
5. Fault cleared → StatusNotification (status: Available)
```

### Validation Checklist

**Message Implementation:**
- [ ] All OCPP 2.0.1 Core Profile messages implemented
- [ ] Message validation against JSON schemas
- [ ] Error handling for invalid messages
- [ ] Response timeout handling

**Transaction Handling:**
- [ ] TransactionEvent sequence numbers correct
- [ ] All trigger reasons implemented
- [ ] Charging state correctly tracked
- [ ] Offline transaction buffering
- [ ] Meter values included in events

**Authorization:**
- [ ] IdToken type detection working
- [ ] All authorization statuses handled
- [ ] Cache expiry honored
- [ ] Concurrent transaction check

**Configuration:**
- [ ] Device model complete (all required components)
- [ ] GetBaseReport generates correct inventory
- [ ] NotifyReport chunking works (tested with large reports)
- [ ] SetVariables applies changes correctly
- [ ] Reboot required flag handled
- [ ] Persistent variables survive reboot

**Boot Process:**
- [ ] Boot reasons correct (PowerUp, FirmwareUpdate, etc.)
- [ ] GetBaseReport response sent promptly
- [ ] NotifyReport completes fully (tbc flag handling)
- [ ] Accepts SetVariables during boot

**Status Reporting:**
- [ ] Connector status mapping correct
- [ ] EVSE hierarchy correct
- [ ] Error reporting via NotifyEvent
- [ ] Status changes timely

---

## Troubleshooting Common Issues

### Issue 1: ChargeStation Keeps Getting "Pending" Boot Status

**Symptoms:**
- BootNotification returns status: Pending
- GetBaseReport is sent but NotifyReport doesn't complete
- Charger retries BootNotification

**Causes:**
1. NotifyReport not sent or incomplete (tbc flag stuck at true)
2. NotifyReport missing required components
3. CSMS waiting for configuration that never arrives

**Solutions:**
- Verify NotifyReport seqNo sequence is correct
- Ensure last NotifyReport has tbc: false
- Check logs for NotifyReport errors
- Verify all required components are in report:
  - OCPPCommCtrlr
  - SecurityCtrlr
  - AuthCtrlr
  - ClockCtrlr
  - SampledDataCtrlr
  - (others depending on feature profile)

### Issue 2: Transactions Not Starting

**Symptoms:**
- TransactionEvent (Started) sent but no response
- Or response has idTokenInfo.status: Invalid

**Causes:**
1. IdToken type not set or incorrect
2. IdToken not authorized in CSMS
3. Sequence number issue
4. Missing required fields (evse, transactionInfo)

**Solutions:**
- Verify idToken.type is set correctly (not null)
- Check authorization exists in CSMS database
- Verify transactionInfo.transactionId is unique
- Ensure evse.id is correct
- Check sequence number starts at 0

### Issue 3: SetVariables Always Returns "UnknownComponent"

**Symptoms:**
- SetVariables fails with attributeStatus: UnknownComponent or UnknownVariable

**Causes:**
1. Component not in NotifyReport
2. Component name spelling mismatch
3. Case sensitivity issue

**Solutions:**
- Cross-reference SetVariables request with NotifyReport data
- Verify exact component/variable names (case-sensitive)
- Check for extra spaces or special characters
- Ensure component was included in GetBaseReport response

### Issue 4: Large NotifyReport Causes Timeout

**Symptoms:**
- GetBaseReport times out
- NotifyReport messages too large
- Memory issues on charger

**Causes:**
1. Too many items per NotifyReport message
2. Not chunking report properly
3. CSMS message size limit exceeded

**Solutions:**
- Reduce items per NotifyReport (try 20-50 items)
- Implement proper chunking with tbc flag
- Use reportBase: ConfigurationInventory instead of FullInventory initially
- Send NotifyReport messages sequentially, not all at once

### Issue 5: Meter Values Not Appearing in Transactions

**Symptoms:**
- TransactionEvent.meterValue is empty or null
- Cost calculation fails in CSMS

**Causes:**
1. Meter values not included in Updated/Ended events
2. MeterValue format incorrect (value should be number, not string)
3. Missing required measurands

**Solutions:**
- Always include meterValue array in Updated and Ended events
- Verify value is number type: `"value": 12.5` not `"value": "12.5"`
- Include at least Energy.Active.Import.Register measurand
- Verify unitOfMeasure is correctly formatted:
  ```json
  "unitOfMeasure": {
    "unit": "Wh",
    "multiplier": 0
  }
  ```

### Issue 6: Authorization Takes Too Long

**Symptoms:**
- Authorize response delayed
- User experience poor (slow start)

**Causes:**
1. CSMS not caching authorizations locally
2. Network latency
3. Database query slow

**Solutions (CSMS side):**
- Enable local authorization cache
- Pre-load frequent tokens
- Optimize authorization queries
- Consider LocalAuthList for offline operation

**Solutions (Charger side):**
- Implement local whitelist
- Use LocalAuthorizeOffline feature
- Cache successful authorizations

### Issue 7: Transaction Sequence Numbers Out of Order

**Symptoms:**
- CSMS rejects TransactionEvent
- Error: "Invalid sequence number"

**Causes:**
1. Sequence counter reset mid-transaction
2. Offline messages buffered out of order
3. Concurrent transaction handling error

**Solutions:**
- Persist sequence number to non-volatile memory
- Restore sequence number after reboot (if transaction ongoing)
- Sort buffered messages by seqNo before sending
- Use separate sequence counters per transaction if supporting concurrent

### Issue 8: Configuration Changes Not Persisting

**Symptoms:**
- SetVariables returns Accepted
- After reboot, old values restored

**Causes:**
1. Not saving to non-volatile memory
2. VariableAttribute.persistent flag ignored
3. Factory reset overwriting values

**Solutions:**
- Save persistent variables to EEPROM/Flash
- Check persistent flag before deciding to save
- Separate user config from factory defaults
- Implement configuration backup/restore

---

## Summary and Key Takeaways

### Migration Complexity: **HIGH**

Migrating from OCPP 1.6 to 2.0.1 is **not a simple upgrade**. It requires:
- Significant firmware development (estimated 3-6 months for full implementation)
- Complete redesign of transaction handling
- Implementation of hierarchical device model
- New message types and flows
- Extensive testing

### Critical Changes Summary

1. **Transaction Model** - Complete redesign from separate Start/Stop messages to unified TransactionEvent
2. **Configuration** - Flat key-value pairs become hierarchical Component/Variable model
3. **Authorization** - Simple string idTag becomes IdToken object with type
4. **Status Reporting** - Simplified connector statuses (9 → 5), detailed state in transactions
5. **Boot Process** - More complex with GetBaseReport and NotifyReport

### Benefits of Migration

1. **Richer Data** - More transaction details, better diagnostics
2. **Better Authorization** - Granular rejection reasons
3. **Flexibility** - Device model allows vendor extensions
4. **Future-Proof** - Required for ISO 15118 Plug & Charge
5. **Smart Charging** - Better support for advanced charging profiles
6. **Security** - Enhanced security with certificate management

### Recommended Approach

1. **Start with new hardware** - Implement OCPP 2.0.1 on new charger models
2. **Maintain 1.6 for existing fleet** - Don't force migration of working chargers
3. **Dual-stack if possible** - Support both protocols during transition
4. **Use CitrineOS** - Already supports both OCPP 1.6 and 2.0.1 seamlessly

### CitrineOS Support

✅ **CitrineOS already supports both OCPP 1.6 and 2.0.1**

The CSMS (CitrineOS) side is **ready for migration**. Focus on:
- Charger firmware updates
- Testing with CitrineOS test environment
- Gradual rollout

### Need Help?

- OCPP 2.0.1 Specification: https://www.openchargealliance.org/
- CitrineOS Documentation: Check repository docs
- OCPP Compliance Testing: OCA test suite
- Community: OCPP forums and mailing lists

---

## Appendix A: Complete Message Mapping

| OCPP 1.6 Message | OCPP 2.0.1 Equivalent | Notes |
|------------------|----------------------|-------|
| **Authorize** | Authorize | Structure changed (idTag → idToken) |
| **BootNotification** | BootNotification | Added reason field |
| **StartTransaction** | TransactionEvent (eventType: Started) | Complete redesign |
| **StopTransaction** | TransactionEvent (eventType: Ended) | Complete redesign |
| **MeterValues** | TransactionEvent (eventType: Updated) | Included in transaction events |
| **StatusNotification** | StatusNotification | Simplified statuses, added evseId |
| **Heartbeat** | Heartbeat | No change |
| **GetConfiguration** | GetVariables | Complete redesign (Component/Variable) |
| **ChangeConfiguration** | SetVariables | Complete redesign |
| N/A | **GetBaseReport** | NEW - device inventory |
| N/A | **NotifyReport** | NEW - device model reporting |
| **DataTransfer** | DataTransfer | No change |
| **DiagnosticsStatusNotification** | NotifyEvent | Generalized event mechanism |
| **FirmwareStatusNotification** | FirmwareStatusNotification | No major change |
| N/A | **TransactionEvent** | NEW - unified transaction handling |

---

## Appendix B: Quick Reference Card

### Transaction Flow

**1.6:** Authorize → StartTransaction → MeterValues → StopTransaction
**2.0.1:** Authorize → TransactionEvent(Started) → TransactionEvent(Updated) → TransactionEvent(Ended)

### Authorization

**1.6:** `"idTag": "RFID123"`
**2.0.1:** `"idToken": {"idToken": "RFID123", "type": "ISO14443"}`

### Configuration

**1.6:** `GetConfiguration("HeartbeatInterval")`
**2.0.1:** `GetVariables(component: "OCPPCommCtrlr", variable: "HeartbeatInterval")`

### Connector ID

**1.6:** `"connectorId": 1`
**2.0.1:** `"evse": {"id": 1, "connectorId": 1}`

### Status Values

**1.6:** Available, Preparing, Charging, SuspendedEVSE, SuspendedEV, Finishing, Reserved, Unavailable, Faulted
**2.0.1:** Available, Occupied, Reserved, Unavailable, Faulted

---

**Document Version:** 1.0
**Last Updated:** 2025-01-21
**Author:** CitrineOS Migration Team
