import { AppBar, Toolbar, Avatar, IconButton, Box, Typography, Menu, MenuItem } from '@mui/material';
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

  const fotoPerfil = localStorage.getItem('fotoPerfil') || '/@image.png';

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
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={handleAvatarClick} sx={{ p: 0 }}>
          <Avatar alt="Admin" src={fotoPerfil} />
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