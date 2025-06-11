import { Box, Typography, Card, CardContent, FormControl, InputLabel, Select, MenuItem, Button, Popover } from '@mui/material';
import { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
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

async function fetchReceitaPorMes(ano: number): Promise<number[]> {
  const receitas: number[] = Array(12).fill(0);
  const col = collection(db, 'agendamentos');
  const q = query(col, where('status', '==', 'finalizado'));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.preco || !data.data) return;
    const dataObj = data.data.toDate();
    if (dataObj.getFullYear() === ano) {
      const mes = dataObj.getMonth();
      receitas[mes] += Number(data.preco);
    }
  });
  return receitas;
}

async function fetchFuncionarios(): Promise<{ id: string, nome: string }[]> {
  const col = collection(db, 'users');
  const snapshot = await getDocs(col);
  return snapshot.docs.map(doc => ({ id: doc.id, nome: doc.data().nome }));
}

async function fetchAgendamentosHoje(): Promise<{ funcionario: string, horario: string, cliente: string, servico: string }[]> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const inicioHoje = Timestamp.fromDate(hoje);
  const fimHoje = Timestamp.fromDate(amanha);
  const col = collection(db, 'agendamentos');
  const q = query(
    col,
    where('data', '>=', inicioHoje),
    where('data', '<', fimHoje),
    where('status', '==', 'agendado')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const d = doc.data();
    return {
      funcionario: d.funcionario,
      horario: d.horario,
      cliente: d.cliente,
      servico: d.servico,
    };
  });
}

export default function Home() {
  // Receita Semestre
  const [anos] = useState(() => {
    const atual = getAnoAtual();
    return [atual, atual - 1, atual - 2];
  });
  const [anoSelecionado, setAnoSelecionado] = useState(getAnoAtual());
  const [semestreSelecionado, setSemestreSelecionado] = useState(getSemestreAtual());
  const [receitas, setReceitas] = useState<number[]>(Array(12).fill(0));
  const [loadingReceita, setLoadingReceita] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Agenda Hoje
  const [funcionarios, setFuncionarios] = useState<{ id: string, nome: string }[]>([]);
  const [agendamentos, setAgendamentos] = useState<{ funcionario: string, horario: string, cliente: string, servico: string }[]>([]);

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
    setLoadingReceita(true);
    fetchReceitaPorMes(anoSelecionado).then(receitas => {
      setReceitas(receitas);
      setLoadingReceita(false);
    });
  }, [anoSelecionado]);

  useEffect(() => {
    Promise.all([fetchFuncionarios(), fetchAgendamentosHoje()]).then(([funcs, ags]) => {
      setFuncionarios(funcs);
      setAgendamentos(ags);
    });
  }, []);

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
            <Box sx={{ flex: 1, bgcolor: '#181818', borderRadius: 3, p: 2, display: 'flex', flexDirection: 'column', minHeight: 0, overflowX: 'auto', height: '100%' }}>
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
              </Box>
              {/* Linhas de horas com coluna fixa de horários */}
              <Box ref={gridRef} sx={{ flex: 1, display: 'grid', gridTemplateRows: `repeat(${horas.length}, 1fr)`, gridTemplateColumns: `80px repeat(${funcionarios.length}, 1fr)`, gap: 0, height: '100%', overflowY: 'auto' }}>
                {horas.map((hora, rowIdx) => [
                  <Box key={hora + '-hora'} sx={{ border: '1px solid #222', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#aaa', bgcolor: '#181818', fontWeight: 600 }}>
                    {hora}
                  </Box>,
                  ...funcionarios.map((func, colIdx) => {
                    const ag = agendamentos.find(a => a.funcionario === func.id && a.horario === hora);
                    return (
                      <Box key={hora + '-' + func.id} sx={{ border: '1px solid #222', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: ag ? '#fff' : '#888', bgcolor: ag ? '#333' : 'transparent' }}>
                        {ag ? `${ag.cliente} - ${ag.servico}` : ''}
                      </Box>
                    );
                  })
                ])}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
} 