import { gql } from '@apollo/client';

export const GET_AUTHORIZATIONS = gql`
  query GetAuthorizations(
    $limit: Int
    $offset: Int
    $where: Authorizations_bool_exp
    $orderBy: [Authorizations_order_by!]
  ) {
    Authorizations(
      limit: $limit
      offset: $offset
      where: $where
      order_by: $orderBy
    ) {
      id
      idToken
      idTokenType
      tenantId
      createdAt
      updatedAt
    }
    Authorizations_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_AUTHORIZATION = gql`
  query GetAuthorization($id: Int!) {
    Authorizations_by_pk(id: $id) {
      id
      idToken
      idTokenType
      tenantId
      createdAt
      updatedAt
    }
  }
`;

export const GET_LOCAL_LIST_VERSIONS = gql`
  query GetLocalListVersions($stationId: String!) {
    LocalListVersions(where: { stationId: { _eq: $stationId } }) {
      id
      versionNumber
      stationId
      tenantId
      createdAt
      updatedAt
    }
  }
`;
