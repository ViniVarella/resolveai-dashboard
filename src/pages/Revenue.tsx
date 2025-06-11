import { Box, Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, styled } from '@mui/material';
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

async function fetchReceitaPorMes(ano: number): Promise<number[]> {
  const receitas: number[] = Array(12).fill(0);
  const col = collection(db, 'agendamentos');
  const q = query(col, where('status', '==', 'finalizado'));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    const data = doc.data() as Agendamento;
    if (!data.preco || !data.data) return;
    
    const dataObj = data.data.toDate();
    if (dataObj.getFullYear() === ano) {
      const mes = dataObj.getMonth();
      receitas[mes] += Number(data.preco);
    }
  });
  return receitas;
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
        fill: true,
      },
    ],
  };

  return (
    <Line data={data} options={{ ...options, maintainAspectRatio: false }} style={{ width: '100%', height: '100%' }} />
  );
};

export default function Revenue() {
  const [anoSelecionado, setAnoSelecionado] = useState(getAnoAtual());
  const [receitas, setReceitas] = useState<number[]>(Array(12).fill(0));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchReceitaPorMes(anoSelecionado).then(receitas => {
      setReceitas(receitas);
      setLoading(false);
    });
  }, [anoSelecionado]);

  const receitaTotal = receitas.reduce((acc, curr) => acc + curr, 0);

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { 
        ticks: { color: '#fff' }, 
        grid: { color: '#444' } 
      },
      y: { 
        ticks: { 
          color: '#fff',
          callback: (value: number) => `R$ ${value.toLocaleString('pt-BR')}`,
          stepSize: 5000
        }, 
        grid: { color: '#444' } 
      },
    },
  };

  const anos = Array.from({ length: 5 }, (_, i) => getAnoAtual() - i);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Faturamento
      </Typography>
      <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minHeight: 200, position: 'relative', height: 500, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
          <CardHeader>
    <Box>
              <Typography variant="h6" color="#aaa" mb={1}>Receita Total</Typography>
              <Typography variant="h4" fontWeight={600}>
                {loading ? 'Carregando...' : receitaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: 100 }}>
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
          <Box sx={{ width: '100%', flex: 1, height: '100%', mt: 4, minHeight: 0 }}>
            <ReceitaChart receitas={receitas} options={options} meses={meses} />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
} 