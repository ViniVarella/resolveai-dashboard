import { Box, Grid, Paper, Typography, Button } from '@mui/material';

export default function Home() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Página Inicial</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Agenda do Dia</Typography>
            <Typography variant="h6">5 atendimentos</Typography>
            <Typography variant="body2">Filtrar por funcionário</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Faturamento Previsto</Typography>
            <Typography variant="h6">R$ 320,00</Typography>
            <Typography variant="body2">Baseado nos serviços agendados</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom>Adicionar Atendimento</Typography>
            <Button variant="contained" color="primary">Novo Atendimento</Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 