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
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Search,
  Visibility,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { GET_TRANSACTIONS } from '../../graphql/queries/transactions';
import type { TransactionsData } from '../../types/graphql';
import type { Transaction } from '../../types';
import { format } from 'date-fns';

type FilterType = 'all' | 'active' | 'completed';

export const TransactionsList = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const buildWhere = () => {
    const conditions: any = {};

    if (filter === 'active') {
      conditions.isActive = { _eq: true };
    } else if (filter === 'completed') {
      conditions.isActive = { _eq: false };
    }

    if (searchTerm) {
      conditions._or = [
        { transactionId: { _ilike: `%${searchTerm}%` } },
        { stationId: { _ilike: `%${searchTerm}%` } },
      ];
    }

    return conditions;
  };

  const { data, loading, error, refetch } = useQuery<TransactionsData>(GET_TRANSACTIONS, {
    variables: {
      limit: rowsPerPage,
      offset: page * rowsPerPage,
      where: buildWhere(),
      orderBy: [{ createdAt: 'desc' }],
    },
    pollInterval: 5000,
  });

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewTransaction = (transactionId: number) => {
    navigate(`/transactions/${transactionId}`);
  };

  const handleFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: FilterType | null) => {
    if (newFilter !== null) {
      setFilter(newFilter);
      setPage(0);
    }
  };

  const transactions: Transaction[] = data?.Transactions || [];
  const totalCount = data?.Transactions_aggregate?.aggregate?.count || 0;
  const totalEnergy = data?.Transactions_aggregate?.aggregate?.sum?.totalKwh || 0;
  const totalCost = data?.Transactions_aggregate?.aggregate?.sum?.totalCost || 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Transactions</Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => refetch()}>
          Refresh
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="textSecondary">
              Total Transactions
            </Typography>
            <Typography variant="h5">{totalCount}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="textSecondary">
              Total Energy
            </Typography>
            <Typography variant="h5">{totalEnergy.toFixed(2)} kWh</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="textSecondary">
              Total Cost
            </Typography>
            <Typography variant="h5">${totalCost.toFixed(2)}</Typography>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search by transaction ID or station ID..."
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
            />
            <ToggleButtonGroup
              value={filter}
              exclusive
              onChange={handleFilterChange}
              aria-label="transaction filter"
            >
              <ToggleButton value="all" aria-label="all transactions">
                All
              </ToggleButton>
              <ToggleButton value="active" aria-label="active transactions">
                Active
              </ToggleButton>
              <ToggleButton value="completed" aria-label="completed transactions">
                Completed
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {loading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Error loading transactions: {error.message}
            </Alert>
          )}

          {!loading && !error && (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Transaction ID</TableCell>
                      <TableCell>Station</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>EVSE</TableCell>
                      <TableCell>Charging State</TableCell>
                      <TableCell>Energy (kWh)</TableCell>
                      <TableCell>Cost</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Started At</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id} hover>
                        <TableCell>
                          <Chip
                            label={transaction.isActive ? 'Active' : 'Completed'}
                            color={transaction.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {transaction.transactionId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{transaction.stationId}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {transaction.station?.chargePointModel || ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {transaction.station?.location?.name || '-'}
                          {transaction.station?.location?.city && (
                            <Typography variant="caption" color="textSecondary" display="block">
                              {transaction.station.location.city}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{transaction.evse?.evseId || '-'}</TableCell>
                        <TableCell>
                          <Chip label={transaction.chargingState || 'Unknown'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{transaction.totalKwh?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>${transaction.totalCost?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>
                          {transaction.timeSpentCharging
                            ? `${Math.floor(transaction.timeSpentCharging / 60)}m ${transaction.timeSpentCharging % 60}s`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(transaction.createdAt), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewTransaction(transaction.id)}
                          >
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {transactions.length === 0 && (
                <Box py={4} textAlign="center">
                  <Typography variant="body1" color="textSecondary">
                    No transactions found
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
