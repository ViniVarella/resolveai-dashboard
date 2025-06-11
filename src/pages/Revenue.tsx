import { Box, Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, styled } from '@mui/material';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import { useUser } from '../contexts/UserContext';
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

interface ReceitaData {
  receitasMensais: number[];
  receitaTotal: number;
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

async function fetchEmpresaId(userId: string): Promise<string | null> {
  const empresasRef = collection(db, 'empresas');
  const q = query(empresasRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    return snapshot.docs[0].id;
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
  const { id: userId } = useUser();
  const [anoSelecionado, setAnoSelecionado] = useState(getAnoAtual());
  const [receitas, setReceitas] = useState<number[]>(Array(12).fill(0));
  const [receitaTotalGeral, setReceitaTotalGeral] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      console.log('ERRO: User ID não encontrado no contexto');
      return;
    }

    setLoading(true);
    fetchReceitaPorMes(anoSelecionado, userId)
      .then(({ receitasMensais, receitaTotal }) => {
        setReceitas(receitasMensais);
        setReceitaTotalGeral(receitaTotal);
        setLoading(false);
      })
      .catch(error => {
        console.error('Erro ao buscar receitas:', error);
        setLoading(false);
      });
  }, [anoSelecionado, userId]);

  const receitaAnoAtual = receitas.reduce((acc, curr) => acc + curr, 0);

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
      <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minHeight: 200, position: 'relative', height: 650, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
          <CardHeader>
            <Box>
              <Typography variant="h6" color="#aaa" mb={1} sx={{ fontSize: theme => `calc(${theme.typography.h6.fontSize} + 7px)` }}>Receita</Typography>
              <Typography variant="h4" fontWeight={600}>
                {loading ? 'Carregando...' : receitaAnoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Typography>
              <Typography variant="subtitle1" color="#aaa" mt={1}>
                Receita Total: {loading ? 'Carregando...' : receitaTotalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
          <Box sx={{ width: '100%', flex: 1, height: '100%', minHeight: 0 }}>
            <ReceitaChart receitas={receitas} options={options} meses={meses} />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
} 