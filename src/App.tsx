import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Home from './pages/Home';
import Services from './pages/Services';
import Revenue from './pages/Revenue';
import Employees from './pages/Employees';
import Schedule from './pages/Schedule';
import Statistics from './pages/Statistics';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute from './components/PrivateRoute';
import { useState } from 'react';

export const SIDEBAR_WIDTH = {
  expanded: 220,
  collapsed: 64
};

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const currentWidth = sidebarOpen ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed;
  const location = useLocation();
  const isLoginPage = location.pathname === '/login' || location.pathname === '/register';

  return (
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      {!isLoginPage && <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          width: '100%',
          minWidth: 0,
          transition: 'all 0.2s'
        }}>
        {!isLoginPage && <Header sidebarWidth={currentWidth} />}
          <Box 
            component="main" 
            sx={{ 
              flex: 1, 
            p: !isLoginPage ? 3 : 0, 
              overflow: 'auto', 
            mt: !isLoginPage ? '80px' : 0,
            }}
          >
            <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route path="/services" element={<PrivateRoute><Services /></PrivateRoute>} />
            <Route path="/revenue" element={<PrivateRoute><Revenue /></PrivateRoute>} />
            <Route path="/employees" element={<PrivateRoute><Employees /></PrivateRoute>} />
            <Route path="/schedule" element={<PrivateRoute><Schedule /></PrivateRoute>} />
            <Route path="/statistics" element={<PrivateRoute><Statistics /></PrivateRoute>} />
            </Routes>
          </Box>
        </Box>
      </Box>
  );
}

function App() {
  return (
    <Router>
      <CssBaseline />
      <AppContent />
    </Router>
  );
}

export default App;
