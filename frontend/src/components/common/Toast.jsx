import { useEffect } from 'react';
import './Toast.css';

/**
 * Toast notification component for displaying temporary messages
 * @param {Object} props
 * @param {string} props.message - The message to display
 * @param {string} props.type - Type of toast: 'success', 'error', 'warning', 'info'
 * @param {number} props.duration - Duration in milliseconds before auto-dismiss (default: 5000)
 * @param {Function} props.onClose - Callback function when toast is closed
 */
const Toast = ({ message, type = 'info', duration = 5000, onClose }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`toast toast-${type}`} role="alert" aria-live="polite">
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{message}</div>
      <button
        className="toast-close"
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
