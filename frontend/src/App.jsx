import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Navigation Bar Placeholder */}
        <nav className="navbar">
          <div className="logo">
            <Link to="/">Nex<span>Mod</span></Link>
          </div>
          <ul className="nav-links">
            <li><Link to="/">Ana Sayfa</Link></li>
            <li><Link to="/dashboard">Dashboard</Link></li>
          </ul>
        </nav>

        {/* Routing */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
