import { Router } from "express";
import bcrypt from "bcryptjs";
import { queryAll, queryOne, run, runAndGetId } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

function requireAdmin(req, res, next) {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}

router.use(authMiddleware, requireAdmin);

function mapUser(user) {
  return {
    ...user,
    userId: user.id,
    userName: user.user_name || user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    userType: user.role,
    createdAt: user.created_at,
  };
}

function mapCompany(company) {
  return {
    ...company,
    companyId: company.id,
    companyName: company.company_name,
    employerId: company.employer_id,
    averageRating: company.average_rating,
    reviewCount: company.review_count,
    createdAt: company.created_at,
  };
}

function mapJob(job) {
  return {
    ...job,
    jobId: job.id,
    companyId: job.company_id,
    companyName: job.company_name,
    jobType: job.job_type,
    salaryRange: job.salary_range,
    createdAt: job.created_at,
  };
}

router.get("/GetAllUsers", (_req, res) => {
  const users = queryAll("SELECT id, email, role, user_name, first_name, last_name, phone, created_at FROM users ORDER BY created_at DESC").map(mapUser);
  res.json({ data: users, items: users });
});

router.get("/GetAllEmployer", (_req, res) => {
  const users = queryAll("SELECT id, email, role, user_name, first_name, last_name, phone, created_at FROM users WHERE role = 'Employer' ORDER BY created_at DESC").map(mapUser);
  res.json({ data: users, items: users });
});

router.get("/GetAllJobSeekers", (_req, res) => {
  const users = queryAll("SELECT id, email, role, user_name, first_name, last_name, phone, created_at FROM users WHERE role = 'JobSeeker' ORDER BY created_at DESC").map(mapUser);
  res.json({ data: users, items: users });
});

router.put("/LockUnLockUser/:id", (req, res) => {
  res.json({ message: `User ${req.params.id} lock state unchanged in local MVP.` });
});

router.post("/RegisterAdmin", async (req, res) => {
  const { email, password, confirmPassword, firstName, lastName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  const existing = queryOne("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
  if (existing) {
    return res.status(400).json({ message: "Email already registered." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = runAndGetId(
    "INSERT INTO users (email, password_hash, role, user_name, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)",
    [email.toLowerCase(), passwordHash, "Admin", email, firstName || null, lastName || null]
  );

  res.status(201).json({ message: "Admin registered.", data: { id } });
});

router.get("/GetAllCompaniesArePending", (_req, res) => {
  const companies = queryAll("SELECT * FROM companies ORDER BY created_at DESC").map(mapCompany);
  res.json({ data: companies, items: companies });
});

router.get("/GetCompanyByIdIsPending/:id", (req, res) => {
  const company = queryOne("SELECT * FROM companies WHERE id = ?", [req.params.id]);
  if (!company) return res.status(404).json({ message: "Company not found." });
  res.json({ data: mapCompany(company) });
});

router.post("/ApperoveCompany/:id", (req, res) => {
  res.json({ message: `Company ${req.params.id} approved.` });
});

router.post("/RejectCompany/:id", (req, res) => {
  res.json({ message: `Company ${req.params.id} rejected.`, reason: req.query.reason || "" });
});

router.get("/GetAllJobsArePending", (_req, res) => {
  const jobs = queryAll(`
    SELECT j.*, c.company_name
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    ORDER BY j.created_at DESC
  `).map(mapJob);
  res.json({ data: jobs, items: jobs });
});

router.get("/GetJobDetailsIsPending/:id", (req, res) => {
  const job = queryOne(`
    SELECT j.*, c.company_name
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    WHERE j.id = ?
  `, [req.params.id]);
  if (!job) return res.status(404).json({ message: "Job not found." });
  res.json({ data: mapJob(job) });
});

router.post("/ApproveJob/:id", (req, res) => {
  res.json({ message: `Job ${req.params.id} approved.` });
});

router.post("/RejectJob/:id", (req, res) => {
  res.json({ message: `Job ${req.params.id} rejected.`, summary: req.query.summary || "" });
});

router.get("/DashBoard", (_req, res) => {
  const users = queryOne("SELECT COUNT(*) as count FROM users")?.count || 0;
  const jobs = queryOne("SELECT COUNT(*) as count FROM jobs")?.count || 0;
  const companies = queryOne("SELECT COUNT(*) as count FROM companies")?.count || 0;
  const applications = queryOne("SELECT COUNT(*) as count FROM applications")?.count || 0;

  res.json({
    data: {
      totalUsers: users,
      totalJobs: jobs,
      totalCompanies: companies,
      totalApplications: applications,
    },
  });
});

export default router;
