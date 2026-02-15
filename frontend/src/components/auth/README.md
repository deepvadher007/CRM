# Login Component

## Overview
The Login component provides a secure authentication interface for users to access the Hanuvansh CRM system.

## Features

### ✅ Form Fields
- **Email**: Text input with email validation
- **Password**: Secure password input

### ✅ Client-Side Validation
- Email format validation (must contain @ and valid domain)
- Required field validation
- Real-time error clearing when user types

### ✅ Error Handling
- **Inline validation errors**: Displayed below each field
- **API error messages**: Displayed at the top of the form
- **User-friendly error messages**: Clear feedback for all error scenarios

### ✅ Loading State
- Button shows "Logging in..." during API call
- Form inputs disabled during submission
- Prevents duplicate submissions

### ✅ Navigation
- Link to registration page for new users
- Automatic redirect to dashboard on successful login

### ✅ Responsive Design
- Desktop (1920x1080+): Full-width card with optimal spacing
- Tablet (768px): Adjusted padding and sizing
- Mobile (375px+): Compact layout optimized for small screens

## Usage

```jsx
import Login from './components/auth/Login';

function App() {
  return <Login />;
}
```

## Requirements Validated
- **Requirement 2.1**: User login with credentials
- **Requirement 10.4**: Client-side validation
- **Requirement 10.5**: Email format validation

## Testing
Run tests with:
```bash
npm test -- Login.test.jsx
```

## Accessibility
- Proper label associations with form inputs
- ARIA role="alert" for error messages
- Keyboard navigation support
- Autocomplete attributes for email and password
