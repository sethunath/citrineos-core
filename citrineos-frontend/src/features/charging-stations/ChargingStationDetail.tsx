import { useQuery } from '@apollo/client';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack,
  FiberManualRecord,
  Refresh,
} from '@mui/icons-material';
import { GET_CHARGING_STATION } from '../../graphql/queries/chargingStations';
import { format } from 'date-fns';
import { useState } from 'react';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

export const ChargingStationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const { data, loading, error, refetch } = useQuery(GET_CHARGING_STATION, {
    variables: { id },
    skip: !id,
    pollInterval: 5000,
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data?.ChargingStations_by_pk) {
    return (
      <Alert severity="error">
        Error loading charging station: {error?.message || 'Station not found'}
      </Alert>
    );
  }

  const station = data.ChargingStations_by_pk;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/charging-stations')}>
            Back
          </Button>
          <Typography variant="h4">Station: {station.id}</Typography>
          <Chip
            icon={<FiberManualRecord />}
            label={station.isOnline ? 'Online' : 'Offline'}
            color={station.isOnline ? 'success' : 'error'}
          />
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => refetch()}>
          Refresh
        </Button>
      </Box>

      {/* Station Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Station Information
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="textSecondary">
                Vendor
              </Typography>
              <Typography variant="body1">{station.chargePointVendor || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="textSecondary">
                Model
              </Typography>
              <Typography variant="body1">{station.chargePointModel || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="textSecondary">
                Protocol
              </Typography>
              <Typography variant="body1">{station.protocol || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="textSecondary">
                Firmware Version
              </Typography>
              <Typography variant="body1">{station.firmwareVersion || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="textSecondary">
                Charge Point Serial
              </Typography>
              <Typography variant="body1">{station.chargePointSerialNumber || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="textSecondary">
                Charge Box Serial
              </Typography>
              <Typography variant="body1">{station.chargeBoxSerialNumber || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="textSecondary">
                ICCID
              </Typography>
              <Typography variant="body1">{station.iccid || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="textSecondary">
                IMSI
              </Typography>
              <Typography variant="body1">{station.imsi || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="textSecondary">
                Meter Type
              </Typography>
              <Typography variant="body1">{station.meterType || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="textSecondary">
                Meter Serial
              </Typography>
              <Typography variant="body1">{station.meterSerialNumber || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="textSecondary">
                Created At
              </Typography>
              <Typography variant="body1">
                {format(new Date(station.createdAt), 'MMM dd, yyyy HH:mm')}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="textSecondary">
                Updated At
              </Typography>
              <Typography variant="body1">
                {format(new Date(station.updatedAt), 'MMM dd, yyyy HH:mm')}
              </Typography>
            </Grid>
          </Grid>

          {station.location && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>
                Location
              </Typography>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="textSecondary">
                    Name
                  </Typography>
                  <Typography variant="body1">{station.location.name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="textSecondary">
                    Address
                  </Typography>
                  <Typography variant="body1">{station.location.address || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="textSecondary">
                    City
                  </Typography>
                  <Typography variant="body1">{station.location.city || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="textSecondary">
                    Country
                  </Typography>
                  <Typography variant="body1">{station.location.country || '-'}</Typography>
                </Grid>
              </Grid>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabs for detailed information */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label={`EVSEs (${station.evses?.length || 0})`} />
            <Tab label={`Transactions (${station.transactions?.length || 0})`} />
            <Tab label={`Status Notifications (${station.statusNotifications?.length || 0})`} />
          </Tabs>
        </Box>

        {/* EVSEs Tab */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>EVSE ID</TableCell>
                  <TableCell>Physical Reference</TableCell>
                  <TableCell>Connectors</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Active Transactions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {station.evses?.map((evse: any) => (
                  <TableRow key={evse.id}>
                    <TableCell>{evse.evseId || '-'}</TableCell>
                    <TableCell>{evse.physicalReference || '-'}</TableCell>
                    <TableCell>{evse.connectors?.length || 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={evse.removed ? 'Removed' : 'Active'}
                        color={evse.removed ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{evse.transactions?.length || 0}</TableCell>
                  </TableRow>
                ))}
                {!station.evses?.length && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="textSecondary" py={2}>
                        No EVSEs found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Transactions Tab */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Transaction ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Charging State</TableCell>
                  <TableCell>Energy (kWh)</TableCell>
                  <TableCell>Cost</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {station.transactions?.map((transaction: any) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.transactionId}</TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.isActive ? 'Active' : 'Completed'}
                        color={transaction.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{transaction.chargingState || '-'}</TableCell>
                    <TableCell>{transaction.totalKwh?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>${transaction.totalCost?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      {transaction.timeSpentCharging
                        ? `${Math.floor(transaction.timeSpentCharging / 60)}m`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(transaction.createdAt), 'MMM dd, HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
                {!station.transactions?.length && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="textSecondary" py={2}>
                        No transactions found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Status Notifications Tab */}
        <TabPanel value={tabValue} index={2}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Connector Status</TableCell>
                  <TableCell>EVSE ID</TableCell>
                  <TableCell>Connector ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {station.statusNotifications?.map((notification: any) => (
                  <TableRow key={notification.id}>
                    <TableCell>
                      {format(new Date(notification.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Chip label={notification.connectorStatus} size="small" />
                    </TableCell>
                    <TableCell>{notification.evseId || '-'}</TableCell>
                    <TableCell>{notification.connectorId || '-'}</TableCell>
                  </TableRow>
                ))}
                {!station.statusNotifications?.length && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="textSecondary" py={2}>
                        No status notifications found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>
    </Box>
  );
};
