<<<<<<< HEAD
import { Box, Grid, Typography, Select, MenuItem, FormControl, InputLabel, styled, Card, CardContent } from '@mui/material';
=======
import { Box, Typography, Card, CardContent, FormControl, InputLabel, Select, MenuItem, Button, Popover, Grid } from '@mui/material';
>>>>>>> 96fc4f0 (adicionando mais backed)
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
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
import DataTable from '../components/DataTable';
import { useUserContext } from '../contexts/UserContext';
<<<<<<< HEAD

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Tipagem para os dados
=======
import { styled } from '@mui/material/styles';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

>>>>>>> 96fc4f0 (adicionando mais backed)
interface Agendamento {
  id: string;
  clienteId: string;
  empresaId: string;
  funcionarioId: string;
  data: Timestamp;
  horaInicio: string;
  horaFim: string;
  servico: {
    nome: string;
    preco: number;
    duracao: number;
    valorFinalMuda: boolean;
    funcionariosIds: string[];
  };
  status: 'agendado' | 'finalizado' | 'cancelado';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

<<<<<<< HEAD
=======
interface AgendamentoSimplificado {
  funcionario: string;
  horario: string;
  cliente: string;
  servico: string;
}

>>>>>>> 96fc4f0 (adicionando mais backed)
// Componentes estilizados
const CardHeader = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
  width: '100%',
});

const StyledSelect = styled(Select)({
  color: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { 
    borderColor: '#fff' 
  }
});

const meses = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

function getAnoAtual() {
  return new Date().getFullYear();
}

function getMesAtual() {
  return new Date().getMonth();
}

async function fetchReceitaPorMes(ano: number, empresaId: string): Promise<number[]> {
  if (!empresaId) {
    console.error('ID da empresa não fornecido');
    return Array(12).fill(0);
  }

  const receitas: number[] = Array(12).fill(0);
  const col = collection(db, 'agendamentos');
  const q = query(
    col, 
    where('empresaId', '==', empresaId),
    where('status', '==', 'finalizado')
  );
  
  const snapshot = await getDocs(q);
  console.log('Agendamentos encontrados:', snapshot.size);
  
  snapshot.forEach(doc => {
<<<<<<< HEAD
    const data = doc.data() as Agendamento;
    if (!data.servico?.preco || !data.data) return;
    
    // Convertendo o Timestamp do Firestore para Date
    const dataObj = data.data.toDate();
    if (dataObj.getFullYear() === ano) {
      const mes = dataObj.getMonth();
      receitas[mes] += Number(data.servico.preco);
=======
    const agendamento = doc.data() as Agendamento;
    if (!agendamento.servico?.preco || !agendamento.data) return;
    
    const dataObj = agendamento.data.toDate();
    if (dataObj.getFullYear() === ano) {
      const mes = dataObj.getMonth();
      receitas[mes] += Number(agendamento.servico.preco);
>>>>>>> 96fc4f0 (adicionando mais backed)
    }
  });

  console.log('Receitas por mês:', receitas);
  return receitas;
}

async function fetchAgendamentosHoje(empresaId: string, funcionarioId?: string): Promise<Agendamento[]> {
  if (!empresaId) {
    console.error('ID da empresa não fornecido');
    return [];
  }

<<<<<<< HEAD
=======
async function fetchAgendamentosHoje(empresaId: string, funcionarioId?: string): Promise<AgendamentoSimplificado[]> {
  if (!empresaId) {
    console.error('ID da empresa não fornecido');
    return [];
  }

>>>>>>> 96fc4f0 (adicionando mais backed)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  
  const inicioHoje = Timestamp.fromDate(hoje);
  const fimHoje = Timestamp.fromDate(amanha);
  
  const col = collection(db, 'agendamentos');
<<<<<<< HEAD
  
  let q = query(
    col, 
=======
  let q = query(
    col,
>>>>>>> 96fc4f0 (adicionando mais backed)
    where('empresaId', '==', empresaId),
    where('data', '>=', inicioHoje),
    where('data', '<', fimHoje),
    where('status', '==', 'agendado')
  );
  
  if (funcionarioId) {
    q = query(q, where('funcionarioId', '==', funcionarioId));
  }
  
  const snapshot = await getDocs(q);
<<<<<<< HEAD
  const agendamentos: Agendamento[] = [];
  
  snapshot.forEach(doc => {
    const data = doc.data() as Omit<Agendamento, 'id'>;
    agendamentos.push({ 
      id: doc.id, 
      ...data 
    });
  });
  
  return agendamentos.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
=======
  const agendamentos: AgendamentoSimplificado[] = [];
  
  snapshot.forEach(doc => {
    const data = doc.data() as Agendamento;
    agendamentos.push({
      funcionario: data.funcionarioId,
      horario: data.horaInicio,
      cliente: data.clienteId,
      servico: data.servico.nome
    });
  });
  
  return agendamentos.sort((a, b) => a.horario.localeCompare(b.horario));
>>>>>>> 96fc4f0 (adicionando mais backed)
}

// Função para obter os meses do semestre atual e os dados correspondentes
function getSemestreData(receitas: number[], mesSelecionado: number) {
  const semestre = mesSelecionado < 6 ? 0 : 1;
  const start = semestre === 0 ? 0 : 6;
  const end = semestre === 0 ? 6 : 12;
  return {
    meses: meses.slice(start, end),
    receitas: receitas.slice(start, end),
  };
}

// Novo componente para o gráfico do semestre atual
const ReceitaChartSemestreAtual = ({ receitas, mesSelecionado, options }: { receitas: number[], mesSelecionado: number, options: any }) => {
  const { meses: mesesSemestre, receitas: receitasSemestre } = getSemestreData(receitas, mesSelecionado);
  const data = {
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
  };
  return (
    <Line data={data} options={{ ...options, scales: { ...options.scales, y: { ...options.scales.y, ticks: { ...options.scales.y.ticks, stepSize: 1000 } } }, maintainAspectRatio: false }} style={{ width: '100%', height: '100%' }} />
  );
};

// Função utilitária para gerar opções de semestre
function gerarSemestres(anos: number[]): { label: string, ano: number, semestre: 1 | 2 }[] {
  return anos.flatMap(ano => [
    { label: `${ano}-1`, ano, semestre: 1 },
    { label: `${ano}-2`, ano, semestre: 2 },
  ]);
}

export default function Home() {
  const { id: userId } = useUserContext();
  const [empresaId, setEmpresaId] = useState<string>('');
<<<<<<< HEAD
=======
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<string>('');
  
  // Receita Semestre
>>>>>>> 96fc4f0 (adicionando mais backed)
  const [anos] = useState(() => {
    const atual = getAnoAtual();
    return [atual, atual - 1, atual - 2];
  });
<<<<<<< HEAD
  const [semestreSelecionado, setSemestreSelecionado] = useState(() => {
    const ano = getAnoAtual();
    const semestre = getMesAtual() < 6 ? 1 : 2;
    return { ano, semestre };
  });
  const [receitas, setReceitas] = useState<number[]>(Array(12).fill(0));
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingAgenda, setLoadingAgenda] = useState(true);

=======
  const [anoSelecionado, setAnoSelecionado] = useState(getAnoAtual());
  const [semestreSelecionado, setSemestreSelecionado] = useState<{ ano: number; semestre: number }>({
    ano: getAnoAtual(),
    semestre: getSemestreAtual()
  });
  const [receitas, setReceitas] = useState<number[]>(Array(12).fill(0));
  const [loadingReceita, setLoadingReceita] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Agenda Hoje
  const [funcionarios, setFuncionarios] = useState<{ id: string, nome: string }[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoSimplificado[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(true);

  // Filtro customizado Receita
  const handleOpenFiltro = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseFiltro = () => {
    setAnchorEl(null);
  };
  const openFiltro = Boolean(anchorEl);

>>>>>>> 96fc4f0 (adicionando mais backed)
  // Buscar ID da empresa quando o userId mudar
  useEffect(() => {
    async function fetchEmpresaId() {
      if (!userId) return;

      try {
        const empresasRef = collection(db, 'empresas');
        const q = query(empresasRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const empresaDoc = snapshot.docs[0];
          setEmpresaId(empresaDoc.id);
        }
      } catch (error) {
        console.error('Erro ao buscar empresa:', error);
      }
    }

    fetchEmpresaId();
  }, [userId]);

  // Atualizar receitas quando empresaId ou semestre mudar
  useEffect(() => {
    if (!empresaId) return;

<<<<<<< HEAD
    setLoading(true);
=======
    setLoadingReceita(true);
>>>>>>> 96fc4f0 (adicionando mais backed)
    fetchReceitaPorMes(semestreSelecionado.ano, empresaId).then(receitas => {
      setReceitas(receitas);
      setLoading(false);
    });
  }, [semestreSelecionado, empresaId]);

  // Atualizar agendamentos quando empresaId ou funcionário mudar
  useEffect(() => {
    if (!empresaId) return;

    setLoadingAgenda(true);
<<<<<<< HEAD
    fetchAgendamentosHoje(empresaId, funcionarioSelecionado || undefined).then(agendamentos => {
      setAgendamentos(agendamentos);
=======
    Promise.all([
      fetchFuncionarios(),
      fetchAgendamentosHoje(empresaId, funcionarioSelecionado || undefined)
    ]).then(([funcs, ags]) => {
      setFuncionarios(funcs);
      setAgendamentos(ags);
>>>>>>> 96fc4f0 (adicionando mais backed)
      setLoadingAgenda(false);
    });
  }, [empresaId, funcionarioSelecionado]);

<<<<<<< HEAD
  // Receita total do semestre selecionado
  const start = semestreSelecionado.semestre === 1 ? 0 : 6;
  const end = semestreSelecionado.semestre === 1 ? 6 : 12;
  const receitaSemestre = receitas.slice(start, end).reduce((acc, v) => acc + v, 0);

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
=======
  const semestresOpcoes = gerarSemestres(anos);
  const start = semestreSelecionado.semestre === 1 ? 0 : 6;
  const end = semestreSelecionado.semestre === 1 ? 6 : 12;
  const mesesSemestre = meses.slice(start, end);
  const receitasSemestre = receitas.slice(start, end);
  const receitaTotal = receitasSemestre.reduce((acc, v) => acc + v, 0);

  const options = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: false } },
>>>>>>> 96fc4f0 (adicionando mais backed)
    scales: {
      x: { ticks: { color: '#fff' }, grid: { color: '#444' } },
      y: { ticks: { color: '#fff' }, grid: { color: '#444' } },
    },
<<<<<<< HEAD
  };

  const semestresOpcoes = gerarSemestres(anos);
=======
    maintainAspectRatio: false,
  };
>>>>>>> 96fc4f0 (adicionando mais backed)

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" fontWeight={600} mb={3} sx={{ ml: 1, mt: 2 }}>
        Página Inicial
      </Typography>
      <Grid container spacing={4} sx={{ flex: 1, minHeight: 0 }}>
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minHeight: 200, height: 500, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <CardContent sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column', pb: 4, height: '100%', minHeight: 0, overflow: 'hidden' }}>
              <CardHeader>
                <Typography variant="h6" color="#aaa" sx={{ fontSize: theme => `calc(${theme.typography.h6.fontSize} + 7px)` }}>Receita</Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ color: '#fff' }}>Semestre</InputLabel>
                  <StyledSelect
                    value={`${semestreSelecionado.ano}-${semestreSelecionado.semestre}`}
                    label="Semestre"
                    onChange={(e) => {
                      const value = e.target.value as string;
                      const [ano, semestre] = value.split('-');
                      setSemestreSelecionado({ ano: Number(ano), semestre: Number(semestre) });
                    }}
                    MenuProps={{ PaperProps: { sx: { background: '#222', color: '#fff' } } }}
                  >
                    {semestresOpcoes.map(opt => (
                      <MenuItem value={opt.label} key={opt.label}>{opt.label}</MenuItem>
                    ))}
                  </StyledSelect>
                </FormControl>
              </CardHeader>
              <Typography variant="h4" mb={2} fontWeight={600} sx={{ fontSize: { xs: '1.6rem', sm: '2.2rem', md: '2.5rem' } }}>
<<<<<<< HEAD
                {loading ? 'Carregando...' : receitaSemestre.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
=======
                {loadingReceita ? 'Carregando...' : receitasSemestre.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
>>>>>>> 96fc4f0 (adicionando mais backed)
              </Typography>
              <Box sx={{ width: '100%', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
                <ReceitaChartSemestreAtual
                  receitas={receitas}
                  mesSelecionado={semestreSelecionado.semestre === 1 ? 0 : 6}
                  options={options}
                />
<<<<<<< HEAD
=======
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minHeight: 200, height: 500, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <CardContent sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column', pb: 4 }}>
              <CardHeader>
                <Typography variant="h6" color="#aaa" sx={{ fontSize: theme => `calc(${theme.typography.h6.fontSize} + 7px)` }}>Agenda Hoje</Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ color: '#fff' }}>Funcionário</InputLabel>
                  <StyledSelect
                    value={funcionarioSelecionado}
                    label="Funcionário"
                    onChange={(e) => setFuncionarioSelecionado(e.target.value as string)}
                    MenuProps={{ PaperProps: { sx: { background: '#222', color: '#fff' } } }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {agendamentos
                      .filter((a, index, self) => 
                        index === self.findIndex(b => b.funcionario === a.funcionario)
                      )
                      .map(a => (
                        <MenuItem key={a.funcionario} value={a.funcionario}>
                          {a.funcionario}
                        </MenuItem>
                      ))
                    }
                  </StyledSelect>
                </FormControl>
              </CardHeader>
              <Box sx={{ width: '100%', flex: 1 }}>
                <DataTable
                  columns={["Horário", "Cliente", "Serviço"]}
                  rows={agendamentos.map(a => [
                    `${a.horario}`,
                    a.cliente,
                    a.servico
                  ])}
                  loading={loadingAgenda}
                  emptyMessage="Nenhum agendamento para hoje"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {/* Card Receita Semestre */}
        <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minWidth: 350, flex: 1, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <CardHeader>
              <Typography variant="h6" color="#aaa" sx={{ fontSize: theme => `calc(${theme.typography.h6.fontSize} + 7px)` }}>Receita Semestre</Typography>
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
                      value={semestreSelecionado.semestre}
                      label="Semestre"
                      onChange={e => setSemestreSelecionado(prev => ({ ...prev, semestre: Number(e.target.value) }))}
                      sx={{ color: '#fff' }}
                    >
                      <MenuItem value={1}>1º Semestre</MenuItem>
                      <MenuItem value={2}>2º Semestre</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Popover>
            </CardHeader>
            <Typography variant="h4" mb={2} fontWeight={600} sx={{ fontSize: { xs: '1.6rem', sm: '2.2rem', md: '2.5rem' } }}>
              {loadingReceita ? 'Carregando...' : receitaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Typography>
            <Box sx={{ width: '100%', flex: 1, height: 260, minHeight: 0, overflow: 'hidden' }}>
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
        <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minWidth: 350, flex: 2, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <CardHeader>
              <Typography variant="h6" color="#aaa" sx={{ fontSize: theme => `calc(${theme.typography.h6.fontSize} + 7px)` }}>Agenda Hoje</Typography>
            </CardHeader>
            <Box sx={{ flex: 1, bgcolor: '#181818', borderRadius: 3, p: 2, display: 'flex', flexDirection: 'column', minHeight: 0, overflowX: 'auto' }}>
              {/* Cabeçalho dos nomes dos funcionários com coluna de horários */}
              <Box sx={{ display: 'grid', gridTemplateColumns: `80px repeat(${funcionarios.length}, 1fr)`, mb: 0.5 }}>
                <Box sx={{ bgcolor: '#111', p: 1, textAlign: 'center', borderTopLeftRadius: 12 }}>
                  <Typography fontWeight={700} fontSize={15}>Horário</Typography>
                </Box>
                {funcionarios.map((func, idx) => (
                  <Box key={func.id} sx={{ bgcolor: '#111', p: 1, textAlign: 'center', borderTopRightRadius: idx === funcionarios.length - 1 ? 12 : 0 }}>
                    <Typography fontWeight={700} fontSize={15}>{func.nome}</Typography>
                  </Box>
                ))}
>>>>>>> 96fc4f0 (adicionando mais backed)
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minHeight: 200, height: 500, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <CardContent sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column', pb: 4 }}>
              <CardHeader>
                <Typography variant="h6" color="#aaa" sx={{ fontSize: theme => `calc(${theme.typography.h6.fontSize} + 7px)` }}>Agenda Hoje</Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ color: '#fff' }}>Funcionário</InputLabel>
                  <StyledSelect
                    value={funcionarioSelecionado}
                    label="Funcionário"
                    onChange={(e) => setFuncionarioSelecionado(e.target.value as string)}
                    MenuProps={{ PaperProps: { sx: { background: '#222', color: '#fff' } } }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {agendamentos
                      .filter((a, index, self) => 
                        index === self.findIndex(b => b.funcionarioId === a.funcionarioId)
                      )
                      .map(a => (
                        <MenuItem key={a.funcionarioId} value={a.funcionarioId}>
                          {a.funcionarioId}
                        </MenuItem>
                      ))
                    }
                  </StyledSelect>
                </FormControl>
              </CardHeader>
              <Box sx={{ width: '100%', flex: 1 }}>
                <DataTable
                  columns={["Horário", "Cliente", "Serviço"]}
                  rows={agendamentos.map(a => [
                    `${a.horaInicio} - ${a.horaFim}`,
                    a.clienteId,
                    a.servico.nome
                  ])}
                  loading={loadingAgenda}
                  emptyMessage="Nenhum agendamento para hoje"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}