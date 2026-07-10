export const JOB_ENDPOINTS = {
  getAllJobs: "/api/Job/GetAllJobs",
  getJobDetails: (id) => `/api/Job/GetJobDetails/${id}`,
  createJob: "/api/Job/CreateJob",
  updateJob: (id) => `/api/Job/UpdateJob/${id}`,
  searchSkills: "/api/Job/SearchSkills",
};
