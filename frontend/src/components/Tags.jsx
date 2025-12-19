import { useState, useMemo } from 'react';
import { dummyTransactions } from '../data/dummyData';
import ConfirmModal from './ConfirmModal';
import './Tags.css';

export default function Tags() {
  const [tags, setTags] = useState(() => {
    // Extraer todas las etiquetas únicas de las transacciones
    const allTags = new Set();
    dummyTransactions.forEach(t => {
      t.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags);
  });
  
  const [newTagName, setNewTagName] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  const [transactionTags, setTransactionTags] = useState(() => {
    // Mapa de transactionId -> tags
    const map = {};
    dummyTransactions.forEach(t => {
      map[t.id] = [...t.tags];
    });
    return map;
  });

  // Obtener transacciones para una etiqueta específica
  const transactionsByTag = useMemo(() => {
    if (!selectedTag) return [];
    return dummyTransactions.filter(t => {
      const tags = transactionTags[t.id] || t.tags;
      return tags.includes(selectedTag);
    });
  }, [selectedTag, transactionTags]);

  const handleCreateTag = (e) => {
    e.preventDefault();
    if (newTagName.trim() && !tags.includes(newTagName.trim())) {
      setTags([...tags, newTagName.trim()]);
      setNewTagName('');
    }
  };

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, tag: null });

  const handleDeleteClick = (tagToDelete) => {
    setDeleteModal({ isOpen: true, tag: tagToDelete });
  };

  const handleConfirmDelete = () => {
    const tagToDelete = deleteModal.tag;
    if (tagToDelete) {
      if (tagToDelete === selectedTag) {
        setSelectedTag(null);
      }
      setTags(tags.filter(t => t !== tagToDelete));
      // Remover etiqueta de todas las transacciones
      const updated = { ...transactionTags };
      Object.keys(updated).forEach(id => {
        updated[id] = updated[id].filter(t => t !== tagToDelete);
      });
      setTransactionTags(updated);
      setDeleteModal({ isOpen: false, tag: null });
    }
  };

  const handleAddTagToTransaction = (transactionId, tag) => {
    // Crear nueva etiqueta si no existe
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    
    setTransactionTags(prev => {
      const currentTags = prev[transactionId] || [];
      if (!currentTags.includes(tag)) {
        return {
          ...prev,
          [transactionId]: [...currentTags, tag]
        };
      }
      return prev;
    });
  };

  const handleRemoveTagFromTransaction = (transactionId, tag) => {
    setTransactionTags(prev => ({
      ...prev,
      [transactionId]: (prev[transactionId] || []).filter(t => t !== tag)
    }));
  };

  return (
    <div className="tags">
      <div className="tags-header">
        <h1>Etiquetas</h1>
        <p className="subtitle">Organiza tus transacciones con etiquetas personalizadas</p>
      </div>

      <div className="tags-layout">
        {/* Panel izquierdo: Lista de etiquetas */}
        <div className="tags-sidebar">
          <div className="tags-create-section">
            <h3>Crear Etiqueta</h3>
            <form onSubmit={handleCreateTag} className="tag-create-form">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nombre de la etiqueta..."
                className="tag-input"
              />
              <button type="submit" className="tag-create-btn">
                Crear
              </button>
            </form>
          </div>

          <div className="tags-list-section">
            <h3>Tus Etiquetas</h3>
            <div className="tags-list">
              {tags.length === 0 ? (
                <p className="empty-state">No hay etiquetas creadas</p>
              ) : (
                tags.map(tag => {
                  const count = dummyTransactions.filter(t => {
                    const tagsForTransaction = transactionTags[t.id] || t.tags;
                    return tagsForTransaction && tagsForTransaction.includes(tag);
                  }).length;
                  
                  return (
                    <div
                      key={tag}
                      className={`tag-item ${selectedTag === tag ? 'active' : ''}`}
                      onClick={() => setSelectedTag(tag)}
                    >
                      <span className="tag-item-name">{tag}</span>
                      <span className="tag-item-count">{count}</span>
                        <button
                          className="tag-item-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(tag);
                          }}
                          title="Eliminar etiqueta"
                        >
                          ×
                        </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho: Transacciones de la etiqueta seleccionada */}
        <div className="tags-content">
          {selectedTag ? (
            <>
              <div className="tags-content-header">
                <h2>Transacciones con etiqueta: "{selectedTag}"</h2>
                <span className="tags-count">{transactionsByTag.length} transacciones</span>
              </div>
              
              <div className="tags-transactions-list">
                {transactionsByTag.length === 0 ? (
                  <p className="empty-state">No hay transacciones con esta etiqueta</p>
                ) : (
                  transactionsByTag.map(transaction => {
                    const currentTags = transactionTags[transaction.id] || transaction.tags;
                    const availableTags = tags.filter(t => !currentTags.includes(t));
                    
                    return (
                      <div key={transaction.id} className="tag-transaction-card">
                        <div className="tag-transaction-info">
                          <div className="tag-transaction-description">
                            {transaction.description}
                          </div>
                          <div className="tag-transaction-meta">
                            {new Date(transaction.date).toLocaleDateString('es-CL')} • 
                            {transaction.amount.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                          </div>
                        </div>
                        
                        <div className="tag-transaction-tags">
                          <div className="tag-transaction-current-tags">
                            {currentTags.map(tag => (
                              <span
                                key={tag}
                                className="tag-badge"
                              >
                                {tag}
                                {tag !== selectedTag && (
                                  <button
                                    className="tag-badge-remove"
                                    onClick={() => handleRemoveTagFromTransaction(transaction.id, tag)}
                                    title="Remover etiqueta"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                          
                          <div className="tag-add-controls">
                            <select
                              className="tag-add-select"
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddTagToTransaction(transaction.id, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                            >
                              <option value="">Agregar etiqueta existente...</option>
                              {availableTags.map(tag => (
                                <option key={tag} value={tag}>{tag}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              className="tag-add-input"
                              placeholder="O crear nueva etiqueta..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.target.value.trim()) {
                                  handleAddTagToTransaction(transaction.id, e.target.value.trim());
                                  e.target.value = '';
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="tags-empty-selection">
              <p>Selecciona una etiqueta para ver sus transacciones</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, tag: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar Etiqueta"
        message={`¿Estás seguro de que deseas eliminar la etiqueta "${deleteModal.tag}"? Esta acción removerá la etiqueta de todas las transacciones y no se puede deshacer.`}
      />
    </div>
  );
}

