import { gql } from '@apollo/client';

export const GET_TRANSACTIONS = gql`
  query GetTransactions(
    $limit: Int
    $offset: Int
    $where: Transactions_bool_exp
    $orderBy: [Transactions_order_by!]
  ) {
    Transactions(
      limit: $limit
      offset: $offset
      where: $where
      order_by: $orderBy
    ) {
      id
      stationId
      transactionId
      isActive
      chargingState
      timeSpentCharging
      stoppedReason
      evseId
      remoteStartId
      totalKwh
      totalCost
      tenantId
      createdAt
      updatedAt
      station: ChargingStation {
        id
        chargePointVendor
        chargePointModel
        location: Location {
          name
          city
        }
      }
      evse: Evse {
        id
        evseId
        physicalReference
      }
      connector: Connector {
        id
        connectorId
        connectorType
      }
      authorization: Authorization {
        id
        idToken
        idTokenType
      }
      tariff: Tariff {
        id
        currency
        pricePerKwh
      }
    }
    Transactions_aggregate(where: $where) {
      aggregate {
        count
        sum {
          totalKwh
          totalCost
        }
      }
    }
  }
`;

export const GET_TRANSACTION = gql`
  query GetTransaction($id: Int!) {
    Transactions_by_pk(id: $id) {
      id
      stationId
      transactionId
      isActive
      chargingState
      timeSpentCharging
      stoppedReason
      evseId
      connectorId
      remoteStartId
      totalKwh
      totalCost
      tenantId
      createdAt
      updatedAt
      station: ChargingStation {
        id
        chargePointVendor
        chargePointModel
        chargePointSerialNumber
        protocol
        location: Location {
          id
          name
          address
          city
          postalCode
          country
        }
      }
      evse: Evse {
        id
        evseId
        physicalReference
      }
      connector: Connector {
        id
        connectorId
        connectorType
      }
      authorization: Authorization {
        id
        idToken
        idTokenType
      }
      tariff: Tariff {
        id
        currency
        pricePerKwh
      }
      meterValues: MeterValues(order_by: { timestamp: asc }) {
        id
        timestamp
        sampledValues
      }
      transactionEvents: TransactionEvents(order_by: { timestamp: asc }) {
        id
        eventType
        timestamp
        triggerReason
        seqNo
      }
      chargingProfiles: ChargingProfiles {
        id
        chargingProfileId
        stackLevel
        chargingProfilePurpose
        chargingProfileKind
      }
    }
  }
`;

export const SUBSCRIBE_TRANSACTIONS = gql`
  subscription SubscribeTransactions($where: Transactions_bool_exp) {
    Transactions(where: $where, order_by: { updatedAt: desc }) {
      id
      stationId
      transactionId
      isActive
      chargingState
      totalKwh
      totalCost
      updatedAt
    }
  }
`;

export const GET_ACTIVE_TRANSACTIONS = gql`
  query GetActiveTransactions {
    Transactions(where: { isActive: { _eq: true } }) {
      id
      stationId
      transactionId
      chargingState
      timeSpentCharging
      totalKwh
      totalCost
      createdAt
      station: ChargingStation {
        id
        chargePointModel
        location: Location {
          name
        }
      }
      evse: Evse {
        evseId
      }
    }
  }
`;

export const GET_TRANSACTIONS_STATS = gql`
  query GetTransactionsStats {
    active: Transactions_aggregate(where: { isActive: { _eq: true } }) {
      aggregate {
        count
        sum {
          totalKwh
          totalCost
        }
      }
    }
    today: Transactions_aggregate(
      where: {
        createdAt: { _gte: "today" }
      }
    ) {
      aggregate {
        count
        sum {
          totalKwh
          totalCost
        }
      }
    }
  }
`;
