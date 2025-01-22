import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeckUpload } from '../DeckUpload';

describe('DeckUpload Component', () => {
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    // Clear mock function calls before each test
    mockOnUpload.mockClear();
  });

  test('renders upload area with instructions', () => {
    render(<DeckUpload onUpload={mockOnUpload} />);
    
    expect(
      screen.getByText(/drag and drop your pitch deck here/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/supported formats: pdf, pptx/i)).toBeInTheDocument();
  });

  test('shows loading state when isLoading is true', () => {
    render(<DeckUpload onUpload={mockOnUpload} isLoading={true} />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('displays error message when provided', () => {
    const errorMessage = 'Failed to upload file';
    render(
      <DeckUpload onUpload={mockOnUpload} error={errorMessage} />
    );
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('handles file drop correctly', async () => {
    render(<DeckUpload onUpload={mockOnUpload} />);
    
    const file = new File(['dummy content'], 'test.pdf', {
      type: 'application/pdf',
    });

    const dropzone = screen.getByText(/drag and drop your pitch deck here/i);

    // Simulate file drop
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
        types: ['Files'],
      },
    });

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(file);
    });
  });

  test('rejects unsupported file types', async () => {
    render(<DeckUpload onUpload={mockOnUpload} />);
    
    const file = new File(['dummy content'], 'test.txt', {
      type: 'text/plain',
    });

    const dropzone = screen.getByText(/drag and drop your pitch deck here/i);

    // Simulate file drop
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
        types: ['Files'],
      },
    });

    await waitFor(() => {
      expect(mockOnUpload).not.toHaveBeenCalled();
    });
  });

  test('changes text when file is being dragged over', () => {
    render(<DeckUpload onUpload={mockOnUpload} />);
    
    const dropzone = screen.getByText(/drag and drop your pitch deck here/i);

    // Simulate dragging file over the dropzone
    fireEvent.dragEnter(dropzone);

    expect(screen.getByText(/drop your pitch deck here/i)).toBeInTheDocument();
  });
});
