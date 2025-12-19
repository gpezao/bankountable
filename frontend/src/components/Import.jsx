import { useState, useEffect } from 'react';
import { formatDateTime } from '../utils/formatters';
import './Import.css';

const API_BASE_URL = 'http://localhost:8000';

export default function Import() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setImportResult(null);
    } else {
      alert('Por favor selecciona un archivo PDF');
      e.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Por favor selecciona un archivo');
      return;
    }

    setUploading(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/import/pdf`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setImportResult({
          success: true,
          message: data.message || 'Archivo importado exitosamente',
          transactionsImported: data.transactions_imported || 0,
        });
        setSelectedFile(null);
        // Limpiar input
        const fileInput = document.getElementById('pdf-file-input');
        if (fileInput) fileInput.value = '';
        // Recargar historial
        loadImportHistory();
      } else {
        setImportResult({
          success: false,
          message: data.detail || 'Error al importar el archivo',
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: `Error de conexión: ${error.message}`,
      });
    } finally {
      setUploading(false);
    }
  };

  const loadImportHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/import/list`);
      if (response.ok) {
        const data = await response.json();
        setImportHistory(data);
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Cargar historial al montar el componente
  useEffect(() => {
    loadImportHistory();
  }, []);

  return (
    <div className="import">
      <div className="import-header">
        <h1>Importar Cartolas</h1>
        <p className="subtitle">Sube archivos PDF de cartolas bancarias para importar transacciones</p>
      </div>

      {/* Área de subida */}
      <div className="import-upload-section">
        <div className="upload-card">
          <h3>Subir PDF</h3>
          <div className="upload-area">
            <input
              id="pdf-file-input"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="file-input"
            />
            <label htmlFor="pdf-file-input" className="file-label">
              {selectedFile ? selectedFile.name : 'Seleccionar archivo PDF'}
            </label>
            {selectedFile && (
              <div className="file-info">
                <span>Archivo seleccionado: {selectedFile.name}</span>
                <span>Tamaño: {(selectedFile.size / 1024).toFixed(2)} KB</span>
              </div>
            )}
          </div>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="upload-button"
          >
            {uploading ? 'Importando...' : 'Importar PDF'}
          </button>
        </div>

        {/* Resultado de importación */}
        {importResult && (
          <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
            <div className="result-icon">
              {importResult.success ? '✅' : '❌'}
            </div>
            <div className="result-content">
              <h4>{importResult.success ? 'Importación exitosa' : 'Error en la importación'}</h4>
              <p>{importResult.message}</p>
              {importResult.success && importResult.transactionsImported !== undefined && (
                <p className="result-count">
                  {importResult.transactionsImported} transacciones importadas
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Historial de imports */}
      <div className="import-history-section">
        <div className="history-header">
          <h3>Historial de Importaciones</h3>
          <button onClick={loadImportHistory} className="refresh-button" disabled={loadingHistory}>
            {loadingHistory ? 'Cargando...' : '🔄 Actualizar'}
          </button>
        </div>
        {importHistory.length === 0 ? (
          <p className="empty-state">No hay importaciones realizadas</p>
        ) : (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Estado</th>
                  <th>Transacciones</th>
                  <th>Fecha</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {importHistory.map((import_item) => (
                  <tr key={import_item.id}>
                    <td className="filename-cell">{import_item.filename}</td>
                    <td>
                      <span className={`status-badge status-${import_item.status}`}>
                        {import_item.status === 'completed' ? '✅ Completado' :
                         import_item.status === 'processing' ? '⏳ Procesando' :
                         import_item.status === 'failed' ? '❌ Fallido' :
                         '⏸ Pendiente'}
                      </span>
                    </td>
                    <td>{import_item.transactions_count || 0}</td>
                    <td>{formatDateTime(new Date(import_item.imported_at))}</td>
                    <td className="error-cell">
                      {import_item.error_message ? (
                        <span className="error-message" title={import_item.error_message}>
                          {import_item.error_message.substring(0, 50)}...
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

