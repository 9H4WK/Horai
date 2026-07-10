import axios from "axios";

// Endpoint files already include /api, and Vite proxies /api to localhost:5000.
export const API_BASE_URL = "";

const tokenKeys = ["token", "accessToken", "authToken", "jwt"];

const getStoredToken = () => {
  for (const key of tokenKeys) {
    const value = localStorage.getItem(key);
    if (value) {
      return value;
    }
  }

  return null;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
