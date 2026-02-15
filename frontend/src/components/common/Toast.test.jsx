import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from './Toast';

describe('Toast Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render toast with message', () => {
    render(<Toast message="Test message" type="info" onClose={mockOnClose} />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should not render when message is empty', () => {
    const { container } = render(<Toast message="" type="info" onClose={mockOnClose} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render success toast with correct styling', () => {
    render(<Toast message="Success!" type="success" onClose={mockOnClose} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('toast-success');
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('should render error toast with correct styling', () => {
    render(<Toast message="Error!" type="error" onClose={mockOnClose} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('toast-error');
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('should render warning toast with correct styling', () => {
    render(<Toast message="Warning!" type="warning" onClose={mockOnClose} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('toast-warning');
    expect(screen.getByText('⚠')).toBeInTheDocument();
  });

  it('should render info toast with correct styling', () => {
    render(<Toast message="Info!" type="info" onClose={mockOnClose} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('toast-info');
    expect(screen.getByText('ℹ')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Toast message="Test" type="info" onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText('Close notification');
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should auto-dismiss after duration', () => {
    render(<Toast message="Test" type="info" duration={3000} onClose={mockOnClose} />);
    
    expect(mockOnClose).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(3000);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not auto-dismiss when duration is 0', () => {
    render(<Toast message="Test" type="info" duration={0} onClose={mockOnClose} />);
    
    jest.advanceTimersByTime(10000);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should have proper accessibility attributes', () => {
    render(<Toast message="Test" type="info" onClose={mockOnClose} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });
});
