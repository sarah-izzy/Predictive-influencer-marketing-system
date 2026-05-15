import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const SweetAlert = ({ open, type = 'success', title, message, confirmText = 'OK', onClose }) => {
  if (!open) return null;

  const isError = type === 'error';

  return (
    <div className="sweet-alert-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sweet-alert-card animate-fade-in">
        <div className={`sweet-alert-icon ${isError ? 'sweet-alert-icon-error' : 'sweet-alert-icon-success'}`}>
          {isError ? <AlertTriangle size={40} /> : <CheckCircle2 size={42} />}
        </div>
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        <button type="button" className="btn-primary" onClick={onClose}>
          {confirmText}
        </button>
      </div>
    </div>
  );
};

export default SweetAlert;
