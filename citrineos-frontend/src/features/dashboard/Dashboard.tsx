import { useQuery, useSubscription } from '@apollo/client/react';
import { Stack } from '@mui/material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import {
  EvStation,
  Receipt,
  BoltOutlined,
  TrendingUp,
  CheckCircle,
} from '@mui/icons-material';
import { GET_CHARGING_STATIONS_STATS } from '../../graphql/queries/chargingStations';
import { GET_ACTIVE_TRANSACTIONS } from '../../graphql/queries/transactions';
import { SUBSCRIBE_CHARGING_STATIONS } from '../../graphql/queries/chargingStations';
import { SUBSCRIBE_TRANSACTIONS } from '../../graphql/queries/transactions';
import type { ChargingStationsStatsData, ActiveTransactionsData } from '../../types/graphql';
import { formatDistanceToNow } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useState, useEffect } from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactElement;
  color: string;
  subtitle?: string;
}

const StatCard = ({ title, value, icon, color, subtitle }: StatCardProps) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: `${color}.main`,
            color: 'white',
            p: 1.5,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const Dashboard = () => {
  const { data: stationsData, loading: stationsLoading, error: stationsError } = useQuery<ChargingStationsStatsData>(GET_CHARGING_STATIONS_STATS);
  const { data: transactionsData, loading: transactionsLoading } = useQuery<ActiveTransactionsData>(GET_ACTIVE_TRANSACTIONS);

  // Subscribe to real-time updates
  useSubscription(SUBSCRIBE_CHARGING_STATIONS, {
    variables: { where: {} },
  });

  useSubscription(SUBSCRIBE_TRANSACTIONS, {
    variables: { where: { isActive: { _eq: true } } },
  });

  const [energyData, setEnergyData] = useState<any[]>([]);

  useEffect(() => {
    if (transactionsData?.Transactions) {
      // Generate mock energy consumption data for the chart
      const data = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        energy: Math.random() * 100 + 50,
      }));
      setEnergyData(data);
    }
  }, [transactionsData]);

  if (stationsLoading || transactionsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (stationsError) {
    return (
      <Alert severity="error">
        Error loading dashboard data: {stationsError.message}
      </Alert>
    );
  }

  const totalStations = stationsData?.total?.aggregate?.count || 0;
  const onlineStations = stationsData?.online?.aggregate?.count || 0;
  const offlineStations = stationsData?.offline?.aggregate?.count || 0;
  const activeTransactions = transactionsData?.Transactions?.length || 0;

  const totalEnergy = transactionsData?.Transactions?.reduce(
    (sum: number, t: any) => sum + (t.totalKwh || 0),
    0
  ) || 0;

  const totalRevenue = transactionsData?.Transactions?.reduce(
    (sum: number, t: any) => sum + (t.totalCost || 0),
    0
  ) || 0;

  const pieData = [
    { name: 'Online', value: onlineStations, color: '#4caf50' },
    { name: 'Offline', value: offlineStations, color: '#f44336' },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      <Stack spacing={3}>
        {/* Statistics Cards */}
        <Box>
          <StatCard
            title="Total Stations"
            value={totalStations}
            icon={<EvStation />}
            color="primary"
            subtitle={`${onlineStations} online, ${offlineStations} offline`}
          />
        </Box>
        <Box>
          <StatCard
            title="Active Sessions"
            value={activeTransactions}
            icon={<Receipt />}
            color="success"
            subtitle="Charging now"
          />
        </Box>
        <Box>
          <StatCard
            title="Energy (kWh)"
            value={totalEnergy.toFixed(2)}
            icon={<BoltOutlined />}
            color="warning"
            subtitle="Active sessions"
          />
        </Box>
        <Box>
          <StatCard
            title="Revenue"
            value={`$${totalRevenue.toFixed(2)}`}
            icon={<TrendingUp />}
            color="info"
            subtitle="Active sessions"
          />
        </Box>

        {/* Station Status Chart */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Station Status
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Energy Consumption Chart */}
        <Box sx={{ flex: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Energy Consumption (24h)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={energyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    stroke="#8884d8"
                    name="Energy (kWh)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Recent Active Transactions */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Charging Sessions
              </Typography>
              {transactionsData?.Transactions && transactionsData.Transactions.length > 0 ? (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                  {transactionsData.Transactions.slice(0, 6).map((transaction: any) => (
                    <Box key={transaction.id} sx={{ flex: '1 1 300px' }}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2" noWrap>
                            {transaction.station?.chargePointModel || 'Unknown Station'}
                          </Typography>
                          <Chip
                            label={transaction.chargingState || 'Charging'}
                            size="small"
                            color="success"
                            icon={<CheckCircle />}
                          />
                        </Box>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          Station: {transaction.stationId}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          EVSE: {transaction.evse?.evseId || 'N/A'}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                          <Box>
                            <Typography variant="caption" color="textSecondary">
                              Energy
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {transaction.totalKwh?.toFixed(2) || '0.00'} kWh
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="textSecondary">
                              Cost
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              ${transaction.totalCost?.toFixed(2) || '0.00'}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                          Started {formatDistanceToNow(new Date(transaction.createdAt))} ago
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ py: 4, textAlign: 'center' }}>
                  No active charging sessions
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
};
