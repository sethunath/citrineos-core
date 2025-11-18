# OCPP 1.6 Charge Point Operation Flow Diagrams

This document contains detailed flow diagrams for all major OCPP 1.6 charge point operations in CitrineOS.

## Table of Contents
1. [BootNotification Flow](#bootnotification-flow)
2. [Authorize Flow](#authorize-flow)
3. [StartTransaction Flow](#starttransaction-flow)
4. [StopTransaction Flow](#stoptransaction-flow)
5. [MeterValues Flow](#metervalues-flow)
6. [StatusNotification Flow](#statusnotification-flow)
7. [RemoteStartTransaction Flow](#remotestarttransaction-flow)
8. [RemoteStopTransaction Flow](#remotestoptransaction-flow)
9. [Message Routing Flow](#message-routing-flow)

---

## BootNotification Flow

```mermaid
flowchart TD
    Start([Charge Point Boot]) --> SendBoot[Send BootNotification Request<br/>chargePointVendor, model,<br/>serialNumber, firmware]
    SendBoot --> Router[MessageRouter.onMessage]
    Router --> Validate[Schema Validation<br/>AJV JSON Schema]
    Validate -->|Invalid| SendError[Send CallError<br/>FormatViolation]
    Validate -->|Valid| Handler[ConfigurationModule<br/>._handleOcpp16BootNotification]

    Handler --> CreateResponse[BootNotificationService<br/>.createOcpp16BootNotificationResponse]
    CreateResponse --> ReadConfig[Read Boot Config<br/>IBootRepository]
    ReadConfig --> DetermineStatus{Determine<br/>Boot Status}

    DetermineStatus -->|Accepted| SetAccepted[status = Accepted<br/>interval = heartbeatInterval]
    DetermineStatus -->|Pending| SetPending[status = Pending<br/>interval = retryInterval]
    DetermineStatus -->|Rejected| SetRejected[status = Rejected<br/>interval = retryInterval]

    SetAccepted --> ParallelOps[Parallel Operations]
    SetPending --> CacheStatus[Cache Boot Status<br/>for retry logic]
    SetRejected --> CacheStatus
    CacheStatus --> ParallelOps

    ParallelOps --> PersistStation[LocationRepository<br/>.createOrUpdateChargingStation<br/>vendor, model, serial, firmware]
    ParallelOps --> UpdatePermissions{Update Action<br/>Permissions}

    UpdatePermissions -->|Accepted| Whitelist[Whitelist ALL actions<br/>in cache]
    UpdatePermissions -->|Pending/Rejected| Blacklist[Blacklist non-boot actions<br/>Only allow BootNotification]

    Whitelist --> SendResponse[Send BootNotificationResponse<br/>status, currentTime, interval]
    Blacklist --> SendResponse
    PersistStation --> SendResponse

    SendResponse --> DispatchWebhook[WebhookDispatcher<br/>.dispatchMessageSent]
    DispatchWebhook -->|Pending| PostBootOps[Optional Post-Boot Operations]
    DispatchWebhook -->|Accepted| End([Complete])
    DispatchWebhook -->|Rejected| End

    PostBootOps --> GetBaseReport[Send GetBaseReport]
    GetBaseReport --> SetVars[Send SetVariables<br/>batched per ItemsPerMessage]
    SetVars --> TriggerBoot[Send TriggerMessage<br/>for BootNotification]
    TriggerBoot --> End

    SendError --> EndError([Error Response Sent])
```

---

## Authorize Flow

```mermaid
flowchart TD
    Start([EV Driver presents ID]) --> SendAuth[Send Authorize Request<br/>idTag]
    SendAuth --> Router[MessageRouter.onMessage]
    Router --> Validate[Schema Validation]
    Validate -->|Invalid| SendError[Send CallError]
    Validate -->|Valid| Handler[EVDriverModule<br/>._handleOCPP16Authorize]

    Handler --> LookupAuth[AuthorizationRepository<br/>.readOnlyOneByQuerystring<br/>idToken = idTag]
    LookupAuth -->|Not Found| ReturnInvalid[Return status = Invalid]
    LookupAuth -->|Found| CheckStatus{Check<br/>Authorization<br/>Status}

    CheckStatus -->|Blocked| ReturnBlocked[Return status = Blocked]
    CheckStatus -->|Expired| ReturnExpired[Return status = Expired]
    CheckStatus -->|Invalid| ReturnInvalid
    CheckStatus -->|Valid| CheckExpiry{Check Cache<br/>Expiry}

    CheckExpiry -->|Expired| ReturnExpired
    CheckExpiry -->|Valid| ApplyAuthorizers[Apply Authorizer Chain]

    ApplyAuthorizers --> RealTimeAuth[RealTimeAuthorizer]
    RealTimeAuth --> CustomAuth[Custom Authorizers]
    CustomAuth -->|All Pass| ReturnAccepted[Return status = Accepted<br/>expiryDate, parentIdTag]
    CustomAuth -->|Any Fail| ReturnBlocked

    ReturnAccepted --> BuildResponse[Build AuthorizeResponse<br/>with idTagInfo]
    ReturnBlocked --> BuildResponse
    ReturnExpired --> BuildResponse
    ReturnInvalid --> BuildResponse

    BuildResponse --> SendResponse[Send AuthorizeResponse]
    SendResponse --> DispatchWebhook[WebhookDispatcher<br/>.dispatchMessageSent]
    DispatchWebhook --> End([Complete])

    SendError --> EndError([Error Response Sent])
```

---

## StartTransaction Flow

```mermaid
flowchart TD
    Start([EV Driver initiates charging]) --> SendStart[Send StartTransaction Request<br/>connectorId, idTag,<br/>meterStart, timestamp,<br/>reservationId]
    SendStart --> Router[MessageRouter.onMessage]
    Router --> Validate[Schema Validation]
    Validate -->|Invalid| SendError[Send CallError]
    Validate -->|Valid| Handler[TransactionsModule<br/>._handleOcpp16StartTransaction]

    Handler --> AuthorizeToken[TransactionService<br/>.authorizeOcpp16IdToken]
    AuthorizeToken --> LookupAuth[AuthorizationRepository<br/>.readOnlyOneByQuerystring]
    LookupAuth -->|Not Found| ReturnInvalid[Response: status = Invalid<br/>transactionId = 0]
    LookupAuth -->|Found| CheckAuth{Check<br/>Authorization}

    CheckAuth -->|Blocked| ReturnBlocked[Response: status = Blocked<br/>transactionId = 0]
    CheckAuth -->|Expired| ReturnExpired[Response: status = Expired<br/>transactionId = 0]
    CheckAuth -->|ConcurrentTx| ReturnConcurrent[Response: status = ConcurrentTx<br/>transactionId = 0]
    CheckAuth -->|Valid| CheckExpiry{Check Cache<br/>Expiry}

    CheckExpiry -->|Expired| ReturnExpired
    CheckExpiry -->|Valid| ApplyAuthorizers[Apply Authorizer Chain]
    ApplyAuthorizers -->|Fail| ReturnBlocked
    ApplyAuthorizers -->|Pass| CreateTransaction[TransactionEventRepository<br/>.createTransactionByStartTransaction]

    CreateTransaction --> CreateTxRecord[Create Transaction Record<br/>stationId, connectorId, isActive=true]
    CreateTxRecord --> CreateStartRecord[Create StartTransaction Record<br/>transactionId, meterStart, timestamp]
    CreateStartRecord --> LinkAuth[Link Authorization to Transaction]
    LinkAuth --> ReturnAccepted[Response: status = Accepted<br/>transactionId = NEW_ID<br/>expiryDate, parentIdTag]

    ReturnInvalid --> SendResponse[Send StartTransactionResponse]
    ReturnBlocked --> SendResponse
    ReturnExpired --> SendResponse
    ReturnConcurrent --> SendResponse
    ReturnAccepted --> SendResponse

    SendResponse --> DispatchWebhook[WebhookDispatcher<br/>.dispatchMessageSent]
    DispatchWebhook -->|Has reservationId| DeactivateReservation[TransactionService<br/>.deactivateReservation<br/>Mark reservation inactive]
    DispatchWebhook -->|No reservation| End([Complete])
    DeactivateReservation --> End

    SendError --> EndError([Error Response Sent])
```

---

## StopTransaction Flow

```mermaid
flowchart TD
    Start([Charging session ends]) --> SendStop[Send StopTransaction Request<br/>transactionId, meterStop,<br/>timestamp, idTag, reason,<br/>transactionData]
    SendStop --> Router[MessageRouter.onMessage]
    Router --> Validate[Schema Validation]
    Validate -->|Invalid| SendError[Send CallError]
    Validate -->|Valid| Handler[TransactionsModule<br/>._handleOcpp16StopTransaction]

    Handler -->|idTag provided| ValidateIdTag[AuthorizationRepository<br/>.readOnlyOneByQuerystring]
    Handler -->|No idTag| BuildResponse[Build StopTransactionResponse<br/>empty idTagInfo]

    ValidateIdTag --> LookupAuth{Lookup<br/>Authorization}
    LookupAuth -->|Not Found| SetInvalid[idTagInfo.status = Invalid]
    LookupAuth -->|Found| MapStatus[Map to OCPP 1.6 status<br/>Accepted/Blocked/Expired]
    LookupAuth -->|Found| GetParent[Get parentIdTag from<br/>groupAuthorizationId]

    SetInvalid --> BuildResponse
    MapStatus --> BuildResponse
    GetParent --> BuildResponse

    BuildResponse --> SendResponse[Send StopTransactionResponse<br/>IMMEDIATELY]
    SendResponse --> FindTransaction[Find Transaction by<br/>stationId + transactionId]

    FindTransaction -->|Not Found| LogError[Log Error:<br/>Transaction not found]
    FindTransaction -->|Found| CreateStopRecord[TransactionEventRepository<br/>.createStopTransaction]

    CreateStopRecord --> ProcessMeterData[Process transactionData<br/>MeterValues array]
    ProcessMeterData --> CalcKwh[Calculate totalKwh<br/>meterStop - meterStart / 1000]
    CalcKwh --> UpdateTransaction[Update Transaction Record<br/>isActive = false<br/>stoppedReason = reason<br/>endTime = timestamp<br/>totalKwh]

    UpdateTransaction --> SaveChanges[Save to Database]
    SaveChanges --> DispatchWebhook[WebhookDispatcher<br/>.dispatchMessageSent]
    DispatchWebhook --> End([Complete])

    LogError --> End
    SendError --> EndError([Error Response Sent])
```

---

## MeterValues Flow

```mermaid
flowchart TD
    Start([Periodic meter reading]) --> SendMeter[Send MeterValues Request<br/>connectorId, transactionId,<br/>meterValue array]
    SendMeter --> Router[MessageRouter.onMessage]
    Router --> Validate[Schema Validation]
    Validate -->|Invalid| SendError[Send CallError]
    Validate -->|Valid| Handler[TransactionsModule<br/>._handleOcpp16MeterValues]

    Handler --> ValidateConnector{connectorId<br/>!= 0?}
    ValidateConnector -->|connectorId = 0| LogWarning[Log Warning:<br/>Invalid connector]
    ValidateConnector -->|connectorId > 0| ValidateTransaction{transactionId<br/>exists?}

    ValidateTransaction -->|No transactionId| LogWarning
    ValidateTransaction -->|Valid| ValidateSamples{meterValue.<br/>sampledValue<br/>not empty?}

    ValidateSamples -->|Empty| LogWarning
    ValidateSamples -->|Has samples| BuildMeterValues[Build MeterValue entities<br/>Include connectorId in each]

    BuildMeterValues --> UpdateTransaction[TransactionEventRepository<br/>.updateTransactionByMeterValues]
    UpdateTransaction --> FindTransaction[Find Transaction by<br/>stationId + transactionId]
    FindTransaction -->|Not Found| LogTxError[Log Error:<br/>Transaction not found]
    FindTransaction -->|Found| CreateRecords[Create MeterValue Records<br/>for each sampledValue]

    CreateRecords --> RecalcKwh[Recalculate Transaction.totalKwh<br/>from meter readings]
    RecalcKwh --> PersistValues[Persist all MeterValue entities]
    PersistValues --> SendResponse[Send MeterValuesResponse<br/>empty payload]

    LogWarning --> SendResponse
    LogTxError --> SendResponse

    SendResponse --> DispatchWebhook[WebhookDispatcher<br/>.dispatchMessageSent]
    DispatchWebhook --> End([Complete])

    SendError --> EndError([Error Response Sent])
```

---

## StatusNotification Flow

```mermaid
flowchart TD
    Start([Connector status change]) --> SendStatus[Send StatusNotification Request<br/>connectorId, status,<br/>errorCode, timestamp]
    SendStatus --> Router[MessageRouter.onMessage]
    Router --> Validate[Schema Validation]
    Validate -->|Invalid| SendError[Send CallError]
    Validate -->|Valid| Handler[TransactionsModule<br/>._handleOcpp16StatusNotification]

    Handler --> Process[StatusNotificationService<br/>.processOcpp16StatusNotification]
    Process --> ValidateStation[LocationRepository<br/>.readChargingStationByStationId]
    ValidateStation -->|Not Found| LogWarning[Log Warning:<br/>Station not found]
    ValidateStation -->|Found| CreateNotification[Create StatusNotification Entity<br/>stationId, connectorId,<br/>status, errorCode, timestamp]

    CreateNotification --> PersistNotification[LocationRepository<br/>.addStatusNotificationToChargingStation]
    PersistNotification --> UpdateConnector[Create/Update Connector Entity]
    UpdateConnector --> MapStatus[Map OCPP 1.6 status to<br/>Connector status]

    MapStatus --> StatusValues[Status mapping:<br/>Available, Preparing, Charging,<br/>SuspendedEVSE, SuspendedEV,<br/>Finishing, Reserved,<br/>Unavailable, Faulted]
    StatusValues --> PersistConnector[Persist Connector with<br/>new status + timestamp]

    PersistConnector --> UpdateDeviceModel{Update Device<br/>Model?}
    UpdateDeviceModel -->|Optional| FindComponent[Find Connector Component<br/>in Device Model]
    FindComponent --> FindVariable[Find AvailabilityState Variable]
    FindVariable --> UpdateVariable[Update ReportDataType<br/>VariableAttribute value]
    UpdateVariable --> CallDeviceModel[DeviceModelRepository<br/>.createOrUpdateDeviceModelByStationId]

    CallDeviceModel --> SendResponse[Send StatusNotificationResponse<br/>empty payload]
    UpdateDeviceModel -->|Skip| SendResponse
    LogWarning --> SendResponse

    SendResponse --> DispatchWebhook[WebhookDispatcher<br/>.dispatchMessageSent]
    DispatchWebhook --> End([Complete])

    SendError --> EndError([Error Response Sent])
```

---

## RemoteStartTransaction Flow

```mermaid
flowchart TD
    Start([API Client Request]) --> APICall[POST /evdriver/remotestarttransaction<br/>identifier array, request body<br/>idTag, connectorId, chargingProfile]
    APICall --> ForEach[For each stationId in identifier array]

    ForEach --> CheckBoot{Check Action<br/>Allowed?}
    CheckBoot -->|Blacklisted| ReturnFailure[Return success: false<br/>Action not allowed]
    CheckBoot -->|Allowed| BuildCall[Module.sendCall<br/>stationId, tenantId, OCPP1_6,<br/>RemoteStartTransaction, request]

    BuildCall --> CreateMessage[Create Call Message<br/>messageTypeId=2, correlationId,<br/>action, payload]
    CreateMessage --> CacheCall[Cache call:<br/>action:correlationId]
    CacheCall --> RemoveNulls[Remove null values<br/>from payload]
    RemoveNulls --> SendToStation[Send message to station<br/>via network hook<br/>WebSocket]

    SendToStation --> DispatchSent[WebhookDispatcher<br/>.dispatchMessageSent]
    DispatchSent --> ReturnSuccess[Return success: true<br/>messageId, stationId]

    ReturnSuccess --> WaitResponse[Wait for CallResult]
    ReturnFailure --> End([API Response Sent])

    WaitResponse --> ReceiveResult[Charge Point sends<br/>RemoteStartTransactionResponse<br/>status: Accepted/Rejected]
    ReceiveResult --> RouterResult[MessageRouter._onCallResult]
    RouterResult --> ValidateResult[Validate messageId<br/>matches cached call]
    ValidateResult --> HandlerResult[EVDriverModule<br/>._handleRemoteStartTransaction]

    HandlerResult --> LogResult[Log response<br/>status and details]
    LogResult --> ClearCache[Clear cached call]
    ClearCache --> DispatchReceived[WebhookDispatcher<br/>.dispatchMessageReceived]
    DispatchReceived -->|Has callbackUrl| NotifyCallback[HTTP POST to callbackUrl<br/>with response]
    DispatchReceived -->|No callback| End
    NotifyCallback --> End
```

---

## RemoteStopTransaction Flow

```mermaid
flowchart TD
    Start([API Client Request]) --> APICall[POST /evdriver/remotestoptransaction<br/>identifier array, request body<br/>transactionId]
    APICall --> ForEach[For each stationId in identifier array]

    ForEach --> CheckBoot{Check Action<br/>Allowed?}
    CheckBoot -->|Blacklisted| ReturnFailure[Return success: false<br/>Action not allowed]
    CheckBoot -->|Allowed| BuildCall[Module.sendCall<br/>stationId, tenantId, OCPP1_6,<br/>RemoteStopTransaction, request]

    BuildCall --> CreateMessage[Create Call Message<br/>messageTypeId=2, correlationId,<br/>action, payload]
    CreateMessage --> CacheCall[Cache call:<br/>action:correlationId]
    CacheCall --> RemoveNulls[Remove null values<br/>from payload]
    RemoveNulls --> SendToStation[Send message to station<br/>via network hook<br/>WebSocket]

    SendToStation --> DispatchSent[WebhookDispatcher<br/>.dispatchMessageSent]
    DispatchSent --> ReturnSuccess[Return success: true<br/>messageId, stationId]

    ReturnSuccess --> WaitResponse[Wait for CallResult]
    ReturnFailure --> End([API Response Sent])

    WaitResponse --> ReceiveResult[Charge Point sends<br/>RemoteStopTransactionResponse<br/>status: Accepted/Rejected]
    ReceiveResult --> RouterResult[MessageRouter._onCallResult]
    RouterResult --> ValidateResult[Validate messageId<br/>matches cached call]
    ValidateResult --> HandlerResult[EVDriverModule<br/>._handleOcpp16RemoteStopTransaction]

    HandlerResult --> LogResult[Log response<br/>status and details]
    LogResult --> ClearCache[Clear cached call]
    ClearCache --> DispatchReceived[WebhookDispatcher<br/>.dispatchMessageReceived]
    DispatchReceived -->|Has callbackUrl| NotifyCallback[HTTP POST to callbackUrl<br/>with response]
    DispatchReceived -->|No callback| End
    NotifyCallback --> End
```

---

## Message Routing Flow

This is the central flow that all messages go through.

```mermaid
flowchart TD
    Start([WebSocket Message Received]) --> OnMessage[MessageRouter.onMessage<br/>identifier, message, timestamp, protocol]
    OnMessage --> ParseJSON{Parse JSON}
    ParseJSON -->|Invalid JSON| SendParseError[Send CallError<br/>RpcFrameworkError]
    ParseJSON -->|Valid| ExtractType[Extract messageTypeId<br/>0=Call, 1=CallResult, 3=CallError]

    ExtractType --> RouteByType{Route by<br/>messageTypeId}
    RouteByType -->|messageTypeId=2| OnCall[_onCall handler]
    RouteByType -->|messageTypeId=3| OnCallResult[_onCallResult handler]
    RouteByType -->|messageTypeId=4| OnCallError[_onCallError handler]

    OnCall --> ExtractCall[Extract messageId,<br/>action, payload]
    ExtractCall --> MapAction[Map action string to<br/>CallAction enum]
    MapAction --> CheckAllowed{Check Action<br/>Allowed?}

    CheckAllowed -->|Blacklisted| SendSecurityError[Send CallError<br/>SecurityError]
    CheckAllowed -->|Allowed| ValidateSchema[Validate message schema<br/>AJV JSON Schema validator]

    ValidateSchema -->|Invalid| SendFormatError[Send CallError<br/>FormatViolation]
    ValidateSchema -->|Valid| SetLock[Set cache lock:<br/>action:messageId<br/>max call length timeout]

    SetLock --> RouteToHandler[Route to appropriate<br/>handler module]
    RouteToHandler --> HandlerExec{Handler<br/>Execution}

    HandlerExec -->|Success| BuildResult[Build CallResult message<br/>messageTypeId=3, messageId, payload]
    HandlerExec -->|OcppError| BuildOcppError[Build CallError message<br/>with OCPP error code]
    HandlerExec -->|Exception| BuildInternalError[Build CallError message<br/>InternalError]

    BuildResult --> RemoveNulls[Remove null values]
    RemoveNulls --> SendToStation[Send to charge point<br/>via network hook]

    BuildOcppError --> SendToStation
    BuildInternalError --> SendToStation

    SendToStation --> ClearLock[Clear cache lock]
    ClearLock --> DispatchSent[WebhookDispatcher<br/>.dispatchMessageSent]
    DispatchSent --> End([Complete])

    OnCallResult --> ValidateCallResult[Validate messageId<br/>matches cached call]
    ValidateCallResult -->|Not Found| LogResultError[Log Warning:<br/>Unexpected CallResult]
    ValidateCallResult -->|Found| RouteResult[Route to result handler]
    RouteResult --> ProcessResult[Process result in<br/>appropriate module]
    ProcessResult --> ClearResultCache[Clear cached call]
    ClearResultCache --> DispatchResult[WebhookDispatcher<br/>.dispatchMessageReceived]
    DispatchResult --> End

    OnCallError --> ValidateCallError[Validate messageId<br/>matches cached call]
    ValidateCallError -->|Not Found| LogErrorError[Log Warning:<br/>Unexpected CallError]
    ValidateCallError -->|Found| RouteError[Route to error handler]
    RouteError --> ProcessError[Process error in<br/>appropriate module]
    ProcessError --> ClearErrorCache[Clear cached call]
    ClearErrorCache --> DispatchError[WebhookDispatcher<br/>.dispatchMessageReceived]
    DispatchError --> End

    SendParseError --> End
    SendSecurityError --> End
    SendFormatError --> End
    LogResultError --> End
    LogErrorError --> End
```

---

## Key Components

### Repositories Used in OCPP 1.6
- **IBootRepository**: Boot configuration and status
- **ILocationRepository**: Charging stations, connectors, locations
- **IAuthorizationRepository**: ID tokens and authorization data
- **ITransactionEventRepository**: Transactions, meter values, events
- **IDeviceModelRepository**: Device model state (limited in 1.6)
- **IReservationRepository**: Reservations
- **ICache**: In-memory state management

### Services
- **BootNotificationService**: Boot logic orchestration
- **TransactionService**: Transaction lifecycle management
- **StatusNotificationService**: Status update persistence
- **CostCalculator**: Cost computation
- **CostNotifier**: Cost notification scheduling

### Error Codes
- **FormatViolation**: Invalid message format or schema
- **SecurityError**: Action not allowed (blacklisted)
- **InternalError**: Unhandled exception
- **NotSupported**: Action not implemented
- **RpcFrameworkError**: RPC protocol violation

---

## Notes

1. **Cache Strategy**: Action blacklisting prevents operations when boot status is Pending/Rejected
2. **Async Processing**: Webhooks are dispatched asynchronously (fire and forget)
3. **Concurrent Transaction Control**: Authorizer checks prevent concurrent transactions per ID token
4. **Meter Data**: Calculated in Wh (watt-hours) and converted to kWh for totals
5. **Response Timing**: Most responses sent before database persistence for fast response times
6. **Error Handling**: Non-critical errors logged but don't block processing flow
