import { Box, Button, Card, CardContent, Grid, IconButton, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Fab, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';

interface Servico {
  id: string;
  categoria: string;
  nome: string;
  descricao: string;
  duracao: number;
  preco: number;
  tipoServico: string;
  ValorFinalMuda: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  imagensUrl?: string[];
  funcionariosIds?: string[];
}

interface Empresa {
  id: string;
  servicos: Servico[];
}

const initialNovoServico: Omit<Servico, 'id' | 'createdAt' | 'updatedAt'> = {
  categoria: '',
  nome: '',
  descricao: '',
  duracao: 0,
  preco: 0,
  tipoServico: 'pagamento no final',
  ValorFinalMuda: true,
};

async function fetchEmpresaId(userId: string): Promise<string | null> {
  const empresasRef = collection(db, 'empresas');
  const q = query(empresasRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }
  return null;
}

export default function Services() {
  const { id: userId } = useUser();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Servico>>({});
  const [loading, setLoading] = useState(true);
  const [openNovo, setOpenNovo] = useState(false);
  const [novoServico, setNovoServico] = useState<Omit<Servico, 'id' | 'createdAt' | 'updatedAt'>>(initialNovoServico);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmpresa() {
      if (!userId) {
        console.log('ERRO: User ID não encontrado no contexto');
        return;
      }

      const id = await fetchEmpresaId(userId);
      if (!id) {
        console.log('ERRO: Empresa não encontrada para o usuário');
        return;
      }

      setEmpresaId(id);
      return id;
    }

    async function fetchServicos() {
      setLoading(true);
      try {
        const empresaId = await fetchEmpresa();
        if (!empresaId) {
          setLoading(false);
          return;
        }

        const empresaRef = doc(db, 'empresas', empresaId);
        const empresaDoc = await getDoc(empresaRef);
        
        if (empresaDoc.exists()) {
          const empresaData = empresaDoc.data() as Empresa;
          setServicos(empresaData.servicos || []);
        } else {
          console.log('Documento da empresa não encontrado');
          setServicos([]);
        }
      } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        setServicos([]);
      } finally {
        setLoading(false);
      }
    }

    fetchServicos();
  }, [userId]);

  const handleEdit = (servico: Servico) => {
    setEditId(servico.id);
    setEditData({ ...servico });
  };

  const handleCancel = () => {
    setEditId(null);
    setEditData({});
  };

  const handleChange = (field: keyof Servico, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editId || !empresaId) return;

    try {
      const empresaRef = doc(db, 'empresas', empresaId);
      const empresaDoc = await getDoc(empresaRef);
      
      if (!empresaDoc.exists()) {
        console.error('Empresa não encontrada');
        return;
      }

      const empresaData = empresaDoc.data() as Empresa;
      const servicosAtualizados = empresaData.servicos.map(s => 
        s.id === editId 
          ? { 
              ...s, 
              ...editData,
              updatedAt: Timestamp.now()
            } 
          : s
      );

      await updateDoc(empresaRef, { servicos: servicosAtualizados });
      setServicos(servicosAtualizados);
      setEditId(null);
      setEditData({});
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
    }
  };

  const handleNovoChange = (field: keyof Omit<Servico, 'id' | 'createdAt' | 'updatedAt'>, value: any) => {
    setNovoServico(prev => ({ ...prev, [field]: value }));
  };

  const handleNovoSalvar = async () => {
    if (!empresaId) {
      console.error('ERRO: Empresa ID não encontrado');
      return;
    }

    try {
      const empresaRef = doc(db, 'empresas', empresaId);
      const empresaDoc = await getDoc(empresaRef);
      
      if (!empresaDoc.exists()) {
        console.error('Empresa não encontrada');
        return;
      }

      const empresaData = empresaDoc.data() as Empresa;
      const novoId = crypto.randomUUID();
      const agora = Timestamp.now();
      
      const novoServicoCompleto: Servico = {
        ...novoServico,
        id: novoId,
        createdAt: agora,
        updatedAt: agora,
        imagensUrl: [],
        funcionariosIds: []
      };

      const servicosAtualizados = [...(empresaData.servicos || []), novoServicoCompleto];
      await updateDoc(empresaRef, { servicos: servicosAtualizados });
      
      setServicos(servicosAtualizados);
      setNovoServico(initialNovoServico);
      setOpenNovo(false);
    } catch (error) {
      console.error('Erro ao criar novo serviço:', error);
    }
  };

  const handleNovoCancelar = () => {
    setNovoServico(initialNovoServico);
    setOpenNovo(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este serviço?')) return;
    if (!empresaId) return;

    try {
      const empresaRef = doc(db, 'empresas', empresaId);
      const empresaDoc = await getDoc(empresaRef);
      
      if (!empresaDoc.exists()) {
        console.error('Empresa não encontrada');
        return;
      }

      const empresaData = empresaDoc.data() as Empresa;
      const servicosAtualizados = empresaData.servicos.filter(s => s.id !== id);
      
      await updateDoc(empresaRef, { servicos: servicosAtualizados });
      setServicos(servicosAtualizados);
      setEditId(null);
      setEditData({});
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
    }
  };

  if (!empresaId && !loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', color: '#888' }}>
        <Typography variant="h5">Empresa não encontrada</Typography>
        <Typography>Não foi possível carregar os serviços da empresa.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Serviços
      </Typography>
      {servicos.length === 0 && !loading ? (
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
          <Typography variant="h5">Nenhum serviço cadastrado</Typography>
          <Typography>Clique no botão + para adicionar um novo serviço</Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {servicos.map(servico => (
            <Grid item xs={12} md={6} lg={4} key={servico.id}>
              <Card sx={{ background: '#222', color: '#fff', borderRadius: 4, minHeight: 200, position: 'relative' }}>
                <CardContent>
                  {editId === servico.id ? (
                    <>
                      <TextField
                        label="Nome"
                        value={editData.nome}
                        onChange={e => handleChange('nome', e.target.value)}
                        fullWidth
                        sx={{ mb: 1, input: { color: '#fff' }, label: { color: '#aaa' } }}
                      />
                      <TextField
                        label="Categoria"
                        value={editData.categoria}
                        onChange={e => handleChange('categoria', e.target.value)}
                        fullWidth
                        sx={{ mb: 1, input: { color: '#fff' }, label: { color: '#aaa' } }}
                      />
                      <TextField
                        label="Descrição"
                        value={editData.descricao}
                        onChange={e => handleChange('descricao', e.target.value)}
                        fullWidth
                        sx={{ mb: 1, input: { color: '#fff' }, label: { color: '#aaa' } }}
                      />
                      <TextField
                        label="Duração"
                        value={editData.duracao}
                        onChange={e => handleChange('duracao', e.target.value)}
                        type="number"
                        fullWidth
                        sx={{ mb: 1, input: { color: '#fff' }, label: { color: '#aaa' } }}
                      />
                      <TextField
                        label="Preço"
                        value={editData.preco}
                        onChange={e => handleChange('preco', e.target.value)}
                        type="number"
                        fullWidth
                        sx={{ mb: 1, input: { color: '#fff' }, label: { color: '#aaa' } }}
                      />
                      <TextField
                        label="Tipo de Serviço"
                        value={editData.tipoServico}
                        onChange={e => handleChange('tipoServico', e.target.value)}
                        fullWidth
                        sx={{ mb: 1, input: { color: '#fff' }, label: { color: '#aaa' } }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1 }}>
                        <Box>
                          <IconButton onClick={handleSave} sx={{ color: 'lightgreen' }}><CheckIcon /></IconButton>
                          <IconButton onClick={handleCancel} sx={{ color: 'tomato' }}><CloseIcon /></IconButton>
                        </Box>
                        <IconButton onClick={() => handleDelete(servico.id)} sx={{ color: 'red', bgcolor: '#222', '&:hover': { bgcolor: '#333' } }}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Typography variant="h5" color="#aaa" mb={1}>{servico.nome}</Typography>
                      <Typography><b>Categoria:</b> {servico.categoria}</Typography>
                      <Typography><b>Valor:</b> R$ {Number(servico.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Typography>
                      <Typography><b>Descrição:</b> {servico.descricao}</Typography>
                      <Typography><b>Duração:</b> {servico.duracao} min</Typography>
                      <Typography><b>Tipo:</b> {servico.tipoServico}</Typography>
                      <Typography><b>Valor Final Muda:</b> {servico.ValorFinalMuda ? 'Sim' : 'Não'}</Typography>
                      <IconButton onClick={() => handleEdit(servico)} sx={{ position: 'absolute', top: 16, right: 16, bgcolor: '#444', color: '#fff', '&:hover': { bgcolor: '#555' } }}>
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
      <Tooltip title="Adicionar Serviço">
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
        <DialogTitle>Novo Serviço</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            value={novoServico.nome}
            onChange={e => handleNovoChange('nome', e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Categoria"
            value={novoServico.categoria}
            onChange={e => handleNovoChange('categoria', e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Descrição"
            value={novoServico.descricao}
            onChange={e => handleNovoChange('descricao', e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Duração (minutos)"
            value={novoServico.duracao}
            onChange={e => handleNovoChange('duracao', e.target.value)}
            type="number"
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Preço"
            value={novoServico.preco}
            onChange={e => handleNovoChange('preco', e.target.value)}
            type="number"
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Tipo de Serviço"
            value={novoServico.tipoServico}
            onChange={e => handleNovoChange('tipoServico', e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNovoCancelar} color="error">Cancelar</Button>
          <Button onClick={handleNovoSalvar} variant="contained" color="primary">Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 