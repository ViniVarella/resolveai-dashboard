import { Box, Button, Card, CardContent, Grid, IconButton, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Fab, Tooltip, CircularProgress, FormControlLabel, Switch, Radio, RadioGroup, FormControl, FormLabel, Chip, Avatar, Alert, Select, MenuItem, InputLabel, OutlinedInput } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import { useEffect, useState, useRef } from 'react';
import { db, storage } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, query, where, Timestamp, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useUser } from '../contexts/UserContext';
import { v4 as uuidv4 } from 'uuid';

interface Funcionario {
  id: string;
  nome: string;
}

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
  imagensUrl: string[];
  funcionariosIds: string[];
}

interface Empresa {
  id: string;
  servicos: Servico[];
  categorias: string[];
  funcionarios: string[];
}

const TIPOS_SERVICO = [
  'pagamento no inicio',
  'pagamento no final'
] as const;

type TipoServico = typeof TIPOS_SERVICO[number];

const initialNovoServico: Omit<Servico, 'id' | 'createdAt' | 'updatedAt'> = {
  categoria: '',
  nome: '',
  descricao: '',
  duracao: 0,
  preco: 0,
  tipoServico: 'pagamento no final',
  ValorFinalMuda: true,
  imagensUrl: [],
  funcionariosIds: []
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
  const [categorias, setCategorias] = useState<string[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selectedFuncionarios, setSelectedFuncionarios] = useState<Funcionario[]>([]);
  const [openFuncionarios, setOpenFuncionarios] = useState(false);
  const [openCategorias, setOpenCategorias] = useState(false);
  const [imagens, setImagens] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isDeletingImage, setIsDeletingImage] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    async function fetchData() {
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
          console.log('Dados da empresa:', empresaData); // Debug log
          
          // Garantir que servicos seja um array
          const servicosArray = Array.isArray(empresaData.servicos) ? empresaData.servicos : [];
          setServicos(servicosArray);

          // Garantir que categorias seja um array e remover duplicatas
          const categoriasArray = Array.isArray(empresaData.categorias) 
            ? [...new Set(empresaData.categorias)] 
            : [];
          console.log('Categorias carregadas:', categoriasArray); // Debug log
          setCategorias(categoriasArray);

          // Buscar dados dos funcionários
          const funcionariosCompletos: Funcionario[] = [];
          const funcionariosIds = Array.isArray(empresaData.funcionarios) ? empresaData.funcionarios : [];
          
          for (const funcionarioId of funcionariosIds) {
            const funcionarioRef = doc(db, 'users', funcionarioId);
            const funcionarioDoc = await getDoc(funcionarioRef);
            
            if (funcionarioDoc.exists()) {
              const funcionarioData = funcionarioDoc.data();
              funcionariosCompletos.push({
                id: funcionarioId,
                nome: funcionarioData.nome || 'Funcionário sem nome'
              });
            }
          }
          setFuncionarios(funcionariosCompletos);
        } else {
          console.log('Documento da empresa não encontrado');
          setServicos([]);
          setCategorias([]);
          setFuncionarios([]);
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setError('Erro ao carregar dados da empresa');
        setServicos([]);
        setCategorias([]);
        setFuncionarios([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setImagens(prev => [...prev, ...newFiles]);
    }
  };

  const handleDeleteImage = async (index: number) => {
    if (!window.confirm('Deseja realmente deletar esta imagem?')) return;

    try {
      setIsDeletingImage(index);
      
      if (uploadedImageUrls[index]) {
        const imageUrl = uploadedImageUrls[index];
        const storagePath = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
        const imageRef = ref(storage, storagePath);
        await deleteObject(imageRef);
      }

      setImagens(prev => prev.filter((_, i) => i !== index));
      setUploadedImageUrls(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      setError('Erro ao deletar imagem');
    } finally {
      setIsDeletingImage(null);
    }
  };

  const handleEdit = (servico: Servico) => {
    setEditId(servico.id);
    setEditData({ ...servico });
    // Carregar funcionários selecionados ao editar
    const funcionariosSelecionados = funcionarios.filter(f => 
      servico.funcionariosIds?.includes(f.id)
    );
    setSelectedFuncionarios(funcionariosSelecionados);
    // Carregar URLs das imagens existentes
    setUploadedImageUrls(servico.imagensUrl || []);
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

    if (!editData.categoria || !categorias.includes(editData.categoria)) {
      setError('Categoria inválida');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Upload de novas imagens
      const newUploadedImageUrls = [...uploadedImageUrls];
      for (let i = 0; i < imagens.length; i++) {
        const image = imagens[i];
        if (uploadedImageUrls[i] === URL.createObjectURL(image)) continue;

        const storageRef = ref(storage, `servicos/${userId}/${editData.nome}/${i + 1}`);
        await uploadBytes(storageRef, image);
        const downloadURL = await getDownloadURL(storageRef);
        newUploadedImageUrls[i] = downloadURL;
      }

      const empresaRef = doc(db, 'empresas', empresaId);
      const empresaDoc = await getDoc(empresaRef);
      
      if (!empresaDoc.exists()) {
        throw new Error('Empresa não encontrada');
      }

      const empresaData = empresaDoc.data() as Empresa;
      // Garantir que servicos seja um array
      const servicosAtualizados = Array.isArray(empresaData.servicos) 
        ? empresaData.servicos.map(s => 
            s.id === editId 
              ? { 
                  ...s, 
                  ...editData,
                  imagensUrl: newUploadedImageUrls,
                  funcionariosIds: selectedFuncionarios.map(f => f.id),
                  updatedAt: Timestamp.now()
                } 
              : s
          )
        : [];

      await updateDoc(empresaRef, { servicos: servicosAtualizados });
      setServicos(servicosAtualizados);
      setEditId(null);
      setEditData({});
      setImagens([]);
      setUploadedImageUrls([]);
      setSelectedFuncionarios([]);
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      setError('Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNovoChange = (field: keyof Omit<Servico, 'id' | 'createdAt' | 'updatedAt'>, value: any) => {
    setNovoServico(prev => ({ ...prev, [field]: value }));
  };

  const handleNovoSalvar = async () => {
    if (!empresaId) {
      setError('Empresa não encontrada');
      return;
    }

    if (!novoServico.nome || !novoServico.categoria || !novoServico.preco || !novoServico.duracao) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (!categorias.includes(novoServico.categoria)) {
      setError('Categoria inválida');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Upload das imagens
      const uploadedUrls: string[] = [];
      for (let i = 0; i < imagens.length; i++) {
        const storageRef = ref(storage, `servicos/${userId}/${novoServico.nome}/${i + 1}`);
        await uploadBytes(storageRef, imagens[i]);
        const downloadURL = await getDownloadURL(storageRef);
        uploadedUrls.push(downloadURL);
      }

      const empresaRef = doc(db, 'empresas', empresaId);
      const empresaDoc = await getDoc(empresaRef);
      
      if (!empresaDoc.exists()) {
        throw new Error('Empresa não encontrada');
      }

      const empresaData = empresaDoc.data() as Empresa;
      const novoId = uuidv4();
      const agora = Timestamp.now();
      
      const novoServicoCompleto: Servico = {
        ...novoServico,
        id: novoId,
        createdAt: agora,
        updatedAt: agora,
        imagensUrl: uploadedUrls,
        funcionariosIds: selectedFuncionarios.map(f => f.id)
      };

      // Garantir que servicos seja um array antes de adicionar
      const servicosAtualizados = Array.isArray(empresaData.servicos) 
        ? [...empresaData.servicos, novoServicoCompleto]
        : [novoServicoCompleto];

      await updateDoc(empresaRef, { servicos: servicosAtualizados });
      
      setServicos(servicosAtualizados);
      setNovoServico(initialNovoServico);
      setImagens([]);
      setUploadedImageUrls([]);
      setSelectedFuncionarios([]);
      setOpenNovo(false);
    } catch (error) {
      console.error('Erro ao criar novo serviço:', error);
      setError('Erro ao criar serviço');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNovoCancelar = () => {
    setNovoServico(initialNovoServico);
    setImagens([]);
    setUploadedImageUrls([]);
    setSelectedFuncionarios([]);
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
                      <FormControl fullWidth sx={{ mb: 1 }}>
                        <InputLabel id="categoria-label" sx={{ color: '#aaa' }}>Categoria</InputLabel>
                        <Select
                          labelId="categoria-label"
                          value={editData.categoria || ''}
                          onChange={e => handleChange('categoria', e.target.value)}
                          label="Categoria"
                          sx={{ 
                            color: '#fff',
                            '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00C20A' },
                            '.MuiSvgIcon-root': { color: '#aaa' }
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                bgcolor: '#222',
                                '& .MuiMenuItem-root': {
                                  color: '#fff',
                                  '&:hover': { bgcolor: '#444' },
                                  '&.Mui-selected': { 
                                    bgcolor: '#00C20A',
                                    '&:hover': { bgcolor: '#00C20A' }
                                  }
                                }
                              }
                            }
                          }}
                        >
                          {categorias.length > 0 ? (
                            categorias.map((cat) => (
                              <MenuItem 
                                key={cat} 
                                value={cat} 
                                sx={{ 
                                  color: '#fff',
                                  '&:hover': { bgcolor: '#444' },
                                  '&.Mui-selected': { 
                                    bgcolor: '#00C20A',
                                    '&:hover': { bgcolor: '#00C20A' }
                                  }
                                }}
                              >
                                {cat}
                              </MenuItem>
                            ))
                          ) : (
                            <MenuItem disabled sx={{ color: '#666' }}>
                              Nenhuma categoria disponível
                            </MenuItem>
                          )}
                        </Select>
                      </FormControl>
                      <FormControl fullWidth sx={{ mb: 1 }}>
                        <InputLabel id="tipo-servico-label" sx={{ color: '#aaa' }}>Tipo de Serviço</InputLabel>
                        <Select
                          labelId="tipo-servico-label"
                          value={editData.tipoServico || ''}
                          onChange={e => handleChange('tipoServico', e.target.value)}
                          label="Tipo de Serviço"
                          sx={{ 
                            color: '#fff',
                            '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00C20A' },
                            '.MuiSvgIcon-root': { color: '#aaa' }
                          }}
                        >
                          {TIPOS_SERVICO.map((tipo) => (
                            <MenuItem key={tipo} value={tipo} sx={{ color: '#333' }}>
                              {tipo === 'pagamento no inicio' ? 'Pagamento no início' : 'Pagamento no final'}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        label={`Valor ${editData.tipoServico === 'pagamento no inicio' ? 'fixo' : 'inicial'}`}
                        value={editData.preco}
                        onChange={e => handleChange('preco', parseFloat(e.target.value))}
                        type="number"
                        fullWidth
                        sx={{ mb: 1, input: { color: '#fff' }, label: { color: '#aaa' } }}
                      />
                      <TextField
                        label="Duração (minutos)"
                        value={editData.duracao}
                        onChange={e => handleChange('duracao', parseInt(e.target.value))}
                        type="number"
                        fullWidth
                        sx={{ mb: 1, input: { color: '#fff' }, label: { color: '#aaa' } }}
                      />
                      <TextField
                        label="Descrição"
                        value={editData.descricao}
                        onChange={e => handleChange('descricao', e.target.value)}
                        multiline
                        rows={3}
                        fullWidth
                        sx={{ mb: 1, input: { color: '#fff' }, label: { color: '#aaa' } }}
                      />
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel id="funcionarios-label" sx={{ color: '#aaa' }}>Funcionários</InputLabel>
                        <Select
                          multiple
                          value={selectedFuncionarios.map(f => f.id)}
                          onChange={(e) => {
                            const selectedIds = e.target.value as string[];
                            const selected = funcionarios.filter(f => selectedIds.includes(f.id));
                            setSelectedFuncionarios(selected);
                          }}
                          input={<OutlinedInput label="Funcionários" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => {
                                const funcionario = funcionarios.find(f => f.id === value);
                                return funcionario ? (
                                  <Chip
                                    key={funcionario.id}
                                    label={funcionario.nome}
                                    sx={{ 
                                      backgroundColor: '#444',
                                      color: '#fff',
                                      '& .MuiChip-deleteIcon': {
                                        color: '#aaa',
                                        '&:hover': { color: '#fff' }
                                      }
                                    }}
                                    onDelete={() => {
                                      const newSelected = selectedFuncionarios.filter(f => f.id !== funcionario.id);
                                      setSelectedFuncionarios(newSelected);
                                    }}
                                  />
                                ) : null;
                              })}
                            </Box>
                          )}
                          sx={{ 
                            color: '#fff',
                            '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00C20A' },
                            '.MuiSvgIcon-root': { color: '#aaa' }
                          }}
                        >
                          {funcionarios.map((funcionario) => (
                            <MenuItem 
                              key={funcionario.id} 
                              value={funcionario.id}
                              sx={{ 
                                color: '#fff',
                                '&:hover': { backgroundColor: '#444' },
                                '&.Mui-selected': { 
                                  backgroundColor: '#00C20A !important',
                                  '&:hover': { backgroundColor: '#00C20A !important' }
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ width: 24, height: 24, bgcolor: '#666' }}>
                                  {funcionario.nome.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography sx={{ color: '#fff' }}>{funcionario.nome}</Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Box sx={{ mb: 2 }}>
                        <Typography sx={{ color: '#aaa', mb: 1 }}>Imagens</Typography>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageSelect}
                          style={{ display: 'none' }}
                          ref={fileInputRef}
                        />
                        <Button
                          variant="outlined"
                          onClick={() => fileInputRef.current?.click()}
                          sx={{ 
                            color: '#00C20A', 
                            borderColor: '#00C20A',
                            mb: 1,
                            '&:hover': {
                              borderColor: '#00C20A',
                              bgcolor: 'rgba(0,194,10,0.1)'
                            }
                          }}
                          startIcon={<ImageIcon />}
                        >
                          Adicionar Imagens
                        </Button>
                        <Box sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                          gap: 1,
                          mt: 1
                        }}>
                          {[...uploadedImageUrls, ...imagens.map(img => URL.createObjectURL(img))].map((url, index) => (
                            <Box key={index} sx={{ position: 'relative' }}>
                              <img
                                src={url}
                                alt={`Imagem ${index + 1}`}
                                style={{
                                  width: '100%',
                                  height: 100,
                                  objectFit: 'cover',
                                  borderRadius: 8,
                                  border: '2px solid #00C20A'
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteImage(index)}
                                disabled={isDeletingImage === index}
                                sx={{
                                  position: 'absolute',
                                  top: -8,
                                  right: -8,
                                  bgcolor: '#B10000',
                                  color: '#fff',
                                  '&:hover': { bgcolor: '#8B0000' }
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      </Box>
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
      <Dialog open={openNovo} onClose={handleNovoCancelar} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          bgcolor: '#222', 
          color: '#fff',
          borderBottom: '1px solid #444'
        }}>
          Novo Serviço
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#222', color: '#fff' }}>
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Nome"
              value={novoServico.nome}
              onChange={e => handleNovoChange('nome', e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="nova-categoria-label" sx={{ color: '#aaa' }}>Categoria</InputLabel>
              <Select
                labelId="nova-categoria-label"
                value={novoServico.categoria}
                onChange={e => handleNovoChange('categoria', e.target.value)}
                label="Categoria"
                sx={{ 
                  color: '#fff',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00C20A' },
                  '.MuiSvgIcon-root': { color: '#aaa' },
                  '.MuiSelect-select': { 
                    whiteSpace: 'normal',
                    wordBreak: 'break-word'
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: '#222',
                      '& .MuiMenuItem-root': {
                        color: '#fff',
                        '&:hover': { bgcolor: '#444' },
                        '&.Mui-selected': { 
                          bgcolor: '#00C20A',
                          '&:hover': { bgcolor: '#00C20A' }
                        }
                      }
                    }
                  }
                }}
              >
                {categorias.length > 0 ? (
                  categorias.map((cat) => (
                    <MenuItem 
                      key={cat} 
                      value={cat}
                      sx={{ 
                        color: '#fff',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}
                    >
                      {cat}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled sx={{ color: '#666' }}>
                    Nenhuma categoria disponível
                  </MenuItem>
                )}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="novo-tipo-servico-label">Tipo de Serviço</InputLabel>
              <Select
                labelId="novo-tipo-servico-label"
                value={novoServico.tipoServico}
                onChange={e => handleNovoChange('tipoServico', e.target.value)}
                label="Tipo de Serviço"
              >
                {TIPOS_SERVICO.map((tipo) => (
                  <MenuItem key={tipo} value={tipo}>
                    {tipo === 'pagamento no inicio' ? 'Pagamento no início' : 'Pagamento no final'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={`Valor ${novoServico.tipoServico === 'pagamento no inicio' ? 'fixo' : 'inicial'}`}
              value={novoServico.preco}
              onChange={e => handleNovoChange('preco', parseFloat(e.target.value))}
              type="number"
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Duração (minutos)"
              value={novoServico.duracao}
              onChange={e => handleNovoChange('duracao', parseInt(e.target.value))}
              type="number"
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Descrição"
              value={novoServico.descricao}
              onChange={e => handleNovoChange('descricao', e.target.value)}
              multiline
              rows={3}
              fullWidth
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="novos-funcionarios-label">Funcionários</InputLabel>
              <Select
                labelId="novos-funcionarios-label"
                multiple
                value={selectedFuncionarios.map(f => f.id)}
                onChange={(e) => {
                  const selectedIds = e.target.value as string[];
                  const selected = funcionarios.filter(f => selectedIds.includes(f.id));
                  setSelectedFuncionarios(selected);
                }}
                input={<OutlinedInput label="Funcionários" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const funcionario = funcionarios.find(f => f.id === value);
                      return (
                        <Chip
                          key={value}
                          label={funcionario?.nome}
                          sx={{ bgcolor: '#444', color: '#fff' }}
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {funcionarios.map((funcionario) => (
                  <MenuItem key={funcionario.id} value={funcionario.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, bgcolor: '#00C20A', fontSize: '0.875rem' }}>
                        {funcionario.nome.charAt(0)}
                      </Avatar>
                      {funcionario.nome}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ mb: 1 }}>Imagens</Typography>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                sx={{ 
                  color: '#00C20A', 
                  borderColor: '#00C20A',
                  mb: 1,
                  '&:hover': {
                    borderColor: '#00C20A',
                    bgcolor: 'rgba(0,194,10,0.1)'
                  }
                }}
                startIcon={<ImageIcon />}
              >
                Adicionar Imagens
              </Button>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: 1,
                mt: 1
              }}>
                {imagens.map((img, index) => (
                  <Box key={index} sx={{ position: 'relative' }}>
                    <img
                      src={URL.createObjectURL(img)}
                      alt={`Imagem ${index + 1}`}
                      style={{
                        width: '100%',
                        height: 100,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '2px solid #00C20A'
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteImage(index)}
                      disabled={isDeletingImage === index}
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        bgcolor: '#B10000',
                        color: '#fff',
                        '&:hover': { bgcolor: '#8B0000' }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#222', borderTop: '1px solid #444' }}>
          <Button 
            onClick={handleNovoCancelar} 
            color="error"
            sx={{ color: '#ff4444' }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleNovoSalvar} 
            variant="contained" 
            color="primary"
            disabled={!novoServico.categoria || !categorias.includes(novoServico.categoria)}
            sx={{ 
              bgcolor: '#00C20A',
              '&:hover': { bgcolor: '#00A208' },
              '&.Mui-disabled': { bgcolor: '#444', color: '#666' }
            }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 