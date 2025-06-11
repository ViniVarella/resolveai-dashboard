import { Box, Typography, Card, CardContent, FormControl, InputLabel, Select, MenuItem, Button, Popover, Grid } from '@mui/material';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, Timestamp, getDoc, doc } from 'firebase/firestore';
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
import DataTable from '../components/DataTable'; // Assuming this component exists
import { useUserContext } from '../contexts/UserContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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

interface AgendamentoSimplificado {
  funcionario: string;
  horario: string;
  cliente: string;
  servico: string;
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
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' }
});

const meses = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];
// const horas = Array.from({ length: 13 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`); // 08:00 até 20:00 - Not used with DataTable

function getAnoAtual() {
  return new Date().getFullYear();
}

// Corrected getSemestreAtual to directly use Date object
function getSemestreAtual() {
  return new Date().getMonth() < 6 ? 1 : 2;
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
    const agendamento = doc.data() as Agendamento;
    if (!agendamento.servico?.preco || !agendamento.data) return;

    const dataObj = agendamento.data.toDate();
    if (dataObj.getFullYear() === ano) {
      const mes = dataObj.getMonth();
      receitas[mes] += Number(agendamento.servico.preco);
    }
  });

  console.log('Receitas por mês:', receitas);
  return receitas;
}

async function fetchFuncionarios(empresaId: string): Promise<{ id: string; nome: string }[]> {
  if (!empresaId) return [];

  try {
    const empresaDoc = await getDoc(doc(db, 'empresas', empresaId));
    if (!empresaDoc.exists()) return [];

    const empresaData = empresaDoc.data();
    const funcionariosIds = empresaData?.funcionarios || []; // Use optional chaining for safety

    const funcionariosPromises = funcionariosIds.map(async (id: string) => {
      const funcionarioDoc = await getDoc(doc(db, 'users', id));
      if (funcionarioDoc.exists()) {
        const data = funcionarioDoc.data();
        return {
          id: funcionarioDoc.id,
          nome: data.nome || ''
        };
      }
      return null;
    });

    return (await Promise.all(funcionariosPromises)).filter(Boolean) as { id: string; nome: string }[];
  } catch (error) {
    console.error('Erro ao buscar funcionários:', error);
    return [];
  }
}

async function fetchAgendamentosHoje(empresaId: string, funcionarioId?: string): Promise<AgendamentoSimplificado[]> {
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
  const agendamentos: AgendamentoSimplificado[] = [];

  // Fetch client and employee names for display
  const clientPromises: Promise<{ id: string; nome: string }>[] = [];
  const employeeNames: { [key: string]: string } = {};

  snapshot.forEach(doc => {
    const data = doc.data() as Agendamento;
    if (!employeeNames[data.funcionarioId]) {
      clientPromises.push(getDoc(collection(db, 'users', data.clienteId)).then(doc => ({ id: doc.id, nome: doc.data()?.nome || 'Cliente Desconhecido' })));
    }
  });

  const clients = await Promise.all(clientPromises);
  const clientNames: { [key: string]: string } = {};
  clients.forEach(client => {
    if (client) clientNames[client.id] = client.nome;
  });


  snapshot.forEach(doc => {
    const data = doc.data() as Agendamento;
    agendamentos.push({
      funcionario: employeeNames[data.funcionarioId] || data.funcionarioId, // Use fetched name, fallback to ID
      horario: data.horaInicio,
      cliente: clientNames[data.clienteId] || data.clienteId, // Use fetched name, fallback to ID
      servico: data.servico.nome
    });
  });

  return agendamentos.sort((a, b) => a.horario.localeCompare(b.horario));
}

// Função para obter os meses do semestre atual e os dados correspondentes (already in nicolas version)
// function getSemestreData(receitas: number[], mesSelecionado: number) {
//   const semestre = mesSelecionado < 6 ? 0 : 1;
//   const start = semestre === 0 ? 0 : 6;
//   const end = semestre === 0 ? 6 : 12;
//   return {
//     meses: meses.slice(start, end),
//     receitas: receitas.slice(start, end),
//   };
// }

// Função utilitária para gerar opções de semestre (already in nicolas version)
function gerarSemestres(anos: number[]): { label: string, ano: number, semestre: 1 | 2 }[] {
  return anos.flatMap(ano => [
    { label: `${ano}-1`, ano, semestre: 1 },
    { label: `${ano}-2`, ano, semestre: 2 },
  ]);
}

export default function Home() {
  const { id: userId } = useUserContext();
  const [empresaId, setEmpresaId] = useState<string>('');
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<string>('');
  const [anos] = useState(() => {
    const atual = getAnoAtual();
    return [atual, atual - 1, atual - 2];
  });
  // Changed semestreSelecionado to an object to align with nicolas version
  const [semestreSelecionado, setSemestreSelecionado] = useState<{ ano: number; semestre: number }>({
    ano: getAnoAtual(),
    semestre: getSemestreAtual()
  });
  const [receitas, setReceitas] = useState<number[]>(Array(12).fill(0));
  const [loadingReceita, setLoadingReceita] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [funcionarios, setFuncionarios] = useState<{ id: string, nome: string }[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoSimplificado[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(true);

  const handleOpenFiltro = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseFiltro = () => {
    setAnchorEl(null);
  };

  const openFiltro = Boolean(anchorEl);

  // Fetch company ID when userId changes
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
        } else {
          console.warn('No company found for the current user.');
          setEmpresaId(''); // Clear company ID if not found
        }
      } catch (error) {
        console.error('Error fetching company:', error);
      }
    }

    fetchEmpresaId();
  }, [userId]);

  // Update revenue when companyId or selected semester changes
  useEffect(() => {
    if (!empresaId) {
      setReceitas(Array(12).fill(0)); // Clear data if no company ID
      setLoadingReceita(false);
      return;
    }

    setLoadingReceita(true);
    fetchReceitaPorMes(semestreSelecionado.ano, empresaId).then(receitas => {
      setReceitas(receitas);
      setLoadingReceita(false);
    });
  }, [semestreSelecionado, empresaId]);

  // Update appointments when companyId or selected employee changes
  useEffect(() => {
    if (!empresaId) {
      setFuncionarios([]);
      setAgendamentos([]);
      setLoadingAgenda(false);
      return;
    }

    setLoadingAgenda(true);
    Promise.all([
      fetchFuncionarios(empresaId),
      fetchAgendamentosHoje(empresaId, funcionarioSelecionado || undefined)
    ]).then(([funcs, ags]) => {
      setFuncionarios(funcs);
      setAgendamentos(ags);
      setLoadingAgenda(false);
    }).catch(error => {
      console.error("Error fetching agenda data:", error);
      setLoadingAgenda(false);
    });
  }, [empresaId, funcionarioSelecionado]);


  const semestresOpcoes = gerarSemestres(anos);
  const start = semestreSelecionado.semestre === 1 ? 0 : 6;
  const end = semestreSelecionado.semestre === 1 ? 6 : 12;
  const mesesSemestre = meses.slice(start, end);
  const receitasSemestre = receitas.slice(start, end);
  const receitaTotal = receitasSemestre.reduce((acc, v) => acc + v, 0);

  const options = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: false } },
    scales: {
      x: { ticks: { color: '#fff' }, grid: { color: '#444' } },
      y: { ticks: { color: '#fff' }, grid: { color: '#444' } },
    },
    maintainAspectRatio: false,
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={600} mb={3}>
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
                      setSemestreSelecionado({ ano: Number(ano), semestre: Number(semestre) as 1 | 2 });
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
                {loadingReceita ? 'Carregando...' : receitaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Typography>
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
                  options={options}
                  style={{ width: '100%', height: '100%' }}
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
                    {funcionarios.map(func => (
                      <MenuItem key={func.id} value={func.id}>
                        {func.nome}
                      </MenuItem>
                    ))}
                  </StyledSelect>
                </FormControl>
              </CardHeader>
              <Box sx={{ width: '100%', flex: 1 }}>
                <DataTable
                  columns={["Horário", "Cliente", "Serviço", "Funcionário"]}
                  rows={agendamentos.map(a => [
                    a.horario,
                    a.cliente,
                    a.servico,
                    a.funcionario, // Add employee name to the DataTable row
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