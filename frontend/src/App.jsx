import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import './App.css';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <AuthModal />

          {/* Routing */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/top-mods" element={<Home isTopMods={true} />} />
            <Route path="/favorites" element={<Home isFavorites={true} />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
