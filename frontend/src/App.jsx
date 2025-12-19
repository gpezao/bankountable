import { Link, useLocation } from 'react-router-dom'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import Tags from './components/Tags'
import Categories from './components/Categories'
import Import from './components/Import'
import './App.css'

function App() {
  const location = useLocation()

  const navItems = [
    { path: '/', name: 'Dashboard' },
    { path: '/transacciones', name: 'Transacciones' },
    { path: '/etiquetas', name: 'Etiquetas' },
    { path: '/categorias', name: 'Categorías' },
    { path: '/importar', name: 'Importar' }
  ]

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-content">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h1>🏦 Bankountable</h1>
            <p>Gestor Financiero Personal</p>
          </Link>
        </div>
        <nav className="app-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-button ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transacciones" element={<Transactions />} />
          <Route path="/etiquetas" element={<Tags />} />
          <Route path="/categorias" element={<Categories />} />
          <Route path="/importar" element={<Import />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
