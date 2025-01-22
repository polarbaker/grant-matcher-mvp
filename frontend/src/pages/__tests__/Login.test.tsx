import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import Login from '../Login';
import authReducer, { login } from '../../store/slices/authSlice';

// Create a test store
const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
  });

// Helper function to render the component with all necessary providers
const renderLogin = () => {
  const store = createTestStore();
  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>
    ),
    store,
  };
};

describe('Login Component', () => {
  test('renders login form', () => {
    renderLogin();
    
    // Check if important elements are present
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('shows validation error for invalid email', async () => {
    renderLogin();
    
    // Find the email input and type an invalid email
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);
    
    // Check if validation message appears
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });

  test('handles successful login', async () => {
    const { store } = renderLogin();
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check if login action was dispatched
    const actions = store.getState().auth;
    expect(actions.loading).toBe(true);
  });

  test('shows error message on login failure', async () => {
    renderLogin();
    
    // Fill in the form with invalid credentials
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check if error message appears
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
