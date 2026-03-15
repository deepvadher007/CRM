import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './ToastContainer';

// Test component that uses the toast hook
const TestComponent = () => {
  const toast = useToast();

  return (
    <div>
      <button onClick={() => toast.success('Success message')}>Show Success</button>
      <button onClick={() => toast.error('Error message')}>Show Error</button>
      <button onClick={() => toast.warning('Warning message')}>Show Warning</button>
      <button onClick={() => toast.info('Info message')}>Show Info</button>
      <button onClick={() => toast.showToast('Custom message', 'info', 1000)}>
        Show Custom
      </button>
    </div>
  );
};

describe('ToastContainer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should throw error when useToast is used outside ToastProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });

  it('should display success toast when success method is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Success');
    userEvent.click(button);

    expect(await screen.findByText('Success message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('toast-success');
  });

  it('should display error toast when error method is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Error');
    userEvent.click(button);

    expect(await screen.findByText('Error message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('toast-error');
  });

  it('should display warning toast when warning method is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Warning');
    userEvent.click(button);

    expect(await screen.findByText('Warning message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('toast-warning');
  });

  it('should display info toast when info method is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Info');
    userEvent.click(button);

    expect(await screen.findByText('Info message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('toast-info');
  });

  it('should display multiple toasts simultaneously', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    userEvent.click(screen.getByText('Show Success'));
    userEvent.click(screen.getByText('Show Error'));

    expect(await screen.findByText('Success message')).toBeInTheDocument();
    expect(await screen.findByText('Error message')).toBeInTheDocument();
  });

  it('should remove toast when close button is clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    userEvent.click(screen.getByText('Show Success'));
    expect(await screen.findByText('Success message')).toBeInTheDocument();

    const closeButton = screen.getByLabelText('Close notification');
    userEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('should auto-remove toast after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    userEvent.click(screen.getByText('Show Custom'));
    expect(await screen.findByText('Custom message')).toBeInTheDocument();

    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.queryByText('Custom message')).not.toBeInTheDocument();
    });
  });

  it('should handle custom toast with showToast method', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    userEvent.click(screen.getByText('Show Custom'));

    expect(await screen.findByText('Custom message')).toBeInTheDocument();
  });
});
