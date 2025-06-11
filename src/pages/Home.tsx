import { Box, Grid, Typography, Select, MenuItem, FormControl, InputLabel, styled, Card, CardContent } from '@mui/material';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Tipagem para os dados
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
    const data = doc.data() as Agendamento;
    if (!data.servico?.preco || !data.data) return;
    
    // Convertendo o Timestamp do Firestore para Date
    const dataObj = data.data.toDate();
    if (dataObj.getFullYear() === ano) {
      const mes = dataObj.getMonth();
      receitas[mes] += Number(data.servico.preco);
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

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  
  const inicioHoje = Timestamp.fromDate(hoje);
  const fimHoje = Timestamp.fromDate(amanha);
  
  const col = collection(db, 'agendamentos');
  
  let q = query(
    col, 
    where('empresaId', '==', empresaId),
    where('data', '>=', inicioHoje),
    where('data', '<', fimHoje),
    where('status', '==', 'agendado')
  );
  
  if (funcionarioId) {
    q = query(q, where('funcionarioId', '==', funcionarioId));
  }
  
  const snapshot = await getDocs(q);
  const agendamentos: Agendamento[] = [];
  
  snapshot.forEach(doc => {
    const data = doc.data() as Omit<Agendamento, 'id'>;
    agendamentos.push({ 
      id: doc.id, 
      ...data 
    });
  });
  
  return agendamentos.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
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
  const [anos] = useState(() => {
    const atual = getAnoAtual();
    return [atual, atual - 1, atual - 2];
  });
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

    setLoading(true);
    fetchReceitaPorMes(semestreSelecionado.ano, empresaId).then(receitas => {
      setReceitas(receitas);
      setLoading(false);
    });
  }, [semestreSelecionado, empresaId]);

  // Atualizar agendamentos quando empresaId ou funcionário mudar
  useEffect(() => {
    if (!empresaId) return;

    setLoadingAgenda(true);
    fetchAgendamentosHoje(empresaId, funcionarioSelecionado || undefined).then(agendamentos => {
      setAgendamentos(agendamentos);
      setLoadingAgenda(false);
    });
  }, [empresaId, funcionarioSelecionado]);

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
    scales: {
      x: { ticks: { color: '#fff' }, grid: { color: '#444' } },
      y: { ticks: { color: '#fff' }, grid: { color: '#444' } },
    },
  };

  const semestresOpcoes = gerarSemestres(anos);

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
                {loading ? 'Carregando...' : receitaSemestre.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Typography>
              <Box sx={{ width: '100%', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
                <ReceitaChartSemestreAtual
                  receitas={receitas}
                  mesSelecionado={semestreSelecionado.semestre === 1 ? 0 : 6}
                  options={options}
                />
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