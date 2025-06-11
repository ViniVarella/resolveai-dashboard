import { Box, Grid, Typography, Card, CardContent, IconButton, TextField, Fab, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
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
  const [loading, setLoading] = useState(true);
  const [openNovo, setOpenNovo] = useState(false);
  const [novoFuncionario, setNovoFuncionario] = useState<Omit<Funcionario, 'id'>>(initialNovoFuncionario);
  const [servicos, setServicos] = useState<Array<{ id: string; nome: string }>>([]);
  const { id: userId } = useUserContext();

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
          const funcionariosAtualizados = empresaData.funcionarios.map((id: string) => 
            id === editId ? { ...editData, id } : id
          );
          await updateDoc(doc(db, 'empresas', empresaDoc.id), { funcionarios: funcionariosAtualizados });
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
      // Criar novo funcionário
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
      // Remover funcionário
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
      <Grid container spacing={4}>
        {funcionarios.map(func => (
          <Grid item xs={12} md={6} lg={4} key={func.id}>
            <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minHeight: 200, position: 'relative' }}>
              <CardContent>
                {editId === func.id ? (
                  <>
                    <TextField
                      label="Nome"
                      value={editData.nome}
                      onChange={e => handleChange('nome', e.target.value)}
                      fullWidth
                      sx={{ mb: 1, input: { color: '#fff' }, label: { color: '#aaa' } }}
                    />
                    <TextField
                      label="Telefone"
                      value={editData.telefone}
                      onChange={e => handleChange('telefone', e.target.value)}
                      fullWidth
                      sx={{ mb: 1, input: { color: '#fff' }, label: { color: '#aaa' } }}
                    />
                    <TextField
                      label="Email"
                      value={editData.email}
                      onChange={e => handleChange('email', e.target.value)}
                      fullWidth
                      sx={{ mb: 1, input: { color: '#fff' }, label: { color: '#aaa' } }}
                    />
                    <FormControl fullWidth sx={{ mb: 1 }}>
                      <InputLabel sx={{ color: '#aaa' }}>Serviços Habilitados</InputLabel>
                      <Select
                        multiple
                        value={editData.servicosHabilitados || []}
                        onChange={e => handleChange('servicosHabilitados', e.target.value)}
                        sx={{ color: '#fff', '.MuiSelect-icon': { color: '#fff' } }}
                        renderValue={(selected) => (selected as string[]).join(', ')}
                      >
                        {servicos.map((servico) => (
                          <MenuItem key={servico.id} value={servico.nome}>
                            {servico.nome}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1 }}>
                      <Box>
                        <IconButton onClick={handleSave} sx={{ color: 'lightgreen' }}><CheckIcon /></IconButton>
                        <IconButton onClick={handleCancel} sx={{ color: 'tomato' }}><CloseIcon /></IconButton>
                      </Box>
                      <IconButton onClick={() => handleDelete(func.id)} sx={{ color: 'red', bgcolor: '#222', '&:hover': { bgcolor: '#333' } }}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      {func.fotoPerfil ? (
                        <img 
                          src={func.fotoPerfil} 
                          alt={func.nome}
                          style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Box 
                          sx={{ 
                            width: 60, 
                            height: 60, 
                            borderRadius: '50%', 
                            bgcolor: '#444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Typography variant="h5">{func.nome.charAt(0)}</Typography>
                        </Box>
                      )}
                      <Typography variant="h5" color="#aaa">{func.nome}</Typography>
                    </Box>
                    <Typography><b>Telefone:</b> {func.telefone}</Typography>
                    <Typography><b>Email:</b> {func.email}</Typography>
                    <Typography><b>Serviços:</b> {func.servicosHabilitados?.join(', ') || 'Nenhum'}</Typography>
                    <Typography><b>Horário:</b> {func.horarioFuncionamento?.inicio} - {func.horarioFuncionamento?.fim}</Typography>
                    <Typography><b>Dias:</b> {func.diasFuncionamento?.join(', ')}</Typography>
                    <IconButton onClick={() => handleEdit(func)} sx={{ position: 'absolute', top: 16, right: 16, bgcolor: '#444', color: '#fff', '&:hover': { bgcolor: '#555' } }}>
                      <EditIcon />
                    </IconButton>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Tooltip title="Adicionar Funcionário">
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            bgcolor: '#222',
            color: '#fff',
            fontWeight: 700,
            fontSize: 18,
            boxShadow: 2,
            '&:hover': { bgcolor: '#333' }
          }}
          onClick={() => setOpenNovo(true)}
          size="medium"
        >
          <AddIcon />
        </Fab>
      </Tooltip>
      <Dialog open={openNovo} onClose={handleNovoCancelar} maxWidth="xs" fullWidth>
        <DialogTitle>Novo Funcionário</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            value={novoFuncionario.nome}
            onChange={e => handleNovoChange('nome', e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Telefone"
            value={novoFuncionario.telefone}
            onChange={e => handleNovoChange('telefone', e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Email"
            value={novoFuncionario.email}
            onChange={e => handleNovoChange('email', e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Serviços Habilitados</InputLabel>
            <Select
              multiple
              value={novoFuncionario.servicosHabilitados}
              onChange={e => handleNovoChange('servicosHabilitados', e.target.value)}
              renderValue={(selected) => (selected as string[]).join(', ')}
            >
              {servicos.map((servico) => (
                <MenuItem key={servico.id} value={servico.nome}>
                  {servico.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNovoCancelar}>Cancelar</Button>
          <Button onClick={handleNovoSalvar} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 