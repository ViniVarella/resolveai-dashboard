import { Box, Typography, Card, CardContent, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput, IconButton, Popover, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
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

async function fetchServicosMaisVendidos({ ano, mes }: { ano?: number, mes?: number }) {
  const col = collection(db, 'agendamentos');
  let q = query(col, where('status', '==', 'finalizado'));
  const snapshot = await getDocs(q);
  const servicosCount: Record<string, number> = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.servico || !data.data) return;
    const dataObj = data.data.toDate();
    if (ano && dataObj.getFullYear() !== ano) return;
    if (mes !== undefined && mes !== null && mes >= 0 && dataObj.getMonth() !== mes) return;
    servicosCount[data.servico] = (servicosCount[data.servico] || 0) + 1;
  });
  // Ordena do maior para o menor
  return Object.entries(servicosCount)
    .sort((a, b) => b[1] - a[1])
    .map(([servico, count]) => ({ servico, count }));
}

export default function Statistics() {
  // Receita anual
  const [anos, setAnos] = useState(() => {
    const atual = getAnoAtual();
    return [atual, atual - 1, atual - 2];
  });
  const [anoSelecionado, setAnoSelecionado] = useState(getAnoAtual());
  const [receitas, setReceitas] = useState<number[]>(Array(12).fill(0));
  const [loadingReceita, setLoadingReceita] = useState(true);

  // Serviços mais populares
  const [filtroAno, setFiltroAno] = useState(false);
  const [filtroMes, setFiltroMes] = useState(false);
  const [anoServicos, setAnoServicos] = useState(getAnoAtual());
  const [mesServicos, setMesServicos] = useState<number | 'todos'>('todos');
  const [servicos, setServicos] = useState<{ servico: string, count: number }[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    setLoadingReceita(true);
    fetchReceitaPorMes(anoSelecionado).then(receitas => {
      setReceitas(receitas);
      setLoadingReceita(false);
    });
  }, [anoSelecionado]);

  useEffect(() => {
    setLoadingServicos(true);
    fetchServicosMaisVendidos({
      ano: filtroAno ? anoServicos : undefined,
      mes: filtroAno && filtroMes && mesServicos !== 'todos' ? mesServicos as number : undefined,
    }).then(servicos => {
      setServicos(servicos);
      setLoadingServicos(false);
    });
  }, [filtroAno, filtroMes, anoServicos, mesServicos]);

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
        <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minWidth: 350, flex: 1, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
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
            <Typography variant="h4" mb={2} fontWeight={600} sx={{ fontSize: { xs: '1.6rem', sm: '2.2rem', md: '2.5rem' } }}>
              {loadingReceita ? 'Carregando...' : receitas.reduce((acc, v) => acc + v, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Typography>
            <Box sx={{ width: '100%', flex: 1, height: 260, minHeight: 0, overflow: 'hidden' }}>
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
        {/* Card Serviços Mais Populares */}
        <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minWidth: 350, flex: 1, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
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
            <Box sx={{ width: '100%', flex: 1, height: 260, minHeight: 0, overflow: 'hidden' }}>
              <Bar
                data={{
                  labels: servicos.map(s => s.servico),
                  datasets: [
                    {
                      label: 'Vendas',
                      data: servicos.map(s => s.count),
                      backgroundColor: '#fff',
                      borderRadius: 6,
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
      </Box>
    </Box>
  );
} 