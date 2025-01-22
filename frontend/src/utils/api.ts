import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',  // Use relative URL for proxy
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return Promise.reject(error.response.data.message || 'An error occurred');
    } else if (error.request) {
      // The request was made but no response was received
      return Promise.reject('No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      return Promise.reject('Error setting up the request');
    }
  }
);

export default api;
