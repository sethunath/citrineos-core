import { gql } from '@apollo/client';

export const GET_VARIABLE_ATTRIBUTES = gql`
  query GetVariableAttributes(
    $stationId: String!
    $limit: Int
    $offset: Int
  ) {
    VariableAttributes(
      where: { stationId: { _eq: $stationId } }
      limit: $limit
      offset: $offset
    ) {
      id
      stationId
      type
      value
      mutability
      persistent
      constant
      tenantId
      createdAt
      updatedAt
    }
    VariableAttributes_aggregate(where: { stationId: { _eq: $stationId } }) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_SECURITY_EVENTS = gql`
  query GetSecurityEvents(
    $limit: Int
    $offset: Int
    $where: SecurityEvents_bool_exp
    $orderBy: [SecurityEvents_order_by!]
  ) {
    SecurityEvents(
      limit: $limit
      offset: $offset
      where: $where
      order_by: $orderBy
    ) {
      id
      stationId
      type
      timestamp
      techInfo
      tenantId
      createdAt
      updatedAt
    }
    SecurityEvents_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_STATUS_NOTIFICATIONS = gql`
  query GetStatusNotifications(
    $stationId: String!
    $limit: Int
    $offset: Int
  ) {
    StatusNotifications(
      where: { stationId: { _eq: $stationId } }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      stationId
      timestamp
      connectorStatus
      evseId
      connectorId
      tenantId
      createdAt
      updatedAt
    }
    StatusNotifications_aggregate(where: { stationId: { _eq: $stationId } }) {
      aggregate {
        count
      }
    }
  }
`;
