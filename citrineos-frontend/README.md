# CitrineOS Frontend - Charge Point Management System

A modern, full-featured web application for managing EV charging infrastructure built with React, TypeScript, Material-UI, and GraphQL.

## Features

### Implemented Features

#### 📊 Dashboard
- Real-time statistics for charging stations and transactions
- Live energy consumption charts
- Station status overview (online/offline)
- Active charging sessions monitoring
- Revenue tracking

#### ⚡ Charging Station Management
- Comprehensive list view with search and filtering
- Detailed station information including:
  - Hardware details (vendor, model, serial numbers)
  - Firmware version tracking
  - EVSE and connector hierarchy
  - Location information
  - Status notifications history
  - Transaction history
- Real-time status updates
- Multi-protocol support (OCPP 1.6 / 2.0.1)

#### 💳 Transaction Management
- Active and historical transaction viewing
- Advanced filtering (all, active, completed)
- Detailed transaction information:
  - Energy consumption tracking
  - Cost calculation
  - Duration monitoring
  - Meter values visualization
  - Transaction events timeline
- Real-time transaction updates
- Export capabilities

#### 🔐 Authentication & Security
- Environment-based credential authentication
- Protected routes
- Session persistence
- Multi-tenancy support with tenant isolation

#### 🔄 Real-time Updates
- WebSocket subscriptions for live data
- GraphQL subscriptions for:
  - Station status changes
  - Transaction updates
  - Real-time metrics

### Planned Features (Placeholder Components Created)

- Authorization and ID Token Management
- Smart Charging Profile Management
- Device Monitoring and Diagnostics
- Configuration Management
- Certificate Management
- Reservation Management
- Reporting and Analytics
- Location Management with Map View

## Technology Stack

- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite
- **UI Library:** Material-UI (MUI) v7
- **GraphQL Client:** Apollo Client v4
- **Routing:** React Router v7
- **State Management:** Zustand
- **Charts:** Recharts
- **Maps:** Leaflet & React-Leaflet
- **Forms:** React Hook Form with Zod validation
- **Date Handling:** date-fns

## Prerequisites

- Node.js >= 22.11.0
- npm or yarn
- Running CitrineOS backend with Hasura GraphQL endpoint
- Access to PostgreSQL database (via Hasura)

## Installation

### 1. Navigate to Frontend Directory

```bash
cd citrineos-core/citrineos-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Hasura GraphQL Endpoint
VITE_GRAPHQL_URL=http://localhost:8090/v1/graphql
VITE_GRAPHQL_WS_URL=ws://localhost:8090/v1/graphql

# Authentication
VITE_AUTH_USERNAME=admin
VITE_AUTH_PASSWORD=citrineos

# Tenant Configuration
VITE_DEFAULT_TENANT_ID=1

# Map Configuration
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_MAP_ATTRIBUTION=&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors

# Application
VITE_APP_TITLE=CitrineOS Charge Point Management
VITE_APP_VERSION=1.7.2
```

## Running the Application

### Development Mode

Start the development server with hot reload:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

Build the application for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Docker Deployment

### Using Docker Compose (Recommended)

#### Production Mode

```bash
docker-compose up -d
```

Access the application at `http://localhost:3000`

#### Development Mode with Hot Reload

```bash
docker-compose --profile dev up
```

Access the application at `http://localhost:5173`

### Manual Docker Build

Build the Docker image:

```bash
docker build -t citrineos-frontend .
```

Run the container:

```bash
docker run -p 3000:80 citrineos-frontend
```

## Project Structure

```
citrineos-frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── auth/           # Authentication components
│   │   ├── common/         # Common UI components
│   │   └── layout/         # Layout components
│   ├── features/           # Feature modules
│   │   ├── dashboard/      # Dashboard feature
│   │   ├── charging-stations/  # Station management
│   │   ├── transactions/   # Transaction management
│   │   ├── authorizations/ # Authorization management
│   │   ├── smart-charging/ # Smart charging profiles
│   │   ├── monitoring/     # Device monitoring
│   │   ├── configuration/  # Configuration management
│   │   ├── certificates/   # Certificate management
│   │   ├── reservations/   # Reservation management
│   │   ├── reporting/      # Reports and analytics
│   │   └── locations/      # Location management
│   ├── graphql/            # GraphQL queries and mutations
│   │   ├── queries/        # GraphQL queries
│   │   ├── mutations/      # GraphQL mutations
│   │   └── subscriptions/  # GraphQL subscriptions
│   ├── hooks/              # Custom React hooks
│   ├── store/              # State management (Zustand)
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── config/             # Configuration files
│   │   ├── apolloClient.ts # Apollo Client setup
│   │   └── config.ts       # App configuration
│   ├── App.tsx             # Main App component
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── .env                    # Environment variables
├── .env.example            # Example environment file
├── Dockerfile              # Production Dockerfile
├── Dockerfile.dev          # Development Dockerfile
├── docker-compose.yml      # Docker Compose configuration
├── nginx.conf              # Nginx configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration
```

## Key Features Implementation

### GraphQL Integration

The application uses Apollo Client for GraphQL communication with Hasura:

- **Queries:** Fetch data from the database
- **Mutations:** Create, update, and delete operations (when implemented)
- **Subscriptions:** Real-time updates via WebSocket

Example query:

```typescript
import { useQuery } from '@apollo/client';
import { GET_CHARGING_STATIONS } from '../graphql/queries/chargingStations';

const { data, loading, error } = useQuery(GET_CHARGING_STATIONS, {
  variables: { limit: 25, offset: 0 },
  pollInterval: 5000, // Poll every 5 seconds
});
```

### Authentication

Simple username/password authentication configured via environment variables:

```typescript
// Login with credentials from .env
const login = useAuthStore((state) => state.login);
await login(username, password);
```

### Multi-Tenancy

Tenant isolation is handled via Hasura headers:

```typescript
// Automatically added to all GraphQL requests
headers: {
  'x-hasura-role': 'user',
  'x-hasura-tenant-id': tenantId,
}
```

### Real-time Updates

WebSocket subscriptions for live data:

```typescript
import { useSubscription } from '@apollo/client';
import { SUBSCRIBE_CHARGING_STATIONS } from '../graphql/queries/chargingStations';

const { data } = useSubscription(SUBSCRIBE_CHARGING_STATIONS, {
  variables: { where: {} },
});
```

## Development Guidelines

### Adding New Features

1. Create feature directory in `src/features/`
2. Add GraphQL queries/mutations in `src/graphql/`
3. Create components for the feature
4. Add routes in `src/App.tsx`
5. Update navigation in `src/components/layout/MainLayout.tsx`

### Code Style

- Use TypeScript for type safety
- Follow React hooks best practices
- Use Material-UI components consistently
- Keep components small and focused
- Use custom hooks for reusable logic

### Testing GraphQL Queries

Access Hasura Console at `http://localhost:8090/console` to:
- Test GraphQL queries
- View database schema
- Check permissions
- Monitor real-time subscriptions

## Troubleshooting

### GraphQL Connection Issues

- Verify Hasura is running: `http://localhost:8090/console`
- Check `.env` file for correct GraphQL URLs
- Ensure tenant ID exists in the database
- Check browser console for errors

### Authentication Issues

- Verify credentials in `.env` match your expectations
- Clear browser localStorage: `localStorage.clear()`
- Check that `x-hasura-tenant-id` header is being sent

### Build Issues

- Clear node_modules: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist .vite`
- Ensure Node.js version >= 22.11.0

## API Documentation

### Available GraphQL Entities

The frontend can query these Hasura entities:

- **ChargingStations** - Charging station information
- **Transactions** - Charging transactions
- **Evses** - EVSE (Electric Vehicle Supply Equipment)
- **Connectors** - Physical connectors
- **Authorizations** - ID tokens and authorizations
- **Locations** - Geographic locations
- **Tariffs** - Pricing information
- **MeterValues** - Energy meter readings
- **TransactionEvents** - Transaction lifecycle events
- **ChargingProfiles** - Smart charging profiles
- **Reservations** - Charging point reservations
- **VariableAttributes** - Device model variables
- **SecurityEvents** - Security event logs
- **StatusNotifications** - Connector status updates
- **Certificates** - Certificate management

## Performance Optimization

- Pagination for large datasets
- Polling intervals configurable per component
- GraphQL query result caching
- Lazy loading for routes
- Image optimization in production
- Gzip compression via Nginx

## Security Considerations

- Environment variables for sensitive configuration
- Nginx security headers
- Protected routes requiring authentication
- Tenant isolation via Hasura permissions
- XSS protection
- CSRF protection (when using mutations)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

When contributing to the frontend:

1. Follow the existing code structure
2. Add TypeScript types for new data models
3. Create reusable components when applicable
4. Test with real CitrineOS backend
5. Update documentation for new features

## Version Compatibility

- **CitrineOS Backend:** v1.7.2+
- **Hasura:** v2.40.3+
- **PostgreSQL:** 16+
- **Node.js:** 22.11.0+

## License

Apache 2.0 - See LICENSE file in the root directory

## Support

For issues and questions:
- GitHub Issues: https://github.com/citrineos/citrineos
- Documentation: https://citrineos.github.io

## Future Enhancements

- [ ] Complete all placeholder features
- [ ] Advanced filtering and search
- [ ] Data export (CSV, PDF)
- [ ] Custom dashboard widgets
- [ ] User preferences and saved views
- [ ] Notifications and alerts
- [ ] Mobile responsive optimizations
- [ ] Offline mode support
- [ ] Advanced analytics and reporting
- [ ] WebSocket reconnection handling
- [ ] Internationalization (i18n)
- [ ] Dark mode support
