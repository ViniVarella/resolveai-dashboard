import { Box, Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, styled, Button, Popover } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
  funcionarioId: string;
  data: Timestamp;
  horaInicio: string;
  horaFim: string;
  status: string;
}

interface Empresa {
  id: string;
  funcionarios: string[];
}

export default function Schedule() {
  const { id: userId } = useUser();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<string>('');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoizar weekDays para evitar recálculos desnecessários
  const weekDays = useMemo(() => getWeekRange(selectedDate), [selectedDate]);

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

  // Consolidar o carregamento de dados em uma única função
  const loadData = useCallback(async () => {
    if (!userId) {
      console.log('ERRO: User ID não encontrado');
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      console.log('Iniciando carregamento de dados...');
      setLoading(true);
      setError(null);

      // Buscar ID da empresa
      const empresaId = await fetchEmpresaId(userId);
      if (!empresaId) {
        console.log('ERRO: Empresa não encontrada');
        setError('Empresa não encontrada');
        setLoading(false);
        return;
      }

      console.log('Empresa encontrada:', empresaId);

      // Buscar funcionários
      const empresaRef = doc(db, 'empresas', empresaId);
      const empresaDoc = await getDoc(empresaRef);
      
      if (!empresaDoc.exists()) {
        console.log('ERRO: Documento da empresa não encontrado');
        setError('Empresa não encontrada');
        setLoading(false);
        return;
      }

      const empresaData = empresaDoc.data();
      const funcionariosIds = empresaData.funcionarios || [];
      
      if (funcionariosIds.length === 0) {
        console.log('Nenhum funcionário encontrado na empresa');
        setFuncionarios([]);
      } else {
        const funcionariosPromises = funcionariosIds.map(async (funcId: string) => {
          const funcRef = doc(db, 'users', funcId);
          const funcDoc = await getDoc(funcRef);
          
          if (funcDoc.exists()) {
            const funcData = funcDoc.data();
            return {
              id: funcId,
              nome: funcData.nome || 'Sem nome'
            };
          }
          return null;
        });

        const funcionariosData = (await Promise.all(funcionariosPromises))
          .filter((f): f is { id: string; nome: string } => f !== null);
        console.log('Funcionários encontrados:', funcionariosData);
        setFuncionarios(funcionariosData);
      }

      // Buscar agendamentos usando weekDays memoizado
      const inicioSemana = weekDays[0];
      const fimSemana = weekDays[6];
      inicioSemana.setHours(0, 0, 0, 0);
      fimSemana.setHours(23, 59, 59, 999);

      console.log('Buscando agendamentos entre:', inicioSemana.toLocaleString(), 'e', fimSemana.toLocaleString());

      const agendamentosRef = collection(db, 'agendamentos');
      const q = query(
        agendamentosRef,
        where('empresaId', '==', empresaId),
        where('data', '>=', Timestamp.fromDate(inicioSemana)),
        where('data', '<=', Timestamp.fromDate(fimSemana)),
        where('status', '==', 'agendado')
      );

      const querySnapshot = await getDocs(q);
      console.log('Total de agendamentos encontrados:', querySnapshot.size);

      const agendamentosPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        const clienteRef = doc(db, 'users', data.clienteId);
        const clienteDoc = await getDoc(clienteRef);
        const clienteNome = clienteDoc.exists() ? (clienteDoc.data() as { nome: string }).nome : 'Cliente não encontrado';
        
        const funcionarioRef = doc(db, 'users', data.funcionarioId);
        const funcionarioDoc = await getDoc(funcionarioRef);
        const funcionarioNome = funcionarioDoc.exists() ? (funcionarioDoc.data() as { nome: string }).nome : 'Funcionário não encontrado';

        return {
          id: docSnapshot.id,
          ...data,
          cliente: clienteNome,
          funcionario: funcionarioNome,
          funcionarioId: data.funcionarioId,
          horaInicio: data.horaInicio || '08:00',
          horaFim: data.horaFim || '09:00'
        } as Agendamento;
      });

      const agendamentosData = await Promise.all(agendamentosPromises);
      console.log('Agendamentos processados:', agendamentosData.length);
      setAgendamentos(agendamentosData);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [userId, weekDays]); // Agora weekDays é memoizado

  // Usar um único useEffect para carregar os dados
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Atualizar o useEffect para selecionar o primeiro funcionário quando a lista for carregada
  useEffect(() => {
    if (funcionarios.length > 0 && !funcionarioSelecionado) {
      setFuncionarioSelecionado(funcionarios[0].id);
    }
  }, [funcionarios]);

  // Handlers para os filtros
  const handleOpenWeekPicker = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseWeekPicker = () => {
    setAnchorEl(null);
  };

  const handleFuncionarioChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as string;
    if (value !== funcionarioSelecionado) {
      console.log('Funcionário selecionado:', value);
      setFuncionarioSelecionado(value);
    }
  };

  const handleDateChange = (date: Date | null) => {
    if (date && !isSameDay(date, selectedDate)) {
      console.log('Data selecionada:', date);
      setSelectedDate(date);
      handleCloseWeekPicker();
    }
  };

  // Renderização dos filtros
  const renderFilters = () => (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Button
        variant="outlined"
        sx={{ 
          color: '#fff', 
          borderColor: '#fff', 
          textTransform: 'none', 
          bgcolor: '#222', 
          '&:hover': { bgcolor: '#333' }, 
          display: 'flex', 
          alignItems: 'center', 
          height: 40, 
          minHeight: 40, 
          minWidth: 180 
        }}
        onClick={handleOpenWeekPicker}
      >
        {formatWeekLabel(weekDays)}
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleCloseWeekPicker}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
          <StaticDatePicker
            displayStaticWrapperAs="desktop"
            value={selectedDate}
            onChange={handleDateChange}
            showDaysOutsideCurrentMonth
            sx={{
              '& .MuiPickersDay-root': {
                color: '#fff',
                '&.Mui-selected': {
                  backgroundColor: '#666',
                  '&:hover': {
                    backgroundColor: '#888',
                  },
                },
              },
              '& .MuiPickersCalendarHeader-root': {
                color: '#fff',
              },
              backgroundColor: '#222',
              color: '#fff',
            }}
          />
        </LocalizationProvider>
      </Popover>
      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel sx={{ color: '#fff' }}>Funcionário</InputLabel>
        <StyledSelect
          value={funcionarioSelecionado}
          label="Funcionário"
          onChange={handleFuncionarioChange}
          MenuProps={{ 
            PaperProps: { 
              sx: { 
                background: '#222', 
                color: '#fff',
                maxHeight: 300
              } 
            } 
          }}
        >
          {funcionarios.map((func) => (
            <MenuItem key={func.id} value={func.id}>
              {func.nome}
            </MenuItem>
          ))}
        </StyledSelect>
      </FormControl>
    </Box>
  );

  // Função para encontrar agendamentos em um horário específico
  const getAgendamentosNoHorario = (hora: string, data: Date) => {
    return agendamentos.filter(ag => {
      const agData = ag.data.toDate();
      const [horaInicio] = ag.horaInicio.split(':');
      const [horaFim] = ag.horaFim.split(':');
      const horaNum = parseInt(hora.split(':')[0]);
      const horaInicioNum = parseInt(horaInicio);
      const horaFimNum = parseInt(horaFim);
      
      return (
        isSameDay(agData, data) &&
        horaNum >= horaInicioNum && 
        horaNum < horaFimNum &&
        (!funcionarioSelecionado || ag.funcionarioId === funcionarioSelecionado)
      );
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h4" fontWeight={600} mb={3}>
          Agenda
        </Typography>
        <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minHeight: 400, height: 650, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <CardHeader>
              <Typography variant="h6" color="#aaa" sx={{ fontSize: theme => `calc(${theme.typography.h6.fontSize} + 7px)` }}>Calendário</Typography>
              {renderFilters()}
            </CardHeader>
            <Box sx={{ flex: 1, bgcolor: '#181818', borderRadius: 3, p: 2, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
              {/* Placeholder da grade */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: `80px repeat(7, 1fr)`, 
                mb: 0.5,
                position: 'sticky',
                top: 0,
                zIndex: 1,
                bgcolor: '#181818'
              }}>
                <Box sx={{ bgcolor: '#111', p: 1, textAlign: 'center', borderTopLeftRadius: 12 }}>
                  <Typography fontWeight={700} fontSize={15}>Horário</Typography>
                </Box>
                {weekDays.map((d, idx) => (
                  <Box 
                    key={idx} 
                    sx={{ 
                      bgcolor: '#111', 
                      p: 1, 
                      textAlign: 'center', 
                      borderTopRightRadius: idx === 6 ? 12 : 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    <Typography fontWeight={700} fontSize={15}>{diasSemanaAbrev[d.getDay()]}</Typography>
                    <Typography fontSize={13} color="#aaa">{d.getDate().toString().padStart(2, '0')}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#aaa'
              }}>
                <Typography>Carregando agendamentos...</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
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
            {renderFilters()}
          </CardHeader>
          <Box sx={{ flex: 1, bgcolor: '#181818', borderRadius: 3, p: 2, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
            {/* Cabeçalho dos dias da semana */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: `80px repeat(7, 1fr)`, 
              mb: 0.5,
              position: 'sticky',
              top: 0,
              zIndex: 1,
              bgcolor: '#181818'
            }}>
              <Box sx={{ bgcolor: '#111', p: 1, textAlign: 'center', borderTopLeftRadius: 12 }}>
                <Typography fontWeight={700} fontSize={15}>Horário</Typography>
              </Box>
              {weekDays.map((d, idx) => (
                <Box 
                  key={idx} 
                  sx={{ 
                    bgcolor: '#111', 
                    p: 1, 
                    textAlign: 'center', 
                    borderTopRightRadius: idx === 6 ? 12 : 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <Typography fontWeight={700} fontSize={15}>{diasSemanaAbrev[d.getDay()]}</Typography>
                  <Typography fontSize={13} color="#aaa">{d.getDate().toString().padStart(2, '0')}</Typography>
                </Box>
              ))}
            </Box>

            {/* Grade de horários com agendamentos */}
            <Box 
              sx={{ 
                flex: 1,
                display: 'grid',
                gridTemplateRows: `repeat(${horas.length}, 80px)`,
                gridTemplateColumns: `80px repeat(7, 1fr)`,
                gap: 0,
                overflowY: 'auto',
                position: 'relative'
              }}
            >
              {horas.map((hora, rowIdx) => {
                const horaNum = parseInt(hora.split(':')[0]);
                const cells = [
                  <Box 
                    key={`${hora}-hora`} 
                    sx={{ 
                      border: '1px solid #222',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      color: '#aaa',
                      bgcolor: '#181818',
                      fontWeight: 600,
                      position: 'sticky',
                      left: 0,
                      zIndex: 1
                    }}
                  >
                    {hora}
                  </Box>
                ];

                weekDays.forEach((data) => {
                  const agendamentosNoHorario = getAgendamentosNoHorario(hora, data);
                  
                  cells.push(
                    <Box 
                      key={`${hora}-${data.toISOString()}`}
                      sx={{ 
                        border: '1px solid #222',
                        height: '100%',
                        position: 'relative',
                        bgcolor: 'transparent'
                      }}
                    >
                      {agendamentosNoHorario.map((ag) => {
                        const [horaInicio] = ag.horaInicio.split(':');
                        const [horaFim] = ag.horaFim.split(':');
                        const horaInicioNum = parseInt(horaInicio);
                        const horaFimNum = parseInt(horaFim);
                        const duracao = horaFimNum - horaInicioNum;
                        
                        return (
                          <Box
                            key={ag.id}
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: `${duracao * 100}%`,
                              bgcolor: '#333',
                              border: '1px solid #444',
                              borderRadius: 1,
                              p: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.5,
                              overflow: 'hidden'
                            }}
                          >
                            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                              {ag.cliente}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: '#aaa' }}>
                              {ag.servico.nome}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: '#aaa' }}>
                              R$ {Number(ag.servico.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  );
                });

                return cells;
              })}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
} 