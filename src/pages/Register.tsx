import { Box, Button, FormControl, IconButton, InputAdornment, OutlinedInput, Paper, TextField, Typography, Stepper, Step, StepLabel, MenuItem, Select, Grid } from '@mui/material';
import { useState } from 'react';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

interface FormData {
  // Step 1
  email: string;
  senha: string;
  confirmarSenha: string;
  // Step 2
  nome: string;
  cep: string;
  cidade: string;
  endereco: string;
  numero: string;
  complemento: string;
  telefone: string;
  categoria: string;
}

const CATEGORIAS = [
  'Aulas',
  'Beleza',
  'Eletricista',
  'Encanador',
  'Limpeza',
  'Massagem',
  'Mecânico',
  'TI'
];

const initialFormData: FormData = {
  email: '',
  senha: '',
  confirmarSenha: '',
  nome: '',
  cep: '',
  cidade: '',
  endereco: '',
  numero: '',
  complemento: '',
  telefone: '',
  categoria: ''
};

export default function Register() {
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const steps = ['Dados de Acesso', 'Dados da Empresa', 'Confirmação'];

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.email || !formData.senha || !formData.confirmarSenha) {
      setError('Todos os campos são obrigatórios');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('E-mail inválido');
      return false;
    }
    if (formData.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const requiredFields: (keyof FormData)[] = ['nome', 'cep', 'cidade', 'endereco', 'numero', 'telefone', 'categoria'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        setError('Todos os campos são obrigatórios');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateStep1()) return;
    if (activeStep === 1 && !validateStep2()) return;
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { confirmarSenha, ...dataToSave } = formData;
      await addDoc(collection(db, 'empresas'), dataToSave);
      navigate('/login');
    } catch (e) {
      setError('Erro ao cadastrar empresa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <Typography fontWeight={600} mb={0.5}>
              E-mail
            </Typography>
            <TextField
              fullWidth
              size="medium"
              variant="outlined"
              sx={{ mb: 2, bgcolor: '#222', input: { color: '#fff' } }}
              InputProps={{ style: { color: '#fff' } }}
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              autoComplete="email"
            />
            <Typography fontWeight={600} mb={0.5}>
              Senha
            </Typography>
            <FormControl fullWidth variant="outlined" sx={{ mb: 2, bgcolor: '#222' }}>
              <OutlinedInput
                type={showPassword ? 'text' : 'password'}
                value={formData.senha}
                onChange={e => handleChange('senha', e.target.value)}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: '#fff' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                sx={{ color: '#fff' }}
                autoComplete="new-password"
              />
            </FormControl>
            <Typography fontWeight={600} mb={0.5}>
              Confirmar Senha
            </Typography>
            <FormControl fullWidth variant="outlined" sx={{ mb: 2, bgcolor: '#222' }}>
              <OutlinedInput
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmarSenha}
                onChange={e => handleChange('confirmarSenha', e.target.value)}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      sx={{ color: '#fff' }}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                sx={{ color: '#fff' }}
                autoComplete="new-password"
              />
            </FormControl>
          </>
        );
      case 1:
        return (
          <>
            <Typography fontWeight={600} mb={0.5}>
              Nome da Empresa
            </Typography>
            <TextField
              fullWidth
              size="medium"
              variant="outlined"
              sx={{ mb: 2, bgcolor: '#222', input: { color: '#fff' } }}
              InputProps={{ style: { color: '#fff' } }}
              value={formData.nome}
              onChange={e => handleChange('nome', e.target.value)}
            />
            <Typography fontWeight={600} mb={0.5}>
              CEP
            </Typography>
            <TextField
              fullWidth
              size="medium"
              variant="outlined"
              sx={{ mb: 2, bgcolor: '#222', input: { color: '#fff' } }}
              InputProps={{ style: { color: '#fff' } }}
              value={formData.cep}
              onChange={e => handleChange('cep', e.target.value)}
            />
            <Typography fontWeight={600} mb={0.5}>
              Cidade
            </Typography>
            <TextField
              fullWidth
              size="medium"
              variant="outlined"
              sx={{ mb: 2, bgcolor: '#222', input: { color: '#fff' } }}
              InputProps={{ style: { color: '#fff' } }}
              value={formData.cidade}
              onChange={e => handleChange('cidade', e.target.value)}
            />
            <Typography fontWeight={600} mb={0.5}>
              Endereço
            </Typography>
            <TextField
              fullWidth
              size="medium"
              variant="outlined"
              sx={{ mb: 2, bgcolor: '#222', input: { color: '#fff' } }}
              InputProps={{ style: { color: '#fff' } }}
              value={formData.endereco}
              onChange={e => handleChange('endereco', e.target.value)}
            />
            <Typography fontWeight={600} mb={0.5}>
              Número
            </Typography>
            <TextField
              fullWidth
              size="medium"
              variant="outlined"
              sx={{ mb: 2, bgcolor: '#222', input: { color: '#fff' } }}
              InputProps={{ style: { color: '#fff' } }}
              value={formData.numero}
              onChange={e => handleChange('numero', e.target.value)}
            />
            <Typography fontWeight={600} mb={0.5}>
              Complemento
            </Typography>
            <TextField
              fullWidth
              size="medium"
              variant="outlined"
              sx={{ mb: 2, bgcolor: '#222', input: { color: '#fff' } }}
              InputProps={{ style: { color: '#fff' } }}
              value={formData.complemento}
              onChange={e => handleChange('complemento', e.target.value)}
            />
            <Typography fontWeight={600} mb={0.5}>
              Telefone
            </Typography>
            <TextField
              fullWidth
              size="medium"
              variant="outlined"
              sx={{ mb: 2, bgcolor: '#222', input: { color: '#fff' } }}
              InputProps={{ style: { color: '#fff' } }}
              value={formData.telefone}
              onChange={e => handleChange('telefone', e.target.value)}
            />
            <Typography fontWeight={600} mb={0.5}>
              Categoria
            </Typography>
            <FormControl fullWidth sx={{ mb: 2, bgcolor: '#222' }}>
              <Select
                value={formData.categoria}
                onChange={e => handleChange('categoria', e.target.value)}
                sx={{ color: '#fff' }}
              >
                {CATEGORIAS.map(categoria => (
                  <MenuItem key={categoria} value={categoria} sx={{ color: '#fff' }}>
                    {categoria}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        );
      case 2:
        return (
          <Box sx={{ color: '#fff', width: '100%' }}>
            <Typography variant="h6" mb={2} sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>Confira seus dados:</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <Typography mb={1} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}><strong>E-mail:</strong> {formData.email}</Typography>
                <Typography mb={1} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}><strong>Nome:</strong> {formData.nome}</Typography>
                <Typography mb={1} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}><strong>CEP:</strong> {formData.cep}</Typography>
                <Typography mb={1} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}><strong>Cidade:</strong> {formData.cidade}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography mb={1} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}><strong>Endereço:</strong> {formData.endereco}, {formData.numero}</Typography>
                {formData.complemento && (
                  <Typography mb={1} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}><strong>Complemento:</strong> {formData.complemento}</Typography>
                )}
                <Typography mb={1} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}><strong>Telefone:</strong> {formData.telefone}</Typography>
                <Typography mb={1} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}><strong>Categoria:</strong> {formData.categoria}</Typography>
              </Grid>
            </Grid>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100%',
      bgcolor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: { xs: 4, sm: 6, md: 8 },
      px: { xs: 2, sm: 3 },
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <Box sx={{
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        px: { xs: 2, sm: 3 },
        boxSizing: 'border-box',
      }}>
        <Paper elevation={6} sx={{
          bgcolor: '#181818',
          color: '#fff',
          borderRadius: 4,
          p: { xs: 2, sm: 3, md: 5 },
          width: { xs: '100%', sm: '90%', md: '600px' },
          maxWidth: '600px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}>
          <Typography variant="h3" fontWeight={700} mb={0.5} align="center" sx={{ fontSize: { xs: '1.8rem', sm: '2.4rem', md: '2.8rem' } }}>
            ResolveAi
          </Typography>
          <Typography variant="h4" fontWeight={500} mb={3} align="center" sx={{ fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2rem' } }}>
            Dashboard
          </Typography>
          <Typography variant="h5" fontWeight={700} mb={2} align="left" sx={{ width: '100%', fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.6rem' } }}>
            Cadastro
          </Typography>

          <Stepper activeStep={activeStep} sx={{ width: '100%', mb: 4, color: '#fff', '& .MuiStepLabel-label': { fontSize: { xs: '0.8rem', sm: '0.9rem' } } }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel sx={{ color: '#fff' }}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            {renderStepContent(activeStep)}
          </Box>

          {error && (
            <Typography 
              color="error" 
              sx={{ 
                fontWeight: 500, 
                width: '100%', 
                textAlign: 'center',
                mt: 3,
                mb: 1,
                fontSize: { xs: '0.95rem', sm: '1.05rem' },
              }}
            >
              {error}
            </Typography>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: error ? 1 : 3, gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{ color: '#fff', borderColor: '#444', flex: 1 }}
            >
              Voltar
            </Button>
            <Button
              variant="contained"
              onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
              disabled={loading}
              sx={{ bgcolor: '#222', color: '#fff', fontWeight: 700, fontSize: { xs: 14, sm: 16 }, py: 1, px: 3, flex: 1 }}
            >
              {loading ? 'Cadastrando...' : activeStep === steps.length - 1 ? 'Confirmar Cadastro' : 'Próximo'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
} 