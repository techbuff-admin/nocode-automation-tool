// renderer/src/services/http.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
});

// Before each request, read the token from storage and set the Authorization header
apiClient.interceptors.request.use((config) => {
  // If you’ve switched to sessionStorage:
  const token = sessionStorage.getItem('token');
  // Or if you left it in localStorage:
  // const token = localStorage.getItem('token');

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
