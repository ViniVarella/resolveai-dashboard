import { Avatar, Box } from '@mui/material';

export default function Header() {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        zIndex: 2000,
        p: 2,
      }}
    >
      <Avatar alt="Admin" src="https://i.pravatar.cc/40?img=3" />
    </Box>
  );
} 