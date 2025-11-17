import { gql } from '@apollo/client';

export const GET_LOCATIONS = gql`
  query GetLocations(
    $limit: Int
    $offset: Int
    $where: Locations_bool_exp
    $orderBy: [Locations_order_by!]
  ) {
    Locations(
      limit: $limit
      offset: $offset
      where: $where
      order_by: $orderBy
    ) {
      id
      name
      address
      city
      postalCode
      country
      tenantId
      createdAt
      updatedAt
      chargingStations: ChargingStations_aggregate {
        aggregate {
          count
        }
      }
    }
    Locations_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_LOCATION = gql`
  query GetLocation($id: Int!) {
    Locations_by_pk(id: $id) {
      id
      name
      address
      city
      postalCode
      country
      tenantId
      createdAt
      updatedAt
      chargingStations: ChargingStations {
        id
        isOnline
        chargePointVendor
        chargePointModel
        protocol
      }
    }
  }
`;
