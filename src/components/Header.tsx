import { AppBar, Toolbar, Avatar, IconButton, Box, Typography, Menu, MenuItem } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const pageTitles: Record<string, string> = {
  '/home': 'Página Inicial',
  '/services': 'Serviços',
  '/revenue': 'Faturamento',
  '/employees': 'Funcionários',
  '/schedule': 'Agenda',
  '/statistics': 'Estatísticas',
};

interface HeaderProps {
  open: boolean;
  sidebarWidth: number;
}

export default function Header({ open, sidebarWidth }: HeaderProps) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || '';
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleLogout = () => {
    setAnchorEl(null);
    localStorage.removeItem('auth');
    navigate('/login');
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: `calc(100% - ${sidebarWidth}px)`,
        ml: `${sidebarWidth}px`,
        transition: 'all 0.2s ease',
        zIndex: 1100,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 500 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton>
          <NotificationsIcon />
        </IconButton>
        <IconButton onClick={handleAvatarClick} sx={{ p: 0 }}>
          <Avatar alt="Admin" src="https://i.pravatar.cc/40?img=3" />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={handleLogout}>Sair</MenuItem>
        </Menu>
      </Box>
    </Box>
  );
} 