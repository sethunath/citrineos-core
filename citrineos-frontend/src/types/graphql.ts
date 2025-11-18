// GraphQL Response Types

export interface ChargingStationsData {
  ChargingStations: any[];
  ChargingStations_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface ChargingStationByPkData {
  ChargingStations_by_pk: any;
}

export interface TransactionsData {
  Transactions: any[];
  Transactions_aggregate: {
    aggregate: {
      count: number;
      sum: {
        totalKwh: number;
        totalCost: number;
      };
    };
  };
}

export interface ActiveTransactionsData {
  Transactions: any[];
}

export interface ChargingStationsStatsData {
  total: {
    aggregate: {
      count: number;
    };
  };
  online: {
    aggregate: {
      count: number;
    };
  };
  offline: {
    aggregate: {
      count: number;
    };
  };
}
