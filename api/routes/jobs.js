import { Router } from "express";
import multer from "multer";
import { queryAll, queryOne, run, runAndGetId } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
const upload = multer();

const categories = [
  { id: 1, categoryName: "Software Engineering" },
  { id: 2, categoryName: "Data Science" },
  { id: 3, categoryName: "Product Management" },
  { id: 4, categoryName: "Design" },
  { id: 5, categoryName: "Marketing" },
  { id: 6, categoryName: "Sales" },
  { id: 7, categoryName: "Human Resources" },
  { id: 8, categoryName: "Finance" },
  { id: 9, categoryName: "Operations" },
  { id: 10, categoryName: "Customer Support" },
];

const skills = [
  "JavaScript", "TypeScript", "React", "Node.js", "Express", "Python", "Java", "C#", "Go",
  "SQL", "PostgreSQL", "MongoDB", "AWS", "Docker", "Kubernetes", "GraphQL", "REST API",
  "HTML", "CSS", "Tailwind", "Vue", "Angular", "Swift", "Kotlin", "Machine Learning",
  "Data Science", "TensorFlow", "PyTorch", "Excel", "PowerBI", "Project Management", "Agile",
  "Scrum", "Leadership", "Communication", "Sales", "Marketing", "SEO", "Content Writing",
  "UI/UX", "Figma", "Adobe XD",
].map((skillName, index) => ({ id: index + 1, skillName }));

function requireEmployer(req, res, next) {
  if (req.user.role !== "Employer" && req.user.role !== "Admin") {
    return res.status(403).json({ message: "Only employers can post jobs." });
  }
  next();
}

function getOrCreateEmployerCompany(userId) {
  const existing = queryOne("SELECT id FROM companies WHERE employer_id = ? ORDER BY id LIMIT 1", [userId]);
  if (existing) return existing.id;

  return runAndGetId(
    "INSERT INTO companies (company_name, description, industry, website, location, employer_id) VALUES (?, ?, ?, ?, ?, ?)",
    [
      "HORAI Labs",
      "HORAI Labs careers and recruitment portal.",
      "Technology · HR Tech",
      "https://horailabs.example",
      "Nairobi, Kenya",
      userId,
    ],
  );
}

function mapJob(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.id,
    jobId: row.id,
    companyId: row.company_id,
    employerId: row.employerId ?? row.employer_id ?? null,
    EmployerId: row.employerId ?? row.employer_id ?? null,
    companyName: row.companyName || row.CompanyName || row.Company || "Company",
    CompanyName: row.companyName || row.CompanyName || row.Company || "Company",
    title: row.title,
    Title: row.title,
    description: row.description,
    Description: row.description,
    summary: row.summary,
    Summary: row.summary,
    jobType: row.job_type,
    JobType: row.job_type,
    salaryRange: row.salary_range,
    SalaryRange: row.salary_range,
    location: row.location,
    Location: row.location,
    deadline: row.deadline,
    Deadline: row.deadline,
    categoryId: row.category,
    category: row.category,
    categoryName: categories.find((item) => String(item.id) === String(row.category))?.categoryName || row.category,
    createdAt: row.created_at,
    CreatedAt: row.created_at,
  };
}

function loadJobById(id) {
  return queryOne(
    `
    SELECT j.*, c.company_name as companyName, c.location as companyLocation,
           c.description as companyDescription, c.employer_id as employerId
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    WHERE j.id = ?
  `,
    [id],
  );
}

function canEditJob(req, jobRow) {
  if (!jobRow) return false;
  if (req.user.role === "Admin") return true;
  if (req.user.role !== "Employer") return false;
  return Number(jobRow.employerId ?? jobRow.employer_id) === Number(req.user.userId);
}

// GET /api/Job/GetAllJobs
router.get("/GetAllJobs", (req, res) => {
  const jobs = queryAll(`
    SELECT j.*, c.company_name as companyName, c.location as companyLocation, c.employer_id as employerId
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    ORDER BY j.created_at DESC
  `).map(mapJob);
  res.json({ data: jobs, items: jobs });
});

// GET /api/Job/GetJobDetails/:id
router.get("/GetJobDetails/:id", (req, res) => {
  const job = loadJobById(req.params.id);
  if (!job) return res.status(404).json({ message: "Job not found." });
  res.json({ data: mapJob(job) });
});

// POST /api/Job/CreateJob
router.post("/CreateJob", authMiddleware, requireEmployer, upload.none(), (req, res) => {
  const { CategoryId, Title, Description, Summary, JobType, SalaryRange, Location, Deadline } = req.body;

  if (!CategoryId || !Title || !Description || !JobType || !SalaryRange || !Location || !Deadline) {
    return res.status(400).json({ message: "Category, title, description, type, salary, location and deadline are required." });
  }

  const companyId = getOrCreateEmployerCompany(req.user.userId);
  const id = runAndGetId(
    `INSERT INTO jobs (company_id, title, description, summary, job_type, salary_range, location, deadline, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [companyId, Title, Description, Summary || null, JobType, SalaryRange, Location, Deadline, CategoryId]
  );
  res.json({ message: "Job created.", data: { id } });
});

// PUT /api/Job/UpdateJob/:id — employer edits their own posting (persists for all applicants)
router.put("/UpdateJob/:id", authMiddleware, requireEmployer, upload.none(), (req, res) => {
  try {
    const existing = loadJobById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Job not found." });

    if (!canEditJob(req, existing)) {
      return res.status(403).json({ message: "You can only edit job postings for your company." });
    }

    const body = req.body || {};
    const Title = body.Title ?? body.title;
    const Description = body.Description ?? body.description;
    const Summary = body.Summary ?? body.summary;
    const JobType = body.JobType ?? body.jobType;
    const SalaryRange = body.SalaryRange ?? body.salaryRange;
    const Location = body.Location ?? body.location;
    const Deadline = body.Deadline ?? body.deadline;
    const CategoryId = body.CategoryId ?? body.categoryId ?? body.category;

    if (!Title || !Description || !JobType || !SalaryRange || !Location || !Deadline || !CategoryId) {
      return res.status(400).json({
        message: "Category, title, description, type, salary, location and deadline are required.",
      });
    }

    run(
      `UPDATE jobs SET
        title = ?,
        description = ?,
        summary = ?,
        job_type = ?,
        salary_range = ?,
        location = ?,
        deadline = ?,
        category = ?
       WHERE id = ?`,
      [
        String(Title).trim(),
        String(Description).trim(),
        Summary != null && String(Summary).trim() ? String(Summary).trim() : null,
        String(JobType).trim(),
        String(SalaryRange).trim(),
        String(Location).trim(),
        String(Deadline).trim(),
        String(CategoryId).trim(),
        req.params.id,
      ],
    );

    const updated = loadJobById(req.params.id);
    res.json({
      message: "Job updated.",
      data: mapJob(updated),
    });
  } catch (err) {
    console.error("UpdateJob error:", err);
    res.status(500).json({ message: err.message || "Failed to update job." });
  }
});

// GET /api/Job/SearchSkills
router.get("/SearchSkills", (req, res) => {
  const term = String(req.query.term || "").toLowerCase();
  const filtered = term
    ? skills.filter((skill) => skill.skillName.toLowerCase().includes(term))
    : skills.slice(0, 10);
  res.json({ data: filtered, items: filtered });
});

// GET /api/Category/GetAllCategories
router.get("/GetAllCategories", (req, res) => {
  res.json({ data: categories, items: categories });
});

router.post("/AddCategory", authMiddleware, (req, res) => {
  res.status(201).json({ message: "Categories are predefined for now.", data: categories[0] });
});

router.put("/UpdateCategory/:id", authMiddleware, (req, res) => {
  res.json({ message: "Categories are predefined for now." });
});

router.delete("/DeleteCategory/:id", authMiddleware, (req, res) => {
  res.json({ message: "Categories are predefined for now." });
});

router.get("/GetAllSkills", (req, res) => {
  res.json({ data: skills, items: skills });
});

router.post("/AddSkill", authMiddleware, (req, res) => {
  const skillName = String(req.body.skillName || req.body.SkillName || "").trim();
  if (!skillName) return res.status(400).json({ message: "Skill name is required." });
  const existing = skills.find((skill) => skill.skillName.toLowerCase() === skillName.toLowerCase());
  res.status(201).json({ message: "Skill available.", data: existing || { id: skills.length + 1, skillName } });
});

router.delete("/DeleteSkill/:id", authMiddleware, (req, res) => {
  res.json({ message: "Skills are predefined for now." });
});

export default router;
