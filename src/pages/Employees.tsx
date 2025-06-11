import { Box, Grid, Typography, Card, CardContent, IconButton, TextField, Fab, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';

interface Funcionario {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  servicosHabilitados: string[];
}

interface Empresa {
  id: string;
  funcionarios: string[];
}

const initialNovoFuncionario: Omit<Funcionario, 'id'> = {
  nome: '',
  telefone: '',
  email: '',
  servicosHabilitados: [],
};

export default function Employees() {
  const { id: userId } = useUser();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Funcionario>>({});
  const [openNovo, setOpenNovo] = useState(false);
  const [novoFuncionario, setNovoFuncionario] = useState<Omit<Funcionario, 'id'>>(initialNovoFuncionario);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar o ID da empresa
  const fetchEmpresaId = async (userId: string): Promise<string | null> => {
    try {
      const empresasRef = collection(db, 'empresas');
      const q = query(empresasRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('Nenhuma empresa encontrada para o usuário:', userId);
        return null;
      }

      const empresaDoc = querySnapshot.docs[0];
      console.log('Empresa encontrada:', empresaDoc.id);
      return empresaDoc.id;
    } catch (error) {
      console.error('Erro ao buscar empresa:', error);
      return null;
    }
  };

  useEffect(() => {
    async function fetchFuncionarios() {
      if (!userId) {
        setError('Usuário não autenticado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Buscar ID da empresa
        const empresaId = await fetchEmpresaId(userId);
        if (!empresaId) {
          setError('Empresa não encontrada');
          setLoading(false);
          return;
        }

        // Buscar dados da empresa
        const empresaDoc = await getDoc(doc(db, 'empresas', empresaId));
        const empresaData = empresaDoc.data() as Empresa;
        
        if (!empresaData?.funcionarios?.length) {
          console.log('Nenhum funcionário cadastrado na empresa');
          setFuncionarios([]);
          setLoading(false);
          return;
        }

        // Buscar dados dos funcionários
        const funcionariosIds = empresaData.funcionarios;
        console.log('Buscando funcionários:', funcionariosIds);

        const funcionariosPromises = funcionariosIds.map(async (funcId) => {
          const funcDoc = await getDoc(doc(db, 'users', funcId));
          if (funcDoc.exists()) {
            return { id: funcDoc.id, ...funcDoc.data() } as Funcionario;
          }
          return null;
        });

        const funcionariosData = (await Promise.all(funcionariosPromises)).filter((f): f is Funcionario => f !== null);
        console.log('Funcionários encontrados:', funcionariosData.length);
        
        setFuncionarios(funcionariosData);
      } catch (error) {
        console.error('Erro ao buscar funcionários:', error);
        setError('Erro ao carregar funcionários');
      } finally {
        setLoading(false);
      }
    }

    fetchFuncionarios();
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
    if (!editId) return;
    try {
      const ref = doc(db, 'users', editId);
      await updateDoc(ref, {
        nome: editData.nome,
        telefone: editData.telefone,
        email: editData.email,
        servicosHabilitados: editData.servicosHabilitados,
      });
      setFuncionarios(funcionarios.map(f => f.id === editId ? { ...f, ...editData } as Funcionario : f));
      setEditId(null);
      setEditData({});
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      setError('Erro ao salvar alterações');
    }
  };

  const handleNovoChange = (field: keyof Omit<Funcionario, 'id'>, value: any) => {
    setNovoFuncionario(prev => ({ ...prev, [field]: value }));
  };

  const handleNovoSalvar = async () => {
    try {
      if (!userId) {
        setError('Usuário não autenticado');
        return;
      }

      // Criar novo funcionário
      const docRef = await addDoc(collection(db, 'users'), {
        ...novoFuncionario,
        tipo: 'funcionario'
      });

      // Buscar empresa
      const empresaId = await fetchEmpresaId(userId);
      if (!empresaId) {
        setError('Empresa não encontrada');
        return;
      }

      // Atualizar array de funcionários da empresa
      const empresaRef = doc(db, 'empresas', empresaId);
      const empresaDoc = await getDoc(empresaRef);
      const empresaData = empresaDoc.data() as Empresa;
      
      await updateDoc(empresaRef, {
        funcionarios: [...(empresaData.funcionarios || []), docRef.id]
      });

      setFuncionarios([...funcionarios, { ...novoFuncionario, id: docRef.id }]);
      setNovoFuncionario(initialNovoFuncionario);
      setOpenNovo(false);
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      setError('Erro ao criar funcionário');
    }
  };

  const handleNovoCancelar = () => {
    setNovoFuncionario(initialNovoFuncionario);
    setOpenNovo(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este funcionário?')) return;
    
    try {
      if (!userId) {
        setError('Usuário não autenticado');
        return;
      }

      // Remover funcionário da coleção users
      await deleteDoc(doc(db, 'users', id));

      // Buscar e atualizar empresa
      const empresaId = await fetchEmpresaId(userId);
      if (!empresaId) {
        setError('Empresa não encontrada');
        return;
      }

      const empresaRef = doc(db, 'empresas', empresaId);
      const empresaDoc = await getDoc(empresaRef);
      const empresaData = empresaDoc.data() as Empresa;
      
      await updateDoc(empresaRef, {
        funcionarios: empresaData.funcionarios.filter(fid => fid !== id)
      });

      setFuncionarios(funcionarios.filter(f => f.id !== id));
      setEditId(null);
      setEditData({});
    } catch (error) {
      console.error('Erro ao excluir funcionário:', error);
      setError('Erro ao excluir funcionário');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Typography>Carregando funcionários...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: 'error.main' }}>
        <Typography>{error}</Typography>
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
                      <TextField
                        label="Serviços Habilitados"
                        value={editData.servicosHabilitados?.join(', ')}
                        onChange={e => handleChange('servicosHabilitados', e.target.value.split(',').map((s: string) => s.trim()))}
                        fullWidth
                        sx={{ mb: 1, input: { color: '#fff' }, label: { color: '#aaa' } }}
                      />
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
                      <Typography variant="h5" color="#aaa" mb={1}>{func.nome}</Typography>
                      <Typography><b>Telefone:</b> {func.telefone}</Typography>
                      <Typography><b>Email:</b> {func.email}</Typography>
                      <Typography><b>Serviços Habilitados:</b> {func.servicosHabilitados?.join(', ') || 'Nenhum'}</Typography>
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
      )}
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
          <TextField
            label="Serviços Habilitados"
            value={novoFuncionario.servicosHabilitados.join(', ')}
            onChange={e => handleNovoChange('servicosHabilitados', e.target.value.split(',').map((s: string) => s.trim()))}
            fullWidth
            sx={{ mb: 2 }}
            helperText="Digite os IDs dos serviços separados por vírgula"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNovoCancelar}>Cancelar</Button>
          <Button onClick={handleNovoSalvar} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 