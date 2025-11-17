import { ApolloClient, InMemoryCache, HttpLink, split, ApolloLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { config } from './config';

// Create authentication link
const authLink = new ApolloLink((operation, forward) => {
  // Get tenant ID from localStorage or use default
  const tenantId =
    localStorage.getItem('tenantId') || String(config.tenant.defaultTenantId);

  // Add headers for Hasura
  operation.setContext({
    headers: {
      'x-hasura-role': 'user',
      'x-hasura-tenant-id': tenantId,
    },
  });

  return forward(operation);
});

// HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: config.graphql.url,
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: config.graphql.wsUrl,
    connectionParams: () => {
      const tenantId =
        localStorage.getItem('tenantId') || String(config.tenant.defaultTenantId);
      return {
        headers: {
          'x-hasura-role': 'user',
          'x-hasura-tenant-id': tenantId,
        },
      };
    },
  })
);

// Split link based on operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink)
);

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          ChargingStations: {
            merge(existing, incoming) {
              return incoming;
            },
          },
          Transactions: {
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});
