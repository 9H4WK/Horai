import { apiClient } from "./client";
import { INTERVIEW_ENDPOINTS } from "../endpoints/interviewEndpoints";

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

const extractItem = (responseBody) => {
  if (!responseBody || typeof responseBody !== "object") {
    return responseBody ?? null;
  }

  if (responseBody.data && typeof responseBody.data === "object") {
    return responseBody.data;
  }

  if (responseBody.result && typeof responseBody.result === "object") {
    return responseBody.result;
  }

  return responseBody;
};

const parseJSON = (value) => {
  if (!value) return null;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  return [];
};

export const normalizeApplication = (rawApplication = {}) => {
  const applicant = pickFirst(rawApplication, ["applicant", "Applicant"], {}) || {};
  const cvAnalysis =
    parseJSON(pickFirst(rawApplication, ["cvAnalysis", "cvAnalysisJson", "CvAnalysis", "CVData"], null)) || {};
  const screening =
    parseJSON(pickFirst(rawApplication, ["screening", "screeningJson", "Screening", "aiScreening"], null)) || {};

  const skills = asArray(
    screening.candidateSkills?.length
      ? screening.candidateSkills
      : cvAnalysis.skills?.length
        ? cvAnalysis.skills
        : applicant.skills,
  );
  const strengths = asArray(screening.strengths?.length ? screening.strengths : cvAnalysis.strengths);
  const gaps = asArray(screening.gaps);
  const summary = screening.summary || cvAnalysis.summary || applicant.bio || "";
  const matchScore = pickFirst(rawApplication, ["matchScore", "MatchScore", "score", "Score"], screening.matchScore);

  return {
    id: pickFirst(rawApplication, ["id", "Id", "applicationId", "ApplicationId"]),
    applicationId: pickFirst(rawApplication, ["applicationId", "ApplicationId", "id", "Id"]),
    jobId: pickFirst(rawApplication, ["jobId", "JobId"]),
    jobTitle: pickFirst(rawApplication, ["jobTitle", "JobTitle", "title", "Title"]),
    companyName: pickFirst(rawApplication, ["companyName", "CompanyName", "employerName", "EmployerName"]),
    status: String(
      pickFirst(rawApplication, ["status", "Status", "applicationStatus", "ApplicationStatus"], "Submitted"),
    ),
    appliedAt: pickFirst(rawApplication, [
      "appliedAt",
      "AppliedAt",
      "createdAt",
      "CreatedAt",
      "submittedAt",
      "SubmittedAt",
    ]),
    decidedAt: pickFirst(rawApplication, ["decidedAt", "DecidedAt"]),
    sessionId: pickFirst(rawApplication, ["sessionId", "SessionId", "interviewSessionId", "InterviewSessionId"]),
    applicantName:
      applicant.name ||
      pickFirst(rawApplication, ["applicantName", "ApplicantName"]) ||
      applicant.email ||
      pickFirst(rawApplication, ["applicantEmail", "ApplicantEmail"]) ||
      "",
    applicantEmail: applicant.email || pickFirst(rawApplication, ["applicantEmail", "ApplicantEmail"]) || "",
    applicantHeadline:
      applicant.headline || pickFirst(rawApplication, ["applicantHeadline", "ApplicantHeadline"]) || "",
    applicantLocation:
      applicant.location || pickFirst(rawApplication, ["applicantLocation", "ApplicantLocation"]) || "",
    applicantPhone: applicant.phone || pickFirst(rawApplication, ["applicantPhone", "ApplicantPhone"]) || "",
    applicantLinkedIn:
      applicant.linkedIn || pickFirst(rawApplication, ["applicantLinkedIn", "ApplicantLinkedIn"]) || "",
    applicantGithub: applicant.github || pickFirst(rawApplication, ["applicantGithub", "ApplicantGithub"]) || "",
    applicantBio: applicant.bio || "",
    experience: asArray(applicant.experience || cvAnalysis.experience),
    education: asArray(applicant.education || cvAnalysis.education),
    projects: asArray(applicant.projects || cvAnalysis.projects),
    cvFileName: pickFirst(rawApplication, ["cvFileName", "CvFileName"]),
    cvDownloadUrl: pickFirst(rawApplication, ["cvDownloadUrl", "CvDownloadUrl"]),
    hrComment: pickFirst(rawApplication, ["hrComment", "HrComment", "comment", "Comment"]),
    matchScore: matchScore != null && matchScore !== "" ? Number(matchScore) : null,
    fitTier: pickFirst(rawApplication, ["fitTier", "FitTier"], screening.fitTier),
    fitLabel: pickFirst(rawApplication, ["fitLabel", "FitLabel"], screening.fitLabel),
    rankInJob: pickFirst(rawApplication, ["rankInJob", "RankInJob"]),
    totalInJob: pickFirst(rawApplication, ["totalInJob", "TotalInJob"]),
    recommendation: screening.recommendation || "",
    reasoning: screening.reasoning || "",
    skillMatches: asArray(screening.skillMatches),
    summary: String(summary || "").slice(0, 320),
    skills: skills.slice(0, 12),
    strengths: strengths.slice(0, 6),
    gaps: gaps.slice(0, 6),
    score: matchScore != null && matchScore !== "" ? Number(matchScore) : skills.length,
    screening,
    cvAnalysis,
    raw: rawApplication,
  };
};

export const normalizeInterviewQuestion = (rawQuestion) => {
  if (!rawQuestion || typeof rawQuestion !== "object") {
    return null;
  }

  const options = pickFirst(rawQuestion, ["options", "Options", "choices", "Choices"], []);

  return {
    questionId: pickFirst(rawQuestion, ["questionId", "QuestionId", "id", "Id"]),
    prompt: String(
      pickFirst(
        rawQuestion,
        [
          "questionText",
          "QuestionText",
          "question",
          "Question",
          "prompt",
          "Prompt",
          "text",
          "Text",
          "message",
          "Message",
          "content",
          "Content",
        ],
        "",
      ) || "",
    ),
    options: Array.isArray(options) ? options : [],
    isCompleted: Boolean(
      pickFirst(rawQuestion, ["isCompleted", "IsCompleted", "completed", "Completed", "done", "Done"], false),
    ),
    raw: rawQuestion,
  };
};

export const normalizeInterviewResult = (rawResult = {}) => ({
  sessionId: pickFirst(rawResult, ["sessionId", "SessionId"]),
  status: pickFirst(rawResult, ["status", "Status"], "Completed"),
  score: pickFirst(rawResult, ["score", "Score", "percentage", "Percentage", "matchPercentage", "MatchPercentage"]),
  passed: Boolean(pickFirst(rawResult, ["passed", "Passed", "isPassed", "IsPassed"], false)),
  summary: pickFirst(rawResult, ["summary", "Summary", "resultSummary", "ResultSummary", "message", "Message"], ""),
  feedback: pickFirst(rawResult, ["feedback", "Feedback", "notes", "Notes"], ""),
  recommendation: pickFirst(rawResult, ["recommendation", "Recommendation", "nextSteps", "NextSteps"], ""),
  matchScore: pickFirst(rawResult, ["matchScore", "MatchScore"]),
  fitTier: pickFirst(rawResult, ["fitTier", "FitTier"]),
  raw: rawResult,
});

export const submitApplication = async (jobId) => {
  const { data } = await apiClient.post(INTERVIEW_ENDPOINTS.submitApplication(jobId));
  return extractItem(data);
};

export const startInterview = async (applicationId) => {
  const { data } = await apiClient.post(INTERVIEW_ENDPOINTS.startInterview(applicationId));
  return extractItem(data);
};

export const getNextInterviewQuestion = async (sessionId) => {
  const { data } = await apiClient.get(INTERVIEW_ENDPOINTS.nextQuestion(sessionId));
  return extractItem(data);
};

export const submitInterviewAnswer = async (payload) => {
  const { data } = await apiClient.post(INTERVIEW_ENDPOINTS.submitAnswer, payload);
  return extractItem(data);
};

export const getInterviewResult = async (sessionId) => {
  const { data } = await apiClient.get(INTERVIEW_ENDPOINTS.result(sessionId));
  return extractItem(data);
};

export const acceptApplication = async (applicationId, comment = "") => {
  if (!applicationId) {
    throw new Error("applicationId is required");
  }

  const { data } = await apiClient.post(INTERVIEW_ENDPOINTS.acceptApplication(applicationId), {
    comment: comment || "",
    reason: comment || "",
  });
  return data;
};

export const rejectApplication = async (applicationId, comment = "") => {
  if (!applicationId) {
    throw new Error("applicationId is required");
  }

  // Send comment in body (primary) and query (compat) so reject never silently fails
  const { data } = await apiClient.post(
    INTERVIEW_ENDPOINTS.rejectApplication(applicationId),
    {
      comment: comment || "",
      reason: comment || "",
    },
    {
      params: { reason: comment || "" },
    },
  );

  return data;
};

export const rescreenApplication = async (applicationId) => {
  if (!applicationId) {
    throw new Error("applicationId is required");
  }
  const { data } = await apiClient.post(INTERVIEW_ENDPOINTS.rescreenApplication(applicationId));
  return extractItem(data);
};

export const getAllApplications = async (params = {}) => {
  const { data } = await apiClient.get(INTERVIEW_ENDPOINTS.allApplications, { params });
  return extractCollection(data).map((item) => normalizeApplication(item));
};

export const getApplicationById = async (applicationId) => {
  if (!applicationId) {
    return null;
  }

  try {
    const { data } = await apiClient.get(INTERVIEW_ENDPOINTS.getApplication(applicationId));
    const item = extractItem(data);
    if (item) {
      return normalizeApplication(item);
    }
  } catch {
    // Fall back to list lookup for older API compatibility
  }

  const applications = await getAllApplications();
  const targetId = String(applicationId).toLowerCase();

  return (
    applications.find((item) => String(item.applicationId || item.id || "").toLowerCase() === targetId) || null
  );
};

export const getInsight = async (jobId) => {
  const { data } = await apiClient.post(INTERVIEW_ENDPOINTS.getInsight(jobId));
  return extractItem(data);
};

/** Employer/admin only — screening assistant connectivity (no vendor branding). */
export const getEmployerAiStatus = async ({ probe = false } = {}) => {
  const { data } = await apiClient.get(INTERVIEW_ENDPOINTS.aiStatus, {
    params: probe ? { probe: 1 } : undefined,
  });
  return extractItem(data) || data;
};
