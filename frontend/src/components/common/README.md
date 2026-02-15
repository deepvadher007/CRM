# Common Components

This directory contains reusable UI components used throughout the application.

## Toast Notifications

Toast notifications provide a non-intrusive way to display temporary messages to users.

### Components

#### Toast.jsx
Individual toast notification component that displays a single message with auto-dismiss functionality.

**Props:**
- `message` (string, required): The message to display
- `type` (string): Type of toast - 'success', 'error', 'warning', 'info' (default: 'info')
- `duration` (number): Duration in milliseconds before auto-dismiss (default: 5000)
- `onClose` (function, required): Callback function when toast is closed

#### ToastContainer.jsx
Provider component that manages multiple toast notifications and provides the `useToast` hook.

**Exports:**
- `ToastProvider`: Wrap your app with this component
- `useToast`: Hook to access toast methods in any component

### Usage Example

```javascript
import { useToast } from './components/common/ToastContainer';

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Operation completed successfully!');
  };

  const handleError = () => {
    toast.error('Something went wrong!');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Success</button>
      <button onClick={handleError}>Error</button>
    </div>
  );
}
```

### Integration with Error Handling

The toast system works seamlessly with the error handling utilities:

```javascript
import { useToast } from './components/common/ToastContainer';
import { extractErrorMessage } from '../../utils/errorHandler';
import api from '../../services/api';

function MyForm() {
  const toast = useToast();

  const handleSubmit = async (data) => {
    try {
      await api.post('/api/endpoint', data);
      toast.success('Data saved successfully!');
    } catch (error) {
      const message = extractErrorMessage(error);
      toast.error(message);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Styling

Toast notifications are styled with CSS and include:
- Color-coded types (success: green, error: red, warning: yellow, info: blue)
- Smooth slide-in animation
- Responsive design for mobile, tablet, and desktop
- Accessible with proper ARIA attributes

### Accessibility

- Uses `role="alert"` for screen reader announcements
- Uses `aria-live="polite"` for non-intrusive announcements
- Close button has `aria-label` for screen readers
- Keyboard accessible
