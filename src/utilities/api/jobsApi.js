import { apiClient } from "./client";
import { JOB_ENDPOINTS } from "../endpoints/jobEndpoints";

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

const splitTextIntoParagraphs = (text) => {
  if (!text || typeof text !== "string") {
    return [];
  }

  return text
    .split(/\n\n|\r\n\r\n/)
    .map((part) => part.trim())
    .filter(Boolean);
};

const formatPostedTime = (value) => {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const diffInDays = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffInDays <= 0) {
    return "Today";
  }

  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }

  if (diffInDays < 30) {
    return `${Math.floor(diffInDays / 7)}w`;
  }

  return `${Math.floor(diffInDays / 30)}mo`;
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
    return null;
  }

  if (responseBody.data && typeof responseBody.data === "object") {
    return responseBody.data;
  }

  if (responseBody.result && typeof responseBody.result === "object") {
    return responseBody.result;
  }

  return responseBody;
};

export const normalizeJob = (rawJob = {}) => {
  const id = pickFirst(rawJob, ["id", "Id", "jobId", "JobId"]);
  const descriptionText = pickFirst(rawJob, ["description", "Description"], "") || "";
  const summaryText = pickFirst(rawJob, ["summary", "Summary"], "") || "";

  const descriptionParagraphs = [
    ...splitTextIntoParagraphs(summaryText),
    ...splitTextIntoParagraphs(descriptionText),
  ];

  const ratingRaw = pickFirst(rawJob, [
    "rating",
    "Rating",
    "averageRating",
    "AverageRating",
  ]);

  return {
    id,
    company: pickFirst(rawJob, [
      "company",
      "Company",
      "companyName",
      "CompanyName",
      "employerName",
      "EmployerName",
    ], "Company"),
    companyId: pickFirst(rawJob, ["companyId", "CompanyId", "company_id"]),
    employerId: pickFirst(rawJob, ["employerId", "EmployerId", "employer_id"]),
    title: pickFirst(rawJob, ["title", "Title"], "Untitled role"),
    rating: ratingRaw !== null ? String(ratingRaw) : "0.0",
    location: pickFirst(rawJob, ["location", "Location"], "Remote"),
    salary: pickFirst(rawJob, ["salaryRange", "SalaryRange", "salary"], "Salary not provided"),
    jobType: pickFirst(rawJob, ["jobType", "JobType", "job_type"], ""),
    deadline: pickFirst(rawJob, ["deadline", "Deadline"], ""),
    categoryId: pickFirst(rawJob, ["categoryId", "CategoryId", "category", "Category"], ""),
    categoryName: pickFirst(rawJob, ["categoryName", "CategoryName"], ""),
    summaryText,
    descriptionText,
    postedTime: formatPostedTime(
      pickFirst(rawJob, ["postedAt", "PostedAt", "createdAt", "CreatedAt"]),
    ),
    resumeMatch: true,
    description:
      descriptionParagraphs.length > 0
        ? descriptionParagraphs
        : ["No job description has been provided yet."],
    fullDescription: [],
    raw: rawJob,
  };
};

export const getAllJobs = async () => {
  const { data } = await apiClient.get(JOB_ENDPOINTS.getAllJobs);
  return extractCollection(data).map((item) => normalizeJob(item));
};

export const getJobDetails = async (jobId) => {
  const { data } = await apiClient.get(JOB_ENDPOINTS.getJobDetails(jobId));
  const rawItem = extractItem(data);

  return rawItem ? normalizeJob(rawItem) : null;
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

const normalizeSkill = (rawSkill) => {
  if (typeof rawSkill === "string") {
    return {
      id: null,
      skillName: rawSkill,
    };
  }

  return {
    id: pickFirst(rawSkill, ["id", "Id", "skillId", "SkillId"]),
    skillName: pickFirst(rawSkill, ["skillName", "SkillName", "name", "Name"], "Untitled skill"),
  };
};

export const getAllCategories = async () => {
  const { data } = await apiClient.get("/api/Category/GetAllCategories");

  return extractCollection(data)
    .map((item) => normalizeCategory(item))
    .filter((item) => item.id);
};

export const searchJobSkills = async (term) => {
  const normalizedTerm = String(term ?? "").trim();

  if (!normalizedTerm) {
    return [];
  }

  const { data } = await apiClient.get(JOB_ENDPOINTS.searchSkills, {
    params: {
      term: normalizedTerm,
    },
  });

  return extractCollection(data)
    .map((item) => normalizeSkill(item))
    .filter((item) => item.id || item.skillName);
};

export const createJob = async (payload) => {
  const formData = new FormData();

  formData.append("CategoryId", String(payload.categoryId).trim());
  formData.append("Title", String(payload.title).trim());
  formData.append("Description", String(payload.description).trim());

  if (payload.summary && String(payload.summary).trim()) {
    formData.append("Summary", String(payload.summary).trim());
  }

  formData.append("JobType", String(payload.jobType));
  formData.append("SalaryRange", String(payload.salaryRange).trim());
  formData.append("Location", String(payload.location).trim());
  formData.append("Deadline", String(payload.deadline));

  if (Array.isArray(payload.skillIds) && payload.skillIds.length > 0) {
    payload.skillIds
      .map((item) => String(item).trim())
      .filter(Boolean)
      .forEach((skillId) => {
        formData.append("SkillIds", skillId);
      });
  }

  // Send FormData as multipart. Pass a content-type to allow axios to set the boundary.
  const { data } = await apiClient.post(JOB_ENDPOINTS.createJob, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const updateJob = async (jobId, payload) => {
  if (!jobId) {
    throw new Error("jobId is required");
  }

  const formData = new FormData();
  formData.append("CategoryId", String(payload.categoryId).trim());
  formData.append("Title", String(payload.title).trim());
  formData.append("Description", String(payload.description).trim());

  if (payload.summary != null && String(payload.summary).trim()) {
    formData.append("Summary", String(payload.summary).trim());
  } else {
    formData.append("Summary", "");
  }

  formData.append("JobType", String(payload.jobType));
  formData.append("SalaryRange", String(payload.salaryRange).trim());
  formData.append("Location", String(payload.location).trim());
  formData.append("Deadline", String(payload.deadline));

  const { data } = await apiClient.put(JOB_ENDPOINTS.updateJob(jobId), formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const item = extractItem(data);
  return item ? normalizeJob(item) : normalizeJob(data);
};
