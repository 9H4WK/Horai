export const AUTH_ENDPOINTS = {
  login: "/api/Account/Login",
  register: "/api/Account/Register",
  forgotPassword: "/api/Account/ForgotPassword",
  resetPassword: "/api/Account/ResetPassword",
  confirmEmail: "/api/Account/ConfirmEmail",
  externalLogin: (provider, role) =>
    `/api/Account/ExternalLogin?provider=${provider}&role=${role}`,
};
