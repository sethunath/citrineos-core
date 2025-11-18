import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  Search,
  Visibility,
  Refresh,
  FiberManualRecord,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { GET_CHARGING_STATIONS } from '../../graphql/queries/chargingStations';
import type { ChargingStation } from '../../types';
import type { ChargingStationsData } from '../../types/graphql';
import { format } from 'date-fns';

export const ChargingStationsList = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');

  const { data, loading, error, refetch } = useQuery<ChargingStationsData>(GET_CHARGING_STATIONS, {
    variables: {
      limit: rowsPerPage,
      offset: page * rowsPerPage,
      where: searchTerm
        ? {
            _or: [
              { id: { _ilike: `%${searchTerm}%` } },
              { chargePointVendor: { _ilike: `%${searchTerm}%` } },
              { chargePointModel: { _ilike: `%${searchTerm}%` } },
              { chargePointSerialNumber: { _ilike: `%${searchTerm}%` } },
            ],
          }
        : {},
      orderBy: [{ updatedAt: 'desc' }],
    },
    pollInterval: 5000, // Poll every 5 seconds for updates
  });

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewStation = (stationId: string) => {
    navigate(`/charging-stations/${stationId}`);
  };

  const stations: ChargingStation[] = data?.ChargingStations || [];
  const totalCount = data?.ChargingStations_aggregate?.aggregate?.count || 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Charging Stations</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search by ID, vendor, model, or serial number..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {loading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Error loading charging stations: {error.message}
            </Alert>
          )}

          {!loading && !error && (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Station ID</TableCell>
                      <TableCell>Vendor</TableCell>
                      <TableCell>Model</TableCell>
                      <TableCell>Protocol</TableCell>
                      <TableCell>Serial Number</TableCell>
                      <TableCell>Firmware</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>EVSEs</TableCell>
                      <TableCell>Last Updated</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stations.map((station) => (
                      <TableRow key={station.id} hover>
                        <TableCell>
                          <Chip
                            icon={<FiberManualRecord />}
                            label={station.isOnline ? 'Online' : 'Offline'}
                            color={station.isOnline ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {station.id}
                          </Typography>
                        </TableCell>
                        <TableCell>{station.chargePointVendor || '-'}</TableCell>
                        <TableCell>{station.chargePointModel || '-'}</TableCell>
                        <TableCell>
                          <Chip label={station.protocol || 'Unknown'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{station.chargePointSerialNumber || '-'}</TableCell>
                        <TableCell>{station.firmwareVersion || '-'}</TableCell>
                        <TableCell>
                          {station.location?.name || '-'}
                          {station.location?.city && ` (${station.location.city})`}
                        </TableCell>
                        <TableCell>{station.evses?.length || 0}</TableCell>
                        <TableCell>
                          {format(new Date(station.updatedAt), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewStation(station.id)}
                          >
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {stations.length === 0 && (
                <Box py={4} textAlign="center">
                  <Typography variant="body1" color="textSecondary">
                    No charging stations found
                  </Typography>
                </Box>
              )}

              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
