import { gql } from '@apollo/client';

export const GET_CHARGING_STATIONS = gql`
  query GetChargingStations(
    $limit: Int
    $offset: Int
    $where: ChargingStations_bool_exp
    $orderBy: [ChargingStations_order_by!]
  ) {
    ChargingStations(
      limit: $limit
      offset: $offset
      where: $where
      order_by: $orderBy
    ) {
      id
      isOnline
      protocol
      chargePointVendor
      chargePointModel
      chargePointSerialNumber
      chargeBoxSerialNumber
      firmwareVersion
      iccid
      imsi
      meterType
      meterSerialNumber
      locationId
      tenantId
      createdAt
      updatedAt
      evses: Evses {
        id
        evseId
        physicalReference
        connectors: Connectors {
          id
          connectorId
          connectorType
        }
      }
      location: Location {
        id
        name
        address
        city
        postalCode
        country
      }
    }
    ChargingStations_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_CHARGING_STATION = gql`
  query GetChargingStation($id: String!) {
    ChargingStations_by_pk(id: $id) {
      id
      isOnline
      protocol
      chargePointVendor
      chargePointModel
      chargePointSerialNumber
      chargeBoxSerialNumber
      firmwareVersion
      iccid
      imsi
      meterType
      meterSerialNumber
      locationId
      tenantId
      createdAt
      updatedAt
      evses: Evses {
        id
        evseId
        evseTypeId
        physicalReference
        removed
        connectors: Connectors {
          id
          connectorId
          connectorType
        }
        transactions: Transactions(where: { isActive: { _eq: true } }) {
          id
          transactionId
          isActive
          chargingState
          totalKwh
          totalCost
        }
      }
      connectors: Connectors {
        id
        connectorId
        connectorType
        evseId
      }
      location: Location {
        id
        name
        address
        city
        postalCode
        country
      }
      transactions: Transactions(order_by: { createdAt: desc }, limit: 10) {
        id
        transactionId
        isActive
        chargingState
        timeSpentCharging
        stoppedReason
        totalKwh
        totalCost
        createdAt
        updatedAt
      }
      statusNotifications: StatusNotifications(
        order_by: { timestamp: desc }
        limit: 10
      ) {
        id
        timestamp
        connectorStatus
        evseId
        connectorId
      }
    }
  }
`;

export const SUBSCRIBE_CHARGING_STATIONS = gql`
  subscription SubscribeChargingStations($where: ChargingStations_bool_exp) {
    ChargingStations(where: $where, order_by: { updatedAt: desc }) {
      id
      isOnline
      protocol
      chargePointVendor
      chargePointModel
      locationId
      tenantId
      updatedAt
    }
  }
`;

export const GET_CHARGING_STATIONS_STATS = gql`
  query GetChargingStationsStats {
    total: ChargingStations_aggregate {
      aggregate {
        count
      }
    }
    online: ChargingStations_aggregate(where: { isOnline: { _eq: true } }) {
      aggregate {
        count
      }
    }
    offline: ChargingStations_aggregate(where: { isOnline: { _eq: false } }) {
      aggregate {
        count
      }
    }
  }
`;
