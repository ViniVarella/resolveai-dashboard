import { Box, Button, Divider, FormControl, IconButton, InputAdornment, OutlinedInput, Paper, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const {
    email,
    setEmail,
    senha,
    setSenha,
    setNome,
    setId,
    setFotoPerfil,
    setUsuarioGlobal,
    setNumeroTelefone,
    setEndereco,
    setCidade,
    setNumero,
    setComplemento,
    setIsAuthenticated
  } = useUser();

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email), where('senha', '==', senha));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setError('');
        const userData = snapshot.docs[0].data();
        
        // Update global context with user data
        setNome(userData.nome || '');
        setId(snapshot.docs[0].id);
        setFotoPerfil(userData.fotoPerfil || '');
        setUsuarioGlobal(userData.usuarioGlobal || 'Empresa');
        setNumeroTelefone(userData.numeroTelefone || '');
        setEndereco(userData.endereco || false);
        setCidade(userData.cidade || false);
        setNumero(userData.numero || '');
        setComplemento(userData.complemento || '');
        setIsAuthenticated(true);

        // Store auth state in localStorage
        localStorage.setItem('auth', 'true');
        localStorage.setItem('fotoPerfil', userData.fotoPerfil || '');
        
        navigate('/home');
      } else {
        setError('E-mail ou senha incorretos.');
      }
    } catch (e) {
      setError('Erro ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
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
      py: { xs: 2, sm: 4, md: 6 },
      px: { xs: 2, sm: 3 },
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative',
      overflowY: 'auto',
    }}>
      <Paper elevation={6} sx={{
        bgcolor: '#181818',
        color: '#fff',
        borderRadius: 4,
        p: 5,
        minWidth: 280,
        width: { xs: '95vw', sm: '90vw', md: '600px', lg: '700px' },
        maxWidth: '90vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <Typography variant="h3" fontWeight={700} mb={0.5} align="center">
          ResolveAi
        </Typography>
        <Typography variant="h4" fontWeight={500} mb={3} align="center">
          Dashboard
        </Typography>
        <Typography variant="h5" fontWeight={700} mb={2} align="left" sx={{ width: '100%' }}>
          Entrar
        </Typography>
        <Box sx={{ width: '100%' }}>
          <Typography fontWeight={600} mb={0.5}>
            E-mail
          </Typography>
          <TextField
            fullWidth
            size="medium"
            variant="outlined"
            sx={{ mb: 2, bgcolor: '#222', input: { color: '#fff' } }}
            InputProps={{ style: { color: '#fff' } }}
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Typography fontWeight={600} mb={0.5}>
            Senha
          </Typography>
          <FormControl fullWidth variant="outlined" sx={{ mb: 1.5, bgcolor: '#222' }}>
            <OutlinedInput
              type={showPassword ? 'text' : 'password'}
              value={senha}
              onChange={e => setSenha(e.target.value)}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword((show) => !show)}
                    edge="end"
                    sx={{ color: '#fff' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
              sx={{ color: '#fff' }}
              autoComplete="current-password"
            />
          </FormControl>
          {error && (
            <Typography color="error" mb={2} sx={{ fontWeight: 500 }}>
              {error}
            </Typography>
          )}
          <Typography variant="body2" color="#aaa" mb={2} sx={{ cursor: 'pointer' }}>
            Esqueceu a senha?
          </Typography>
          <Button
            fullWidth
            variant="contained"
            sx={{ bgcolor: '#222', color: '#fff', fontWeight: 700, fontSize: 20, py: 1.2, mb: 2, boxShadow: 2 }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
          <Divider sx={{ my: 2, borderColor: '#444', bgcolor: 'transparent' }}>
            <Typography variant="body2" color="#fff">ou</Typography>
          </Divider>
          <Button
            fullWidth
            variant="contained"
            sx={{
              bgcolor: '#222',
              color: '#fff',
              fontWeight: 700,
              fontSize: 20,
              py: 1.2,
              boxShadow: 2,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            component={Link}
            to="/register"
          >
            Cadastre-se agora
          </Button>
        </Box>
      </Paper>
    </Box>
  );
} 