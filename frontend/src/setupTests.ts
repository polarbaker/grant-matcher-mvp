// This file sets up the testing environment
import '@testing-library/jest-dom';

// Mock the environment variables that would normally come from .env
process.env.REACT_APP_API_URL = 'http://localhost:4000';

// Mock the localStorage API
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
