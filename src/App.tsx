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

function App() {
  return (
    <Router>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
        <Sidebar />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Header />
          <Box component="main" sx={{ flex: 1, p: 3, overflow: 'auto' }}>
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
