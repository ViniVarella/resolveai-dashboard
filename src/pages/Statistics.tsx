import { Box, Paper, Typography } from '@mui/material';

export default function Statistics() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Estatísticas
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Typography variant="body1">
          Gráficos e análises de desempenho
        </Typography>
      </Paper>
    </Box>
  );
} 