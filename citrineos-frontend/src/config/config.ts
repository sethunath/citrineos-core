// Configuration for CitrineOS Frontend

export const config = {
  graphql: {
    url: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:8090/v1/graphql',
    wsUrl: import.meta.env.VITE_GRAPHQL_WS_URL || 'ws://localhost:8090/v1/graphql',
  },
  auth: {
    username: import.meta.env.VITE_AUTH_USERNAME || 'admin',
    password: import.meta.env.VITE_AUTH_PASSWORD || 'citrineos',
  },
  tenant: {
    defaultTenantId: Number(import.meta.env.VITE_DEFAULT_TENANT_ID) || 1,
  },
  map: {
    tileUrl:
      import.meta.env.VITE_MAP_TILE_URL ||
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      import.meta.env.VITE_MAP_ATTRIBUTION ||
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  app: {
    title: import.meta.env.VITE_APP_TITLE || 'CitrineOS Charge Point Management',
    version: import.meta.env.VITE_APP_VERSION || '1.7.2',
  },
};
