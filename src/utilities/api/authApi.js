import { apiClient } from "./client";
import { AUTH_ENDPOINTS } from "../endpoints/authEndpoints";

export const login = async (email, password) => {
  const { data } = await apiClient.post(AUTH_ENDPOINTS.login, {
    email,
    password,
  });

  return data;
};

export const register = async (registrationData) => {
  const { data } = await apiClient.post(
    AUTH_ENDPOINTS.register,
    registrationData,
  );

  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await apiClient.post(AUTH_ENDPOINTS.forgotPassword, {
    email,
  });

  return data;
};

export const resetPassword = async (resetPasswordData) => {
  const { data } = await apiClient.post(
    AUTH_ENDPOINTS.resetPassword,
    resetPasswordData,
  );

  return data;
};
