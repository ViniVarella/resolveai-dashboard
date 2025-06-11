import { Box, Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, styled, Button, Popover } from '@mui/material';
import { useState } from 'react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, StaticDatePicker } from '@mui/x-date-pickers';
import { ptBR } from 'date-fns/locale';

const CardHeader = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
  width: '100%',
});

const StyledSelect = styled(Select)({
  color: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' }
});

const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const diasSemanaAbrev = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const horas = Array.from({ length: 11 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`); // 08:00 às 18:00

function getWeekRange(date: Date) {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  return days;
}

function formatWeekLabel(days: Date[]) {
  const first = days[0];
  const last = days[6];
  return `${first.getDate().toString().padStart(2, '0')}–${last.getDate().toString().padStart(2, '0')} de ${last.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
}

export default function Schedule() {
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekDays = getWeekRange(selectedDate);

  const handleOpenWeekPicker = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseWeekPicker = () => {
    setAnchorEl(null);
  };
  const open = Boolean(anchorEl);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Agenda
      </Typography>
      <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minHeight: 400, height: 650, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <CardHeader>
            <Typography variant="h5" color="#aaa">Calendário</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                sx={{ color: '#fff', borderColor: '#fff', textTransform: 'none', bgcolor: '#222', '&:hover': { bgcolor: '#333' } }}
                onClick={handleOpenWeekPicker}
              >
                {formatWeekLabel(weekDays)}
              </Button>
              <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleCloseWeekPicker}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                  <StaticDatePicker
                    displayStaticWrapperAs="desktop"
                    value={selectedDate}
                    onChange={date => {
                      if (date) setSelectedDate(date);
                      handleCloseWeekPicker();
                    }}
                    showDaysOutsideCurrentMonth
                  />
                </LocalizationProvider>
              </Popover>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: '#fff' }}>Funcionário</InputLabel>
                <StyledSelect
                  value={funcionarioSelecionado}
                  label="Funcionário"
                  onChange={e => setFuncionarioSelecionado(e.target.value as string)}
                  MenuProps={{ PaperProps: { sx: { background: '#222', color: '#fff' } } }}
                >
                  <MenuItem value={''}>Todos</MenuItem>
                  <MenuItem value={'func1'}>Funcionário 1</MenuItem>
                  <MenuItem value={'func2'}>Funcionário 2</MenuItem>
                </StyledSelect>
              </FormControl>
            </Box>
          </CardHeader>
          <Box sx={{ flex: 1, bgcolor: '#181818', borderRadius: 3, p: 2, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
            {/* Cabeçalho dos dias da semana com coluna 'Horário' */}
            <Box sx={{ display: 'grid', gridTemplateColumns: `80px repeat(6, 1fr) 1.2fr`, mb: 1, borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ bgcolor: '#111', p: 2, textAlign: 'center', borderTopLeftRadius: 12, minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #222' }}>
                <Typography fontWeight={700} fontSize={17}>Horário</Typography>
              </Box>
              {weekDays.map((d, idx) => (
                <Box key={idx} sx={{ bgcolor: '#111', p: 2, borderRight: idx < 6 ? '1px solid #222' : 'none', minHeight: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography fontWeight={600} fontSize={22}>{d.getDate().toString().padStart(2, '0')}</Typography>
                  <Typography fontSize={16} sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{diasSemana[d.getDay()]}</Typography>
                </Box>
              ))}
            </Box>
            {/* Linhas de horas com coluna fixa de horários */}
            <Box sx={{ flex: 1, display: 'grid', gridTemplateRows: `repeat(${horas.length}, 1fr)`, gridTemplateColumns: `80px repeat(6, 1fr) 1.2fr`, gap: 0, height: '100%', overflowY: 'auto' }}>
              {horas.map((hora, rowIdx) => [
                <Box key={hora + '-hora'} sx={{ border: '1px solid #222', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#aaa', bgcolor: '#181818', fontWeight: 600 }}>
                  {hora}
                </Box>,
                ...weekDays.map((_, colIdx) => (
                  <Box key={hora + '-' + colIdx} sx={{ border: '1px solid #222', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#888' }}>
                    {/* Aqui futuramente exibir agendamentos */}
                  </Box>
                ))
              ])}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
} 