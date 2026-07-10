import { apiClient } from "./client";

export const getAllCompanies = async () => {
  const { data } = await apiClient.get("/api/Company/GetAllCompanies");
  return Array.isArray(data) ? data : data?.data ?? data?.items ?? [];
};

export const getCompanyById = async (id) => {
  const { data } = await apiClient.get(`/api/Company/GetCompanyById/${id}`);
  return data?.data ?? data?.result ?? data;
};

export const getMyCompany = async () => {
  const { data } = await apiClient.get("/api/Company/GetMyCompany");
  return data?.data ?? data?.result ?? data ?? null;
};

export const createCompany = async (payload) => {
  const formData = new FormData();

  formData.append("EmployerId", String(payload.employerId).trim());
  formData.append("CompanyName", String(payload.companyName).trim());

  if (payload.description && String(payload.description).trim()) {
    formData.append("Description", String(payload.description).trim());
  }

  if (payload.industry && String(payload.industry).trim()) {
    formData.append("Industry", String(payload.industry).trim());
  }

  if (payload.website && String(payload.website).trim()) {
    formData.append("Website", String(payload.website).trim());
  }

  if (payload.logoFile instanceof File) {
    formData.append("LogoFile", payload.logoFile);
  }

  const { data } = await apiClient.post("/api/Company/AddCompany", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

const parseJwtPayload = (token) => {
  try {
    const payloadPart = String(token || "").split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const resolveCurrentUserIdentity = () => {
  const tokenKeys = ["token", "accessToken", "authToken", "jwt"];
  let token = null;
  for (const key of tokenKeys) {
    const value = localStorage.getItem(key);
    if (value) {
      token = value;
      break;
    }
  }

  if (!token) {
    return { userName: "", email: "", userId: "" };
  }

  const payload = parseJwtPayload(token);
  if (!payload) {
    return { userName: "", email: "", userId: "" };
  }

  const userId =
    payload.userId ??
    payload.id ??
    payload.sub ??
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
    payload.nameid ??
    "";

  const email =
    payload.email ??
    payload.Email ??
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ??
    "";

  const userName =
    payload.unique_name ??
    payload.username ??
    payload.userName ??
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ??
    "";

  return { userName, email, userId };
};

export const normalizeCompany = (raw = {}) => ({
  id:            raw.id          ?? raw.companyId    ?? raw.CompanyId ?? String(Math.random()),
  companyName:   raw.companyName ?? raw.CompanyName  ?? raw.name         ?? "Unnamed Company",
  industry:      raw.industry    ?? raw.Industry     ?? "—",
  description:   raw.description ?? raw.Description  ?? "",
  website:       raw.website     ?? raw.Website      ?? "",
  averageRating: raw.averageRating ?? raw.AverageRating ?? 0,
  reviewCount:   raw.reviewCount   ?? raw.ReviewCount   ?? 0,
  logoUrl:       raw.logoUrl     ?? raw.LogoUrl      ?? raw.logo ?? null,
  location:      raw.location    ?? raw.Location     ?? "",
  employeeCount: raw.employeeCount ?? raw.EmployeeCount ?? null,
  foundedAt:     raw.foundedAt   ?? raw.FoundedAt    ?? null,
});

export const getCompanyDetails = async (id) => {
  const { data } = await apiClient.get(`/api/CompanyReview/GetCompanyDetailsById/${id}`);
  return data?.data ?? data?.result ?? data;
};

export const getCompanyJobs = async (id) => {
  const { data } = await apiClient.get(`/api/CompanyReview/GetAllJobsForSpecificCompany/${id}`);
  return data?.data ?? data?.result ?? data ?? [];
};

export const getCompanyReviews = async (id) => {
  const { data } = await apiClient.get(`/api/CompanyReview/GetCompanyReviews/${id}`);
  return data?.data ?? data?.result ?? data ?? [];
};

export const addCompanyReview = async (payload) => {
  const cleanPayload = {
    companyId: payload.companyId ?? payload.CompanyId,
    rating: Number(payload.rating ?? payload.Rating),
    comment: payload.comment ?? payload.Comment ?? payload.reviewText ?? payload.ReviewText,
  };
  const { data } = await apiClient.post("/api/CompanyReview/AddCompanyReview", cleanPayload);
  return data;
};

