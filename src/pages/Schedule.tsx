import { Box, Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, styled, Button, Popover } from '@mui/material';
import { useState, useEffect } from 'react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, StaticDatePicker } from '@mui/x-date-pickers';
import { ptBR } from 'date-fns/locale';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { format, isSameDay, parseISO } from 'date-fns';

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

interface Funcionario {
  id: string;
  nome: string;
}

interface Agendamento {
  id: string;
  cliente: string;
  servico: {
    nome: string;
    preco: number;
    duracao: number;
  };
  funcionario: string;
  data: Timestamp;
  horario: string;
  status: string;
}

interface Empresa {
  id: string;
  funcionarios: string[];
}

export default function Schedule() {
  const { id: userId } = useUser();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState('');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const weekDays = getWeekRange(selectedDate);

  // Função para buscar o ID da empresa
  const fetchEmpresaId = async (userId: string): Promise<string | null> => {
    try {
      const empresasRef = collection(db, 'empresas');
      const q = query(empresasRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('Nenhuma empresa encontrada para o usuário:', userId);
        return null;
      }

      const empresaDoc = querySnapshot.docs[0];
      console.log('Empresa encontrada:', empresaDoc.id);
      return empresaDoc.id;
    } catch (error) {
      console.error('Erro ao buscar empresa:', error);
      return null;
    }
  };

  // Buscar funcionários da empresa
  useEffect(() => {
    async function fetchFuncionarios() {
      if (!userId) {
        setError('Usuário não autenticado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const empresaId = await fetchEmpresaId(userId);
        if (!empresaId) {
          setError('Empresa não encontrada');
          setLoading(false);
          return;
        }

        const empresaDoc = await getDoc(doc(db, 'empresas', empresaId));
        const empresaData = empresaDoc.data() as Empresa;
        
        if (!empresaData?.funcionarios?.length) {
          console.log('Nenhum funcionário cadastrado na empresa');
          setFuncionarios([]);
          setLoading(false);
          return;
        }

        const funcionariosPromises = empresaData.funcionarios.map(async (funcId) => {
          const funcDoc = await getDoc(doc(db, 'users', funcId));
          if (funcDoc.exists()) {
            return { id: funcDoc.id, ...funcDoc.data() } as Funcionario;
          }
          return null;
        });

        const funcionariosData = (await Promise.all(funcionariosPromises)).filter((f): f is Funcionario => f !== null);
        console.log('Funcionários encontrados:', funcionariosData.length);
        
        setFuncionarios(funcionariosData);
      } catch (error) {
        console.error('Erro ao buscar funcionários:', error);
        setError('Erro ao carregar funcionários');
      } finally {
        setLoading(false);
      }
    }

    fetchFuncionarios();
  }, [userId]);

  // Buscar agendamentos da semana
  useEffect(() => {
    async function fetchAgendamentos() {
      if (!userId) return;

      try {
        setLoading(true);
        const empresaId = await fetchEmpresaId(userId);
        if (!empresaId) return;

        // Calcular início e fim da semana
        const inicioSemana = weekDays[0];
        const fimSemana = weekDays[6];
        inicioSemana.setHours(0, 0, 0, 0);
        fimSemana.setHours(23, 59, 59, 999);

        console.log('Buscando agendamentos entre:', inicioSemana, 'e', fimSemana);

        // Buscar agendamentos
        const agendamentosRef = collection(db, 'agendamentos');
        const q = query(
          agendamentosRef,
          where('empresaId', '==', empresaId),
          where('data', '>=', Timestamp.fromDate(inicioSemana)),
          where('data', '<=', Timestamp.fromDate(fimSemana))
        );

        const querySnapshot = await getDocs(q);
        const agendamentosData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Agendamento[];

        console.log('Agendamentos encontrados:', agendamentosData.length);
        setAgendamentos(agendamentosData);
      } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        setError('Erro ao carregar agendamentos');
      } finally {
        setLoading(false);
      }
    }

    fetchAgendamentos();
  }, [userId, weekDays]);

  const handleOpenWeekPicker = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseWeekPicker = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  // Função para encontrar agendamentos em um horário específico
  const getAgendamentosNoHorario = (hora: string, data: Date) => {
    return agendamentos.filter(ag => {
      const agData = ag.data.toDate();
      return (
        ag.horario === hora &&
        isSameDay(agData, data) &&
        (!funcionarioSelecionado || ag.funcionario === funcionarioSelecionado)
      );
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Typography>Carregando agenda...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: 'error.main' }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Agenda
      </Typography>
      <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minHeight: 400, height: 650, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <CardHeader>
            <Typography variant="h6" color="#aaa" sx={{ fontSize: theme => `calc(${theme.typography.h6.fontSize} + 7px)` }}>Calendário</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                sx={{ color: '#fff', borderColor: '#fff', textTransform: 'none', bgcolor: '#222', '&:hover': { bgcolor: '#333' }, display: 'flex', alignItems: 'end', height: 40, minHeight: 40, minWidth: 180 }}
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
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel sx={{ color: '#fff' }}>Funcionário</InputLabel>
                <StyledSelect
                  value={funcionarioSelecionado}
                  label="Funcionário"
                  onChange={e => setFuncionarioSelecionado(e.target.value as string)}
                  MenuProps={{ PaperProps: { sx: { background: '#222', color: '#fff' } } }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {funcionarios.map(func => (
                    <MenuItem key={func.id} value={func.id}>{func.nome}</MenuItem>
                  ))}
                </StyledSelect>
              </FormControl>
            </Box>
          </CardHeader>
          <Box sx={{ flex: 1, bgcolor: '#181818', borderRadius: 3, p: 2, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
            {/* Cabeçalho dos dias da semana com coluna 'Horário' */}
            <Box sx={{ display: 'grid', gridTemplateColumns: `80px repeat(7, 1fr)`, mb: 1, borderRadius: 3, overflow: 'hidden' }}>
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
            <Box sx={{ flex: 1, display: 'grid', gridTemplateRows: `repeat(${horas.length}, 1fr)`, gridTemplateColumns: `80px repeat(7, 1fr)`, gap: 0, height: '100%', overflowY: 'auto' }}>
              {horas.map((hora, rowIdx) => [
                <Box key={`${hora}-hora`} sx={{ border: '1px solid #222', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#aaa', bgcolor: '#181818', fontWeight: 600 }}>
                  {hora}
                </Box>,
                ...weekDays.map((data, colIdx) => {
                  const agendamentosNoHorario = getAgendamentosNoHorario(hora, data);
                  return (
                    <Box 
                      key={`${hora}-${colIdx}`} 
                      sx={{ 
                        border: '1px solid #222', 
                        minHeight: 56, 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: 14,
                        color: agendamentosNoHorario.length > 0 ? '#fff' : '#888',
                        bgcolor: agendamentosNoHorario.length > 0 ? '#333' : 'transparent',
                        p: 1,
                        gap: 0.5
                      }}
                    >
                      {agendamentosNoHorario.map(ag => (
                        <Box key={ag.id} sx={{ textAlign: 'center', width: '100%' }}>
                          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{ag.cliente}</Typography>
                          <Typography sx={{ fontSize: 12, color: '#aaa' }}>{ag.servico.nome}</Typography>
                          <Typography sx={{ fontSize: 12, color: '#aaa' }}>
                            R$ {Number(ag.servico.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  );
                })
              ])}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
} 