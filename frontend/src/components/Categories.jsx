import { useState, useMemo } from 'react';
import { dummyTransactions } from '../data/dummyData';
import { formatCurrency } from '../utils/formatters';
import ConfirmModal from './ConfirmModal';
import './Categories.css';

// Categorías iniciales desde dummyData
const initialCategories = [
  'Alimentación',
  'Transporte',
  'Entretenimiento',
  'Compras',
  'Servicios',
  'Salud',
  'Educación',
  'Otros'
];

export default function Categories() {
  const [categories, setCategories] = useState(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, category: null });

  // Calcular estadísticas por categoría
  const categoryStats = useMemo(() => {
    const stats = {};
    dummyTransactions.forEach(t => {
      const category = t.category || 'Otros';
      if (!stats[category]) {
        stats[category] = { count: 0, total: 0 };
      }
      stats[category].count += 1;
      stats[category].total += t.amount;
    });
    return stats;
  }, []);

  const handleCreateCategory = (e) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setNewCategoryName('');
    }
  };

  const handleStartEdit = (category) => {
    setEditingCategory(category);
    setEditValue(category);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue.trim() !== editingCategory) {
      setCategories(categories.map(c => c === editingCategory ? editValue.trim() : c));
    }
    setEditingCategory(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditValue('');
  };

  const handleDeleteClick = (category) => {
    setDeleteModal({ isOpen: true, category });
  };

  const handleConfirmDelete = () => {
    if (deleteModal.category) {
      setCategories(categories.filter(c => c !== deleteModal.category));
      setDeleteModal({ isOpen: false, category: null });
    }
  };

  return (
    <div className="categories">
      <div className="categories-header">
        <h1>Categorías</h1>
        <p className="subtitle">Gestiona las categorías de tus transacciones</p>
      </div>

      {/* Crear nueva categoría */}
      <div className="categories-create-section">
        <h3>Crear Nueva Categoría</h3>
        <form onSubmit={handleCreateCategory} className="category-create-form">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nombre de la categoría..."
            className="category-input"
          />
          <button type="submit" className="category-create-btn">
            Crear
          </button>
        </form>
      </div>

      {/* Lista de categorías */}
      <div className="categories-list-section">
        <h3>Tus Categorías ({categories.length})</h3>
        <div className="categories-grid">
          {categories.map(category => {
            const stats = categoryStats[category] || { count: 0, total: 0 };
            const isEditing = editingCategory === category;

            return (
              <div key={category} className="category-card">
                {isEditing ? (
                  <div className="category-edit-form">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="category-edit-input"
                      autoFocus
                    />
                    <div className="category-edit-actions">
                      <button
                        className="category-edit-btn category-edit-btn-save"
                        onClick={handleSaveEdit}
                      >
                        ✓
                      </button>
                      <button
                        className="category-edit-btn category-edit-btn-cancel"
                        onClick={handleCancelEdit}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="category-header">
                      <h4 className="category-name">{category}</h4>
                      <div className="category-actions">
                        <button
                          className="category-action-btn category-action-edit"
                          onClick={() => handleStartEdit(category)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="category-action-btn category-action-delete"
                          onClick={() => handleDeleteClick(category)}
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="category-stats">
                      <div className="category-stat">
                        <span className="category-stat-label">Transacciones:</span>
                        <span className="category-stat-value">{stats.count}</span>
                      </div>
                      <div className="category-stat">
                        <span className="category-stat-label">Total:</span>
                        <span className="category-stat-value">{formatCurrency(stats.total)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, category: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar Categoría"
        message={`¿Estás seguro de que deseas eliminar la categoría "${deleteModal.category}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}


