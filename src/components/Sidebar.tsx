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
import { SIDEBAR_WIDTH } from '../App';

const menuItems = [
  { text: 'Página Inicial', icon: <DashboardIcon />, path: '/home' },
  { text: 'Serviços', icon: <BuildIcon />, path: '/services' },
  { text: 'Faturamento', icon: <AttachMoneyIcon />, path: '/revenue' },
  { text: 'Funcionários', icon: <PeopleIcon />, path: '/employees' },
  { text: 'Agenda', icon: <CalendarMonthIcon />, path: '/schedule' },
  { text: 'Estatísticas', icon: <BarChartIcon />, path: '/statistics' },
];

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const location = useLocation();
  
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        minWidth: 0,
        overflowX: 'hidden',
        [`& .MuiDrawer-paper`]: {
          width: open ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed,
          transition: 'width 0.2s',
          overflowX: 'hidden',
          bgcolor: 'background.paper',
          minWidth: 0,
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
            onClick={() => setOpen(!open)}
            size="small"
            sx={{
              ml: open ? 1 : 0,
              alignSelf: 'center',
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
      <Box sx={{ overflow: 'auto', overflowX: 'hidden', width: '100%' }}>
        <List sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{ 
                  px: 0,
                  justifyContent: 'flex-start',
                  minHeight: 48,
                  width: '100%',
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: 0,
                  width: `${SIDEBAR_WIDTH.collapsed}px`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  transition: 'width 0.2s',
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ 
                    minWidth: 0, 
                    opacity: open ? 1 : 0, 
                    transition: 'opacity 0.2s, width 0.2s, margin-left 0.2s', 
                    width: open ? 'auto' : 0, 
                    overflow: 'hidden',
                    ml: open && (typeof window === 'undefined' || window.getComputedStyle(document.body).direction !== 'rtl') ? 1.5 : 0,
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