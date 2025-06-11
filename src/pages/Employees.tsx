import { Box, Grid, Typography, Card, CardContent, IconButton, TextField, Fab, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import { useUserContext } from '../contexts/UserContext';

interface Funcionario {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  fotoPerfil: string;
  servicosHabilitados: string[];
  diasFuncionamento: string[];
  horarioFuncionamento: {
    inicio: string;
    fim: string;
  };
}

const initialNovoFuncionario: Omit<Funcionario, 'id'> = {
  nome: '',
  telefone: '',
  email: '',
  fotoPerfil: '',
  servicosHabilitados: [],
  diasFuncionamento: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
  horarioFuncionamento: {
    inicio: '09:00',
    fim: '18:00'
  }
};

export default function Employees() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Funcionario>>({});
  const [openNovo, setOpenNovo] = useState(false);
  const [novoFuncionario, setNovoFuncionario] = useState<Omit<Funcionario, 'id'>>(initialNovoFuncionario);
  const [servicos, setServicos] = useState<Array<{ id: string; nome: string }>>([]);
  const { id: userId } = useUserContext();
  const [loading, setLoading] = useState(true); // Added loading state

  useEffect(() => {
    async function fetchData() {
      if (!userId) {
        console.error('ID do usuário não encontrado');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Buscar empresa usando o userId do usuário global
        const empresasRef = collection(db, 'empresas');
        const q = query(empresasRef, where('userId', '==', userId));
        const empresasSnapshot = await getDocs(q);

        if (empresasSnapshot.empty) {
          console.error('Empresa não encontrada para o usuário:', userId);
          setLoading(false);
          return;
        }

        const empresaDoc = empresasSnapshot.docs[0];
        const empresaData = empresaDoc.data();
        const empresaId = empresaDoc.id;

        console.log('Dados da empresa:', empresaData);

        // Buscar serviços da empresa para o select
        const servicosArray = empresaData.servicos?.map((servico: any) => ({
          id: servico.id,
          nome: servico.nome
        })) || [];
        console.log('Serviços encontrados:', servicosArray);
        setServicos(servicosArray);

        // Buscar funcionários da empresa
        const funcionariosIds = empresaData.funcionarios || [];
        console.log('IDs dos funcionários:', funcionariosIds);

        const funcionariosPromises = funcionariosIds.map(async (id: string) => {
          console.log('Buscando funcionário com ID:', id);
          const funcionarioDoc = await getDoc(doc(db, 'users', id));
          console.log('Documento do funcionário existe?', funcionarioDoc.exists());
          if (funcionarioDoc.exists()) {
            const data = funcionarioDoc.data();
            console.log('Dados do funcionário:', data);
            return {
              id: funcionarioDoc.id,
              nome: data.nome || '',
              telefone: data.telefone || '',
              email: data.email || '',
              fotoPerfil: data.fotoPerfil || '',
              servicosHabilitados: data.servicosHabilitados || [],
              diasFuncionamento: data.diasFuncionamento || [],
              horarioFuncionamento: data.horarioFuncionamento || { inicio: '09:00', fim: '18:00' }
            } as Funcionario;
          }
          return null;
        });

        const funcionariosData = (await Promise.all(funcionariosPromises)).filter(Boolean) as Funcionario[];
        console.log('Funcionários processados:', funcionariosData);
        setFuncionarios(funcionariosData);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userId]);

  const handleEdit = (func: Funcionario) => {
    setEditId(func.id);
    setEditData({ ...func });
  };

  const handleCancel = () => {
    setEditId(null);
    setEditData({});
  };

  const handleChange = (field: keyof Funcionario, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editId || !userId) return;
    try {
      const ref = doc(db, 'users', editId);
      await updateDoc(ref, {
        nome: editData.nome,
        telefone: editData.telefone,
        email: editData.email,
        servicosHabilitados: editData.servicosHabilitados,
        diasFuncionamento: editData.diasFuncionamento,
        horarioFuncionamento: editData.horarioFuncionamento,
      });

      // Buscar a empresa correta
      const empresasRef = collection(db, 'empresas');
      const q = query(empresasRef, where('userId', '==', userId));
      const empresasSnapshot = await getDocs(q);

      if (!empresasSnapshot.empty) {
        const empresaDoc = empresasSnapshot.docs[0];
        const empresaData = empresaDoc.data();

        if (empresaData) {
          // No Firebase, você geralmente atualiza a lista de IDs de funcionários na empresa,
          // não os dados completos dos funcionários diretamente no array de funcionários da empresa.
          // Os dados do funcionário são atualizados na coleção 'users'.
          // Não é necessário mapear o array `funcionarios` da empresa, pois ele contém apenas IDs.
          // O que você salvou em 'users' já é o suficiente.
        }
      }

      setFuncionarios(funcionarios.map(f => f.id === editId ? { ...f, ...editData } as Funcionario : f));
      setEditId(null);
      setEditData({});
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleNovoChange = (field: keyof Omit<Funcionario, 'id'>, value: any) => {
    setNovoFuncionario(prev => ({ ...prev, [field]: value }));
  };

  const handleNovoSalvar = async () => {
    if (!userId) return;
    try {
      // Criar novo funcionário na coleção 'users'
      const funcionarioRef = await addDoc(collection(db, 'users'), {
        ...novoFuncionario,
        tipoUsuario: 'Funcionario',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Buscar a empresa correta
      const empresasRef = collection(db, 'empresas');
      const q = query(empresasRef, where('userId', '==', userId));
      const empresasSnapshot = await getDocs(q);

      if (!empresasSnapshot.empty) {
        const empresaDoc = empresasSnapshot.docs[0];
        const empresaData = empresaDoc.data();

        if (empresaData) {
          const funcionariosAtualizados = [...(empresaData.funcionarios || []), funcionarioRef.id];
          await updateDoc(doc(db, 'empresas', empresaDoc.id), { funcionarios: funcionariosAtualizados });
        }
      }

      setFuncionarios([...funcionarios, { ...novoFuncionario, id: funcionarioRef.id }]);
      setNovoFuncionario(initialNovoFuncionario);
      setOpenNovo(false);
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
    }
  };

  const handleNovoCancelar = () => {
    setNovoFuncionario(initialNovoFuncionario);
    setOpenNovo(false);
  };

  const handleDelete = async (id: string) => {
    if (!userId || !window.confirm('Tem certeza que deseja excluir este funcionário?')) return;
    try {
      // Remover funcionário da coleção 'users'
      await deleteDoc(doc(db, 'users', id));

      // Buscar a empresa correta
      const empresasRef = collection(db, 'empresas');
      const q = query(empresasRef, where('userId', '==', userId));
      const empresasSnapshot = await getDocs(q);

      if (!empresasSnapshot.empty) {
        const empresaDoc = empresasSnapshot.docs[0];
        const empresaData = empresaDoc.data();

        if (empresaData) {
          const funcionariosAtualizados = empresaData.funcionarios.filter((funcId: string) => funcId !== id);
          await updateDoc(doc(db, 'empresas', empresaDoc.id), { funcionarios: funcionariosAtualizados });
        }
      }

      setFuncionarios(funcionarios.filter(f => f.id !== id));
      setEditId(null);
      setEditData({});
    } catch (error) {
      console.error('Erro ao deletar funcionário:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Funcionários
      </Typography>
      {funcionarios.length === 0 ? (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          color: '#888',
          textAlign: 'center',
          gap: 2
        }}>
          <Typography variant="h5">Nenhum funcionário cadastrado</Typography>
          <Typography>Clique no botão + para adicionar um novo funcionário</Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {funcionarios.map(func => (
            <Grid item xs={12} md={6} lg={4} key={func.id}>
              <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minHeight: 200, position: 'relative' }}>
                <CardContent>
                  {editId === func.id ? (
                    <>
                      <TextField