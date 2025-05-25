import { Box, Grid, Paper, Typography } from '@mui/material';

export default function Home() {
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Agenda do Dia</Typography>
            <Typography variant="h6">5 atendimentos</Typography>
            <Typography variant="body2">Filtrar por funcionário</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Faturamento Previsto</Typography>
            <Typography variant="h6">R$ 320,00</Typography>
            <Typography variant="body2">Baseado nos serviços agendados</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 