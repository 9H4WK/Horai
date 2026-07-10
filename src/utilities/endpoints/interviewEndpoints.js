export const INTERVIEW_ENDPOINTS = {
  submitApplication: (jobId) => `/api/ApplyJob/ApplyJob/${jobId}`,
  startInterview: (applicationId) => `/api/ApplyJob/Start/${applicationId}`,
  nextQuestion: (sessionId) => `/api/ApplyJob/NextQuestion/${sessionId}`,
  submitAnswer: "/api/ApplyJob/SubmitAnswer",
  result: (sessionId) => `/api/ApplyJob/Result/${sessionId}`,
  allApplications: "/api/ApplyJob/AllApplications",
  getApplication: (applicationId) => `/api/ApplyJob/GetApplication/${applicationId}`,
  acceptApplication: (applicationId) => `/api/ApplyJob/AcceptApplication/${applicationId}`,
  rejectApplication: (applicationId) => `/api/ApplyJob/RejectApplication/${applicationId}`,
  rescreenApplication: (applicationId) => `/api/ApplyJob/Rescreen/${applicationId}`,
  getInsight: (jobId) => `/api/ApplyJob/GetInsight/${jobId}`,
  aiStatus: "/api/ApplyJob/AiStatus",
};