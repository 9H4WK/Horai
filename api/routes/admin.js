import { Router } from "express";
import bcrypt from "bcryptjs";
import fs from "fs";
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

function safeJsonParse(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ── user mapping + metrics ─────────────────────────────────────────────────
function computeProfileCompletion(user) {
  const profile = safeJsonParse(user.profile_json, {});
  const checks = [
    !!user.first_name,
    !!user.last_name,
    !!user.phone,
    !!user.bio,
    !!user.headline,
    !!user.location,
    !!user.linkedin_url || !!user.github_url || !!user.portfolio_url,
    Array.isArray(profile.skills) && profile.skills.length > 0,
    Array.isArray(profile.experience) && profile.experience.length > 0,
    Array.isArray(profile.education) && profile.education.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function mapUser(user) {
  const profile = safeJsonParse(user.profile_json, {});
  return {
    ...user,
    userId: user.id,
    userName: user.user_name || user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    userType: user.role,
    createdAt: user.created_at,
    isLocked: !!user.is_locked,
    lastLoginAt: user.last_login_at || null,
    headline: user.headline || null,
    location: user.location || null,
    bio: user.bio || null,
    skillCount: Array.isArray(profile.skills) ? profile.skills.length : 0,
    experienceCount: Array.isArray(profile.experience) ? profile.experience.length : 0,
    educationCount: Array.isArray(profile.education) ? profile.education.length : 0,
    projectCount: Array.isArray(profile.projects) ? profile.projects.length : 0,
    applicationCount: user.application_count ?? 0,
    cvCount: user.cv_count ?? 0,
    hasCV: (user.cv_count ?? 0) > 0,
    interviewCount: user.interview_count ?? 0,
    averageMatchScore:
      user.avg_match_score !== undefined && user.avg_match_score !== null
        ? Math.round(Number(user.avg_match_score))
        : null,
    acceptedCount: user.accepted_count ?? 0,
    rejectedCount: user.rejected_count ?? 0,
    lastActivityAt: user.last_activity_at || user.last_login_at || user.created_at,
    profileCompletion: computeProfileCompletion(user),
  };
}

function enrichUsers(rows) {
  const metrics = queryAll(`
    SELECT
      u.id AS user_id,
      (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id) AS application_count,
      (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id AND a.status = 'Accepted') AS accepted_count,
      (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id AND a.status = 'Rejected') AS rejected_count,
      (SELECT AVG(a.match_score) FROM applications a WHERE a.user_id = u.id AND a.match_score IS NOT NULL) AS avg_match_score,
      (SELECT COUNT(*) FROM cvs c WHERE c.user_id = u.id) AS cv_count,
      (SELECT COUNT(*) FROM interview_sessions s
         JOIN applications a2 ON s.application_id = a2.id
        WHERE a2.user_id = u.id) AS interview_count,
      (SELECT MAX(a.created_at) FROM applications a WHERE a.user_id = u.id) AS last_activity_at
    FROM users u
  `);
  const byId = new Map(metrics.map((m) => [Number(m.user_id), m]));
  return rows.map((row) => {
    const m = byId.get(Number(row.id)) || {};
    return mapUser({
      ...row,
      application_count: Number(m.application_count ?? 0),
      accepted_count: Number(m.accepted_count ?? 0),
      rejected_count: Number(m.rejected_count ?? 0),
      avg_match_score: m.avg_match_score,
      cv_count: Number(m.cv_count ?? 0),
      interview_count: Number(m.interview_count ?? 0),
      last_activity_at: m.last_activity_at,
    });
  });
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

const USER_LIST_FIELDS = `id, email, role, user_name, first_name, last_name, phone, bio,
    linkedin_url, github_url, portfolio_url, location, headline, profile_json,
    is_locked, last_login_at, created_at`;

router.get("/GetAllUsers", (_req, res) => {
  const users = enrichUsers(
    queryAll(`SELECT ${USER_LIST_FIELDS} FROM users ORDER BY created_at DESC`)
  );
  res.json({ data: users, items: users });
});

router.get("/GetAllEmployer", (_req, res) => {
  const users = enrichUsers(
    queryAll(`SELECT ${USER_LIST_FIELDS} FROM users WHERE role = 'Employer' ORDER BY created_at DESC`)
  );
  res.json({ data: users, items: users });
});

router.get("/GetAllJobSeekers", (_req, res) => {
  const users = enrichUsers(
    queryAll(`SELECT ${USER_LIST_FIELDS} FROM users WHERE role = 'JobSeeker' ORDER BY created_at DESC`)
  );
  res.json({ data: users, items: users });
});

// ── Single-user management ─────────────────────────────────────────────────
router.get("/GetUserDetails/:id", (req, res) => {
  const user = queryOne(`SELECT * FROM users WHERE id = ?`, [req.params.id]);
  if (!user) return res.status(404).json({ message: "User not found." });

  const cv = queryOne(
    "SELECT id, file_path, file_name, analysis_json, created_at FROM cvs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [user.id]
  );

  const applications = queryAll(`
    SELECT a.id, a.status, a.match_score, a.fit_tier, a.hr_comment, a.created_at, a.decided_at,
           j.id AS job_id, j.title AS job_title, c.company_name
    FROM applications a
    LEFT JOIN jobs j ON a.job_id = j.id
    LEFT JOIN companies c ON j.company_id = c.id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `, [user.id]);

  const interviews = queryAll(`
    SELECT s.id, s.application_id, s.score, s.status, s.created_at, j.title AS job_title
    FROM interview_sessions s
    JOIN applications a ON s.application_id = a.id
    LEFT JOIN jobs j ON a.job_id = j.id
    WHERE a.user_id = ?
    ORDER BY s.created_at DESC
  `, [user.id]);

  const notifications = queryAll(`
    SELECT id, title, message, type, is_read, created_at
    FROM notifications WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 10
  `, [user.id]);

  const completedInterviews = interviews.filter((i) => i.score !== null && i.score !== undefined);
  const avgInterviewScore = completedInterviews.length
    ? Math.round(completedInterviews.reduce((sum, i) => sum + Number(i.score), 0) / completedInterviews.length)
    : null;

  res.json({
    data: {
      ...mapUser(user),
      emailVerified: true,
      profile: safeJsonParse(user.profile_json, {}),
      cv: cv
        ? {
            id: cv.id,
            fileName: cv.file_name,
            url: cv.file_path?.startsWith("seed://") ? null : `/api/uploads/cvs/${cv.file_path.split(/[\\/]/).pop()}`,
            uploadedAt: cv.created_at,
            analysis: safeJsonParse(cv.analysis_json, null),
          }
        : null,
      applications: applications.map((a) => ({
        ...a,
        matchScore: a.match_score !== null ? Math.round(Number(a.match_score)) : null,
        createdAt: a.created_at,
      })),
      interviews: interviews.map((i) => ({ ...i, score: i.score !== null ? Math.round(Number(i.score)) : null })),
      interviewStats: {
        total: interviews.length,
        completed: completedInterviews.length,
        averageScore: avgInterviewScore,
      },
      notifications,
      notificationCount: notifications.filter((n) => !n.is_read).length,
    },
  });
});

const ADMIN_EDITABLE_FIELDS = {
  firstName: "first_name",
  lastName: "last_name",
  phone: "phone",
  bio: "bio",
  location: "location",
  headline: "headline",
  linkedInURL: "linkedin_url",
  gitHubURL: "github_url",
  websiteURL: "portfolio_url",
};

router.put("/UpdateUser/:id", async (req, res) => {
  const userId = req.params.id;
  const user = queryOne("SELECT * FROM users WHERE id = ?", [userId]);
  if (!user) return res.status(404).json({ message: "User not found." });

  const body = req.body || {};
  const updates = [];
  const params = [];

  for (const [key, column] of Object.entries(ADMIN_EDITABLE_FIELDS)) {
    if (body[key] !== undefined && body[key] !== null) {
      updates.push(`${column} = ?`);
      params.push(String(body[key]));
    }
  }

  const allowedRoles = new Set(["JobSeeker", "Employer", "Admin"]);
  if (body.role !== undefined || body.userType !== undefined) {
    const role = String(body.role ?? body.userType);
    if (!allowedRoles.has(role)) {
      return res.status(400).json({ message: "Invalid role. Allowed: JobSeeker, Employer, Admin." });
    }
    if (user.role === "Admin" && role !== "Admin" && req.user.userId === Number(userId)) {
      return res.status(400).json({ message: "You cannot demote your own admin account." });
    }
    updates.push("role = ?");
    params.push(role);
  }

  if (body.isLocked !== undefined) {
    updates.push("is_locked = ?");
    params.push(body.isLocked ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: "No valid fields to update." });
  }

  params.push(userId);
  run(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);

  const updated = queryOne(`SELECT ${USER_LIST_FIELDS} FROM users WHERE id = ?`, [userId]);
  res.json({ message: "User updated.", data: mapUser(updated) });
});

router.delete("/DeleteUser/:id", (req, res) => {
  const userId = Number(req.params.id);

  if (userId === req.user.userId) {
    return res.status(400).json({ message: "You cannot delete your own account." });
  }

  const user = queryOne("SELECT * FROM users WHERE id = ?", [userId]);
  if (!user) return res.status(404).json({ message: "User not found." });

  // Remove CV files from disk
  const cvs = queryAll("SELECT file_path FROM cvs WHERE user_id = ?", [userId]);
  for (const cv of cvs) {
    try { fs.unlinkSync(cv.file_path); } catch {}
  }

  run(`
    DELETE FROM interview_sessions
    WHERE application_id IN (SELECT id FROM applications WHERE user_id = ?)
  `, [userId]);
  run("DELETE FROM cvs WHERE user_id = ?", [userId]);
  run("DELETE FROM applications WHERE user_id = ?", [userId]);
  run("DELETE FROM notifications WHERE user_id = ?", [userId]);

  // Detach companies owned by this employer rather than deleting them
  run("UPDATE companies SET employer_id = NULL WHERE employer_id = ?", [userId]);

  run("DELETE FROM users WHERE id = ?", [userId]);
  res.json({ message: `User ${user.email} and all related records deleted.` });
});

router.put("/LockUnLockUser/:id", (req, res) => {
  const user = queryOne("SELECT id, is_locked FROM users WHERE id = ?", [req.params.id]);
  if (!user) return res.status(404).json({ message: "User not found." });
  if (Number(req.params.id) === req.user.userId) {
    return res.status(400).json({ message: "You cannot lock your own account." });
  }

  const newState = user.is_locked ? 0 : 1;
  run("UPDATE users SET is_locked = ? WHERE id = ?", [newState, req.params.id]);
  res.json({
    message: newState ? "User locked." : "User unlocked.",
    data: { id: Number(req.params.id), isLocked: !!newState },
  });
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
  const count = (sql, params = []) => queryOne(sql, params)?.count || 0;

  const totalUsers = count("SELECT COUNT(*) as count FROM users");
  const totalSeekers = count("SELECT COUNT(*) as count FROM users WHERE role = 'JobSeeker'");
  const totalEmployers = count("SELECT COUNT(*) as count FROM users WHERE role = 'Employer'");
  const totalAdmins = count("SELECT COUNT(*) as count FROM users WHERE role = 'Admin'");
  const lockedUsers = count("SELECT COUNT(*) as count FROM users WHERE is_locked = 1");
  const newUsers7d = count("SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days')");
  const newUsers30d = count("SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-30 days')");
  const usersWithCV = count(
    "SELECT COUNT(DISTINCT user_id) as count FROM cvs"
  );
  const jobs = count("SELECT COUNT(*) as count FROM jobs");
  const companies = count("SELECT COUNT(*) as count FROM companies");
  const applications = count("SELECT COUNT(*) as count FROM applications");
  const acceptedApps = count("SELECT COUNT(*) as count FROM applications WHERE status = 'Accepted'");
  const rejectedApps = count("SELECT COUNT(*) as count FROM applications WHERE status = 'Rejected'");
  const pendingReview = count(
    "SELECT COUNT(*) as count FROM applications WHERE status IN ('Submitted', 'UnderReview', 'Shortlisted') OR status IS NULL"
  );
  const interviewsCompleted = count("SELECT COUNT(*) as count FROM interview_sessions WHERE score IS NOT NULL");
  const avgMatchScoreRow = queryOne("SELECT AVG(match_score) as avg FROM applications WHERE match_score IS NOT NULL");

  const recentSignups = enrichUsers(
    queryAll(`SELECT ${USER_LIST_FIELDS} FROM users ORDER BY created_at DESC LIMIT 5`)
  ).map((u) => ({
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.userName,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    profileCompletion: u.profileCompletion,
  }));

  res.json({
    data: {
      totalUsers,
      usersByRole: { jobSeekers: totalSeekers, employers: totalEmployers, admins: totalAdmins },
      lockedUsers,
      newUsers7d,
      newUsers30d,
      usersWithCV,
      totalJobs: jobs,
      totalCompanies: companies,
      totalApplications: applications,
      applicationsByStatus: {
        accepted: acceptedApps,
        rejected: rejectedApps,
        inProgress: Math.max(applications - acceptedApps - rejectedApps, 0),
        pendingReview,
      },
      interviewsCompleted,
      averageMatchScore: avgMatchScoreRow?.avg ? Math.round(Number(avgMatchScoreRow.avg)) : null,
      recentSignups,
    },
  });
});

export default router;
