import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Home from './pages/Home';
import Services from './pages/Services';
import Revenue from './pages/Revenue';
import Employees from './pages/Employees';
import Schedule from './pages/Schedule';
import Statistics from './pages/Statistics';
import { useState } from 'react';

export const SIDEBAR_WIDTH = {
  expanded: 220,
  collapsed: 64
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const currentWidth = sidebarOpen ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed;

  return (
    <Router>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          marginLeft: 0, // Importante: não adicionar margem aqui
          transition: 'all 0.2s'
        }}>
          <Header open={sidebarOpen} sidebarWidth={currentWidth} />
          <Box 
            component="main" 
            sx={{ 
              flex: 1, 
              p: 3, 
              overflow: 'auto', 
              mt: '80px',
              ml: 0, // Importante: não adicionar margem aqui
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/home" />} />
              <Route path="/home" element={<Home />} />
              <Route path="/services" element={<Services />} />
              <Route path="/revenue" element={<Revenue />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/statistics" element={<Statistics />} />
            </Routes>
          </Box>
        </Box>
      </Box>
    </Router>
  );
}

export default App;
