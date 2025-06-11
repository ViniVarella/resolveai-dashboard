import { Avatar, IconButton, Box, Menu, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface HeaderProps {
  sidebarWidth: number;
}

export default function Header({ sidebarWidth }: HeaderProps) {
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