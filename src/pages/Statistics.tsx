import { Box, Typography, Card, CardContent, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput, IconButton, Popover, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { styled } from '@mui/material/styles';
import { useUser } from '../contexts/UserContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

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

const meses = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

function getAnoAtual() {
  return new Date().getFullYear();
}

interface Empresa {
  id: string;
  funcionarios: string[];
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

// Função para buscar o ID da empresa
async function fetchEmpresaId(userId: string): Promise<string | null> {
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
}

async function fetchReceitaPorMes(ano: number, userId: string): Promise<{ receitasMensais: number[], receitaTotal: number }> {
  try {
    const empresaId = await fetchEmpresaId(userId);
    if (!empresaId) {
      console.log('Empresa não encontrada');
      return { receitasMensais: Array(12).fill(0), receitaTotal: 0 };
    }

    const receitasMensais: number[] = Array(12).fill(0);
    const col = collection(db, 'agendamentos');
    const q = query(
      col,
      where('empresaId', '==', empresaId),
      where('status', '==', 'finalizado')
    );
    
    const snapshot = await getDocs(q);
    console.log('Buscando agendamentos para receita...');
    
    snapshot.forEach(doc => {
      const data = doc.data() as Agendamento;
      if (!data.servico?.preco || !data.data) return;
      
      const dataObj = data.data.toDate();
      if (dataObj.getFullYear() === ano) {
        const mes = dataObj.getMonth();
        receitasMensais[mes] += Number(data.servico.preco);
      }
    });

    const receitaTotal = receitasMensais.reduce((acc, curr) => acc + curr, 0);
    console.log('Receita total:', receitaTotal);
    console.log('Receitas mensais:', receitasMensais);
    
    return { receitasMensais, receitaTotal };
  } catch (error) {
    console.error('Erro ao buscar receita:', error);
    return { receitasMensais: Array(12).fill(0), receitaTotal: 0 };
  }
}

async function fetchServicosMaisVendidos({ ano, mes, userId }: { ano?: number, mes?: number, userId: string }) {
  try {
    const empresaId = await fetchEmpresaId(userId);
    if (!empresaId) {
      console.log('Empresa não encontrada');
      return [];
    }

    const col = collection(db, 'agendamentos');
    const q = query(
      col,
      where('empresaId', '==', empresaId)
    );
    
    const snapshot = await getDocs(q);
    console.log('Buscando agendamentos para serviços...');
    
    const servicosCount: Record<string, { count: number, receita: number, status: Record<string, number> }> = {};
    
    snapshot.forEach(doc => {
      const data = doc.data() as Agendamento;
      if (!data.servico || !data.data) return;
      
      const dataObj = data.data.toDate();
      if (ano && dataObj.getFullYear() !== ano) return;
      if (mes !== undefined && mes !== null && mes >= 0 && dataObj.getMonth() !== mes) return;
      
      const servicoNome = data.servico.nome;
      if (!servicosCount[servicoNome]) {
        servicosCount[servicoNome] = { 
          count: 0, 
          receita: 0,
          status: {}
        };
      }
      servicosCount[servicoNome].count += 1;
      servicosCount[servicoNome].receita += Number(data.servico.preco);
      
      const status = data.status || 'sem_status';
      servicosCount[servicoNome].status[status] = (servicosCount[servicoNome].status[status] || 0) + 1;
    });

    const servicosOrdenados = Object.entries(servicosCount)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([servico, data]) => ({
        servico,
        count: data.count,
        receita: data.receita,
        status: data.status
      }));

    console.log('Serviços mais vendidos:', servicosOrdenados);
    return servicosOrdenados;
  } catch (error) {
    console.error('Erro ao buscar serviços:', error);
    return [];
  }
}

export default function Statistics() {
  const { id: userId } = useUser();
  
  // Receita anual
  const [anos, setAnos] = useState(() => {
    const atual = getAnoAtual();
    return [atual, atual - 1, atual - 2];
  });
  const [anoSelecionado, setAnoSelecionado] = useState(getAnoAtual());
  const [receitas, setReceitas] = useState<number[]>(Array(12).fill(0));
  const [receitaTotal, setReceitaTotal] = useState(0);
  const [loadingReceita, setLoadingReceita] = useState(true);
  const [errorReceita, setErrorReceita] = useState<string | null>(null);

  // Serviços mais populares
  const [filtroAno, setFiltroAno] = useState(false);
  const [filtroMes, setFiltroMes] = useState(false);
  const [anoServicos, setAnoServicos] = useState(getAnoAtual());
  const [mesServicos, setMesServicos] = useState<number | 'todos'>('todos');
  const [servicos, setServicos] = useState<{ 
    servico: string, 
    count: number, 
    receita: number,
    status: Record<string, number>
  }[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(true);
  const [errorServicos, setErrorServicos] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!userId) {
      setErrorReceita('Usuário não autenticado');
      setLoadingReceita(false);
      return;
    }

    setLoadingReceita(true);
    setErrorReceita(null);
    
    fetchReceitaPorMes(anoSelecionado, userId)
      .then(({ receitasMensais, receitaTotal }) => {
        setReceitas(receitasMensais);
        setReceitaTotal(receitaTotal);
        setLoadingReceita(false);
      })
      .catch(error => {
        console.error('Erro ao buscar receitas:', error);
        setErrorReceita('Erro ao carregar receitas');
        setLoadingReceita(false);
      });
  }, [anoSelecionado, userId]);

  useEffect(() => {
    if (!userId) {
      setErrorServicos('Usuário não autenticado');
      setLoadingServicos(false);
      return;
    }

    setLoadingServicos(true);
    setErrorServicos(null);
    
    fetchServicosMaisVendidos({
      ano: filtroAno ? anoServicos : undefined,
      mes: filtroAno && filtroMes && mesServicos !== 'todos' ? mesServicos as number : undefined,
      userId
    })
      .then(servicos => {
        setServicos(servicos);
        setLoadingServicos(false);
      })
      .catch(error => {
        console.error('Erro ao buscar serviços:', error);
        setErrorServicos('Erro ao carregar serviços');
        setLoadingServicos(false);
      });
  }, [filtroAno, filtroMes, anoServicos, mesServicos, userId]);

  // Filtro customizado para serviços
  const handleOpenFiltro = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseFiltro = () => {
    setAnchorEl(null);
  };
  const openFiltro = Boolean(anchorEl);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Estatísticas
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {/* Card Receita Anual */}
        <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minWidth: 350, flex: 1, minHeight: 400, display: 'flex', flexDirection: 'column', height: 650 }}>
          <CardContent sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <CardHeader>
              <Typography variant="h6" color="#aaa" sx={{ fontSize: theme => `calc(${theme.typography.h6.fontSize} + 7px)` }}>Receita Anual</Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: '#fff' }}>Ano</InputLabel>
                <StyledSelect
                  value={anoSelecionado}
                  label="Ano"
                  onChange={e => setAnoSelecionado(Number(e.target.value))}
                  MenuProps={{ PaperProps: { sx: { background: '#222', color: '#fff' } } }}
                >
                  {anos.map(ano => (
                    <MenuItem value={ano} key={ano}>{ano}</MenuItem>
                  ))}
                </StyledSelect>
              </FormControl>
            </CardHeader>
            {errorReceita ? (
              <Typography color="error" sx={{ mt: 2 }}>{errorReceita}</Typography>
            ) : (
              <>
                <Typography variant="h4" mb={2} fontWeight={600} sx={{ fontSize: { xs: '1.6rem', sm: '2.2rem', md: '2.5rem' } }}>
                  {loadingReceita ? 'Carregando...' : receitaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Typography>
                <Box sx={{ width: '100%', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
                  <Line
                    data={{
                      labels: meses,
                      datasets: [
                        {
                          label: 'Receita',
                          data: receitas,
                          borderColor: '#fff',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          tension: 0.4,
                          fill: true,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { 
                        legend: { display: false }, 
                        title: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const value = context.raw as number;
                              return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: { 
                          ticks: { color: '#fff' }, 
                          grid: { color: '#444' } 
                        },
                        y: { 
                          ticks: { 
                            color: '#fff',
                            callback: (value) => `R$ ${Number(value).toLocaleString('pt-BR')}`,
                            stepSize: 5000
                          }, 
                          grid: { color: '#444' } 
                        },
                      },
                      maintainAspectRatio: false,
                    }}
                    style={{ width: '100%', height: '100%' }}
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>
        {/* Card Serviços Mais Populares */}
        <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minWidth: 350, flex: 1, minHeight: 400, display: 'flex', flexDirection: 'column', height: 650 }}>
          <CardContent sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <CardHeader>
              <Typography variant="h6" color="#aaa" sx={{ fontSize: theme => `calc(${theme.typography.h6.fontSize} + 7px)` }}>Serviços Mais Populares</Typography>
              <Button
                variant="outlined"
                sx={{ color: '#fff', borderColor: '#fff', textTransform: 'none', bgcolor: '#222', '&:hover': { bgcolor: '#333' } }}
                onClick={handleOpenFiltro}
              >
                Filtros
              </Button>
              <Popover
                open={openFiltro}
                anchorEl={anchorEl}
                onClose={handleCloseFiltro}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <Box sx={{ p: 2, minWidth: 220 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Checkbox checked={filtroAno} onChange={e => { setFiltroAno(e.target.checked); if (!e.target.checked) { setFiltroMes(false); setMesServicos('todos'); } }} />
                    <Typography>Ano</Typography>
                    {filtroAno && (
                      <FormControl size="small" sx={{ ml: 2, minWidth: 90 }}>
                        <InputLabel sx={{ color: '#fff' }}>Ano</InputLabel>
                        <Select
                          value={anoServicos}
                          label="Ano"
                          onChange={e => setAnoServicos(Number(e.target.value))}
                          sx={{ color: '#fff' }}
                        >
                          {anos.map(ano => (
                            <MenuItem value={ano} key={ano}>{ano}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                  {filtroAno && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Checkbox checked={filtroMes} onChange={e => setFiltroMes(e.target.checked)} />
                      <Typography>Mês</Typography>
                      {filtroMes && (
                        <FormControl size="small" sx={{ ml: 2, minWidth: 90 }}>
                          <InputLabel sx={{ color: '#fff' }}>Mês</InputLabel>
                          <Select
                            value={mesServicos}
                            label="Mês"
                            onChange={e => setMesServicos(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
                            sx={{ color: '#fff' }}
                          >
                            <MenuItem value={'todos'}>Todos</MenuItem>
                            {meses.map((mes, idx) => (
                              <MenuItem value={idx} key={mes}>{mes}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </Box>
                  )}
                </Box>
              </Popover>
            </CardHeader>
            {errorServicos ? (
              <Typography color="error" sx={{ mt: 2 }}>{errorServicos}</Typography>
            ) : (
              <Box sx={{ width: '100%', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
                {loadingServicos ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography>Carregando...</Typography>
                  </Box>
                ) : servicos.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography color="#888">Nenhum serviço encontrado no período</Typography>
                  </Box>
                ) : (
                  <Bar
                    data={{
                      labels: servicos.map(s => s.servico),
                      datasets: [
                        {
                          label: 'Quantidade',
                          data: servicos.map(s => s.count),
                          backgroundColor: '#fff',
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { 
                        legend: { display: false }, 
                        title: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const index = context.dataIndex;
                              const servico = servicos[index];
                              const statusInfo = Object.entries(servico.status)
                                .map(([status, count]) => `${status}: ${count}`)
                                .join('\n');
                              return [
                                `Quantidade total: ${servico.count}`,
                                `Receita: R$ ${servico.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                                'Status:',
                                statusInfo
                              ];
                            }
                          }
                        }
                      },
                      scales: {
                        x: { 
                          ticks: { 
                            color: '#fff',
                            maxRotation: 45,
                            minRotation: 45
                          }, 
                          grid: { color: '#444' } 
                        },
                        y: { 
                          ticks: { color: '#fff' }, 
                          grid: { color: '#444' } 
                        },
                      },
                      maintainAspectRatio: false,
                    }}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
} 