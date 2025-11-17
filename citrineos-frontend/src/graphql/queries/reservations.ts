import { gql } from '@apollo/client';

export const GET_RESERVATIONS = gql`
  query GetReservations(
    $limit: Int
    $offset: Int
    $where: Reservations_bool_exp
    $orderBy: [Reservations_order_by!]
  ) {
    Reservations(
      limit: $limit
      offset: $offset
      where: $where
      order_by: $orderBy
    ) {
      id
      reservationId
      expiryDateTime
      idToken
      stationId
      evseId
      tenantId
      createdAt
      updatedAt
    }
    Reservations_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_RESERVATION = gql`
  query GetReservation($id: Int!) {
    Reservations_by_pk(id: $id) {
      id
      reservationId
      expiryDateTime
      idToken
      stationId
      evseId
      tenantId
      createdAt
      updatedAt
    }
  }
`;
