import { apiClient } from "./client";

const extractCollection = (responseBody) => {
  if (Array.isArray(responseBody)) {
    return responseBody;
  }

  if (Array.isArray(responseBody?.data)) {
    return responseBody.data;
  }

  if (Array.isArray(responseBody?.items)) {
    return responseBody.items;
  }

  if (Array.isArray(responseBody?.result)) {
    return responseBody.result;
  }

  if (Array.isArray(responseBody?.value)) {
    return responseBody.value;
  }

  return [];
};

const pickFirst = (obj, keys, fallback = null) => {
  if (!obj || typeof obj !== "object") {
    return fallback;
  }

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }

  return fallback;
};

const normalizeCategory = (rawCategory = {}) => ({
  id: pickFirst(rawCategory, ["id", "Id", "categoryId", "CategoryId"]),
  categoryName: pickFirst(rawCategory, [
    "categoryName",
    "CategoryName",
    "name",
    "Name",
  ], "Unnamed category"),
});

// ── Companies ──────────────────────────────────────────────────────────────
export const getPendingCompanies = async () => {
  const { data } = await apiClient.get("/api/Admin/GetAllCompaniesArePending");
  return extractCollection(data);
};

export const getPendingCompanyById = async (id) => {
  const { data } = await apiClient.get(`/api/Admin/GetCompanyByIdIsPending/${id}`);
  return data;
};

export const approveCompany = async (id) => {
  const { data } = await apiClient.post(`/api/Admin/ApperoveCompany/${id}`);
  return data;
};

export const rejectCompany = async (id, reason = "") => {
  const { data } = await apiClient.post(`/api/Admin/RejectCompany/${id}`, null, {
    params: { reason },
  });
  return data;
};

// ── Jobs ───────────────────────────────────────────────────────────────────
export const getPendingJobs = async () => {
  const { data } = await apiClient.get("/api/Admin/GetAllJobsArePending");
  return extractCollection(data);
};

export const getPendingJobById = async (id) => {
  const { data } = await apiClient.get(`/api/Admin/GetJobDetailsIsPending/${id}`);
  return data;
};

export const approveJob = async (id) => {
  const { data } = await apiClient.post(`/api/Admin/ApproveJob/${id}`);
  return data;
};

export const rejectJob = async (id, summary = "") => {
  const { data } = await apiClient.post(`/api/Admin/RejectJob/${id}`, null, {
    params: { summary },
  });
  return data;
};

// ── Categories ─────────────────────────────────────────────────────────────
export const getAllCategories = async () => {
  const { data } = await apiClient.get("/api/Category/GetAllCategories");
  return extractCollection(data).map((item) => normalizeCategory(item));
};

export const addCategory = async (categoryName) => {
  const { data } = await apiClient.post("/api/Category/AddCategory", { categoryName });
  return data;
};

export const updateCategory = async (id, categoryName) => {
  const { data } = await apiClient.put(`/api/Category/UpdateCategory/${id}`, { categoryName });
  return data;
};

export const deleteCategory = async (id) => {
  const { data } = await apiClient.delete(`/api/Category/DeleteCategory/${id}`);
  return data;
};

// ── Jobs & Companies (public) ──────────────────────────────────────────────
export const getAllJobs = async () => {
  const { data } = await apiClient.get("/api/Job/GetAllJobs");
  return extractCollection(data);
};

export const getAllCompanies = async () => {
  const { data } = await apiClient.get("/api/Company/GetAllCompanies");
  return extractCollection(data);
};

// ── Users Management ────────────────────────────────────────────────────────
const unwrapData = (responseBody) => responseBody?.data ?? responseBody?.result ?? responseBody;

export const getAllUsers = async () => {
  const { data } = await apiClient.get("/api/Admin/GetAllUsers");
  return extractCollection(data);
};

export const getUserDetails = async (id) => {
  const { data } = await apiClient.get(`/api/Admin/GetUserDetails/${id}`);
  return unwrapData(data);
};

export const updateUser = async (id, payload) => {
  const { data } = await apiClient.put(`/api/Admin/UpdateUser/${id}`, payload);
  return data;
};

export const deleteUser = async (id) => {
  const { data } = await apiClient.delete(`/api/Admin/DeleteUser/${id}`);
  return data;
};

export const lockUnlockUser = async (id) => {
  const { data } = await apiClient.put(`/api/Admin/LockUnLockUser/${id}`);
  return data;
};

export const getAdminDashboardStats = async () => {
  const { data } = await apiClient.get("/api/Admin/DashBoard");
  return unwrapData(data);
};

export const getAllEmployers = async () => {
  const { data } = await apiClient.get("/api/Admin/GetAllEmployer");
  return extractCollection(data);
};

export const getAllJobSeekers = async () => {
  const { data } = await apiClient.get("/api/Admin/GetAllJobSeekers");
  return extractCollection(data);
};

export const registerAdmin = async (payload) => {
  const { data } = await apiClient.post("/api/Admin/RegisterAdmin", payload);
  return data;
};

// ── Analytics ────────────────────────────────────────────────────────────────
export const getEmploymentRate = async () => {
  const { data } = await apiClient.get("/api/AnalysisForAdminDashboard/GetEmploymentRate");
  return unwrapData(data);
};

export const getApplicationsDistribution = async () => {
  const { data } = await apiClient.get("/api/AnalysisForAdminDashboard/GetApplicationsDistribution");
  return extractCollection(data);
};

export const getApplicationsOverTime = async () => {
  const { data } = await apiClient.get("/api/AnalysisForAdminDashboard/GetApplicationsOverTime");
  return extractCollection(data);
};

export const getUsersGrowth = async () => {
  const { data } = await apiClient.get("/api/AnalysisForAdminDashboard/GetUsersGrowth");
  return extractCollection(data);
};

export const getScreeningFunnel = async () => {
  const { data } = await apiClient.get("/api/AnalysisForAdminDashboard/GetScreeningFunnel");
  return extractCollection(data);
};

export const getJobTypeDistribution = async () => {
  const { data } = await apiClient.get("/api/AnalysisForAdminDashboard/GetJobTypeDistribution");
  return extractCollection(data);
};

export const getTopJobs = async () => {
  const { data } = await apiClient.get("/api/AnalysisForAdminDashboard/GetTopJobs");
  return extractCollection(data);
};

export const getScreeningQuality = async () => {
  const { data } = await apiClient.get("/api/AnalysisForAdminDashboard/GetScreeningQuality");
  return unwrapData(data);
};

export const getTopSkills = async () => {
  const { data } = await apiClient.get("/api/AnalysisForAdminDashboard/GetTopSkills");
  return extractCollection(data).map((item) => ({
    name: item.skillName ?? item.name ?? item.label ?? item.skill ?? "Skill",
    count: Number(item.count ?? item.value ?? item.jobsCount ?? 0),
  }));
};

