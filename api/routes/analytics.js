import { Router } from "express";
import { queryAll, queryOne } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

function safeJsonParse(value, fallback = []) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function lastMonthLabels(monthsBack = 6) {
  const labels = [];
  const keys = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString("en-US", { month: "short" }));
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return { labels, keys };
}

function countByMonth(table, column = "created_at", where = "") {
  const rows = queryAll(`
    SELECT substr(${column}, 1, 7) as month, COUNT(*) as value
    FROM ${table}
    ${where}
    GROUP BY substr(${column}, 1, 7)
  `);
  return new Map(rows.map((r) => [r.month, Number(r.value)]));
}

router.get("/GetEmploymentRate", (_req, res) => {
  const seekers = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'JobSeeker'")?.count || 0;
  const employedSeekers = queryOne(`
    SELECT COUNT(DISTINCT a.user_id) as count
    FROM applications a
    JOIN users u ON u.id = a.user_id AND u.role = 'JobSeeker'
    WHERE a.status = 'Accepted'
  `)?.count || 0;
  const rate = seekers ? Math.round((employedSeekers / seekers) * 100) : 0;

  res.json({ data: { placed: employedSeekers, total: seekers, rate } });
});

router.get("/GetApplicationsDistribution", (_req, res) => {
  const rows = queryAll("SELECT status as label, COUNT(*) as value FROM applications GROUP BY status ORDER BY value DESC");
  res.json({ data: rows, items: rows });
});

// Applications submitted per month (last 6 months)
router.get("/GetApplicationsOverTime", (_req, res) => {
  const { labels, keys } = lastMonthLabels();
  const counts = countByMonth("applications");
  const data = keys.map((key, i) => ({ label: labels[i], key, value: counts.get(key) || 0 }));
  res.json({ data, items: data });
});

// New registrations per month split by role (last 6 months)
router.get("/GetUsersGrowth", (_req, res) => {
  const { labels, keys } = lastMonthLabels();
  const seekers = countByMonth("users", "created_at", "WHERE role = 'JobSeeker'");
  const employers = countByMonth("users", "created_at", "WHERE role = 'Employer'");
  const data = keys.map((key, i) => ({
    label: labels[i],
    key,
    jobSeekers: seekers.get(key) || 0,
    employers: employers.get(key) || 0,
    total: (seekers.get(key) || 0) + (employers.get(key) || 0),
  }));
  res.json({ data, items: data });
});

// Screening funnel: how far applications get through the pipeline
router.get("/GetScreeningFunnel", (_req, res) => {
  const total = queryOne("SELECT COUNT(*) as count FROM applications")?.count || 0;
  const screened = queryOne("SELECT COUNT(*) as count FROM applications WHERE match_score IS NOT NULL")?.count || 0;
  const interviewed = queryOne("SELECT COUNT(DISTINCT s.application_id) as count FROM interview_sessions s JOIN applications a ON s.application_id = a.id")?.count || 0;
  const decided = queryOne("SELECT COUNT(*) as count FROM applications WHERE status IN ('Accepted', 'Rejected')")?.count || 0;
  const accepted = queryOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Accepted'")?.count || 0;

  const data = [
    { label: "Applied", stage: 1, value: total },
    { label: "AI Screened", stage: 2, value: Math.max(screened, accepted) },
    { label: "Interviewed", stage: 3, value: interviewed },
    { label: "Decided", stage: 4, value: decided },
    { label: "Hired", stage: 5, value: accepted },
  ];
  res.json({ data, items: data });
});

// Jobs grouped by job type
router.get("/GetJobTypeDistribution", (_req, res) => {
  const typeNames = { 0: "Full-time", 1: "Part-time", 2: "Contract", 3: "Internship", 4: "Remote" };
  const rows = queryAll("SELECT job_type as rawType, COUNT(*) as value FROM jobs GROUP BY job_type ORDER BY value DESC");
  const data = rows.map((row) => ({
    label: typeNames[String(row.rawType)] ?? `Type ${row.rawType}`,
    value: Number(row.value),
  }));
  res.json({ data, items: data });
});

// Most applied-to jobs
router.get("/GetTopJobs", (_req, res) => {
  const rows = queryAll(`
    SELECT j.id, j.title, c.company_name, COUNT(a.id) as value,
           AVG(a.match_score) as avgMatchScore
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    LEFT JOIN applications a ON a.job_id = j.id
    GROUP BY j.id
    HAVING COUNT(a.id) > 0
    ORDER BY COUNT(a.id) DESC
    LIMIT 5
  `);
  const data = rows.map((r) => ({
    id: r.id,
    label: r.title,
    companyName: r.company_name,
    value: Number(r.value),
    avgMatchScore: r.avgMatchScore ? Math.round(Number(r.avgMatchScore)) : null,
  }));
  res.json({ data, items: data });
});

// Average AI screening score across all scored applications
router.get("/GetScreeningQuality", (_req, res) => {
  const row = queryOne(`
    SELECT AVG(match_score) as average, MIN(match_score) as min, MAX(match_score) as max,
           SUM(CASE WHEN fit_tier = 'Strong' THEN 1 ELSE 0 END) as strong,
           SUM(CASE WHEN fit_tier = 'Medium' THEN 1 ELSE 0 END) as medium,
           SUM(CASE WHEN fit_tier IS NOT NULL AND fit_tier NOT IN ('Strong', 'Medium') THEN 1 ELSE 0 END) as other
    FROM applications WHERE match_score IS NOT NULL
  `);
  const scored = queryOne("SELECT COUNT(*) as count FROM applications WHERE match_score IS NOT NULL")?.count || 0;
  const tiers = [
    { label: "Strong", value: Number(row?.strong || 0), color: "#16a34a" },
    { label: "Medium", value: Number(row?.medium || 0), color: "#D3571F" },
    { label: "Weak", value: Number(row?.other || 0), color: "#94a3b8" },
  ];
  res.json({
    data: {
      scoredApplications: scored,
      average: row?.average ? Math.round(Number(row.average)) : null,
      min: row?.min !== null && row?.min !== undefined ? Math.round(Number(row.min)) : null,
      max: row?.max !== null && row?.max !== undefined ? Math.round(Number(row.max)) : null,
      tiers,
    },
  });
});

// Top skills aggregated from every job-seeker profile + CV analysis
router.get("/GetTopSkills", (_req, res) => {
  const skillCounts = new Map();

  const bump = (raw) => {
    if (!raw) return;
    const name = String(raw).trim();
    if (name.length < 2 || name.length > 40) return;
    const key = name.toLowerCase();
    const existing = skillCounts.get(key) || { name, count: 0 };
    existing.count += 1;
    skillCounts.set(key, existing);
  };

  for (const user of queryAll("SELECT profile_json FROM users WHERE role = 'JobSeeker'")) {
    for (const skill of safeJsonParse(user.profile_json, {}).skills ?? []) {
      bump(typeof skill === "string" ? skill : skill?.skillName ?? skill?.name);
    }
  }

  for (const cv of queryAll("SELECT analysis_json FROM cvs")) {
    for (const skill of safeJsonParse(cv.analysis_json, []).skills ?? []) {
      bump(typeof skill === "string" ? skill : skill?.skillName ?? skill?.name);
    }
  }

  const data = [...skillCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((s) => ({ label: s.name, value: s.count }));

  res.json({ data, items: data });
});

export default router;
