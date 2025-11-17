import { gql } from '@apollo/client';

export const GET_CHARGING_PROFILES = gql`
  query GetChargingProfiles(
    $limit: Int
    $offset: Int
    $where: ChargingProfiles_bool_exp
  ) {
    ChargingProfiles(limit: $limit, offset: $offset, where: $where) {
      id
      chargingProfileId
      stackLevel
      chargingProfilePurpose
      chargingProfileKind
      transactionDatabaseId
      tenantId
      createdAt
      updatedAt
      chargingSchedules: ChargingSchedules {
        id
        duration
        startSchedule
        chargingRateUnit
      }
    }
    ChargingProfiles_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_CHARGING_PROFILE = gql`
  query GetChargingProfile($id: Int!) {
    ChargingProfiles_by_pk(id: $id) {
      id
      chargingProfileId
      stackLevel
      chargingProfilePurpose
      chargingProfileKind
      transactionDatabaseId
      tenantId
      createdAt
      updatedAt
      chargingSchedules: ChargingSchedules {
        id
        duration
        startSchedule
        chargingRateUnit
      }
    }
  }
`;
