import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the CRM app without crashing', () => {
  render(<App />);
  // The app renders the login page by default (unauthenticated)
  expect(document.body).toBeInTheDocument();
});
