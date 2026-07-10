import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  getProfile,
  completeProfile,
  updateProfile,
  uploadCV,
  getCVData,
  deleteProfile,
} from "../../utilities/api/profileApi";
import { getMyCompany } from "../../utilities/api/companiesApi";
import { API_BASE_URL } from "../../utilities/api/client";
import {
  Github,
  Globe,
  Linkedin,
  Camera,
  Pencil,
  Trash2,
  ExternalLink,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Upload,
  Download,
  GraduationCap,
  BriefcaseBusiness,
  FolderKanban,
  Sparkles,
  PencilLine,
  Plus,
  X,
  Link2,
  Building2,
  Users,
  MapPin,
  Phone,
} from "lucide-react";

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

const normalizeCVData = (rawCVData) => {
  if (!rawCVData) {
    return null;
  }

  if (typeof rawCVData === "string") {
    const inferredFileName = rawCVData.split("/").pop() || "Uploaded CV";
    return {
      fileName: inferredFileName,
      downloadUrl: rawCVData,
      updatedAt: null,
    };
  }

  const hasCV = pickFirst(rawCVData, ["hasCV", "HasCV"], true);
  const downloadUrl = pickFirst(
    rawCVData,
    [
      "downloadUrl",
      "DownloadUrl",
      "fileUrl",
      "FileUrl",
      "cvUrl",
      "CVUrl",
      "url",
      "Url",
      "path",
      "Path",
    ],
    "",
  );

  const deriveFileNameFromUrl = (url) => {
    if (!url) {
      return "";
    }

    try {
      const normalizedUrl = String(url);
      const withoutQuery = normalizedUrl.split("?")[0];
      const decoded = decodeURIComponent(withoutQuery);
      const bySlash = decoded.split("/").pop() || "";
      const byBackslash = bySlash.split("\\").pop() || "";

      return byBackslash.trim();
    } catch {
      return "";
    }
  };

  const fileName = pickFirst(
    rawCVData,
    ["fileName", "FileName", "cvFileName", "CVFileName", "name", "Name"],
    "",
  );
  const summaryText = pickFirst(
    rawCVData,
    [
      "summary",
      "Summary",
      "overview",
      "Overview",
      "extractedSummary",
      "ExtractedSummary",
      "profileSummary",
      "ProfileSummary",
    ],
    "",
  );
  const education = normalizeSectionList(
    pickFirst(
      rawCVData,
      [
        "education",
        "Education",
        "educations",
        "EducationItems",
        "educationHistory",
        "EducationHistory",
      ],
      [],
    ),
    normalizeEducationEntry,
  );
  const experience = normalizeSectionList(
    pickFirst(
      rawCVData,
      [
        "experience",
        "Experience",
        "workExperience",
        "WorkExperience",
        "jobs",
        "Jobs",
      ],
      [],
    ),
    normalizeExperienceEntry,
  );
  const projects = normalizeSectionList(
    pickFirst(
      rawCVData,
      ["projects", "Projects", "portfolioItems", "PortfolioItems"],
      [],
    ),
    normalizeProjectEntry,
  );
  const skills = normalizeSectionList(
    pickFirst(
      rawCVData,
      [
        "skills",
        "Skills",
        "extractedSkills",
        "ExtractedSkills",
        "matchedSkills",
        "MatchedSkills",
      ],
      [],
    ),
    normalizeSkillEntry,
  );
  const updatedAt = pickFirst(
    rawCVData,
    [
      "uploadedAt",
      "UploadedAt",
      "updatedAt",
      "UpdatedAt",
      "createdAt",
      "CreatedAt",
    ],
    null,
  );

  if (!hasCV && !downloadUrl) {
    return null;
  }

  const resolvedFileName =
    fileName || deriveFileNameFromUrl(downloadUrl) || "Uploaded CV";
  const cvInsights = buildCvSummary({
    summaryText,
    education,
    experience,
    projects,
    skills,
  });

  return {
    fileName: resolvedFileName,
    downloadUrl,
    updatedAt,
    summary: cvInsights.overview,
    highlights: cvInsights.highlights,
    education,
    experience,
    projects,
    skills,
  };
};

const parseJwtPayload = (token) => {
  try {
    const payloadPart = String(token || "").split(".")[1];

    if (!payloadPart) {
      return null;
    }

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded);

    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const normalizeAccountType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

/** Job-seeker / applicant account (career profile: CV, education, experience). */
const isEmployeeType = (value) => {
  const normalized = normalizeAccountType(value);

  return (
    normalized.includes("jobseeker") ||
    normalized.includes("employee") ||
    normalized.includes("seeker") ||
    normalized.includes("candidate")
  );
};

/** Employer / HR account (hiring contact — no applicant career sections). */
const isEmployerType = (value) => {
  const normalized = normalizeAccountType(value);

  return (
    normalized.includes("employer") ||
    normalized.includes("company") ||
    normalized.includes("hr") ||
    normalized.includes("recruiter") ||
    normalized.includes("admin")
  );
};

const resolveAccountType = (profileData) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    "";

  const tokenPayload = parseJwtPayload(token);

  return pickFirst(
    profileData,
    [
      "userType",
      "UserType",
      "role",
      "Role",
      "accountType",
      "AccountType",
      "userRole",
      "UserRole",
    ],
    pickFirst(
      tokenPayload,
      [
        "userType",
        "role",
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role",
      ],
      localStorage.getItem("userType") || localStorage.getItem("role") || "",
    ),
  );
};

// ── Toast ─────────────────────────────────────────────────────────────────
const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-poppins-medium transition-all
        ${toast.type === "error" ? "bg-red-500 text-white" : "bg-[#1a1a1a] text-white"}`}
    >
      {toast.type === "error" ? (
        <XCircle className="w-4 h-4" />
      ) : (
        <CheckCircle2 className="w-4 h-4" />
      )}
      {toast.message}
    </div>
  );
};

// ── Input Field ───────────────────────────────────────────────────────────
const Field = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
  disabled,
}) => {
  const Icon = icon;

  return (
    <div>
      <label className="block text-xs font-poppins-medium text-gray-500 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full ${Icon ? "pl-9" : "pl-4"} pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-poppins placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent/50
            disabled:bg-gray-50 disabled:text-gray-400 transition-colors`}
        />
      </div>
    </div>
  );
};

// ── Delete Confirm Modal ──────────────────────────────────────────────────
const DeleteModal = ({ onConfirm, onClose }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
        <Trash2 className="w-5 h-5 text-red-500" />
      </div>
      <h3 className="font-poppins-semibold text-[#1a1a1a] mb-1">
        Delete Profile?
      </h3>
      <p className="text-sm font-poppins text-gray-500 mb-6">
        This will permanently delete your profile information. This action
        cannot be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-poppins-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-poppins-medium hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ── Social Link display ───────────────────────────────────────────────────
const SocialLink = ({ href, icon, label, color }) => {
  const Icon = icon;

  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-poppins-medium transition-all hover:-translate-y-0.5 hover:shadow-sm ${color}`}
    >
      <Icon className="w-4 h-4" />
      {label}
      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
    </a>
  );
};

const SECTION_STORAGE_PREFIX = "searchera-profile-sections";
const SKILL_LEVEL_OPTIONS = ["", "Junior", "Mid", "Senior", "Lead", "Expert"];

const createLocalId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeText = (value) => String(value ?? "").trim();

const resolveMediaUrl = (url) => {
  const text = normalizeText(url);

  if (!text) {
    return null;
  }

  if (
    text.startsWith("http://") ||
    text.startsWith("https://") ||
    text.startsWith("blob:") ||
    text.startsWith("data:")
  ) {
    return text;
  }

  if (text.startsWith("//")) {
    return `${new URL(API_BASE_URL).protocol}${text}`;
  }

  if (text.startsWith("/")) {
    return `${API_BASE_URL.replace(/\/$/, "")}${text}`;
  }

  return `${API_BASE_URL.replace(/\/$/, "")}/${text}`;
};

const safeParseJson = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeSectionList = (value, normalizer) => {
  const parsed = safeParseJson(value, value);
  const arrayValue = Array.isArray(parsed) ? parsed : [];

  return arrayValue.map(normalizer).filter(Boolean);
};

const formatMonthValue = (value) => {
  const text = normalizeText(value);

  if (!text) {
    return "";
  }

  if (/^\d{4}-\d{2}$/.test(text)) {
    const [year, month] = text.split("-").map(Number);
    const date = new Date(year, month - 1, 1);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      });
    }
  }

  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  }

  return text;
};

const formatRange = (start, end) => {
  const startText = formatMonthValue(start);
  const endText = formatMonthValue(end);

  if (startText && endText) {
    return `${startText} - ${endText}`;
  }

  if (startText) {
    return `${startText} - Present`;
  }

  if (endText) {
    return endText;
  }

  return "";
};

const getLocalStorageJson = (key) => {
  try {
    return safeParseJson(localStorage.getItem(key), {});
  } catch {
    return {};
  }
};

const setLocalStorageJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
};

const resolveProfileStorageKey = (profileData) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    "";
  const tokenPayload = parseJwtPayload(token);

  const identifier = pickFirst(
    profileData,
    ["id", "Id", "userId", "UserId", "email", "Email", "userName", "UserName"],
    pickFirst(
      tokenPayload,
      [
        "sub",
        "email",
        "name",
        "preferred_username",
        "unique_name",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
      ],
      localStorage.getItem("userId") ||
        localStorage.getItem("email") ||
        localStorage.getItem("userName") ||
        "default",
    ),
  );

  return `${SECTION_STORAGE_PREFIX}:${normalizeText(identifier)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")}`;
};

const normalizeEducationEntry = (raw) => {
  if (!raw) {
    return null;
  }

  if (typeof raw === "string") {
    const school = normalizeText(raw);
    return school
      ? {
          id: createLocalId(),
          school,
          degree: "",
          field: "",
          location: "",
          startDate: "",
          endDate: "",
          description: "",
        }
      : null;
  }

  const school = normalizeText(
    pickFirst(
      raw,
      [
        "school",
        "School",
        "institution",
        "Institution",
        "university",
        "University",
        "college",
        "College",
      ],
      "",
    ),
  );
  const degree = normalizeText(
    pickFirst(
      raw,
      ["degree", "Degree", "qualification", "Qualification", "title", "Title"],
      "",
    ),
  );
  const field = normalizeText(
    pickFirst(
      raw,
      ["field", "Field", "fieldOfStudy", "FieldOfStudy", "major", "Major"],
      "",
    ),
  );
  const location = normalizeText(pickFirst(raw, ["location", "Location"], ""));
  const startDate = normalizeText(
    pickFirst(
      raw,
      ["startDate", "StartDate", "from", "From", "beginDate", "BeginDate"],
      "",
    ),
  );
  const endDate = normalizeText(
    pickFirst(
      raw,
      ["endDate", "EndDate", "to", "To", "graduationDate", "GraduationDate"],
      "",
    ),
  );
  const description = normalizeText(
    pickFirst(
      raw,
      ["description", "Description", "details", "Details", "notes", "Notes"],
      "",
    ),
  );

  if (!school && !degree && !field && !description) {
    return null;
  }

  return {
    id: pickFirst(
      raw,
      ["id", "Id", "educationId", "EducationId"],
      createLocalId(),
    ),
    school,
    degree,
    field,
    location,
    startDate,
    endDate,
    description,
  };
};

const normalizeExperienceEntry = (raw) => {
  if (!raw) {
    return null;
  }

  if (typeof raw === "string") {
    const company = normalizeText(raw);
    return company
      ? {
          id: createLocalId(),
          company,
          title: "",
          location: "",
          startDate: "",
          endDate: "",
          description: "",
        }
      : null;
  }

  const company = normalizeText(
    pickFirst(
      raw,
      [
        "company",
        "Company",
        "organization",
        "Organization",
        "employer",
        "Employer",
      ],
      "",
    ),
  );
  const title = normalizeText(
    pickFirst(
      raw,
      ["title", "Title", "role", "Role", "position", "Position"],
      "",
    ),
  );
  const location = normalizeText(pickFirst(raw, ["location", "Location"], ""));
  const startDate = normalizeText(
    pickFirst(
      raw,
      ["startDate", "StartDate", "from", "From", "beginDate", "BeginDate"],
      "",
    ),
  );
  const endDate = normalizeText(
    pickFirst(
      raw,
      ["endDate", "EndDate", "to", "To", "leaveDate", "LeaveDate"],
      "",
    ),
  );
  const description = normalizeText(
    pickFirst(
      raw,
      [
        "description",
        "Description",
        "details",
        "Details",
        "responsibilities",
        "Responsibilities",
      ],
      "",
    ),
  );

  if (!company && !title && !description) {
    return null;
  }

  return {
    id: pickFirst(
      raw,
      [
        "id",
        "Id",
        "experienceId",
        "ExperienceId",
        "workExperienceId",
        "WorkExperienceId",
      ],
      createLocalId(),
    ),
    company,
    title,
    location,
    startDate,
    endDate,
    description,
  };
};

const normalizeProjectEntry = (raw) => {
  if (!raw) {
    return null;
  }

  if (typeof raw === "string") {
    const title = normalizeText(raw);
    return title
      ? {
          id: createLocalId(),
          title,
          description: "",
          liveUrl: "",
          repoUrl: "",
          stack: "",
        }
      : null;
  }

  const title = normalizeText(
    pickFirst(
      raw,
      ["title", "Title", "name", "Name", "projectName", "ProjectName"],
      "",
    ),
  );
  const description = normalizeText(
    pickFirst(
      raw,
      [
        "description",
        "Description",
        "summary",
        "Summary",
        "details",
        "Details",
      ],
      "",
    ),
  );
  const liveUrl = normalizeText(
    pickFirst(
      raw,
      [
        "liveUrl",
        "LiveUrl",
        "url",
        "Url",
        "link",
        "Link",
        "demoUrl",
        "DemoUrl",
      ],
      "",
    ),
  );
  const repoUrl = normalizeText(
    pickFirst(
      raw,
      [
        "repoUrl",
        "RepoUrl",
        "repositoryUrl",
        "RepositoryUrl",
        "sourceUrl",
        "SourceUrl",
        "githubUrl",
        "GitHubUrl",
      ],
      "",
    ),
  );
  const stack = normalizeText(
    pickFirst(
      raw,
      [
        "stack",
        "Stack",
        "technologies",
        "Technologies",
        "techStack",
        "TechStack",
      ],
      "",
    ),
  );

  if (!title && !description && !liveUrl && !repoUrl) {
    return null;
  }

  return {
    id: pickFirst(
      raw,
      ["id", "Id", "projectId", "ProjectId", "portfolioId", "PortfolioId"],
      createLocalId(),
    ),
    title,
    description,
    liveUrl,
    repoUrl,
    stack,
  };
};

const normalizeSkillEntry = (raw) => {
  if (!raw) {
    return null;
  }

  if (typeof raw === "string") {
    const name = normalizeText(raw);
    return name
      ? {
          id: createLocalId(),
          name,
          level: "",
        }
      : null;
  }

  const name = normalizeText(
    pickFirst(
      raw,
      [
        "name",
        "Name",
        "skill",
        "Skill",
        "skillName",
        "SkillName",
        "label",
        "Label",
      ],
      "",
    ),
  );
  const level = normalizeText(
    pickFirst(
      raw,
      ["level", "Level", "seniority", "Seniority", "tag", "Tag"],
      "",
    ),
  );

  if (!name) {
    return null;
  }

  return {
    id: pickFirst(raw, ["id", "Id", "skillId", "SkillId"], createLocalId()),
    name,
    level,
  };
};

const extractStructuredSections = (source) => ({
  education: normalizeSectionList(
    pickFirst(
      source,
      [
        "education",
        "Education",
        "educations",
        "EducationItems",
        "educationHistory",
        "EducationHistory",
        "academicHistory",
        "AcademicHistory",
      ],
      [],
    ),
    normalizeEducationEntry,
  ),
  experience: normalizeSectionList(
    pickFirst(
      source,
      [
        "experience",
        "Experience",
        "workExperience",
        "WorkExperience",
        "jobs",
        "Jobs",
        "employmentHistory",
        "EmploymentHistory",
      ],
      [],
    ),
    normalizeExperienceEntry,
  ),
  projects: normalizeSectionList(
    pickFirst(
      source,
      [
        "projects",
        "Projects",
        "portfolioItems",
        "PortfolioItems",
        "projectItems",
        "ProjectItems",
      ],
      [],
    ),
    normalizeProjectEntry,
  ),
  skills: normalizeSectionList(
    pickFirst(
      source,
      [
        "skills",
        "Skills",
        "extractedSkills",
        "ExtractedSkills",
        "matchedSkills",
        "MatchedSkills",
        "skillTags",
        "SkillTags",
      ],
      [],
    ),
    normalizeSkillEntry,
  ),
});

const mergeStructuredSections = (primary, fallback) => ({
  education: primary.education.length ? primary.education : fallback.education,
  experience: primary.experience.length
    ? primary.experience
    : fallback.experience,
  projects: primary.projects.length ? primary.projects : fallback.projects,
  skills: primary.skills.length ? primary.skills : fallback.skills,
});

const loadStructuredSections = (profileData, storageKey) => {
  const fromProfile = extractStructuredSections(profileData ?? {});
  const fromStorage = extractStructuredSections(
    getLocalStorageJson(storageKey),
  );

  return mergeStructuredSections(fromProfile, fromStorage);
};

const buildCvSummary = ({
  summaryText,
  education,
  experience,
  projects,
  skills,
}) => {
  const overviewParts = [];

  if (summaryText) {
    overviewParts.push(normalizeText(summaryText));
  }

  const metrics = [];

  if (education.length) {
    metrics.push(
      `${education.length} education item${education.length === 1 ? "" : "s"}`,
    );
  }

  if (experience.length) {
    metrics.push(
      `${experience.length} work experience${experience.length === 1 ? "" : " entries"}`,
    );
  }

  if (projects.length) {
    metrics.push(
      `${projects.length} project${projects.length === 1 ? "" : "s"}`,
    );
  }

  if (skills.length) {
    metrics.push(`${skills.length} skill${skills.length === 1 ? "" : "s"}`);
  }

  if (metrics.length) {
    overviewParts.push(`Extracted ${metrics.join(", ")}.`);
  }

  const highlights = [];

  if (experience[0]) {
    const primaryRole = experience[0].title || experience[0].company;
    highlights.push(
      primaryRole
        ? `Recent role: ${primaryRole}`
        : `Recent role: ${experience[0].company}`,
    );
  }

  if (education[0]) {
    const primaryEducation = education[0].degree || education[0].school;
    highlights.push(
      primaryEducation
        ? `Education: ${primaryEducation}`
        : `Education: ${education[0].school}`,
    );
  }

  if (projects[0]) {
    highlights.push(`Portfolio: ${projects[0].title}`);
  }

  if (skills.length) {
    const skillPreview = skills
      .slice(0, 4)
      .map((skill) =>
        skill.level ? `${skill.name} (${skill.level})` : skill.name,
      )
      .join(", ");

    highlights.push(`Skills: ${skillPreview}`);
  }

  return {
    overview: overviewParts.join(" ").trim(),
    highlights,
  };
};

const SECTION_DEFINITIONS = {
  education: {
    label: "Education",
    emptyMessage:
      "Add your education history to give recruiters context on your academic background.",
    addLabel: "Add education",
    icon: GraduationCap,
    badgeClass: "bg-[#FFF0E8] text-primary-accent",
    fields: [
      {
        name: "school",
        label: "School / University",
        type: "text",
        placeholder: "JKUAT",
        required: true,
      },
      {
        name: "degree",
        label: "Degree",
        type: "text",
        placeholder: "Bachelor of Science",
        required: true,
      },
      {
        name: "field",
        label: "Field of study",
        type: "text",
        placeholder: "Computer Science",
      },
      {
        name: "location",
        label: "Location",
        type: "text",
        placeholder: "Kiambu, Kenya",
      },
      { name: "startDate", label: "Start date", type: "month" },
      { name: "endDate", label: "End date", type: "month" },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Honors, coursework, activities, or achievements.",
      },
    ],
    createEmpty: () => ({
      school: "",
      degree: "",
      field: "",
      location: "",
      startDate: "",
      endDate: "",
      description: "",
    }),
    normalize: normalizeEducationEntry,
    isValid: (draft) =>
      normalizeText(draft.school).length > 0 &&
      normalizeText(draft.degree).length > 0,
    renderItem: (item) => (
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-poppins-semibold text-[#1a1a1a]">
              {item.degree || "Education"}
            </h4>
            <p className="text-sm font-poppins-medium text-primary-accent">
              {item.school || "Untitled school"}
            </p>
          </div>
          {(item.startDate || item.endDate) && (
            <span className="rounded-full bg-[#FFF4EE] px-3 py-1 text-[11px] font-poppins-medium text-[#A85A35]">
              {formatRange(item.startDate, item.endDate) || "In progress"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-poppins text-gray-500">
          {item.field && (
            <span className="rounded-full bg-gray-100 px-3 py-1">
              {item.field}
            </span>
          )}
          {item.location && (
            <span className="rounded-full bg-gray-100 px-3 py-1">
              {item.location}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-sm font-poppins text-gray-600 leading-relaxed whitespace-pre-line">
            {item.description}
          </p>
        )}
      </div>
    ),
  },
  experience: {
    label: "Work Experience",
    emptyMessage:
      "Show your professional history with roles, dates, and impact.",
    addLabel: "Add experience",
    icon: BriefcaseBusiness,
    badgeClass: "bg-[#FFF0E8] text-primary-accent",
    fields: [
      {
        name: "company",
        label: "Company",
        type: "text",
        placeholder: "Safaricom",
        required: true,
      },
      {
        name: "title",
        label: "Role / Title",
        type: "text",
        placeholder: "Frontend Developer",
        required: true,
      },
      {
        name: "location",
        label: "Location",
        type: "text",
        placeholder: "Remote / Nairobi",
      },
      { name: "startDate", label: "Start date", type: "month" },
      { name: "endDate", label: "End date", type: "month" },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Summarize responsibilities, scope, and results.",
      },
    ],
    createEmpty: () => ({
      company: "",
      title: "",
      location: "",
      startDate: "",
      endDate: "",
      description: "",
    }),
    normalize: normalizeExperienceEntry,
    isValid: (draft) =>
      normalizeText(draft.company).length > 0 &&
      normalizeText(draft.title).length > 0,
    renderItem: (item) => (
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-poppins-semibold text-[#1a1a1a]">
              {item.title || "Work experience"}
            </h4>
            <p className="text-sm font-poppins-medium text-primary-accent">
              {item.company || "Untitled company"}
            </p>
          </div>
          {(item.startDate || item.endDate) && (
            <span className="rounded-full bg-[#FFF4EE] px-3 py-1 text-[11px] font-poppins-medium text-[#A85A35]">
              {formatRange(item.startDate, item.endDate) || "In progress"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-poppins text-gray-500">
          {item.location && (
            <span className="rounded-full bg-gray-100 px-3 py-1">
              {item.location}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-sm font-poppins text-gray-600 leading-relaxed whitespace-pre-line">
            {item.description}
          </p>
        )}
      </div>
    ),
  },
  projects: {
    label: "Projects",
    emptyMessage:
      "Add portfolio items with descriptions and links to showcase your work.",
    addLabel: "Add project",
    icon: FolderKanban,
    badgeClass: "bg-[#EEF6FF] text-[#3466A8]",
    fields: [
      {
        name: "title",
        label: "Project title",
        type: "text",
        placeholder: "Resume Analyzer",
        required: true,
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        placeholder: "What the project does, the outcome, or your role.",
      },
      {
        name: "liveUrl",
        label: "Live URL",
        type: "url",
        placeholder: "https://yourproject.com",
      },
      {
        name: "repoUrl",
        label: "Repository URL",
        type: "url",
        placeholder: "https://github.com/you/project",
      },
      {
        name: "stack",
        label: "Tech stack",
        type: "text",
        placeholder: "React, Node.js, Tailwind",
      },
    ],
    createEmpty: () => ({
      title: "",
      description: "",
      liveUrl: "",
      repoUrl: "",
      stack: "",
    }),
    normalize: normalizeProjectEntry,
    isValid: (draft) => normalizeText(draft.title).length > 0,
    renderItem: (item) => (
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-poppins-semibold text-[#1a1a1a]">
              {item.title || "Project"}
            </h4>
            {item.stack && (
              <p className="mt-1 text-xs font-poppins-medium text-gray-500">
                {item.stack}
              </p>
            )}
          </div>
        </div>
        {item.description && (
          <p className="text-sm font-poppins text-gray-600 leading-relaxed whitespace-pre-line">
            {item.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {item.liveUrl && (
            <a
              href={item.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF6FF] px-3 py-1.5 text-xs font-poppins-medium text-[#3466A8] hover:bg-[#DCEBFF] transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              Live
            </a>
          )}
          {item.repoUrl && (
            <a
              href={item.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F4F4] px-3 py-1.5 text-xs font-poppins-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Repo
            </a>
          )}
        </div>
      </div>
    ),
  },
  skills: {
    label: "Skills",
    emptyMessage:
      "Add tags for your technical and soft skills to keep your profile scannable.",
    addLabel: "Add skill",
    icon: Sparkles,
    badgeClass: "bg-[#F6F0FF] text-[#6A4BC2]",
    fields: [
      {
        name: "name",
        label: "Skill name",
        type: "text",
        placeholder: "React",
        required: true,
      },
      {
        name: "level",
        label: "Level",
        type: "select",
        options: SKILL_LEVEL_OPTIONS,
      },
    ],
    createEmpty: () => ({ name: "", level: "" }),
    normalize: normalizeSkillEntry,
    isValid: (draft) => normalizeText(draft.name).length > 0,
    renderItem: (item) => (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-[#FFECE3] px-3 py-1.5 text-sm font-poppins-medium text-primary-accent">
          {item.name || "Skill"}
        </span>
        {item.level && (
          <span className="inline-flex items-center rounded-full bg-[#F6F0FF] px-3 py-1.5 text-xs font-poppins-semibold text-[#6A4BC2]">
            {item.level}
          </span>
        )}
      </div>
    ),
  },
};

const SectionEditorModal = ({
  definition,
  draft,
  onChange,
  onClose,
  onSave,
  saving,
}) => {
  if (!definition || !draft) {
    return null;
  }

  const Icon = definition.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${definition.badgeClass}`}
            >
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-poppins-semibold text-lg text-[#1a1a1a]">
                {draft.id
                  ? `Edit ${definition.label}`
                  : `Add ${definition.label}`}
              </h3>
              <p className="text-sm font-poppins text-gray-500">
                {definition.emptyMessage}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {definition.fields.map((field) => {
              const fieldValue = draft[field.name] ?? "";

              return (
                <div
                  key={field.name}
                  className={field.type === "textarea" ? "sm:col-span-2" : ""}
                >
                  <label className="mb-1.5 block text-xs font-poppins-medium text-gray-500">
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={fieldValue}
                      onChange={(event) =>
                        onChange(field.name, event.target.value)
                      }
                      rows={4}
                      placeholder={field.placeholder}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-poppins placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent/50 resize-none"
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={fieldValue}
                      onChange={(event) =>
                        onChange(field.name, event.target.value)
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-poppins placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent/50"
                    >
                      {field.options.map((option) => (
                        <option key={option || "empty"} value={option}>
                          {option || "Select level"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || "text"}
                      value={fieldValue}
                      onChange={(event) =>
                        onChange(field.name, event.target.value)
                      }
                      placeholder={field.placeholder}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-poppins placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent/50"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-poppins-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !definition.isValid(draft)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-5 py-2.5 text-sm font-poppins-medium text-white transition-colors hover:bg-[#B8461A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const CvProcessingModal = ({ modal, onClose }) => {
  if (!modal) {
    return null;
  }

  const steps = [
    "Reading your resume",
    "Filling in your contact details",
    "Adding your experience and education",
    "Finishing up",
  ];
  const activeStep = Math.max(0, Math.min(modal.step ?? 0, steps.length - 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="max-h-[80vh] overflow-y-auto px-8 py-9">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-linear-to-br from-primary-accent/10 via-primary-accent/20 to-primary-accent/5 shadow-[0_20px_60px_rgba(211,87,31,0.12)]">
            <FileText className="h-11 w-11 text-primary-accent" />
          </div>

          <div className="mt-6 text-center">
            <h3 className="font-poppins-semibold text-2xl text-[#1a1a1a]">
              {modal.status === "complete"
                ? "Resume processed"
                : modal.status === "error"
                  ? "Upload interrupted"
                  : "Processing your resume"}
            </h3>
            <p className="mt-2 font-poppins text-sm text-gray-500">
              {modal.fileName || "Uploading your file"}
            </p>
          </div>

          <div className="mt-7">
            <div className="h-2 overflow-hidden rounded-full bg-primary-accent/10">
              <div
                className="h-full rounded-full bg-linear-to-r from-primary-accent to-primary-accent/60 transition-all duration-300"
                style={{ width: `${modal.progress ?? 0}%` }}
              />
            </div>
            <p className="mt-3 text-center font-poppins-semibold text-primary-accent">
              {modal.progress ?? 0}% completed
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {steps.map((step, index) => {
              const isComplete =
                modal.status === "complete" || index < activeStep;
              const isCurrent =
                modal.status !== "complete" && index === activeStep;

              return (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white/60 px-4 py-3"
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-poppins-bold transition-colors ${
                      isComplete
                        ? "border-primary-accent bg-primary-accent text-white"
                        : isCurrent
                          ? "border-primary-accent bg-primary-accent/10 text-primary-accent"
                          : "border-gray-200 bg-white text-gray-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-poppins-medium text-sm text-[#1a1a1a]">
                      {step}
                    </p>
                    <p className="mt-0.5 text-xs font-poppins text-gray-500">
                      {isComplete
                        ? "Done"
                        : isCurrent
                          ? "In progress"
                          : "Waiting"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {modal.status === "complete" && modal.summary && (
            <div className="mt-8 rounded-3xl border border-primary-accent/30 bg-primary-accent/5 p-5">
              <p className="text-xs font-poppins-semibold uppercase tracking-[0.22em] text-primary-accent">
                Extracted summary
              </p>
              <p className="mt-3 font-poppins text-sm leading-relaxed text-[#3A3454]">
                {modal.summary}
              </p>
              {modal.highlights?.length > 0 && (
                <div className="mt-4 space-y-2">
                  {modal.highlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-poppins text-[#4E4668] shadow-sm"
                    >
                      {highlight}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {modal.status === "error" && modal.error && (
            <div className="mt-8 rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-poppins text-red-600">
              {modal.error}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-xl bg-primary-accent px-5 py-2.5 text-sm font-poppins-medium text-white transition-colors hover:bg-[#B8461A]"
            >
              {modal.status === "complete" ? "Close" : "Keep working"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────
const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem("token"));
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const cvFileRef = useRef(null);
  const [cvData, setCvData] = useState(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvModal, setCvModal] = useState(null);
  const [sectionEditor, setSectionEditor] = useState(null);
  const [structuredSectionsKey, setStructuredSectionsKey] = useState("");
  const [educationEntries, setEducationEntries] = useState([]);
  const [experienceEntries, setExperienceEntries] = useState([]);
  const [projectEntries, setProjectEntries] = useState([]);
  const [skillEntries, setSkillEntries] = useState([]);
  const sectionsSnapshotRef = useRef({
    education: [],
    experience: [],
    projects: [],
    skills: [],
  });

  const emptyForm = {
    Bio: "",
    Headline: "",
    Phone: "",
    Location: "",
    LinkedInURL: "",
    GitHubURL: "",
    WebsiteURL: "",
    PhotoFile: null,
  };
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState(null);
  const [employerCompany, setEmployerCompany] = useState(null);

  const isLoggedIn = !!localStorage.getItem("token");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── load profile ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getProfile();
        if (!active) return;

        const accountType = resolveAccountType(data);
        const shouldHandleCV = isEmployeeType(accountType);
        const isEmployerAccount = isEmployerType(accountType);

        if (data) {
          setProfile(data);
          setHasProfile(true);
          setForm({
            Bio: data.bio ?? data.Bio ?? "",
            Headline: data.headline ?? data.Headline ?? "",
            Phone: data.phone ?? data.phoneNumber ?? data.PhoneNumber ?? "",
            Location: data.location ?? data.Location ?? "",
            LinkedInURL: data.linkedInURL ?? data.LinkedInURL ?? "",
            GitHubURL: data.gitHubURL ?? data.GitHubURL ?? "",
            WebsiteURL: data.websiteURL ?? data.WebsiteURL ?? "",
            PhotoFile: null,
          });
          setPreview(
            resolveMediaUrl(
              data.photoUrl ?? data.PhotoUrl ?? data.photoURL ?? data.PhotoURL,
            ),
          );
        } else {
          setHasProfile(false);
        }

        if (shouldHandleCV) {
          try {
            setCvLoading(true);
            const cvResponse = await getCVData();
            if (!active) return;
            setCvData(normalizeCVData(cvResponse));
          } catch {
            if (!active) return;
            setCvData(null);
          } finally {
            if (active) {
              setCvLoading(false);
            }
          }
        } else {
          setCvData(null);
        }

        if (isEmployerAccount) {
          try {
            const company = await getMyCompany();
            if (!active) return;
            setEmployerCompany(company && company.id ? company : null);
          } catch {
            if (!active) return;
            setEmployerCompany(null);
          }
        } else {
          setEmployerCompany(null);
        }
      } catch {
        if (!active) return;
        setHasProfile(false);
        setCvData(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    // Employers do not maintain applicant career sections
    if (isEmployerType(resolveAccountType(profile)) && !isEmployeeType(resolveAccountType(profile))) {
      setEducationEntries([]);
      setExperienceEntries([]);
      setProjectEntries([]);
      setSkillEntries([]);
      sectionsSnapshotRef.current = {
        education: [],
        experience: [],
        projects: [],
        skills: [],
      };
      return;
    }

    let active = true;
    (async () => {
      const storageKey = resolveProfileStorageKey(profile);
      const mergedSections = loadStructuredSections(profile, storageKey);

      if (!active) {
        return;
      }

      setStructuredSectionsKey(storageKey);
      setEducationEntries(mergedSections.education);
      setExperienceEntries(mergedSections.experience);
      setProjectEntries(mergedSections.projects);
      setSkillEntries(mergedSections.skills);
      sectionsSnapshotRef.current = mergedSections;
    })();

    return () => {
      active = false;
    };
  }, [profile, isLoggedIn]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, PhotoFile: file }));
    setPreview(URL.createObjectURL(file));
  };
  // photo upload handler

  const buildFormData = (asJobSeeker) => {
    const fd = new FormData();
    if (form.Bio) fd.append("Bio", form.Bio);
    if (form.Headline) fd.append("Headline", form.Headline);
    if (form.Phone) fd.append("phone", form.Phone);
    if (form.Location) fd.append("Location", form.Location);
    if (form.LinkedInURL) fd.append("LinkedInURL", form.LinkedInURL);
    if (form.GitHubURL) fd.append("GitHubURL", form.GitHubURL);
    if (form.WebsiteURL) fd.append("WebsiteURL", form.WebsiteURL);
    if (form.PhotoFile) fd.append("PhotoFile", form.PhotoFile);
    // Career history only applies to applicants — employers skip empty career payload noise
    fd.append("EducationJson", JSON.stringify(asJobSeeker ? educationEntries : []));
    fd.append("ExperienceJson", JSON.stringify(asJobSeeker ? experienceEntries : []));
    fd.append("ProjectsJson", JSON.stringify(asJobSeeker ? projectEntries : []));
    fd.append("SkillsJson", JSON.stringify(asJobSeeker ? skillEntries : []));
    return fd;
  };

  const persistStructuredSections = () => {
    if (!structuredSectionsKey) {
      return;
    }

    const payload = {
      education: educationEntries,
      experience: experienceEntries,
      projects: projectEntries,
      skills: skillEntries,
    };

    setLocalStorageJson(structuredSectionsKey, payload);
    sectionsSnapshotRef.current = payload;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const asJobSeeker = isEmployeeType(resolveAccountType(profile));
      const fd = buildFormData(asJobSeeker);
      const result = hasProfile
        ? await updateProfile(fd)
        : await completeProfile(fd);
      const savedPhotoUrl = resolveMediaUrl(
        result?.photoUrl ??
          result?.PhotoUrl ??
          result?.photoURL ??
          result?.PhotoURL ??
          profile?.photoUrl ??
          profile?.PhotoUrl ??
          profile?.photoURL ??
          profile?.PhotoURL ??
          preview,
      );

      setProfile(
        result
          ? {
              ...profile,
              ...result,
              bio: form.Bio,
              Bio: form.Bio,
              headline: form.Headline,
              Headline: form.Headline,
              phone: form.Phone,
              location: form.Location,
              linkedInURL: form.LinkedInURL,
              LinkedInURL: form.LinkedInURL,
              gitHubURL: form.GitHubURL,
              GitHubURL: form.GitHubURL,
              websiteURL: form.WebsiteURL,
              WebsiteURL: form.WebsiteURL,
              photoUrl: savedPhotoUrl,
              PhotoUrl: savedPhotoUrl,
            }
          : {
              ...form,
              bio: form.Bio,
              headline: form.Headline,
              phone: form.Phone,
              location: form.Location,
              photoUrl: savedPhotoUrl,
              PhotoUrl: savedPhotoUrl,
            },
      );
      setHasProfile(true);
      setEditing(false);
      if (asJobSeeker) {
        persistStructuredSections();
      }
      showToast(hasProfile ? "Profile updated ✓" : "Profile completed ✓");
    } catch {
      showToast("Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setShowDelete(false);
    try {
      await deleteProfile();
      setProfile(null);
      setHasProfile(false);
      setForm(emptyForm);
      setPreview(null);
      setEducationEntries([]);
      setExperienceEntries([]);
      setProjectEntries([]);
      setSkillEntries([]);
      sectionsSnapshotRef.current = {
        education: [],
        experience: [],
        projects: [],
        skills: [],
      };
      if (structuredSectionsKey) {
        try {
          localStorage.removeItem(structuredSectionsKey);
        } catch {
          // ignore storage failures
        }
      }
      showToast("Profile deleted");
    } catch {
      showToast("Failed to delete profile", "error");
    }
  };

  const openSectionEditor = (sectionKey, itemIndex = null) => {
    const definition = SECTION_DEFINITIONS[sectionKey];
    const currentEntries =
      sectionKey === "education"
        ? educationEntries
        : sectionKey === "experience"
          ? experienceEntries
          : sectionKey === "projects"
            ? projectEntries
            : skillEntries;

    setSectionEditor({
      sectionKey,
      itemIndex,
      draft:
        itemIndex === null
          ? definition.createEmpty()
          : { ...currentEntries[itemIndex] },
    });
  };

  const updateSectionDraft = (name, value) => {
    setSectionEditor((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        draft: {
          ...current.draft,
          [name]: value,
        },
      };
    });
  };

  const upsertSectionEntry = () => {
    if (!sectionEditor) {
      return;
    }

    const definition = SECTION_DEFINITIONS[sectionEditor.sectionKey];
    const normalizedEntry = definition.normalize(sectionEditor.draft);

    if (!normalizedEntry || !definition.isValid(normalizedEntry)) {
      showToast(
        `Please complete the ${definition.label.toLowerCase()} fields`,
        "error",
      );
      return;
    }

    const updateEntries = (setter) => {
      setter((previous) => {
        const next = [...previous];

        if (sectionEditor.itemIndex === null) {
          next.push(normalizedEntry);
        } else {
          next[sectionEditor.itemIndex] = normalizedEntry;
        }

        return next;
      });
    };

    switch (sectionEditor.sectionKey) {
      case "education":
        updateEntries(setEducationEntries);
        break;
      case "experience":
        updateEntries(setExperienceEntries);
        break;
      case "projects":
        updateEntries(setProjectEntries);
        break;
      default:
        updateEntries(setSkillEntries);
        break;
    }

    setSectionEditor(null);
    showToast(`${definition.label} saved ✓`);
  };

  const deleteSectionEntry = (sectionKey, itemIndex) => {
    const definition = SECTION_DEFINITIONS[sectionKey];

    const removeEntry = (setter) => {
      setter((previous) => previous.filter((_, index) => index !== itemIndex));
    };

    switch (sectionKey) {
      case "education":
        removeEntry(setEducationEntries);
        break;
      case "experience":
        removeEntry(setExperienceEntries);
        break;
      case "projects":
        removeEntry(setProjectEntries);
        break;
      default:
        removeEntry(setSkillEntries);
        break;
    }

    showToast(`${definition.label} deleted`);
  };

  const cancelEditing = () => {
    setEditing(false);
    setForm({
      Bio: profile?.bio ?? profile?.Bio ?? "",
      Headline: profile?.headline ?? profile?.Headline ?? "",
      Phone: profile?.phone ?? profile?.phoneNumber ?? profile?.PhoneNumber ?? "",
      Location: profile?.location ?? profile?.Location ?? "",
      LinkedInURL: profile?.linkedInURL ?? profile?.LinkedInURL ?? "",
      GitHubURL: profile?.gitHubURL ?? profile?.GitHubURL ?? "",
      WebsiteURL: profile?.websiteURL ?? profile?.WebsiteURL ?? "",
      PhotoFile: null,
    });
    setPreview(
      resolveMediaUrl(
        profile?.photoUrl ??
          profile?.PhotoUrl ??
          profile?.photoURL ??
          profile?.PhotoURL,
      ),
    );
    setEducationEntries(sectionsSnapshotRef.current.education ?? []);
    setExperienceEntries(sectionsSnapshotRef.current.experience ?? []);
    setProjectEntries(sectionsSnapshotRef.current.projects ?? []);
    setSkillEntries(sectionsSnapshotRef.current.skills ?? []);
    setSectionEditor(null);
  };

  const handleCVUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("CV file is too large (max 10MB)", "error");
      event.target.value = "";
      return;
    }

    try {
      setCvUploading(true);
      setCvModal({
        status: "processing",
        fileName: file.name,
        progress: 18,
        step: 0,
        summary: "",
      });
      await uploadCV(file);

      setCvModal((current) => ({ ...current, progress: 56, step: 1 }));

      let latestCvData = null;

      try {
        setCvModal((current) => ({ ...current, progress: 78, step: 2 }));
        const cvResponse = await getCVData();
        latestCvData = normalizeCVData(cvResponse);
      } catch {
        latestCvData = null;
      }

      const resolvedCvData = latestCvData
        ? {
            ...latestCvData,
            fileName:
              latestCvData.fileName && latestCvData.fileName !== "Uploaded CV"
                ? latestCvData.fileName
                : file.name,
          }
        : {
            fileName: file.name,
            downloadUrl: "",
            updatedAt: new Date().toISOString(),
            summary:
              "Your resume was uploaded successfully, but no extracted summary was returned by the API yet.",
            highlights: [],
          };

      setCvData(resolvedCvData);
      setCvModal({
        status: "complete",
        fileName: resolvedCvData.fileName,
        progress: 100,
        step: 3,
        summary: resolvedCvData.summary,
        highlights: resolvedCvData.highlights,
      });
      showToast("CV uploaded ✓");
    } catch {
      setCvModal({
        status: "error",
        fileName: file.name,
        progress: 100,
        step: 0,
        summary: "",
        highlights: [],
        error: "Failed to upload CV",
      });
      showToast("Failed to upload CV", "error");
    } finally {
      setCvUploading(false);
      event.target.value = "";
    }
  };

  // ── not logged in ──────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-16 h-16 bg-[#FFECE3] rounded-2xl flex items-center justify-center">
          <User className="w-7 h-7 text-primary-accent" />
        </div>
        <h2 className="font-poppins-semibold text-[#1a1a1a] text-lg text-center">
          Sign in to view your profile
        </h2>
        <p className="font-poppins text-sm text-gray-500 text-center max-w-sm">
          You need to be logged in to access your profile page.
        </p>
        <Link
          to="/login"
          className="px-6 py-2.5 bg-primary-accent text-white rounded-xl text-sm font-poppins-medium hover:bg-[#B8461A] transition-colors"
        >
          Go to Login
        </Link>
      </main>
    );
  }

  // ── loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#FFECE3] border-t-primary-accent rounded-full animate-spin" />
          <p className="text-sm font-poppins text-gray-400">Loading profile…</p>
        </div>
      </main>
    );
  }

  // ── derived display values ─────────────────────────────────────────
  const displayBio = profile?.bio ?? profile?.Bio ?? "";
  const displayHeadline = profile?.headline ?? profile?.Headline ?? form.Headline ?? "";
  const displayPhone = profile?.phone ?? profile?.phoneNumber ?? profile?.PhoneNumber ?? form.Phone ?? "";
  const displayLocation = profile?.location ?? profile?.Location ?? form.Location ?? "";
  const displayLinkedIn = profile?.linkedInURL ?? profile?.LinkedInURL ?? "";
  const displayGitHub = profile?.gitHubURL ?? profile?.GitHubURL ?? "";
  const displayWebsite = profile?.websiteURL ?? profile?.WebsiteURL ?? "";
  const displayPhoto =
    preview ??
    resolveMediaUrl(
      profile?.photoUrl ??
        profile?.PhotoUrl ??
        profile?.photoURL ??
        profile?.PhotoURL,
    );
  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName ?? ""}`.trim()
    : (profile?.userName ?? profile?.email ?? "Your Profile");

  const accountType = resolveAccountType(profile);
  const isEmployeeAccount = isEmployeeType(accountType);
  const isEmployerAccount = isEmployerType(accountType) && !isEmployeeAccount;

  const isEditMode = editing || !hasProfile;

  const renderEntriesSection = (sectionKey, items, onEdit, onDelete) => {
    const definition = SECTION_DEFINITIONS[sectionKey];
    const Icon = definition.icon;

    return (
      <div className="bg-white border border-[#4242425C]/20 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${definition.badgeClass}`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-poppins-semibold text-gray-400 uppercase tracking-wider">
                {definition.label}
              </h2>
              <p className="text-[11px] font-poppins text-gray-500">
                {items.length} item{items.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {isEditMode && (
            <button
              onClick={() => openSectionEditor(sectionKey)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-poppins-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {definition.addLabel}
            </button>
          )}
        </div>

        {items.length ? (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id ?? `${sectionKey}-${index}`}
                className="rounded-2xl border border-gray-100 bg-[#FCFCFC] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {definition.renderItem(item, index)}
                  </div>
                  {isEditMode && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => onEdit(index)}
                        className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs font-poppins-medium text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        <PencilLine className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(index)}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-100 px-2.5 py-1.5 text-xs font-poppins-medium text-red-500 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-[#FCFCFC] p-5 text-center">
            <p className="text-sm font-poppins text-gray-400">
              {definition.emptyMessage}
            </p>
            {isEditMode && (
              <button
                onClick={() => openSectionEditor(sectionKey)}
                className="mt-2 text-xs font-poppins-medium text-primary-accent hover:underline"
              >
                {definition.addLabel} →
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="w-full min-h-screen border-b border-[#4242425C]/20 bg-[#F9F6F3]">
      {/* Hero Banner */}
      <div className="w-full h-36 bg-linear-to-r from-primary-accent via-tritary-accent to-secondary-accent relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-12">
        {/* Avatar + header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 mb-6">
          <div className="relative w-fit">
            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-[#FFECE3] flex items-center justify-center">
              {displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-primary-accent" />
              )}
            </div>
            {isEditMode && (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-primary-accent rounded-lg flex items-center justify-center shadow-sm hover:bg-[#B8461A] transition-colors"
                >
                  <Camera className="w-3 h-3 text-white" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhoto}
                />
              </>
            )}
          </div>

          {/* Action buttons (view mode) */}
          {!isEditMode && hasProfile && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-poppins-medium text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Profile
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-100 text-sm font-poppins-medium text-red-400 bg-white hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Name */}
        <h1 className="font-poppins-bold text-[22px] text-[#1a1a1a] leading-tight mb-1">
          {displayName}
        </h1>
        {isEmployerAccount ? (
          <div className="mb-1 space-y-1">
            {displayHeadline && (
              <p className="text-sm font-poppins-medium text-[#5E524C]">
                {displayHeadline}
              </p>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2EA] px-2.5 py-0.5 text-[11px] font-poppins-semibold uppercase tracking-wide text-[#C26A42]">
              <Building2 className="h-3 w-3" />
              Hiring team
            </span>
          </div>
        ) : displayHeadline ? (
          <p className="mb-1 text-sm font-poppins-medium text-[#5E524C]">
            {displayHeadline}
          </p>
        ) : null}

        {/* ── VIEW MODE ──────────────────────────────────────────────── */}
        {!isEditMode && (
          <div className="space-y-6 mt-4">
            {isEmployerAccount && (
              <div className="rounded-2xl border border-[#EFD7C9] bg-gradient-to-br from-[#FFF8F4] to-white p-5">
                <p className="text-[11px] font-poppins-semibold uppercase tracking-[0.16em] text-[#C26A42]">
                  Hiring workspace
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4A403B]">
                  This is your hiring contact profile — not a candidate CV. Manage
                  how you appear to your team and keep company hiring tools one
                  click away.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to="/employer/applications"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#7A3E1D] px-3.5 py-2 text-xs font-poppins-medium text-white transition hover:opacity-90"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Candidate screening
                  </Link>
                  <Link
                    to="/for-employers"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7D9D0] bg-white px-3.5 py-2 text-xs font-poppins-medium text-[#7A3E1D] transition hover:bg-[#FFF6F1]"
                  >
                    Grow your team
                  </Link>
                </div>
              </div>
            )}

            {isEmployerAccount && (
              <div className="rounded-2xl border border-[#4242425C]/20 bg-white p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary-accent" />
                  <h2 className="text-xs font-poppins-semibold uppercase tracking-wider text-gray-400">
                    Company
                  </h2>
                </div>
                {employerCompany ? (
                  <div className="space-y-2">
                    <p className="text-base font-poppins-semibold text-[#1a1a1a]">
                      {employerCompany.companyName || employerCompany.company_name || "Your company"}
                    </p>
                    {(employerCompany.industry || employerCompany.location) && (
                      <p className="text-sm text-gray-500">
                        {[employerCompany.industry, employerCompany.location]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {employerCompany.description && (
                      <p className="text-sm leading-6 text-gray-600">
                        {employerCompany.description}
                      </p>
                    )}
                    {employerCompany.website && (
                      <a
                        href={employerCompany.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-poppins-medium text-primary-accent hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Company website
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-[#FCFCFC] p-4 text-center">
                    <p className="text-sm font-poppins text-gray-500">
                      No company profile linked yet. Post a role or set up your
                      company from the hiring page.
                    </p>
                    <Link
                      to="/for-employers"
                      className="mt-2 inline-block text-xs font-poppins-medium text-primary-accent hover:underline"
                    >
                      Set up hiring →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Bio */}
            {displayBio ? (
              <div className="bg-white border border-[#4242425C]/20 rounded-2xl p-5">
                <h2 className="text-xs font-poppins-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {isEmployerAccount ? "About (hiring contact)" : "About"}
                </h2>
                <p className="text-sm font-poppins text-[#3a3a3a] leading-relaxed whitespace-pre-line">
                  {displayBio}
                </p>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-5 text-center">
                <p className="text-sm font-poppins text-gray-400">
                  {isEmployerAccount
                    ? "Add a short note about your role on the hiring team."
                    : "No bio added yet."}
                </p>
              </div>
            )}

            {isEmployerAccount && (displayPhone || displayLocation) && (
              <div className="bg-white border border-[#4242425C]/20 rounded-2xl p-5">
                <h2 className="text-xs font-poppins-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Contact
                </h2>
                <div className="space-y-2 text-sm text-gray-700">
                  {displayPhone && (
                    <p className="inline-flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-[#C26A42]" />
                      {displayPhone}
                    </p>
                  )}
                  {displayLocation && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-[#C26A42]" />
                      {displayLocation}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Links */}
            {(displayLinkedIn || (!isEmployerAccount && displayGitHub) || displayWebsite) && (
              <div className="bg-white border border-[#4242425C]/20 rounded-2xl p-5">
                <h2 className="text-xs font-poppins-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {isEmployerAccount ? "Professional links" : "Links"}
                </h2>
                <div className="flex flex-col gap-2">
                  <SocialLink
                    href={displayLinkedIn}
                    icon={Linkedin}
                    label="LinkedIn"
                    color="border-blue-100 text-blue-600 hover:bg-blue-50"
                  />
                  {!isEmployerAccount && (
                    <SocialLink
                      href={displayGitHub}
                      icon={Github}
                      label="GitHub"
                      color="border-gray-200 text-gray-700 hover:bg-gray-50"
                    />
                  )}
                  <SocialLink
                    href={displayWebsite}
                    icon={Globe}
                    label={isEmployerAccount ? "Company website" : "Website"}
                    color="border-[#FFECE3] text-[#D3571F] hover:bg-[#FFECE3]"
                  />
                </div>
              </div>
            )}

            {/* No links placeholder */}
            {!displayLinkedIn && !( !isEmployerAccount && displayGitHub) && !displayWebsite && (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-5 text-center">
                <p className="text-sm font-poppins text-gray-400">
                  {isEmployerAccount
                    ? "Add LinkedIn or your company site so candidates can learn more."
                    : "No links added yet."}
                </p>
                <button
                  onClick={() => setEditing(true)}
                  className="mt-2 text-xs font-poppins-medium text-primary-accent hover:underline"
                >
                  Add links →
                </button>
              </div>
            )}

            {isEmployeeAccount && (
              <div className="bg-white border border-[#4242425C]/20 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-accent" />
                    <h2 className="text-xs font-poppins-semibold text-gray-400 uppercase tracking-wider">
                      Resume / CV
                    </h2>
                  </div>
                  <button
                    onClick={() => cvFileRef.current?.click()}
                    disabled={cvUploading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-poppins-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {cvUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {cvData ? "Replace CV" : "Upload CV"}
                  </button>
                  <input
                    ref={cvFileRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleCVUpload}
                  />
                </div>

                {cvLoading ? (
                  <p className="text-sm font-poppins text-gray-400">
                    Loading CV data...
                  </p>
                ) : cvData ? (
                  <div className="rounded-xl border border-gray-100 bg-[#FCFCFC] p-3">
                    <p className="text-sm font-poppins-medium text-[#1A1A1A]">
                      {cvData.fileName || "Uploaded CV"}
                    </p>
                    {cvData.updatedAt && (
                      <p className="mt-1 text-xs font-poppins text-gray-500">
                        Updated {new Date(cvData.updatedAt).toLocaleString()}
                      </p>
                    )}
                    {cvData.summary && (
                      <div className="mt-3 rounded-xl border border-[#E6DFFA] bg-[#FBF9FF] p-3">
                        <p className="text-xs font-poppins-semibold uppercase tracking-[0.2em] text-[#6A4BC2]">
                          Extracted summary
                        </p>
                        <p className="mt-2 text-sm font-poppins text-[#3A3454] leading-relaxed">
                          {cvData.summary}
                        </p>
                        {cvData.highlights?.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {cvData.highlights.map((highlight) => (
                              <p
                                key={highlight}
                                className="text-xs font-poppins text-[#5A5272]"
                              >
                                • {highlight}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {cvData.downloadUrl && (
                      <a
                        href={cvData.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-poppins-medium text-primary-accent hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Open CV
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-poppins text-gray-500">
                    No CV uploaded yet. Add your latest resume to improve your
                    profile.
                  </p>
                )}
              </div>
            )}

            {isEmployeeAccount && (
              <>
                {renderEntriesSection(
                  "education",
                  educationEntries,
                  (index) => openSectionEditor("education", index),
                  (index) => deleteSectionEntry("education", index),
                )}
                {renderEntriesSection(
                  "experience",
                  experienceEntries,
                  (index) => openSectionEditor("experience", index),
                  (index) => deleteSectionEntry("experience", index),
                )}
                {renderEntriesSection(
                  "projects",
                  projectEntries,
                  (index) => openSectionEditor("projects", index),
                  (index) => deleteSectionEntry("projects", index),
                )}
                {renderEntriesSection(
                  "skills",
                  skillEntries,
                  (index) => openSectionEditor("skills", index),
                  (index) => deleteSectionEntry("skills", index),
                )}
              </>
            )}
          </div>
        )}

        {/* ── EDIT / CREATE MODE ─────────────────────────────────────── */}
        {isEditMode && (
          <div className="mt-4 space-y-4">
            {!hasProfile && (
              <div className="flex items-start gap-3 bg-[#FFECE3] border border-tritary-accent/30 rounded-xl px-4 py-3">
                <User className="w-4 h-4 text-primary-accent mt-0.5 shrink-0" />
                <p className="text-sm font-poppins text-[#A85A35] leading-relaxed">
                  {isEmployerAccount
                    ? "Set up your hiring contact profile — role, company links, and how candidates can reach your team."
                    : "You haven't set up your profile yet. Fill in the fields below to get started."}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-[#4242425C]/20 bg-white p-5 shadow-sm">
              <div className="mb-4 border-b border-gray-100 pb-3">
                <h2 className="text-base font-poppins-semibold text-[#1A1A1A]">
                  {isEmployerAccount ? "Hiring contact details" : "Profile Information"}
                </h2>
                <p className="mt-1 text-xs font-poppins text-gray-500">
                  {isEmployerAccount
                    ? "You work for the company — no CV, education, or job history needed here."
                    : "Keep your details clear and current so your profile looks professional."}
                </p>
              </div>

              <div className="space-y-4">
                <Field
                  label={isEmployerAccount ? "Your role at the company" : "Headline"}
                  name="Headline"
                  value={form.Headline}
                  onChange={handleChange}
                  placeholder={
                    isEmployerAccount
                      ? "e.g. Talent Acquisition Lead, HR Manager"
                      : "e.g. Full-stack engineer · Open to remote"
                  }
                  icon={isEmployerAccount ? Building2 : BriefcaseBusiness}
                />

                {isEmployerAccount && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Work phone"
                      name="Phone"
                      value={form.Phone}
                      onChange={handleChange}
                      placeholder="+254 …"
                      icon={Phone}
                    />
                    <Field
                      label="Office / city"
                      name="Location"
                      value={form.Location}
                      onChange={handleChange}
                      placeholder="Nairobi, Kenya"
                      icon={MapPin}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-poppins-medium text-gray-500 mb-1.5">
                    {isEmployerAccount ? "About you as hiring contact" : "Bio"}
                  </label>
                  <textarea
                    name="Bio"
                    value={form.Bio}
                    onChange={handleChange}
                    rows={5}
                    placeholder={
                      isEmployerAccount
                        ? "Brief intro for your hiring team profile (not a candidate CV)…"
                        : "Write a short bio about yourself…"
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-poppins placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent/50 resize-none"
                  />
                  <p className="mt-1 text-right text-[11px] font-poppins text-gray-300">
                    {form.Bio.length}/500
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-[#FCFCFC] p-4 space-y-4">
                  <h3 className="text-xs font-poppins-semibold uppercase tracking-wider text-gray-400">
                    {isEmployerAccount ? "Professional links" : "Public Links"}
                  </h3>
                  <Field
                    label="LinkedIn URL"
                    name="LinkedInURL"
                    type="url"
                    value={form.LinkedInURL}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/yourname"
                    icon={Linkedin}
                  />
                  {!isEmployerAccount && (
                    <Field
                      label="GitHub URL"
                      name="GitHubURL"
                      type="url"
                      value={form.GitHubURL}
                      onChange={handleChange}
                      placeholder="https://github.com/yourname"
                      icon={Github}
                    />
                  )}
                  <Field
                    label={isEmployerAccount ? "Company website" : "Website URL"}
                    name="WebsiteURL"
                    type="url"
                    value={form.WebsiteURL}
                    onChange={handleChange}
                    placeholder={
                      isEmployerAccount
                        ? "https://yourcompany.com"
                        : "https://yourwebsite.com"
                    }
                    icon={Globe}
                  />
                </div>

                {isEmployeeAccount && (
                  <div className="rounded-xl border border-gray-100 bg-[#FCFCFC] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-poppins-semibold uppercase tracking-wider text-gray-400">
                        Resume / CV
                      </h3>
                      <button
                        onClick={() => cvFileRef.current?.click()}
                        disabled={cvUploading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-poppins-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                      >
                        {cvUploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        {cvData ? "Replace CV" : "Upload CV"}
                      </button>
                      <input
                        ref={cvFileRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleCVUpload}
                      />
                    </div>

                    {cvLoading ? (
                      <p className="text-sm font-poppins text-gray-400">
                        Loading CV data...
                      </p>
                    ) : cvData ? (
                      <div className="rounded-xl border border-gray-100 bg-white p-3">
                        <p className="text-sm font-poppins-medium text-[#1A1A1A]">
                          {cvData.fileName || "Uploaded CV"}
                        </p>
                        {cvData.updatedAt && (
                          <p className="mt-1 text-xs font-poppins text-gray-500">
                            Updated{" "}
                            {new Date(cvData.updatedAt).toLocaleString()}
                          </p>
                        )}
                        {cvData.summary && (
                          <div className="mt-3 rounded-xl border border-[#E6DFFA] bg-[#FBF9FF] p-3">
                            <p className="text-xs font-poppins-semibold uppercase tracking-[0.2em] text-[#6A4BC2]">
                              Extracted summary
                            </p>
                            <p className="mt-2 text-sm font-poppins text-[#3A3454] leading-relaxed">
                              {cvData.summary}
                            </p>
                            {cvData.highlights?.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {cvData.highlights.map((highlight) => (
                                  <p
                                    key={highlight}
                                    className="text-xs font-poppins text-[#5A5272]"
                                  >
                                    • {highlight}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {cvData.downloadUrl && (
                          <a
                            href={cvData.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-poppins-medium text-primary-accent hover:underline"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Open CV
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-poppins text-gray-500">
                        Upload your latest resume to help employers review your
                        profile.
                      </p>
                    )}
                  </div>
                )}

                {isEmployeeAccount && (
                  <>
                    {renderEntriesSection(
                      "education",
                      educationEntries,
                      (index) => openSectionEditor("education", index),
                      (index) => deleteSectionEntry("education", index),
                    )}
                    {renderEntriesSection(
                      "experience",
                      experienceEntries,
                      (index) => openSectionEditor("experience", index),
                      (index) => deleteSectionEntry("experience", index),
                    )}
                    {renderEntriesSection(
                      "projects",
                      projectEntries,
                      (index) => openSectionEditor("projects", index),
                      (index) => deleteSectionEntry("projects", index),
                    )}
                    {renderEntriesSection(
                      "skills",
                      skillEntries,
                      (index) => openSectionEditor("skills", index),
                      (index) => deleteSectionEntry("skills", index),
                    )}
                  </>
                )}

                {isEmployerAccount && (
                  <div className="rounded-xl border border-[#EFD7C9] bg-[#FFF8F4] p-4">
                    <p className="text-xs font-poppins-semibold uppercase tracking-wide text-[#C26A42]">
                      Career history not required
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-[#5E524C]">
                      Education, work experience, projects, skills, and CV upload
                      are only for job seekers. As an employer you manage roles and
                      screen candidates instead.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-4 z-20 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
              <div className="flex items-center justify-end gap-2">
                {hasProfile && (
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-poppins-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary-accent text-white text-sm font-poppins-medium hover:bg-[#B8461A] disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving
                    ? "Saving…"
                    : hasProfile
                      ? "Save Changes"
                      : "Complete Profile"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {showDelete && (
        <DeleteModal
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}

      {/* Section editor */}
      {sectionEditor && (
        <SectionEditorModal
          definition={SECTION_DEFINITIONS[sectionEditor.sectionKey]}
          draft={sectionEditor.draft}
          onChange={updateSectionDraft}
          onClose={() => setSectionEditor(null)}
          onSave={upsertSectionEntry}
          saving={saving}
        />
      )}

      {/* CV processing modal */}
      <CvProcessingModal modal={cvModal} onClose={() => setCvModal(null)} />

      {/* Toast */}
      <Toast toast={toast} />
    </main>
  );
};

export default ProfilePage;
