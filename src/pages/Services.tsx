import { Box, Button, Card, CardContent, Grid, IconButton, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Fab, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';

interface Servico {
  id: string;
  categoria: string;
  nome: string;
  descricao: string;
  duracao: number;
  preco: number;
}

const initialNovoServico: Omit<Servico, 'id'> = {
  categoria: '',
  nome: '',
  descricao: '',
  duracao: 0,
  preco: 0,
};

export default function Services() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Servico>>({});
  const [loading, setLoading] = useState(true);
  const [openNovo, setOpenNovo] = useState(false);
  const [novoServico, setNovoServico] = useState<Omit<Servico, 'id'>>(initialNovoServico);

  useEffect(() => {
    async function fetchServicos() {
      setLoading(true);
      const col = collection(db, 'servicos');
      const snapshot = await getDocs(col);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Servico));
      setServicos(data);
      setLoading(false);
    }
    fetchServicos();
  }, []);

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
    if (!editId) return;
    const ref = doc(db, 'servicos', editId);
    await updateDoc(ref, {
      categoria: editData.categoria,
      nome: editData.nome,
      descricao: editData.descricao,
      duracao: Number(editData.duracao),
      preco: Number(editData.preco),
    });
    setServicos(servicos.map(s => s.id === editId ? { ...s, ...editData } as Servico : s));
    setEditId(null);
    setEditData({});
  };

  // Cadastro de novo serviço
  const handleNovoChange = (field: keyof Omit<Servico, 'id'>, value: any) => {
    setNovoServico(prev => ({ ...prev, [field]: value }));
  };

  const handleNovoSalvar = async () => {
    const docRef = await addDoc(collection(db, 'servicos'), {
      ...novoServico,
      duracao: Number(novoServico.duracao),
      preco: Number(novoServico.preco),
    });
    setServicos([...servicos, { ...novoServico, id: docRef.id }]);
    setNovoServico(initialNovoServico);
    setOpenNovo(false);
  };

  const handleNovoCancelar = () => {
    setNovoServico(initialNovoServico);
    setOpenNovo(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este serviço?')) return;
    await deleteDoc(doc(db, 'servicos', id));
    setServicos(servicos.filter(s => s.id !== id));
    setEditId(null);
    setEditData({});
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Serviços
      </Typography>
      <Grid container spacing={4}>
        {servicos.map(servico => (
          <Grid item xs={12} md={6} lg={4} key={servico.id}>
            <Card sx={{ bgcolor: '#222', color: '#fff', borderRadius: 4, minHeight: 200, position: 'relative' }}>
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
                    <Typography><b>Duração:</b> {servico.duracao}</Typography>
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
            label="Duração"
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNovoCancelar} color="error">Cancelar</Button>
          <Button onClick={handleNovoSalvar} variant="contained" color="primary">Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 