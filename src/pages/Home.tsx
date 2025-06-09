import { Box, Grid, Typography, Select, MenuItem, FormControl, InputLabel, styled } from '@mui/material';
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
import DashboardCard from '../components/DashboardCard';
import DataTable from '../components/DataTable';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Tipagem para os dados
interface Agendamento {
  id: string;
  cliente: string;
  servico: string;
  data: Timestamp;
  horario: string;
  preco: number;
  funcionario: string;
  status: 'agendado' | 'finalizado' | 'cancelado';
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

async function fetchReceitaPorMes(ano: number): Promise<number[]> {
  const receitas: number[] = Array(12).fill(0);
  const col = collection(db, 'agendamentos');
  const q = query(col, where('status', '==', 'finalizado'));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    const data = doc.data() as Agendamento;
    if (!data.preco || !data.data) return;
    
    // Convertendo o Timestamp do Firestore para Date
    const dataObj = data.data.toDate();
    if (dataObj.getFullYear() === ano) {
      const mes = dataObj.getMonth();
      receitas[mes] += Number(data.preco);
    }
  });
  return receitas;
}

async function fetchAgendamentosHoje(funcionario?: string): Promise<Agendamento[]> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  
  const inicioHoje = Timestamp.fromDate(hoje);
  const fimHoje = Timestamp.fromDate(amanha);
  
  const col = collection(db, 'agendamentos');
  
  let q = query(
    col, 
    where('data', '>=', inicioHoje),
    where('data', '<', fimHoje),
    where('status', '==', 'agendado')
  );
  
  if (funcionario) {
    q = query(q, where('funcionario', '==', funcionario));
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
  
  return agendamentos.sort((a, b) => a.horario.localeCompare(b.horario));
}

// Componente para o gráfico de receita
const ReceitaChart = ({ receitas, options, meses }: { 
  receitas: number[], 
  options: any, 
  meses: string[] 
}) => {
  const data = {
    labels: meses,
    datasets: [
      {
        label: 'Receita',
        data: receitas,
        borderColor: '#fff',
        backgroundColor: 'rgba(255,255,255,0.1)',
        tension: 0.4,
      },
    ],
  };

  return receitas.some(r => r > 0) ? (
    <Line data={data} options={options} height={180} />
  ) : (
    <Typography color="#888" align="center" mt={6}>Sem dados para exibir</Typography>
  );
};

export default function Home() {
  const [mesSelecionado, setMesSelecionado] = useState(getMesAtual());
  const [anoSelecionado] = useState(getAnoAtual());
  const [receitas, setReceitas] = useState<number[]>(Array(12).fill(0));
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingAgenda, setLoadingAgenda] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchReceitaPorMes(anoSelecionado).then(receitas => {
      setReceitas(receitas);
      setLoading(false);
    });
  }, [anoSelecionado]);

  useEffect(() => {
    setLoadingAgenda(true);
    fetchAgendamentosHoje(funcionarioSelecionado || undefined).then(agendamentos => {
      setAgendamentos(agendamentos);
      setLoadingAgenda(false);
    });
  }, [funcionarioSelecionado]);

  const receitaMes = receitas[mesSelecionado] || 0;

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

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Grid container spacing={4} justifyContent="space-between" alignItems="flex-start">
        <Grid item xs={12} md={6}>
          <DashboardCard>
            <CardHeader>
              <Typography variant="h6" color="#aaa">Receita</Typography>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel sx={{ color: '#fff' }}>Mês</InputLabel>
                <StyledSelect
                  value={mesSelecionado}
                  label="Mês"
                  onChange={e => setMesSelecionado(Number(e.target.value))}
                  MenuProps={{ PaperProps: { sx: { background: '#222', color: '#fff' } } }}
                >
                  {meses.map((mes, idx) => (
                    <MenuItem value={idx} key={mes}>{mes}</MenuItem>
                  ))}
                </StyledSelect>
              </FormControl>
            </CardHeader>
            <Typography variant="h3" mb={2} fontWeight={600}>
              {loading ? 'Carregando...' : receitaMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Typography>
            <Box sx={{ height: 180, width: '100%' }}>
              <ReceitaChart receitas={receitas} options={options} meses={meses} />
            </Box>
          </DashboardCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <DashboardCard>
            <CardHeader>
              <Typography variant="h6" color="#aaa">Agenda Hoje</Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: '#fff' }}>Funcionário</InputLabel>
                <StyledSelect
                  value={funcionarioSelecionado}
                  label="Funcionário"
                  onChange={(e) => setFuncionarioSelecionado(e.target.value as string)}
                  MenuProps={{ PaperProps: { sx: { background: '#222', color: '#fff' } } }}
                >
                  <MenuItem value={''}>Todos</MenuItem>
                  <MenuItem value={'func1'}>Funcionário 1</MenuItem>
                  <MenuItem value={'func2'}>Funcionário 2</MenuItem>
                </StyledSelect>
              </FormControl>
            </CardHeader>
            <Box sx={{ width: '100%' }}>
              <DataTable
                columns={["Horário", "Cliente", "Serviço"]}
                rows={agendamentos.map(a => [a.horario, a.cliente, a.servico])}
                loading={loadingAgenda}
                emptyMessage="Nenhum agendamento para hoje"
              />
            </Box>
          </DashboardCard>
        </Grid>
      </Grid>
    </Box>
  );
} 