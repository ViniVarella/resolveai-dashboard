import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, Box, Typography, IconButton, Tooltip, ListItemButton } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BuildIcon from '@mui/icons-material/Build';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

const expandedWidth = 220;
const collapsedWidth = 64;

const menuItems = [
  { text: 'Página Inicial', icon: <DashboardIcon />, path: '/home' },
  { text: 'Serviços', icon: <BuildIcon />, path: '/services' },
  { text: 'Faturamento', icon: <AttachMoneyIcon />, path: '/revenue' },
  { text: 'Funcionários', icon: <PeopleIcon />, path: '/employees' },
  { text: 'Agenda', icon: <CalendarMonthIcon />, path: '/schedule' },
  { text: 'Estatísticas', icon: <BarChartIcon />, path: '/statistics' },
];

export default function Sidebar() {
  const location = useLocation();
  const [open, setOpen] = useState(true);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? expandedWidth : collapsedWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        [`& .MuiDrawer-paper`]: {
          width: open ? expandedWidth : collapsedWidth,
          transition: 'width 0.2s',
          overflowX: 'hidden',
          bgcolor: 'background.paper',
        },
      }}
    >
      <Toolbar
        sx={{
          minHeight: 64,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          position: 'relative',
          ...(open ? {} : { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', px: 0 }),
        }}
      >
        <Box
          sx={{
            height: 40,
            width: open ? 'auto' : 32,
            flex: open ? 1 : 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="h6"
            noWrap
            fontWeight={700}
            sx={{ lineHeight: 1, visibility: open ? 'visible' : 'hidden' }}
          >
            ResolveAi
          </Typography>
          <Typography
            variant="subtitle2"
            noWrap
            fontWeight={400}
            sx={{ lineHeight: 1, visibility: open ? 'visible' : 'hidden' }}
          >
            Dashboard
          </Typography>
        </Box>
        <Tooltip title={open ? 'Recolher' : 'Expandir'}>
          <IconButton
            onClick={() => setOpen((prev) => !prev)}
            size="small"
            sx={{
              ml: open ? 1 : 0,
              alignSelf: open ? 'center' : 'unset',
              position: open ? 'relative' : 'absolute',
              left: open ? 'unset' : '50%',
              top: open ? 'unset' : 16,
              transform: open ? 'none' : 'translateX(-50%)',
              zIndex: 2,
            }}
          >
            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Tooltip>
      </Toolbar>
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{ px: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 0, width: 32, mr: 2 }}>{item.icon}</ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ 
                    minWidth: 0, 
                    opacity: open ? 1 : 0, 
                    transition: 'opacity 0.2s', 
                    width: open ? 'auto' : 0, 
                    overflow: 'hidden',
                  }} 
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
} 