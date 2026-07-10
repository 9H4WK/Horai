import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Plus,
} from "lucide-react";
import { createJob, getAllCategories, searchJobSkills } from "../../utilities/api/jobsApi";
import { createCompany, getAllCompanies } from "../../utilities/api/companiesApi";
import { getProfile } from "../../utilities/api/profileApi";
import { addSkill, getAllSkills } from "../../utilities/api/skillsApi";

const defaultFormState = {
  categoryId: "",
  title: "",
  description: "",
  summary: "",
  jobType: "1",
  salaryRange: "",
  location: "",
  deadline: "",
  skillIds: [],
};

const defaultCompanyForm = {
  companyName: "",
  description: "",
  industry: "",
  website: "",
  logoFile: null,
};

const jobTypeOptions = [
  { value: "1", label: "Full-time" },
  { value: "2", label: "Part-time" },
  { value: "3", label: "Contract" },
  { value: "4", label: "Internship" },
  { value: "5", label: "Remote" },
];

const parseApiError = (error) => {
  const response = error?.response?.data;

  if (typeof response === "string" && response.trim()) {
    return response.trim();
  }

  if (Array.isArray(response)) {
    return response
      .map((item) => item?.description || item?.message)
      .filter(Boolean)
      .join(" ");
  }

  if (response?.errors && typeof response.errors === "object") {
    const messages = Object.values(response.errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return (
    response?.message ||
    response?.title ||
    `Could not post the job (HTTP ${error?.response?.status ?? "unknown"}). Please verify your data and try again.`
  );
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

const isEmployerType = (value) => normalizeAccountType(value).includes("employer");
const isEmployeeType = (value) => {
  const normalized = normalizeAccountType(value);

  return (
    normalized.includes("employee") ||
    normalized.includes("jobseeker") ||
    normalized.includes("candidate") ||
    normalized.includes("seeker")
  );
};

const resolveProfileObject = (response) => {
  if (!response || typeof response !== "object") {
    return null;
  }

  if (response.data && typeof response.data === "object") {
    return response.data;
  }

  if (response.result && typeof response.result === "object") {
    return response.result;
  }

  return response;
};

const validateForm = (formData) => {
  const errors = {};

  if (!formData.categoryId) {
    errors.categoryId = "Please choose a category.";
  }

  if (formData.title.trim().length < 5) {
    errors.title = "Title must be at least 5 characters.";
  }

  if (!formData.description.trim()) {
    errors.description = "Description is required.";
  }

  if (!formData.salaryRange.trim()) {
    errors.salaryRange = "Salary range is required.";
  }

  if (!formData.location.trim()) {
    errors.location = "Location is required.";
  }

  if (!formData.deadline) {
    errors.deadline = "Deadline is required.";
  }

  return errors;
};

const validateCompanyForm = (formData) => {
  const errors = {};

  if (formData.companyName.trim().length < 2) {
    errors.companyName = "Company name must be at least 2 characters.";
  }

  if (formData.website.trim()) {
    try {
      const normalizedWebsite =
        /^https?:\/\//i.test(formData.website.trim())
          ? formData.website.trim()
          : `https://${formData.website.trim()}`;

      const parsedUrl = new URL(normalizedWebsite);

      if (!parsedUrl.protocol.startsWith("http")) {
        errors.website = "Website must start with http:// or https://.";
      }
    } catch {
      errors.website = "Website must be a valid URL.";
    }
  }

  return errors;
};

const fieldClass = (hasError) =>
  `w-full rounded-xl border bg-white px-4 py-2.5 text-sm font-poppins text-[#292624] placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? "border-red-300 focus:border-red-300 focus:ring-red-200"
      : "border-gray-200 focus:border-[#D3571F]/40 focus:ring-[#D3571F]/25"
  }`;

const normalizeCompanyRecord = (company = {}) => {
  const employerId = pickFirst(company, ["employerId", "EmployerId", "ownerId", "OwnerId"], "");

  return {
    ...company,
    employerId: employerId ? String(employerId) : "",
  };
};

const ForEmployersPage = () => {
  const [activeSection, setActiveSection] = useState("job");
  const [jobFormData, setJobFormData] = useState(defaultFormState);
  const [jobFormErrors, setJobFormErrors] = useState({});
  const [companyFormData, setCompanyFormData] = useState(defaultCompanyForm);
  const [companyFormErrors, setCompanyFormErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [employerId, setEmployerId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isResolvingProfile, setIsResolvingProfile] = useState(true);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [isSubmittingSkill, setIsSubmittingSkill] = useState(false);
  const [jobApiError, setJobApiError] = useState("");
  const [jobSuccessMessage, setJobSuccessMessage] = useState("");
  const [companyApiError, setCompanyApiError] = useState("");
  const [companySuccessMessage, setCompanySuccessMessage] = useState("");
  const [skillsApiError, setSkillsApiError] = useState("");
  const [jobSkillQuery, setJobSkillQuery] = useState("");
  const [jobSkillResults, setJobSkillResults] = useState([]);
  const [isSearchingJobSkills, setIsSearchingJobSkills] = useState(false);

  const isLoggedIn = Boolean(localStorage.getItem("token"));
  const roleFromStorage = localStorage.getItem("userType") || localStorage.getItem("role") || "";
  const tokenPayload = useMemo(() => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      "";

    return parseJwtPayload(token);
  }, []);
  const normalizedResolvedRole = String(userRole || "").trim().toLowerCase();
  const normalizedStoredRole = String(roleFromStorage || "").trim().toLowerCase();
  const tokenRole = normalizeAccountType(
    pickFirst(
      tokenPayload,
      [
        "userType",
        "role",
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role",
      ],
      "",
    ),
  );
  const accountTypeSignals = [normalizedResolvedRole, normalizedStoredRole, tokenRole].filter(Boolean);
  const hasEmployerSignal = accountTypeSignals.some((value) => isEmployerType(value));
  const hasEmployeeSignal = accountTypeSignals.some((value) => isEmployeeType(value));
  const isEmployer = hasEmployerSignal && !hasEmployeeSignal;

  const loadCompanies = async (isActive = true) => {
    setIsLoadingCompanies(true);

    try {
      const result = await getAllCompanies();

      if (!isActive) {
        return;
      }

      setCompanies(Array.isArray(result) ? result.map(normalizeCompanyRecord) : []);
    } catch {
      if (!isActive) {
        return;
      }

      setCompanies([]);
    } finally {
      if (isActive) {
        setIsLoadingCompanies(false);
      }
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadCategories = async () => {
      setIsLoadingCategories(true);
      setJobApiError("");

      try {
        const result = await getAllCategories();

        if (!isActive) {
          return;
        }

        setCategories(result);
      } catch {
        if (!isActive) {
          return;
        }

        setJobApiError("Could not load categories right now. Please refresh and try again.");
      } finally {
        if (isActive) {
          setIsLoadingCategories(false);
        }
      }
    };

    const loadSkills = async () => {
      setSkillsApiError("");

      try {
        const result = await getAllSkills();

        if (!isActive) {
          return;
        }

        setSkills(result);
      } catch {
        if (!isActive) {
          return;
        }

        setSkillsApiError("Could not load skills right now.");
      }
    };

    const loadProfile = async () => {
      setIsResolvingProfile(true);

      if (!isLoggedIn) {
        setIsResolvingProfile(false);
        return;
      }

      try {
        const response = await getProfile();

        if (!isActive) {
          return;
        }

        const profile = resolveProfileObject(response);
        const id = pickFirst(profile, ["employerId", "EmployerId", "id", "Id", "userId", "UserId"], "");
        const role = pickFirst(profile, ["userType", "UserType", "role", "Role", "accountType", "AccountType", "userRole", "UserRole", "type", "Type"], "");

        setEmployerId(id ? String(id) : "");
        setUserRole(role ? String(role) : "");
      } catch {
        if (!isActive) {
          return;
        }

        setEmployerId("");
      } finally {
        if (isActive) {
          setIsResolvingProfile(false);
        }
      }
    };

    loadCategories();
    loadSkills();
    loadCompanies(isActive);
    loadProfile();

    return () => {
      isActive = false;
    };
  }, [isLoggedIn]);

  const minDeadline = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  }, []);

  const selectedJobSkills = useMemo(() => {
    const byId = new Map();

    for (const skill of skills) {
      if (skill?.id) {
        byId.set(String(skill.id), skill);
      }
    }

    for (const skill of jobSkillResults) {
      if (skill?.id) {
        byId.set(String(skill.id), skill);
      }
    }

    return jobFormData.skillIds
      .map((id) => {
        const normalizedId = String(id);
        return byId.get(normalizedId) || { id: normalizedId, skillName: "Selected skill" };
      })
      .filter(Boolean);
  }, [jobFormData.skillIds, skills, jobSkillResults]);

  const currentCompany = useMemo(() => {
    if (!employerId) {
      return null;
    }

    const normalizedEmployerId = String(employerId).trim();

    return companies.find((company) => {
      const companyEmployerId = pickFirst(company, ["employerId", "EmployerId", "ownerId", "OwnerId"], "");
      return String(companyEmployerId || "").trim() === normalizedEmployerId;
    }) || null;
  }, [companies, employerId]);

  const companyTabLabel = currentCompany ? "My Company" : "Create Company";

  useEffect(() => {
    let isActive = true;
    const term = jobSkillQuery.trim();

    if (!term) {
      setJobSkillResults([]);
      setIsSearchingJobSkills(false);
      return () => {
        isActive = false;
      };
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSearchingJobSkills(true);

      try {
        const result = await searchJobSkills(term);

        if (!isActive) {
          return;
        }

        const selectedIds = new Set(jobFormData.skillIds.map((id) => String(id)));
        const deduped = [];
        const seen = new Set();

        for (const item of result) {
          const id = item.id ? String(item.id) : "";
          const name = String(item.skillName || "").trim();
          const dedupeKey = id || name.toLowerCase();

          if (!name || !dedupeKey || seen.has(dedupeKey) || (id && selectedIds.has(id))) {
            continue;
          }

          seen.add(dedupeKey);
          deduped.push(item);
        }

        setJobSkillResults(deduped);
      } catch {
        if (!isActive) {
          return;
        }

        setJobSkillResults([]);
      } finally {
        if (isActive) {
          setIsSearchingJobSkills(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [jobSkillQuery, jobFormData.skillIds]);

  const handleJobFieldChange = (field, value) => {
    setJobFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (jobFormErrors[field]) {
      setJobFormErrors((previous) => ({
        ...previous,
        [field]: "",
      }));
    }

    if (jobSuccessMessage) {
      setJobSuccessMessage("");
    }

    if (jobApiError) {
      setJobApiError("");
    }
  };

  const handleCompanyFieldChange = (field, value) => {
    setCompanyFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (companyFormErrors[field]) {
      setCompanyFormErrors((previous) => ({
        ...previous,
        [field]: "",
      }));
    }

    if (companySuccessMessage) {
      setCompanySuccessMessage("");
    }

    if (companyApiError) {
      setCompanyApiError("");
    }
  };

  const handleSelectJobSkill = (skill) => {
    const id = skill?.id ? String(skill.id) : "";

    if (!id) {
      return;
    }

    setJobFormData((previous) => {
      const exists = previous.skillIds.some((item) => String(item) === id);

      if (exists) {
        return previous;
      }

      return {
        ...previous,
        skillIds: [...previous.skillIds, id],
      };
    });

    setJobSkillQuery("");
    setJobSkillResults([]);
  };

  const handleRemoveJobSkill = (skillId) => {
    const normalizedId = String(skillId);

    setJobFormData((previous) => ({
      ...previous,
      skillIds: previous.skillIds.filter((id) => String(id) !== normalizedId),
    }));
  };

  const handleAddSkillFromJobQuery = async () => {
    const requestedSkill = jobSkillQuery.trim();

    if (!requestedSkill) {
      return;
    }

    if (!isEmployer) {
      setSkillsApiError("Only Employer accounts can add skills while posting a job.");
      return;
    }

    const normalizedRequestedSkill = requestedSkill.toLowerCase();
    const existingSkill = skills.find(
      (skill) => String(skill?.skillName || "").trim().toLowerCase() === normalizedRequestedSkill,
    );

    if (existingSkill?.id) {
      handleSelectJobSkill(existingSkill);
      setSkillsApiError("");
      return;
    }

    setIsSubmittingSkill(true);
    setSkillsApiError("");

    try {
      await addSkill(requestedSkill);
      const updatedSkills = await getAllSkills();
      setSkills(updatedSkills);

      const createdSkill = updatedSkills.find(
        (skill) => String(skill?.skillName || "").trim().toLowerCase() === normalizedRequestedSkill,
      );

      if (createdSkill?.id) {
        handleSelectJobSkill(createdSkill);
      } else {
        setSkillsApiError("Skill added, but it could not be auto-selected. Search again to attach it.");
      }
    } catch (error) {
      setSkillsApiError(parseApiError(error));
    } finally {
      setIsSubmittingSkill(false);
    }
  };

  const handleJobSubmit = async (event) => {
    event.preventDefault();

    if (!isEmployer) {
      setJobApiError("Only Employer accounts can post jobs.");
      return;
    }

    const errors = validateForm(jobFormData);
    if (Object.keys(errors).length > 0) {
      setJobFormErrors(errors);
      return;
    }

    setJobFormErrors({});
    setIsSubmittingJob(true);
    setJobApiError("");
    setJobSuccessMessage("");

    try {
      await createJob({
        categoryId: jobFormData.categoryId,
        title: jobFormData.title.trim(),
        description: jobFormData.description.trim(),
        summary: jobFormData.summary.trim(),
        jobType: Number(jobFormData.jobType),
        salaryRange: jobFormData.salaryRange.trim(),
        location: jobFormData.location.trim(),
        deadline: jobFormData.deadline,
        skillIds: jobFormData.skillIds,
      });

      setJobFormData(defaultFormState);
      setJobSkillQuery("");
      setJobSkillResults([]);
      setJobSuccessMessage("Job posted successfully. It is now pending admin approval.");
    } catch (error) {
      setJobApiError(parseApiError(error));
    } finally {
      setIsSubmittingJob(false);
    }
  };

  const handleCompanySubmit = async (event) => {
    event.preventDefault();

    if (currentCompany) {
      setCompanyApiError("You already have a company on file. Use the My Company section to review it.");
      return;
    }

    if (!isEmployer) {
      setCompanyApiError("Only Employer accounts can create companies.");
      return;
    }

    if (!employerId) {
      setCompanyApiError("Could not resolve your EmployerId. Please complete your profile and try again.");
      return;
    }

    const errors = validateCompanyForm(companyFormData);
    if (Object.keys(errors).length > 0) {
      setCompanyFormErrors(errors);
      return;
    }

    setCompanyFormErrors({});
    setIsSubmittingCompany(true);
    setCompanyApiError("");
    setCompanySuccessMessage("");

    try {
      await createCompany({
        employerId,
        companyName: companyFormData.companyName,
        description: companyFormData.description,
        industry: companyFormData.industry,
        website: companyFormData.website.trim()
          ? (/^https?:\/\//i.test(companyFormData.website.trim())
              ? companyFormData.website.trim()
              : `https://${companyFormData.website.trim()}`)
          : "",
        logoFile: companyFormData.logoFile,
      });

      setCompanyFormData(defaultCompanyForm);
      setCompanySuccessMessage("Company submitted successfully. It is now pending admin approval.");
    } catch (error) {
      setCompanyApiError(parseApiError(error));
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <main className="w-full border-b border-[#4242425C]/20">
        <section className="mx-auto flex min-h-[55vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <div className="rounded-2xl bg-[#FFECE3] p-3">
            <BriefcaseBusiness className="h-8 w-8 text-primary-accent" />
          </div>
          <h1 className="font-poppins-bold text-2xl text-[#1A1A1A]">Employer Portal</h1>
          <p className="max-w-md text-sm font-poppins text-[#4A4A4A]">
            Sign in with an Employer account to create a company, manage skills, and post jobs.
          </p>
          <Link
            to="/login"
            className="rounded-xl bg-primary-accent px-5 py-2.5 text-sm font-poppins-medium text-white hover:bg-secondary-accent"
          >
            Go to Login
          </Link>
        </section>
      </main>
    );
  }

  if (isResolvingProfile) {
    return (
      <main className="w-full border-b border-[#4242425C]/20">
        <section className="mx-auto flex min-h-[55vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <div className="rounded-2xl bg-[#FFECE3] p-3">
            <BriefcaseBusiness className="h-8 w-8 text-primary-accent" />
          </div>
          <h1 className="font-poppins-bold text-2xl text-[#1A1A1A]">Employer Portal</h1>
          <p className="max-w-md text-sm font-poppins text-[#4A4A4A]">
            Checking your account type before opening employer tools.
          </p>
        </section>
      </main>
    );
  }

  if (!isEmployer) {
    return (
      <main className="w-full border-b border-[#4242425C]/20">
        <section className="mx-auto flex min-h-[55vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <div className="rounded-2xl bg-[#FFECE3] p-3">
            <BriefcaseBusiness className="h-8 w-8 text-primary-accent" />
          </div>
          <h1 className="font-poppins-bold text-2xl text-[#1A1A1A]">Employer access only</h1>
          <p className="max-w-md text-sm font-poppins text-[#4A4A4A]">
            Employee accounts can&apos;t use this area. If you need to post jobs or create a company, switch to an employer account first.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/jobs"
              className="rounded-xl bg-primary-accent px-5 py-2.5 text-sm font-poppins-medium text-white hover:bg-secondary-accent"
            >
              Browse Jobs
            </Link>
            <Link
              to="/profile"
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-poppins-medium text-gray-600 hover:bg-gray-50"
            >
              View Profile
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="w-full border-b border-[#4242425C]/20">
      <section className="w-full border-b border-[#4242425C]/20 bg-[#FFECE3] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#D3571F]/20 bg-white/70 px-3 py-1">
            <BriefcaseBusiness className="h-4 w-4 text-[#D3571F]" />
            <span className="text-xs font-poppins-medium text-[#D3571F]">Employer View</span>
          </div>
          <h1 className="font-poppins-bold text-[28px] leading-tight text-[#1A1A1A] md:text-[34px]">
            Employer Workspace
          </h1>
          <p className="max-w-2xl text-sm font-poppins text-[#4A4A4A] md:text-[15px]">
            Create your company, manage skill tags, and post jobs that go through admin approval.
          </p>
          {!isEmployer && !isResolvingProfile && (
            <p className="rounded-xl border border-[#F4D5C7] bg-white/80 px-4 py-2 text-sm font-poppins text-[#A85A35]">
              This page is view-only for employee accounts. Posting jobs and creating companies are disabled unless your account is marked as an employer.
            </p>
          )}
          {isResolvingProfile ? (
            <p className="text-xs font-poppins text-[#7A7A7A]">Resolving employer profile...</p>
          ) : (
            <p className="text-xs font-poppins text-[#7A7A7A]">
              Employer ID: {employerId || "Not found"} • Role: {userRole || roleFromStorage || "Unknown"}
            </p>
          )}
          {!isEmployer && !isResolvingProfile && (
            <p className="rounded-lg border border-[#F4D5C7] bg-[#FFF6F2] px-3 py-2 text-xs font-poppins text-[#A85A35]">
              This area is intended for Employer accounts. Some actions are disabled until you sign in as Employer.
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-[#4242425C]/20 bg-white p-2 shadow-sm lg:col-span-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { id: "job", label: "Post Job", icon: BriefcaseBusiness },
              { id: "company", label: companyTabLabel, icon: Building2 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-poppins-medium transition-colors ${
                    activeSection === item.id
                      ? "bg-[#FFECE3] text-[#D3571F]"
                      : "text-[#5D5D5D] hover:bg-[#FFF6F2]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeSection === "job" && (
          <form
            onSubmit={handleJobSubmit}
            className="rounded-2xl border border-[#4242425C]/20 bg-white p-5 shadow-sm md:p-7 lg:col-start-1"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Category</span>
                <select
                  value={jobFormData.categoryId}
                  onChange={(event) => handleJobFieldChange("categoryId", event.target.value)}
                  disabled={isLoadingCategories}
                  className={fieldClass(Boolean(jobFormErrors.categoryId))}
                >
                  <option value="">{isLoadingCategories ? "Loading categories..." : "Choose a category"}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.categoryName}
                    </option>
                  ))}
                </select>
                {jobFormErrors.categoryId && (
                  <p className="mt-1 text-xs font-poppins text-red-500">{jobFormErrors.categoryId}</p>
                )}
              </label>

              <label className="md:col-span-2">
                <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Job title</span>
                <input
                  type="text"
                  value={jobFormData.title}
                  onChange={(event) => handleJobFieldChange("title", event.target.value)}
                  placeholder="Senior Frontend Engineer"
                  className={fieldClass(Boolean(jobFormErrors.title))}
                />
                {jobFormErrors.title && (
                  <p className="mt-1 text-xs font-poppins text-red-500">{jobFormErrors.title}</p>
                )}
              </label>

              <div className="md:col-span-2">
                <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Required skills (optional)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={jobSkillQuery}
                    onChange={(event) => {
                      setJobSkillQuery(event.target.value);

                      if (skillsApiError) {
                        setSkillsApiError("");
                      }
                    }}
                    placeholder="Search skills like React, JavaScript, Figma"
                    className={fieldClass(false)}
                  />
                  <button
                    type="button"
                    onClick={handleAddSkillFromJobQuery}
                    disabled={isSubmittingSkill || !jobSkillQuery.trim() || !isEmployer}
                    className="inline-flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl border border-primary-accent/25 bg-[#FFF6F2] text-primary-accent transition-colors hover:bg-[#FFECE3] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Add skill"
                    title="Add skill from your search term"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-2 text-xs font-poppins text-[#7A7A7A]">
                  Can't find a skill? Type it and click + to add it, then we will attach it to this job.
                </p>

                {skillsApiError && (
                  <p className="mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-poppins text-red-700">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    {skillsApiError}
                  </p>
                )}

                {jobSkillQuery.trim() && (
                  <div className="mt-2 max-h-44 overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                    {isSearchingJobSkills ? (
                      <p className="px-3 py-2 text-sm font-poppins text-[#7A7A7A]">Searching skills...</p>
                    ) : jobSkillResults.length === 0 ? (
                      <p className="px-3 py-2 text-sm font-poppins text-[#7A7A7A]">No matching skills found.</p>
                    ) : (
                      jobSkillResults.map((skill, index) => (
                        <button
                          key={skill.id ?? `${skill.skillName}-${index}`}
                          type="button"
                          onClick={() => handleSelectJobSkill(skill)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-poppins text-[#1A1A1A] transition-colors hover:bg-[#FFF6F2]"
                        >
                          <span>{skill.skillName}</span>
                          <span className="text-xs font-poppins-medium text-primary-accent">Add</span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {selectedJobSkills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedJobSkills.map((skill) => (
                      <span
                        key={skill.id}
                        className="inline-flex items-center gap-2 rounded-full border border-primary-accent/25 bg-[#FFF6F2] px-3 py-1 text-xs font-poppins-medium text-[#A04416]"
                      >
                        {skill.skillName}
                        <button
                          type="button"
                          onClick={() => handleRemoveJobSkill(skill.id)}
                          className="text-primary-accent transition-colors hover:text-[#B8461A]"
                          aria-label={`Remove ${skill.skillName}`}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <label>
                <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Job type</span>
                <select
                  value={jobFormData.jobType}
                  onChange={(event) => handleJobFieldChange("jobType", event.target.value)}
                  className={fieldClass(false)}
                >
                  {jobTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Application deadline</span>
                <input
                  type="date"
                  min={minDeadline}
                  value={jobFormData.deadline}
                  onChange={(event) => handleJobFieldChange("deadline", event.target.value)}
                  className={fieldClass(Boolean(jobFormErrors.deadline))}
                />
                {jobFormErrors.deadline && (
                  <p className="mt-1 text-xs font-poppins text-red-500">{jobFormErrors.deadline}</p>
                )}
              </label>

              <label>
                <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Location</span>
                <input
                  type="text"
                  value={jobFormData.location}
                  onChange={(event) => handleJobFieldChange("location", event.target.value)}
                  placeholder="Nairobi, Kenya"
                  className={fieldClass(Boolean(jobFormErrors.location))}
                />
                {jobFormErrors.location && (
                  <p className="mt-1 text-xs font-poppins text-red-500">{jobFormErrors.location}</p>
                )}
              </label>

              <label>
                <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Salary range</span>
                <input
                  type="text"
                  value={jobFormData.salaryRange}
                  onChange={(event) => handleJobFieldChange("salaryRange", event.target.value)}
                  placeholder="$2,000 - $3,000"
                  className={fieldClass(Boolean(jobFormErrors.salaryRange))}
                />
                {jobFormErrors.salaryRange && (
                  <p className="mt-1 text-xs font-poppins text-red-500">{jobFormErrors.salaryRange}</p>
                )}
              </label>

              <label className="md:col-span-2">
                <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Short summary (optional)</span>
                <textarea
                  rows={3}
                  value={jobFormData.summary}
                  onChange={(event) => handleJobFieldChange("summary", event.target.value)}
                  placeholder="A short summary shown in previews"
                  className={fieldClass(false)}
                />
              </label>

              <label className="md:col-span-2">
                <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Description</span>
                <textarea
                  rows={6}
                  value={jobFormData.description}
                  onChange={(event) => handleJobFieldChange("description", event.target.value)}
                  placeholder="Describe responsibilities, requirements, and benefits"
                  className={fieldClass(Boolean(jobFormErrors.description))}
                />
                {jobFormErrors.description && (
                  <p className="mt-1 text-xs font-poppins text-red-500">{jobFormErrors.description}</p>
                )}
              </label>
            </div>

            {(jobApiError || jobSuccessMessage) && (
              <div className="mt-5">
                {jobApiError && (
                  <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-poppins text-red-700">
                    <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    {jobApiError}
                  </p>
                )}
                {jobSuccessMessage && (
                  <p className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-poppins text-green-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    {jobSuccessMessage}
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmittingJob || isLoadingCategories || categories.length === 0 || !isEmployer}
                className="rounded-xl bg-[#D3571F] px-5 py-2.5 text-sm font-poppins-medium text-white transition-colors hover:bg-[#B8461A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingJob ? "Posting job..." : "Post Job"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setJobFormData(defaultFormState);
                  setJobSkillQuery("");
                  setJobSkillResults([]);
                  setJobFormErrors({});
                  setJobApiError("");
                  setJobSuccessMessage("");
                }}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-poppins-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </form>
        )}

        {activeSection === "company" && (
          <>
          {isEmployer && currentCompany ? (
            <div className="rounded-2xl border border-[#4242425C]/20 bg-white p-5 shadow-sm md:p-7 lg:col-start-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#D3571F]/20 bg-[#FFF6F2] px-3 py-1 text-xs font-poppins-medium text-primary-accent">
                    <Building2 className="h-3.5 w-3.5" />
                    My Company
                  </div>
                  <h2 className="mt-3 text-2xl font-poppins-bold text-[#1A1A1A]">
                    {currentCompany.companyName ?? "Your Company"}
                  </h2>
                  <p className="mt-1 text-sm font-poppins text-[#4A4A4A]">
                    Your company profile has already been created.
                  </p>
                </div>
                {currentCompany.logoUrl ? (
                  <img
                    src={currentCompany.logoUrl}
                    alt={currentCompany.companyName ?? "Company logo"}
                    className="h-14 w-14 rounded-2xl object-cover border border-gray-100"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFECE3] text-lg font-poppins-bold text-primary-accent">
                    {(currentCompany.companyName ?? "CO").slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {isLoadingCompanies ? (
                <p className="mt-5 text-sm font-poppins text-[#7A7A7A]">Loading company details...</p>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-[#4242425C]/20 bg-[#FAFAFA] p-4">
                    <p className="text-xs font-poppins-medium text-[#7A7A7A]">Industry</p>
                    <p className="mt-1 text-sm font-poppins-medium text-[#1A1A1A]">{currentCompany.industry ?? "—"}</p>
                  </div>
                  <div className="rounded-xl border border-[#4242425C]/20 bg-[#FAFAFA] p-4">
                    <p className="text-xs font-poppins-medium text-[#7A7A7A]">Website</p>
                    {currentCompany.website ? (
                      <a
                        href={currentCompany.website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate text-sm font-poppins-medium text-primary-accent hover:underline"
                      >
                        {currentCompany.website}
                      </a>
                    ) : (
                      <p className="mt-1 text-sm font-poppins-medium text-[#1A1A1A]">—</p>
                    )}
                  </div>
                  <div className="md:col-span-2 rounded-xl border border-[#4242425C]/20 bg-[#FAFAFA] p-4">
                    <p className="text-xs font-poppins-medium text-[#7A7A7A]">Description</p>
                    <p className="mt-1 text-sm font-poppins text-[#1A1A1A]">
                      {currentCompany.description || "No description provided yet."}
                    </p>
                  </div>
                </div>
              )}

              {(companyApiError || companySuccessMessage) && (
                <div className="mt-5">
                  {companyApiError && (
                    <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-poppins text-red-700">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      {companyApiError}
                    </p>
                  )}
                  {companySuccessMessage && (
                    <p className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-poppins text-green-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      {companySuccessMessage}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSection("job")}
                  className="rounded-xl bg-[#D3571F] px-5 py-2.5 text-sm font-poppins-medium text-white transition-colors hover:bg-[#B8461A]"
                >
                  Back to Jobs
                </button>
                <button
                  type="button"
                  onClick={() => loadCompanies()}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-poppins-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Refresh
                </button>
              </div>
            </div>
          ) : isEmployer ? (
            <form
              onSubmit={handleCompanySubmit}
              className="rounded-2xl border border-[#4242425C]/20 bg-white p-5 shadow-sm md:p-7 lg:col-start-1"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Company name</span>
                  <input
                    type="text"
                    value={companyFormData.companyName}
                    onChange={(event) => handleCompanyFieldChange("companyName", event.target.value)}
                    placeholder="Horai Labs"
                    className={fieldClass(Boolean(companyFormErrors.companyName))}
                  />
                  {companyFormErrors.companyName && (
                    <p className="mt-1 text-xs font-poppins text-red-500">{companyFormErrors.companyName}</p>
                  )}
                </label>

                <label>
                  <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Industry</span>
                  <input
                    type="text"
                    value={companyFormData.industry}
                    onChange={(event) => handleCompanyFieldChange("industry", event.target.value)}
                    placeholder="Technology"
                    className={fieldClass(false)}
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Website</span>
                  <input
                    type="url"
                    value={companyFormData.website}
                    onChange={(event) => handleCompanyFieldChange("website", event.target.value)}
                    placeholder="https://example.com"
                    className={fieldClass(Boolean(companyFormErrors.website))}
                  />
                  {companyFormErrors.website && (
                    <p className="mt-1 text-xs font-poppins text-red-500">{companyFormErrors.website}</p>
                  )}
                </label>

                <label className="md:col-span-2">
                  <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Description</span>
                  <textarea
                    rows={5}
                    value={companyFormData.description}
                    onChange={(event) => handleCompanyFieldChange("description", event.target.value)}
                    placeholder="Tell candidates what your company does"
                    className={fieldClass(false)}
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="mb-1.5 block text-sm font-poppins-medium text-[#1A1A1A]">Company logo (optional)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleCompanyFieldChange("logoFile", event.target.files?.[0] ?? null)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-poppins text-[#292624] file:mr-3 file:rounded-lg file:border-0 file:bg-[#FFECE3] file:px-3 file:py-1 file:text-xs file:font-poppins-medium file:text-[#D3571F]"
                  />
                </label>
              </div>

              {(companyApiError || companySuccessMessage) && (
                <div className="mt-5">
                  {companyApiError && (
                    <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-poppins text-red-700">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      {companyApiError}
                    </p>
                  )}
                  {companySuccessMessage && (
                    <p className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-poppins text-green-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      {companySuccessMessage}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmittingCompany || !isEmployer || !employerId}
                  className="rounded-xl bg-[#D3571F] px-5 py-2.5 text-sm font-poppins-medium text-white transition-colors hover:bg-[#B8461A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmittingCompany ? "Submitting company..." : "Create Company"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompanyFormData(defaultCompanyForm);
                    setCompanyFormErrors({});
                    setCompanyApiError("");
                    setCompanySuccessMessage("");
                  }}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-poppins-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-[#4242425C]/20 bg-white p-5 shadow-sm md:p-7 lg:col-start-1">
              <div className="rounded-2xl border border-[#F4D5C7] bg-[#FFF6F2] p-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-accent/20 bg-white px-3 py-1 text-xs font-poppins-medium text-primary-accent">
                  <Building2 className="h-3.5 w-3.5" />
                  Company management disabled
                </div>
                <p className="mt-3 text-sm font-poppins text-[#4A4A4A]">
                  Employee accounts can view company information here, but only employer accounts can create or manage companies.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to="/profile"
                    className="rounded-xl bg-primary-accent px-5 py-2.5 text-sm font-poppins-medium text-white hover:bg-secondary-accent"
                  >
                    Check Profile
                  </Link>
                  <Link
                    to="/jobs"
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-poppins-medium text-gray-600 hover:bg-gray-50"
                  >
                    Browse Jobs
                  </Link>
                </div>
              </div>
            </div>
          )}
          </>
        )}

        <aside className="space-y-4 lg:col-start-2 lg:row-start-2">
          <div className="rounded-2xl border border-[#4242425C]/20 bg-white p-5 shadow-sm">
            <h2 className="text-base font-poppins-semibold text-[#1A1A1A]">Before You Submit</h2>
            <ul className="mt-3 space-y-2 text-sm font-poppins text-[#4A4A4A]">
              <li className="rounded-lg bg-[#FFF6F2] px-3 py-2">Use a clear title and include role level.</li>
              <li className="rounded-lg bg-[#FFF6F2] px-3 py-2">Be specific with requirements and responsibilities.</li>
              <li className="rounded-lg bg-[#FFF6F2] px-3 py-2">Set a realistic deadline to receive better applicants.</li>
              <li className="rounded-lg bg-[#FFF6F2] px-3 py-2">Review company information first to strengthen employer credibility.</li>
            </ul>
          </div>

          {/* <div className="rounded-2xl border border-[#D3571F]/20 bg-[#FFECE3] p-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[#D3571F]" />
              <h3 className="text-sm font-poppins-semibold text-[#1A1A1A]">Approval Workflow</h3>
            </div>
            <p className="mt-2 text-sm font-poppins text-[#4A4A4A]">
              Your posted job is reviewed by admins first. Once approved, it appears publicly in the jobs list.
            </p>
          </div> */}
        </aside>
      </section>
    </main>
  );
};

export default ForEmployersPage;
