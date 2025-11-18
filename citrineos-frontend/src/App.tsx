import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client/react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { apolloClient } from './config/apolloClient';
import { Login } from './components/auth/Login';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './features/dashboard/Dashboard';
import { ChargingStationsList } from './features/charging-stations/ChargingStationsList';
import { ChargingStationDetail } from './features/charging-stations/ChargingStationDetail';
import { TransactionsList } from './features/transactions/TransactionsList';

// Placeholder components for features
const Authorizations = () => <div>Authorizations (Coming Soon)</div>;
const SmartCharging = () => <div>Smart Charging (Coming Soon)</div>;
const Monitoring = () => <div>Monitoring (Coming Soon)</div>;
const Configuration = () => <div>Configuration (Coming Soon)</div>;
const Certificates = () => <div>Certificates (Coming Soon)</div>;
const Reservations = () => <div>Reservations (Coming Soon)</div>;
const Reporting = () => <div>Reporting (Coming Soon)</div>;
const Locations = () => <div>Locations (Coming Soon)</div>;

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    success: {
      main: '#4caf50',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="charging-stations" element={<ChargingStationsList />} />
              <Route path="charging-stations/:id" element={<ChargingStationDetail />} />
              <Route path="transactions" element={<TransactionsList />} />
              <Route path="authorizations" element={<Authorizations />} />
              <Route path="smart-charging" element={<SmartCharging />} />
              <Route path="monitoring" element={<Monitoring />} />
              <Route path="configuration" element={<Configuration />} />
              <Route path="certificates" element={<Certificates />} />
              <Route path="reservations" element={<Reservations />} />
              <Route path="reporting" element={<Reporting />} />
              <Route path="locations" element={<Locations />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ApolloProvider>
  );
}

export default App;
