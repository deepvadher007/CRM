# Dashboard Component

## Overview

The Dashboard component is the main landing page for authenticated users. It displays a personalized welcome message, user profile information, and placeholder sections for future CRM features.

## Features

- **Welcome Message**: Personalized greeting with the user's name
- **User Profile Card**: Displays user information including:
  - Name
  - Email address
  - Role (with styled badge)
  - Logout button
- **CRM Feature Placeholders**: Six feature cards showcasing upcoming functionality:
  - Analytics
  - Contacts
  - Deals
  - Calendar
  - Email
  - Reports

## Usage

```jsx
import Dashboard from './components/dashboard/Dashboard';

function App() {
  return <Dashboard />;
}
```

## Requirements

- Must be used within an `AuthProvider` context
- User must be authenticated to access this component
- Should be wrapped in a `PrivateRoute` component

## Responsive Design

The Dashboard component is fully responsive and adapts to different screen sizes:

- **Desktop (1920px+)**: Full grid layout with 3 columns for feature cards
- **Tablet (768px)**: Adjusted spacing and single-column layout for feature cards
- **Mobile (375px+)**: Optimized for small screens with stacked layout

## Styling

The component uses CSS modules with the following key classes:

- `.dashboard-container`: Main container with gradient background
- `.welcome-section`: Welcome message area
- `.user-info-card`: Profile information card
- `.features-grid`: Grid layout for feature placeholders
- `.feature-card`: Individual feature card with hover effects

## Testing

The component includes comprehensive unit tests covering:

- Rendering of welcome message with user name
- Display of user profile information (name, email, role)
- Logout button functionality
- Display of all CRM feature placeholders
- "Coming Soon" badges on feature cards

Run tests with:

```bash
npm test Dashboard.test.jsx
```

## Future Enhancements

The placeholder feature cards are designed to be replaced with actual CRM functionality in future iterations:

1. **Analytics**: Sales performance metrics and dashboards
2. **Contacts**: Customer relationship management
3. **Deals**: Sales pipeline tracking
4. **Calendar**: Meeting and appointment scheduling
5. **Email**: Email campaign management
6. **Reports**: Detailed reporting and insights

## Related Components

- `AuthContext`: Provides user authentication state and logout functionality
- `PrivateRoute`: Protects the dashboard route from unauthenticated access
- `Navbar`: Navigation component displayed above the dashboard
