import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-inject JWT token on every request
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('chatUser') || 'null');

  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }

  return config;
});

export default api;