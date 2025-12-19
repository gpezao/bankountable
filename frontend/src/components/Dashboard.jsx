import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import './Dashboard.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0'];
const API_BASE_URL = 'http://localhost:8000';

export default function Dashboard() {
  // Calcular mes anterior por defecto
  const getPreviousMonth = () => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getPreviousMonth());
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch stats sin filtro (todas las transacciones)
        const statsResponse = await fetch(`${API_BASE_URL}/api/stats`);
        if (!statsResponse.ok) throw new Error('Error al cargar estadísticas');
        const statsData = await statsResponse.json();
        
        // Fetch todas las transacciones
        const transactionsResponse = await fetch(`${API_BASE_URL}/api/transactions?limit=10000`);
        if (!transactionsResponse.ok) throw new Error('Error al cargar transacciones');
        const transactionsData = await transactionsResponse.json();
        
        // Transformar datos del backend al formato esperado
        const transformedStats = {
          total: statsData.total || 0,
          totalTransactions: statsData.total_transactions || 0,
          creditUsage: statsData.credit_usage || 0,
          byPaymentMethod: {
            'Crédito': statsData.by_payment_method?.credit || 0,
            'Débito': statsData.by_payment_method?.debit || 0
          },
          topCategories: (statsData.top_categories || []).map(cat => ({
            name: cat.name || 'Sin categoría',
            amount: cat.amount || 0
          })),
          topMerchants: (statsData.top_merchants || []).map(merchant => ({
            name: merchant.name || 'Sin comercio',
            amount: merchant.amount || 0
          }))
        };
        
        setStats(transformedStats);
        setTransactions(transactionsData);
        
        // Obtener meses disponibles
        const monthsSet = new Set();
        transactionsData.forEach(t => {
          const date = new Date(t.transaction_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = date.toLocaleDateString('es-CL', { year: 'numeric', month: 'long' });
          monthsSet.add(JSON.stringify({ key: monthKey, label: monthLabel }));
        });
        const months = Array.from(monthsSet).map(m => JSON.parse(m)).sort((a, b) => b.key.localeCompare(a.key));
        setAvailableMonths(months);
        
        // Si el mes seleccionado no está en los disponibles, usar el más reciente
        if (months.length > 0 && !months.find(m => m.key === selectedMonth)) {
          setSelectedMonth(months[0].key);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calcular estadísticas del mes seleccionado
  const selectedMonthStats = useMemo(() => {
    if (!transactions || transactions.length === 0 || !selectedMonth) {
      return { total: 0, credit: 0, debit: 0 };
    }
    
    // Parsear mes seleccionado
    const [year, month] = selectedMonth.split('-').map(Number);
    
    // Filtrar transacciones del mes seleccionado
    const monthTransactions = transactions.filter(t => {
      const txDate = new Date(t.transaction_date);
      return txDate.getFullYear() === year && 
             (txDate.getMonth() + 1) === month;
    });
    
    // Calcular totales
    const total = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
    const credit = monthTransactions
      .filter(t => t.payment_method === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    const debit = monthTransactions
      .filter(t => t.payment_method === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { total, credit, debit };
  }, [transactions, selectedMonth]);

  // Preparar datos para gráfico de categorías
  const categoryData = useMemo(() => {
    if (!stats) return [];
    return stats.topCategories.map(cat => ({
      name: cat.name,
      value: cat.amount
    }));
  }, [stats]);

  // Preparar datos para gráfico de barras (gastos por mes)
  const monthlyData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const months = {};
    transactions.forEach(t => {
      const date = new Date(t.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, total: 0 };
      }
      months[monthKey].total += t.amount;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  // Calcular alertas
  const alerts = useMemo(() => {
    if (!stats || !transactions || transactions.length === 0) return [];
    const alertsList = [];
    
    // Alerta: Uso excesivo de crédito
    if (parseFloat(stats.creditUsage) > 80) {
      alertsList.push({
        type: 'warning',
        message: `Estás usando ${stats.creditUsage.toFixed(1)}% de tarjeta de crédito. Considera usar más débito.`,
        icon: '💳'
      });
    }
    
    // Alerta: Muchos gastos pequeños recurrentes
    const smallRecurring = transactions.filter(t => 
      t.tags && t.tags.some(tag => tag.toLowerCase().includes('recurrente')) && t.amount < 10000
    ).length;
    if (smallRecurring > 50) {
      const totalSmall = transactions
        .filter(t => t.tags && t.tags.some(tag => tag.toLowerCase().includes('recurrente')) && t.amount < 10000)
        .reduce((sum, t) => sum + t.amount, 0);
      alertsList.push({
        type: 'info',
        message: `Tienes ${smallRecurring} gastos pequeños recurrentes. Estos suman ${formatCurrency(totalSmall)}`,
        icon: '☕'
      });
    }
    
    // Alerta: Categoría desbalanceada
    const topCategory = stats.topCategories[0];
    if (topCategory && stats.total > 0 && (topCategory.amount / stats.total) > 0.4) {
      alertsList.push({
        type: 'warning',
        message: `${topCategory.name} representa el ${((topCategory.amount / stats.total) * 100).toFixed(1)}% de tus gastos.`,
        icon: '⚠️'
      });
    }
    
    return alertsList;
  }, [stats, transactions]);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Dashboard Financiero</h1>
          <p className="subtitle">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Dashboard Financiero</h1>
          <p className="subtitle">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Dashboard Financiero</h1>
          <p className="subtitle">No hay datos disponibles. Importa algunas transacciones para comenzar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Financiero</h1>
        <p className="subtitle">Resumen de tus gastos</p>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.map((alert, idx) => (
            <div key={idx} className={`alert alert-${alert.type}`}>
              <span className="alert-icon">{alert.icon}</span>
              <span className="alert-message">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filtro de mes para las cards */}
      {availableMonths.length > 0 ? (
        <div style={{ 
          marginBottom: '1.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <label htmlFor="month-filter" style={{ fontWeight: '500', fontSize: '1rem', color: '#333', whiteSpace: 'nowrap' }}>
            Filtrar por mes:
          </label>
          <select
            id="month-filter"
            value={selectedMonth || availableMonths[0]?.key || ''}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '1rem',
              backgroundColor: 'white',
              cursor: 'pointer',
              minWidth: '200px',
              fontFamily: 'inherit',
              color: '#333'
            }}
          >
            {availableMonths.map(month => (
              <option key={month.key} value={month.key}>{month.label}</option>
            ))}
          </select>
        </div>
      ) : (
        !loading && (
          <div style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            color: '#666'
          }}>
            Cargando meses disponibles...
          </div>
        )
      )}

      {/* Total gastado - Mes seleccionado */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-label">Total Gastado</div>
          <div className="stat-value">{formatCurrency(selectedMonthStats.total)}</div>
          <div className="stat-meta">
            {availableMonths.find(m => m.key === selectedMonth)?.label || 'Mes seleccionado'}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Uso de Crédito</div>
          <div className="stat-value">
            {selectedMonthStats.total > 0 ? ((selectedMonthStats.credit / selectedMonthStats.total) * 100).toFixed(1) : '0.0'}%
          </div>
          <div className="stat-meta">
            {formatCurrency(selectedMonthStats.credit)} en crédito
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Uso de Débito</div>
          <div className="stat-value">
            {selectedMonthStats.total > 0 ? ((selectedMonthStats.debit / selectedMonthStats.total) * 100).toFixed(1) : '0.0'}%
          </div>
          <div className="stat-meta">
            {formatCurrency(selectedMonthStats.debit)} en débito
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Distribución por Categoría</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Gastos por Mes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tickFormatter={(value) => {
                  const [year, month] = value.split('-');
                  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                  return `${months[parseInt(month) - 1]} ${year}`;
                }}
              />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="total" fill="#667eea" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top categorías y comercios */}
      <div className="top-lists-grid">
        <div className="top-list-card">
          <h3>Top 5 Categorías</h3>
          <ul className="top-list">
            {stats && stats.topCategories.map((cat, idx) => (
              <li key={idx} className="top-list-item">
                <span className="top-list-name">{cat.name}</span>
                <span className="top-list-amount">{formatCurrency(cat.amount)}</span>
                <div className="top-list-bar">
                  <div 
                    className="top-list-bar-fill" 
                    style={{ 
                      width: `${stats.total > 0 ? (cat.amount / stats.total) * 100 : 0}%`,
                      backgroundColor: COLORS[idx % COLORS.length]
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="top-list-card">
          <h3>Top 5 Comercios</h3>
          <ul className="top-list">
            {stats && stats.topMerchants.map((merchant, idx) => (
              <li key={idx} className="top-list-item">
                <span className="top-list-name">{merchant.name}</span>
                <span className="top-list-amount">{formatCurrency(merchant.amount)}</span>
                <div className="top-list-bar">
                  <div 
                    className="top-list-bar-fill" 
                    style={{ 
                      width: `${stats.total > 0 ? (merchant.amount / stats.total) * 100 : 0}%`,
                      backgroundColor: COLORS[(idx + 2) % COLORS.length]
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
