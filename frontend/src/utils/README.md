# Error Handling Utilities

This directory contains utilities for handling and displaying errors in the frontend application.

## errorHandler.js

A collection of utility functions for extracting and formatting error messages from API responses.

### Functions

#### `extractErrorMessage(error, defaultMessage)`
Extracts a user-friendly error message from an error object.

**Parameters:**
- `error` (Error): The error object from axios or other sources
- `defaultMessage` (string): Default message if no specific error is found (default: 'An error occurred')

**Returns:** `string` - Formatted error message

**Example:**
```javascript
import { extractErrorMessage } from '../utils/errorHandler';

try {
  await api.post('/api/auth/login', credentials);
} catch (error) {
  const message = extractErrorMessage(error, 'Login failed');
  setErrorMessage(message);
}
```

#### `extractValidationErrors(error)`
Extracts validation errors from API response.

**Parameters:**
- `error` (Error): The error object from axios

**Returns:** `Object` - Object with field names as keys and error messages as values

#### `formatError(error)`
Formats error for display with message, status code, and validation errors.

**Parameters:**
- `error` (Error): The error object

**Returns:** `Object` - Formatted error object

**Example:**
```javascript
import { formatError } from '../utils/errorHandler';

try {
  await api.post('/api/auth/register', userData);
} catch (error) {
  const formattedError = formatError(error);
  console.log(formattedError.message);
  console.log(formattedError.statusCode);
  console.log(formattedError.validationErrors);
}
```

#### `isAuthError(error)`
Checks if error is authentication related (401).

**Returns:** `boolean`

#### `isForbiddenError(error)`
Checks if error is authorization related (403).

**Returns:** `boolean`

#### `isValidationError(error)`
Checks if error is validation related (400).

**Returns:** `boolean`

#### `getStatusMessage(statusCode)`
Gets user-friendly error message based on HTTP status code.

**Parameters:**
- `statusCode` (number): HTTP status code

**Returns:** `string` - User-friendly error message

## Toast Notifications

Toast notifications provide a non-intrusive way to display temporary messages to users.

### Usage

#### 1. Wrap your app with ToastProvider

```javascript
import { ToastProvider } from './components/common/ToastContainer';

function App() {
  return (
    <ToastProvider>
      {/* Your app components */}
    </ToastProvider>
  );
}
```

#### 2. Use the useToast hook in your components

```javascript
import { useToast } from '../components/common/ToastContainer';

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Operation completed successfully!');
  };

  const handleError = () => {
    toast.error('Something went wrong!');
  };

  const handleWarning = () => {
    toast.warning('Please be careful!');
  };

  const handleInfo = () => {
    toast.info('Here is some information.');
  };

  // Custom toast with specific duration
  const handleCustom = () => {
    toast.showToast('Custom message', 'success', 3000);
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
      <button onClick={handleWarning}>Show Warning</button>
      <button onClick={handleInfo}>Show Info</button>
    </div>
  );
}
```

### Toast Methods

- `toast.success(message, duration)` - Show success toast (green)
- `toast.error(message, duration)` - Show error toast (red)
- `toast.warning(message, duration)` - Show warning toast (yellow)
- `toast.info(message, duration)` - Show info toast (blue)
- `toast.showToast(message, type, duration)` - Show custom toast

**Parameters:**
- `message` (string): The message to display
- `type` (string): Toast type - 'success', 'error', 'warning', 'info'
- `duration` (number): Duration in milliseconds before auto-dismiss (default: 5000)

## Error Clearing on User Input

Both Login and Register components implement automatic error clearing when users start typing:

```javascript
const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData({ ...formData, [name]: value });
  
  // Clear field-specific error when user starts typing
  if (errors[name]) {
    setErrors({ ...errors, [name]: '' });
  }
  
  // Clear API error when user makes changes
  if (apiError) {
    setApiError('');
  }
};
```

This provides immediate feedback and improves user experience by removing error messages as soon as the user begins correcting their input.

## Best Practices

1. **Use inline errors for form validation** - Display field-specific errors next to the relevant input fields
2. **Use toast notifications for global messages** - Use toasts for success messages, API errors, or system notifications
3. **Clear errors on user input** - Remove error messages when users start correcting their input
4. **Provide specific error messages** - Use the error extraction utilities to show meaningful messages
5. **Handle network errors gracefully** - The utilities automatically detect network and timeout errors
6. **Don't expose sensitive information** - The backend error handler ensures sensitive data is never exposed

## Example: Complete Error Handling Flow

```javascript
import { useState } from 'react';
import { useToast } from '../components/common/ToastContainer';
import { extractErrorMessage } from '../utils/errorHandler';
import api from '../services/api';

function MyForm() {
  const toast = useToast();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear field error on input
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/api/endpoint', formData);
      toast.success('Success!');
    } catch (error) {
      const message = extractErrorMessage(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="email"
        value={formData.email}
        onChange={handleChange}
      />
      {errors.email && <span className="error">{errors.email}</span>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Loading...' : 'Submit'}
      </button>
    </form>
  );
}
```
