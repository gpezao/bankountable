import './ConfirmModal.css';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="modal-button modal-button-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button className="modal-button modal-button-confirm" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}


