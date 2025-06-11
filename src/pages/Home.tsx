import { Box, Typography, Card, CardContent, FormControl, InputLabel, Select, MenuItem, Button, Popover } from '@mui/material';
import { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { styled } from '@mui/material/styles';
import { useUser } from '../contexts/UserContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const CardHeader = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
  width: '100%',
});

const meses = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];
const horas = Array.from({ length: 13 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`); // 08:00 até 20:00

function getAnoAtual() {
  return new Date().getFullYear();
}
function getSemestreAtual() {
  return new Date().getMonth() < 6 ? 1 : 2;
}

interface ReceitaData {
  receitasMensais: number[];
  receitaTotal: number;
}

interface AgendamentoData {
  clienteId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  data: Timestamp;
  empresaId: string;
  funcionarioId: string;
  servico: {
    nome: string;
    preco: number;
    duracao: number;
  };
  status: string;
  horaInicio: string;
  horaFim: string;
}

interface Agendamento extends AgendamentoData {
  id: string;
  cliente: string;
  funcionario: string;
  horario: string;
}

async function fetchEmpresaId(userId: string): Promise<string | null> {
  const empresasRef = collection(db, 'empresas');
  const q = query(empresasRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    return snapshot.docs[0].id; // Retorna o ID do documento da empresa
  }
  return null;
}

async function fetchReceitaPorMes(ano: number, userId: string): Promise<ReceitaData> {
  console.log('Buscando ID da empresa para o usuário:', userId);
  const empresaId = await fetchEmpresaId(userId);
  
  if (!empresaId) {
    console.log('ERRO: Empresa não encontrada para o usuário');
    return { receitasMensais: Array(12).fill(0), receitaTotal: 0 };
  }
  
  console.log('ID da empresa encontrado:', empresaId);
  const receitasMensais: number[] = Array(12).fill(0);
  let receitaTotal = 0;
  const col = collection(db, 'agendamentos');
  
  const q = query(
    col, 
    where('empresaId', '==', empresaId),
    where('status', '==', 'finalizado')
  );
  
  const snapshot = await getDocs(q);
  console.log('Total de agendamentos encontrados:', snapshot.size);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.data || !data.servico?.preco) return;
    
    const dataObj = data.data.toDate();
    const preco = Number(data.servico.preco);
    
    if (!isNaN(preco)) {
      receitaTotal += preco;
      
      if (dataObj.getFullYear() === ano) {
        const mes = dataObj.getMonth();
        receitasMensais[mes] += preco;
        console.log(`Agendamento de ${dataObj.toLocaleDateString()}: R$${preco}`);
      }
    }
  });
  
  console.log('Receita total:', receitaTotal);
  console.log('Receitas mensais:', receitasMensais);
  
  return { receitasMensais, receitaTotal };
}

async function fetchAgendamentosHoje(userId: string): Promise<Agendamento[]> {
  console.log('Buscando agendamentos para hoje...');
  const empresaId = await fetchEmpresaId(userId);
  
  if (!empresaId) {
    console.log('ERRO: Empresa não encontrada para o usuário');
    return [];
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  
  const inicioHoje = Timestamp.fromDate(hoje);
  const fimHoje = Timestamp.fromDate(amanha);
  
  console.log('Buscando agendamentos entre:', inicioHoje.toDate().toLocaleString(), 'e', fimHoje.toDate().toLocaleString());
  
  const col = collection(db, 'agendamentos');
  const q = query(
    col,
    where('empresaId', '==', empresaId),
    where('data', '>=', inicioHoje),
    where('data', '<', fimHoje),
    where('status', '==', 'agendado')
  );
  
  const snapshot = await getDocs(q);
  console.log('Total de agendamentos encontrados:', snapshot.size);
  
  const agendamentos = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
    const data = docSnapshot.data() as AgendamentoData;
    
    // Buscar dados do cliente
    const clienteRef = doc(db, 'users', data.clienteId);
    const clienteDoc = await getDoc(clienteRef);
    const clienteNome = clienteDoc.exists() ? (clienteDoc.data() as { nome: string }).nome : 'Cliente não encontrado';
    
    // Buscar dados do funcionário
    const funcionarioRef = doc(db, 'users', data.funcionarioId);
    const funcionarioDoc = await getDoc(funcionarioRef);
    const funcionarioNome = funcionarioDoc.exists() ? (funcionarioDoc.data() as { nome: string }).nome : 'Funcionário não encontrado';

    return {
      id: docSnapshot.id,
      ...data,
      cliente: clienteNome,
      funcionario: funcionarioNome,
      horario: data.horaInicio // Para compatibilidade
    } as Agendamento;
  }));

  return agendamentos;
}

async function fetchFuncionarios(userId: string): Promise<{ id: string, nome: string }[]> {
  const empresaId = await fetchEmpresaId(userId);
  
  if (!empresaId) {
    console.log('ERRO: Empresa não encontrada para o usuário');
    return [];
  }

  const empresaRef = doc(db, 'empresas', empresaId);
  const empresaDoc = await getDoc(empresaRef);
  
  if (!empresaDoc.exists()) {
    console.log('ERRO: Documento da empresa não encontrado');
    return [];
  }

  const empresaData = empresaDoc.data();
  const funcionariosIds = empresaData.funcionarios || [];
  
  if (funcionariosIds.length === 0) {
    console.log('Nenhum funcionário encontrado na empresa');
    return [];
  }

  const funcionarios: { id: string, nome: string }[] = [];
  
  for (const funcId of funcionariosIds) {
    const funcRef = doc(db, 'users', funcId);
    const funcDoc = await getDoc(funcRef);
    
    if (funcDoc.exists()) {
      const funcData = funcDoc.data();
      funcionarios.push({
        id: funcId,
        nome: funcData.nome || 'Sem nome'
      });
    }
  }

  console.log('Funcionários encontrados:', funcionarios);
  return funcionarios;
}

export default function Home() {
  const { id: userId } = useUser(); // Agora é o ID do usuário, não da empresa
  const [anos] = useState(() => {
    const atual = getAnoAtual();
    return [atual, atual - 1, atual - 2];
  });
  const [anoSelecionado, setAnoSelecionado] = useState(getAnoAtual());
  const [semestreSelecionado, setSemestreSelecionado] = useState(getSemestreAtual());
  const [receitas, setReceitas] = useState<number[]>(Array(12).fill(0));
  const [receitaTotalGeral, setReceitaTotalGeral] = useState(0);
  const [loadingReceita, setLoadingReceita] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Agenda Hoje
  const [funcionarios, setFuncionarios] = useState<{ id: string, nome: string }[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(true);

  // Filtro customizado Receita
  const handleOpenFiltro = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseFiltro = () => {
    setAnchorEl(null);
  };
  const openFiltro = Boolean(anchorEl);

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) {
      console.log('ERRO: User ID não encontrado no contexto');
      return;
    }
    
    console.log('User ID do contexto:', userId);
    setLoadingReceita(true);
    fetchReceitaPorMes(anoSelecionado, userId)
      .then(({ receitasMensais, receitaTotal }) => {
        setReceitas(receitasMensais);
        setReceitaTotalGeral(receitaTotal);
        setLoadingReceita(false);
      })
      .catch(error => {
        console.error('Erro ao buscar receitas:', error);
        setLoadingReceita(false);
      });
  }, [anoSelecionado, userId]);

  useEffect(() => {
    if (!userId) {
      console.log('ERRO: User ID não encontrado no contexto');
      return;
    }

    setLoadingAgenda(true);
    Promise.all([
      fetchFuncionarios(userId),
      fetchAgendamentosHoje(userId)
    ]).then(([funcs, ags]) => {
      console.log('Funcionários carregados:', funcs);
      console.log('Agendamentos carregados:', ags);
      setFuncionarios(funcs);
      setAgendamentos(ags);
      setLoadingAgenda(false);
    }).catch(error => {
      console.error('Erro ao carregar agenda:', error);
      setLoadingAgenda(false);
    });
  }, [userId]);

  // Scroll automático para o horário atual
  useEffect(() => {
    if (!gridRef.current) return;
    const now = new Date();
    const horaAtual = now.getHours();
    // Encontra o índice do horário mais próximo (exato ou próximo abaixo)
    const idx = horas.findIndex(h => Number(h.split(':')[0]) >= horaAtual);
    if (idx > 0) {
      const cellHeight = gridRef.current.scrollHeight / horas.length;
      gridRef.current.scrollTop = cellHeight * (idx - 1); // Deixa o horário atual no topo
    }
  }, [funcionarios.length, agendamentos.length]);

  // Dados do semestre selecionado
  const start = semestreSelecionado === 1 ? 0 : 6;
  const end = semestreSelecionado === 1 ? 6 : 12;
  const mesesSemestre = meses.slice(start, end);
  const receitasSemestre = receitas.slice(start, end);
  const receitaTotal = receitasSemestre.reduce((acc, v) => acc + v, 0);

  // Adicione este useEffect para debug
  useEffect(() => {
    if (agendamentos.length > 0) {
      console.log('Agendamentos no estado:', agendamentos.map(ag => ({
        cliente: ag.cliente,
        servico: ag.servico?.nome,
        horario: ag.horario,
        funcionario: ag.funcionario
      })));
    }
  }, [agendamentos]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Página Inicial
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {/* Card Receita Semestre */}
        <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minWidth: 350, flex: 1, display: 'flex', flexDirection: 'column', height: 650 }}>
          <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <CardHeader>
              <Typography variant="h6" color="#aaa" sx={{ fontSize: theme => `calc(${theme.typography.h6.fontSize} + 7px)` }}>Receita Semestral</Typography>
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
                  <FormControl size="small" sx={{ mb: 2, minWidth: 120 }}>
                    <InputLabel sx={{ color: '#fff' }}>Ano</InputLabel>
                    <Select
                      value={anoSelecionado}
                      label="Ano"
                      onChange={e => setAnoSelecionado(Number(e.target.value))}
                      sx={{ color: '#fff' }}
                    >
                      {anos.map(ano => (
                        <MenuItem value={ano} key={ano}>{ano}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel sx={{ color: '#fff' }}>Semestre</InputLabel>
                    <Select
                      value={semestreSelecionado}
                      label="Semestre"
                      onChange={e => setSemestreSelecionado(Number(e.target.value))}
                      sx={{ color: '#fff' }}
                    >
                      <MenuItem value={1}>1º Semestre</MenuItem>
                      <MenuItem value={2}>2º Semestre</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Popover>
            </CardHeader>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h4" fontWeight={600} sx={{ fontSize: { xs: '1.6rem', sm: '2.2rem', md: '2.5rem' } }}>
                {loadingReceita ? 'Carregando...' : receitaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Typography>
              <Typography variant="subtitle1" color="#aaa" mt={1}>
                Receita Total: {loadingReceita ? 'Carregando...' : receitaTotalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Typography>
            </Box>
            <Box sx={{ width: '100%', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
              <Line
                data={{
                  labels: mesesSemestre,
                  datasets: [
                    {
                      label: 'Receita',
                      data: receitasSemestre,
                      borderColor: '#fff',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      tension: 0.4,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false }, title: { display: false } },
                  scales: {
                    x: { ticks: { color: '#fff' }, grid: { color: '#444' } },
                    y: { ticks: { color: '#fff' }, grid: { color: '#444' } },
                  },
                  maintainAspectRatio: false,
                }}
                style={{ width: '100%', height: '100%' }}
              />
            </Box>
          </CardContent>
        </Card>
        {/* Card Agenda Hoje */}
        <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minWidth: 350, flex: 2, display: 'flex', flexDirection: 'column', height: 650 }}>
          <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <CardHeader>
              <Typography variant="h6" color="#aaa" sx={{ fontSize: theme => `calc(${theme.typography.h6.fontSize} + 7px)` }}>Agenda Hoje</Typography>
            </CardHeader>
            {loadingAgenda ? (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography>Carregando agenda...</Typography>
              </Box>
            ) : funcionarios.length === 0 ? (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#888' }}>
                <Typography>Nenhum funcionário cadastrado na empresa</Typography>
              </Box>
            ) : agendamentos.length === 0 ? (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#888' }}>
                <Typography>Nenhum agendamento para hoje</Typography>
              </Box>
            ) : (
              <Box sx={{ flex: 1, bgcolor: '#181818', borderRadius: 3, p: 2, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                {/* Cabeçalho com nomes dos funcionários */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: `80px repeat(${funcionarios.length}, 1fr)`, 
                  mb: 0.5,
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  bgcolor: '#181818'
                }}>
                  <Box sx={{ bgcolor: '#111', p: 1, textAlign: 'center', borderTopLeftRadius: 12 }}>
                    <Typography fontWeight={700} fontSize={15}>Horário</Typography>
                  </Box>
                  {funcionarios.map((func, idx) => (
                    <Box 
                      key={func.id} 
                      sx={{ 
                        bgcolor: '#111', 
                        p: 1, 
                        textAlign: 'center', 
                        borderTopRightRadius: idx === funcionarios.length - 1 ? 12 : 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.5
                      }}
                    >
                      <Typography fontWeight={700} fontSize={15}>{func.nome}</Typography>
                    </Box>
                  ))}
                </Box>

                {/* Grade de horários com agendamentos */}
                <Box 
                  ref={gridRef} 
                  sx={{ 
                    flex: 1,
                    display: 'grid',
                    gridTemplateRows: `repeat(${horas.length}, 80px)`,
                    gridTemplateColumns: `80px repeat(${funcionarios.length}, 1fr)`,
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

                    funcionarios.forEach((func) => {
                      const agendamentosDoFuncionario = agendamentos.filter(a => {
                        const [horaInicio] = a.horaInicio.split(':');
                        const [horaFim] = a.horaFim.split(':');
                        const horaInicioNum = parseInt(horaInicio);
                        const horaFimNum = parseInt(horaFim);
                        
                        return a.funcionarioId === func.id && 
                               horaNum >= horaInicioNum && 
                               horaNum < horaFimNum;
                      });

                      cells.push(
                        <Box 
                          key={`${hora}-${func.id}`}
                          sx={{ 
                            border: '1px solid #222',
                            height: '100%',
                            position: 'relative',
                            bgcolor: 'transparent'
                          }}
                        >
                          {agendamentosDoFuncionario.map((ag) => {
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
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
} 