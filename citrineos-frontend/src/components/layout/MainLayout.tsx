import { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  EvStation,
  Receipt,
  PersonOutline,
  BoltOutlined,
  Monitor,
  Settings,
  Security,
  EventAvailable,
  Assessment,
  LocationOn,
  AccountCircle,
  Logout,
  Business,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { config } from '../../config/config';

const drawerWidth = 280;

interface NavItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  divider?: boolean;
}

const navItems: NavItem[] = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/' },
  { text: 'Charging Stations', icon: <EvStation />, path: '/charging-stations' },
  { text: 'Transactions', icon: <Receipt />, path: '/transactions' },
  { text: 'Authorizations', icon: <PersonOutline />, path: '/authorizations', divider: true },
  { text: 'Smart Charging', icon: <BoltOutlined />, path: '/smart-charging' },
  { text: 'Monitoring', icon: <Monitor />, path: '/monitoring' },
  { text: 'Configuration', icon: <Settings />, path: '/configuration' },
  { text: 'Certificates', icon: <Security />, path: '/certificates' },
  { text: 'Reservations', icon: <EventAvailable />, path: '/reservations', divider: true },
  { text: 'Reporting', icon: <Assessment />, path: '/reporting' },
  { text: 'Locations', icon: <LocationOn />, path: '/locations' },
];

export const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { username, logout, tenantId } = useAuthStore();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawer = (
    <Box>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" noWrap component="div">
          CitrineOS
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <Box key={item.text}>
            <ListItem disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
            {item.divider && <Divider sx={{ my: 1 }} />}
          </Box>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navItems.find((item) => item.path === location.pathname)?.text ||
              'CitrineOS Management'}
          </Typography>
          <Chip
            icon={<Business />}
            label={`Tenant ${tenantId}`}
            size="small"
            sx={{ mr: 2, bgcolor: 'rgba(255,255,255,0.2)' }}
          />
          <IconButton color="inherit" onClick={handleMenuOpen}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {username?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem disabled>
              <AccountCircle sx={{ mr: 1 }} />
              {username}
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'grey.50',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};
