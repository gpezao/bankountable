import { useState, useEffect, useMemo } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import './Transactions.css';

const paymentMethods = ['Crédito', 'Débito'];
const API_BASE_URL = 'http://localhost:8000';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editingTags, setEditingTags] = useState(null);
  const [editingDescription, setEditingDescription] = useState(null);
  const [editedCategories, setEditedCategories] = useState({});
  const [editedPayments, setEditedPayments] = useState({});
  const [editedTags, setEditedTags] = useState({});
  const [editedDescriptions, setEditedDescriptions] = useState({});
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch transactions
        const transactionsResponse = await fetch(`${API_BASE_URL}/api/transactions?limit=10000`);
        if (!transactionsResponse.ok) throw new Error('Error al cargar transacciones');
        const transactionsData = await transactionsResponse.json();
        
        // Fetch categories
        const categoriesResponse = await fetch(`${API_BASE_URL}/api/categories`);
        if (!categoriesResponse.ok) throw new Error('Error al cargar categorías');
        const categoriesData = await categoriesResponse.json();
        
        // Transformar transacciones del backend al formato esperado
        const transformedTransactions = transactionsData.map(t => ({
          id: t.id,
          date: new Date(t.transaction_date),
          description: t.description,
          merchant: t.merchant || '',
          amount: t.amount,
          category: t.category_name || 'Sin categoría',
          category_id: t.category_id,
          paymentMethod: t.payment_method === 'credit' ? 'Crédito' : (t.payment_method === 'debit' ? 'Débito' : t.payment_method || 'Sin especificar'),
          tags: t.tags || []
        }));
        
        // Extraer todas las etiquetas únicas
        const tagsSet = new Set();
        transformedTransactions.forEach(t => {
          t.tags.forEach(tag => tagsSet.add(tag));
        });
        
        setTransactions(transformedTransactions);
        setCategories(categoriesData.map(c => c.name));
        setAllTags(Array.from(tagsSet));
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Ordenamiento
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Funciones helper para obtener valores editados
  const getDisplayCategory = (transactionId, originalCategory) => {
    return editedCategories[transactionId] || originalCategory;
  };

  const getDisplayPayment = (transactionId, originalPayment) => {
    return editedPayments[transactionId] || originalPayment;
  };

  const getDisplayTags = (transactionId, originalTags) => {
    return editedTags[transactionId] || originalTags;
  };

  const getDisplayDescription = (transactionId, originalDescription) => {
    return editedDescriptions[transactionId] || originalDescription;
  };

  // Obtener meses únicos
  const availableMonths = useMemo(() => {
    const months = new Set();
    transactions.forEach(t => {
      const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = t.date.toLocaleDateString('es-CL', { year: 'numeric', month: 'long' });
      months.add(JSON.stringify({ key: monthKey, label: monthLabel }));
    });
    return Array.from(months).map(m => JSON.parse(m)).sort((a, b) => b.key.localeCompare(a.key));
  }, [transactions]);

  // Filtrar transacciones
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(t => {
      const matchesCategory = filterCategory === 'all' || getDisplayCategory(t.id, t.category) === filterCategory;
      const matchesPayment = filterPaymentMethod === 'all' || getDisplayPayment(t.id, t.paymentMethod) === filterPaymentMethod;
      const matchesSearch = searchTerm === '' || 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.merchant.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesMonth = true;
      if (filterMonth !== 'all') {
        const tMonthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
        matchesMonth = tMonthKey === filterMonth;
      }
      
      return matchesCategory && matchesPayment && matchesSearch && matchesMonth;
    });

    // Ordenar
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal, bVal;
        
        switch (sortField) {
          case 'date':
            aVal = a.date.getTime();
            bVal = b.date.getTime();
            break;
          case 'description':
            aVal = a.description.toLowerCase();
            bVal = b.description.toLowerCase();
            break;
          case 'amount':
            aVal = a.amount;
            bVal = b.amount;
            break;
          case 'category':
            aVal = getDisplayCategory(a.id, a.category).toLowerCase();
            bVal = getDisplayCategory(b.id, b.category).toLowerCase();
            break;
          case 'payment':
            aVal = getDisplayPayment(a.id, a.paymentMethod);
            bVal = getDisplayPayment(b.id, b.paymentMethod);
            break;
          default:
            return 0;
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [transactions, filterCategory, filterPaymentMethod, filterMonth, searchTerm, sortField, sortDirection, editedCategories, editedPayments]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleCategoryUpdate = async (transactionId, newCategory) => {
    // Encontrar el category_id de la nueva categoría
    try {
      const categoryResponse = await fetch(`${API_BASE_URL}/api/categories`);
      const categoriesData = await categoryResponse.json();
      const category = categoriesData.find(c => c.name === newCategory);
      
      if (category || newCategory === 'Sin categoría') {
        const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_id: category ? category.id : null })
        });
        if (response.ok) {
          setEditedCategories(prev => ({ ...prev, [transactionId]: newCategory }));
          // Actualizar la transacción local
          setTransactions(prev => prev.map(t => 
            t.id === transactionId ? { ...t, category: newCategory, category_id: category ? category.id : null } : t
          ));
        }
      }
    } catch (err) {
      console.error('Error updating category:', err);
    }
    setEditingCategory(null);
  };

  const handlePaymentUpdate = async (transactionId, newPayment) => {
    const paymentMethod = newPayment === 'Crédito' ? 'credit' : (newPayment === 'Débito' ? 'debit' : newPayment.toLowerCase());
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: paymentMethod })
      });
      if (response.ok) {
        setEditedPayments(prev => ({ ...prev, [transactionId]: newPayment }));
        // Actualizar la transacción local
        setTransactions(prev => prev.map(t => 
          t.id === transactionId ? { ...t, paymentMethod: newPayment } : t
        ));
      }
    } catch (err) {
      console.error('Error updating payment method:', err);
    }
    setEditingPayment(null);
  };

  const handleCategoryEdit = (transactionId, newCategory) => {
    handleCategoryUpdate(transactionId, newCategory);
  };

  const handlePaymentEdit = (transactionId, newPayment) => {
    handlePaymentUpdate(transactionId, newPayment);
  };

  const handleDescriptionUpdate = async (transactionId, newDescription) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDescription })
      });
      if (response.ok) {
        setEditedDescriptions(prev => ({ ...prev, [transactionId]: newDescription }));
        // Actualizar la transacción local
        setTransactions(prev => prev.map(t => 
          t.id === transactionId ? { ...t, description: newDescription } : t
        ));
      }
    } catch (err) {
      console.error('Error updating description:', err);
    }
    setEditingDescription(null);
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        // Eliminar de la lista local
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
        // Limpiar ediciones relacionadas
        setEditedCategories(prev => {
          const newState = { ...prev };
          delete newState[transactionId];
          return newState;
        });
        setEditedPayments(prev => {
          const newState = { ...prev };
          delete newState[transactionId];
          return newState;
        });
        setEditedTags(prev => {
          const newState = { ...prev };
          delete newState[transactionId];
          return newState;
        });
        setEditedDescriptions(prev => {
          const newState = { ...prev };
          delete newState[transactionId];
          return newState;
        });
      } else {
        alert('Error al eliminar la transacción');
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Error al eliminar la transacción');
    }
  };

  const handleTagsEdit = (transactionId, newTags) => {
    // Crear nuevas etiquetas si no existen
    newTags.forEach(tag => {
      if (!allTags.includes(tag.trim()) && tag.trim() !== '') {
        setAllTags(prev => [...prev, tag.trim()]);
      }
    });
    
    setEditedTags(prev => ({
      ...prev,
      [transactionId]: newTags.filter(t => t.trim() !== '')
    }));
    setEditingTags(null);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="sort-icon">⇅</span>;
    return <span className="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <div className="transactions">
        <div className="transactions-header">
          <h1>Transacciones</h1>
          <p className="subtitle">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transactions">
        <div className="transactions-header">
          <h1>Transacciones</h1>
          <p className="subtitle">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transactions">
      <div className="transactions-header">
        <h1>Transacciones</h1>
        <p className="subtitle">{filteredTransactions.length} transacciones encontradas</p>
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="search">Buscar</label>
          <input
            id="search"
            type="text"
            placeholder="Buscar por descripción o comercio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="month">Mes</label>
          <select
            id="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos los meses</option>
            {availableMonths.map(month => (
              <option key={month.key} value={month.key}>{month.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="category">Categoría</label>
          <select
            id="category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todas las categorías</option>
            <option value="Sin categoría">Sin categoría</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="payment">Medio de pago</label>
          <select
            id="payment"
            value={filterPaymentMethod}
            onChange={(e) => setFilterPaymentMethod(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos</option>
            <option value="Crédito">Crédito</option>
            <option value="Débito">Débito</option>
          </select>
        </div>
      </div>

      {/* Tabla de transacciones */}
      <div className="transactions-table-container">
        <table className="transactions-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('date')}>
                Fecha <SortIcon field="date" />
              </th>
              <th className="sortable" onClick={() => handleSort('description')}>
                Descripción <SortIcon field="description" />
              </th>
              <th className="sortable" onClick={() => handleSort('amount')}>
                Monto <SortIcon field="amount" />
              </th>
              <th className="sortable" onClick={() => handleSort('category')}>
                Categoría <SortIcon field="category" />
              </th>
              <th>Etiquetas</th>
              <th className="sortable" onClick={() => handleSort('payment')}>
                Medio de pago <SortIcon field="payment" />
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-results">
                  No se encontraron transacciones con los filtros aplicados
                </td>
              </tr>
            ) : (
              filteredTransactions.map(transaction => {
                const displayCategory = getDisplayCategory(transaction.id, transaction.category);
                const displayPayment = getDisplayPayment(transaction.id, transaction.paymentMethod);
                const displayTags = getDisplayTags(transaction.id, transaction.tags);
                const displayDescription = getDisplayDescription(transaction.id, transaction.description);
                const isEditingCategory = editingCategory === transaction.id;
                const isEditingPayment = editingPayment === transaction.id;
                const isEditingTags = editingTags === transaction.id;
                const isEditingDescription = editingDescription === transaction.id;
                
                return (
                  <tr key={transaction.id}>
                    <td className="date-cell">{formatDate(transaction.date)}</td>
                    <td className="description-cell">
                      {isEditingDescription ? (
                        <input
                          type="text"
                          defaultValue={displayDescription}
                          onBlur={(e) => {
                            if (e.target.value.trim() !== displayDescription) {
                              handleDescriptionUpdate(transaction.id, e.target.value.trim());
                            } else {
                              setEditingDescription(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (e.target.value.trim() !== displayDescription) {
                                handleDescriptionUpdate(transaction.id, e.target.value.trim());
                              } else {
                                setEditingDescription(null);
                              }
                            }
                            if (e.key === 'Escape') {
                              setEditingDescription(null);
                            }
                          }}
                          autoFocus
                          className="description-edit-input"
                          style={{ width: '100%', padding: '0.25rem' }}
                        />
                      ) : (
                        <div 
                          onClick={() => setEditingDescription(transaction.id)}
                          style={{ cursor: 'pointer' }}
                          title="Click para editar"
                        >
                          <div className="description-main">{displayDescription}</div>
                          <div className="description-merchant">{transaction.merchant}</div>
                        </div>
                      )}
                    </td>
                    <td className="amount-cell">{formatCurrency(transaction.amount)}</td>
                    <td className="category-cell">
                      {isEditingCategory ? (
                        <select
                          value={displayCategory}
                          onChange={(e) => handleCategoryEdit(transaction.id, e.target.value)}
                          onBlur={() => setEditingCategory(null)}
                          autoFocus
                          className="category-select"
                        >
                          <option value="Sin categoría">Sin categoría</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      ) : (
                        <span 
                          className="category-badge"
                          onClick={() => setEditingCategory(transaction.id)}
                          title="Click para editar"
                        >
                          {displayCategory}
                        </span>
                      )}
                    </td>
                    <td className="tags-cell">
                      {isEditingTags ? (
                        <input
                          type="text"
                          defaultValue={displayTags.join(', ')}
                          onBlur={(e) => {
                            const tags = e.target.value.split(',').map(t => t.trim());
                            handleTagsEdit(transaction.id, tags);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const tags = e.target.value.split(',').map(t => t.trim());
                              handleTagsEdit(transaction.id, tags);
                            }
                            if (e.key === 'Escape') {
                              setEditingTags(null);
                            }
                          }}
                          autoFocus
                          className="tags-edit-input"
                          placeholder="Etiquetas separadas por coma"
                        />
                      ) : (
                        <div className="tags-list">
                          {displayTags.map((tag, idx) => (
                            <span key={idx} className="tag">{tag}</span>
                          ))}
                          <button
                            className="tag-edit-btn"
                            onClick={() => setEditingTags(transaction.id)}
                            title="Editar etiquetas"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="payment-cell">
                      {isEditingPayment ? (
                        <select
                          value={displayPayment}
                          onChange={(e) => handlePaymentEdit(transaction.id, e.target.value)}
                          onBlur={() => setEditingPayment(null)}
                          autoFocus
                          className="payment-select"
                        >
                          {paymentMethods.map(method => (
                            <option key={method} value={method}>{method}</option>
                          ))}
                        </select>
                      ) : (
                        <span 
                          className={`payment-badge payment-${displayPayment === 'Crédito' ? 'credit' : 'debit'}`}
                          onClick={() => setEditingPayment(transaction.id)}
                          title="Click para editar"
                        >
                          {displayPayment}
                        </span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        title="Eliminar transacción"
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.5rem 1rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
