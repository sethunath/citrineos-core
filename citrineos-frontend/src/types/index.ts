// Core Types for CitrineOS

export interface ChargingStation {
  id: string;
  isOnline: boolean;
  protocol?: string | null;
  chargePointVendor?: string | null;
  chargePointModel?: string | null;
  chargePointSerialNumber?: string | null;
  chargeBoxSerialNumber?: string | null;
  firmwareVersion?: string | null;
  iccid?: string | null;
  imsi?: string | null;
  meterType?: string | null;
  meterSerialNumber?: string | null;
  locationId?: number | null;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
  evses?: Evse[];
  connectors?: Connector[];
  transactions?: Transaction[];
  location?: Location;
}

export interface Evse {
  id: number;
  stationId: string;
  evseId?: number;
  evseTypeId?: number;
  physicalReference?: string;
  removed?: boolean;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
  connectors?: Connector[];
  transactions?: Transaction[];
}

export interface Connector {
  id: number;
  stationId: string;
  evseId?: number;
  connectorId: number;
  connectorType?: string;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: number;
  stationId: string;
  transactionId: string;
  isActive: boolean;
  chargingState?: string;
  timeSpentCharging?: number;
  stoppedReason?: string;
  evseId?: number;
  remoteStartId?: number;
  totalKwh?: number;
  totalCost?: number;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
  station?: ChargingStation;
  evse?: Evse;
  connector?: Connector;
  authorization?: Authorization;
  tariff?: Tariff;
  meterValues?: MeterValue[];
  transactionEvents?: TransactionEvent[];
}

export interface Authorization {
  id: number;
  idToken: string;
  idTokenType?: string;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: number;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  tenantId: number;
  createdAt: string;
  updatedAt: string;
  chargingStations?: ChargingStation[];
}

export interface Tariff {
  id: number;
  currency: string;
  pricePerKwh?: number;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface MeterValue {
  id: number;
  transactionDatabaseId?: number;
  timestamp: string;
  sampledValues?: SampledValue[];
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface SampledValue {
  value: number;
  context?: string;
  measurand?: string;
  phase?: string;
  location?: string;
  unit?: string;
}

export interface TransactionEvent {
  id: number;
  transactionDatabaseId: number;
  eventType: string;
  timestamp: string;
  triggerReason?: string;
  seqNo: number;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChargingProfile {
  id: number;
  chargingProfileId: number;
  stackLevel: number;
  chargingProfilePurpose: string;
  chargingProfileKind: string;
  transactionDatabaseId?: number;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
  chargingSchedules?: ChargingSchedule[];
}

export interface ChargingSchedule {
  id: number;
  chargingProfileId: number;
  duration?: number;
  startSchedule?: string;
  chargingRateUnit: string;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Reservation {
  id: number;
  reservationId: number;
  expiryDateTime: string;
  idToken: string;
  stationId?: string;
  evseId?: number;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface VariableAttribute {
  id: number;
  stationId: string;
  type?: string;
  value?: string;
  mutability?: string;
  persistent?: boolean;
  constant?: boolean;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Component {
  id: number;
  name: string;
  instance?: string;
  evseId?: number;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Variable {
  id: number;
  name: string;
  instance?: string;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityEvent {
  id: number;
  stationId: string;
  type: string;
  timestamp: string;
  techInfo?: string;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Certificate {
  id: number;
  serialNumber: string;
  issuerName: string;
  certificateType: string;
  validBefore: string;
  validAfter: string;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface StatusNotification {
  id: number;
  stationId: string;
  timestamp: string;
  connectorStatus: string;
  evseId?: number;
  connectorId?: number;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

// Dashboard Statistics
export interface DashboardStats {
  totalStations: number;
  onlineStations: number;
  activeTransactions: number;
  totalEnergyToday: number;
  totalRevenueToday: number;
}

// Pagination
export interface PaginationParams {
  limit: number;
  offset: number;
}

// Sorting
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// Filter
export interface FilterParams {
  [key: string]: any;
}
