import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { queryOne, queryAll, run, runAndGetId, saveDb } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads", "cvs");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authMiddleware);

function safeJsonParse(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeProfileBody(body) {
  const profileJson = {
    education: safeJsonParse(body.EducationJson, []),
    experience: safeJsonParse(body.ExperienceJson, []),
    projects: safeJsonParse(body.ProjectsJson, []),
    skills: safeJsonParse(body.SkillsJson, []),
  };

  return {
    firstName: body.firstName || body.FirstName || null,
    lastName: body.lastName || body.LastName || null,
    phone: body.phone || body.phoneNumber || body.PhoneNumber || null,
    bio: body.bio || body.Bio || null,
    linkedIn: body.linkedIn || body.linkedin || body.LinkedInURL || body.linkedInURL || null,
    github: body.github || body.GitHubURL || body.gitHubURL || null,
    portfolio: body.portfolio || body.WebsiteURL || body.websiteURL || body.PortfolioURL || null,
    location: body.location || body.Location || null,
    headline: body.headline || body.Headline || null,
    profileJson,
  };
}

function serializeUserProfile(user, cv) {
  const profileJson = safeJsonParse(user.profile_json, {});

  return {
    ...user,
    userType: user.role,
    firstName: user.first_name,
    lastName: user.last_name,
    userName: user.user_name || user.email,
    phoneNumber: user.phone,
    bio: user.bio,
    Bio: user.bio,
    linkedInURL: user.linkedin_url,
    LinkedInURL: user.linkedin_url,
    gitHubURL: user.github_url,
    GitHubURL: user.github_url,
    websiteURL: user.portfolio_url,
    WebsiteURL: user.portfolio_url,
    profileJson,
    education: profileJson.education || [],
    experience: profileJson.experience || [],
    projects: profileJson.projects || [],
    skills: profileJson.skills || [],
    hasCV: !!cv,
    cvUrl: cv ? `/api/uploads/cvs/${path.basename(cv.file_path)}` : null,
    cvData: cv?.analysis_json ? JSON.parse(cv.analysis_json) : null,
  };
}

// GET /api/Profile/GetProfile
router.get("/GetProfile", (req, res) => {
  const user = queryOne("SELECT id, email, role, profile_json, user_name, first_name, last_name, phone, bio, linkedin_url, github_url, portfolio_url, location, headline, created_at FROM users WHERE id = ?", [req.user.userId]);
  if (!user) return res.status(404).json({ message: "User not found." });

  const cv = queryOne("SELECT id, file_path, file_name, analysis_json, created_at FROM cvs WHERE user_id = ?", [req.user.userId]);

  res.json({ data: serializeUserProfile(user, cv) });
});

// POST /api/Profile/CompleteProfile
router.post("/CompleteProfile", upload.any(), (req, res) => {
  const { firstName, lastName, phone, bio, linkedIn, github, portfolio, location, headline, profileJson } = normalizeProfileBody(req.body);

  run(
    `UPDATE users SET
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      phone = COALESCE(?, phone),
      bio = COALESCE(?, bio),
      linkedin_url = COALESCE(?, linkedin_url),
      github_url = COALESCE(?, github_url),
      portfolio_url = COALESCE(?, portfolio_url),
      location = COALESCE(?, location),
      headline = COALESCE(?, headline),
      profile_json = ?
    WHERE id = ?`,
    [firstName, lastName, phone, bio, linkedIn, github, portfolio, location, headline, JSON.stringify(profileJson), req.user.userId]
  );

  res.json({ message: "Profile completed.", data: { userId: req.user.userId } });
});

// PUT /api/Profile/UpdateProfile
router.put("/UpdateProfile", upload.any(), (req, res) => {
  const { firstName, lastName, phone, bio, linkedIn, github, portfolio, location, headline, profileJson } = normalizeProfileBody(req.body);

  run(
    `UPDATE users SET
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      phone = COALESCE(?, phone),
      bio = COALESCE(?, bio),
      linkedin_url = COALESCE(?, linkedin_url),
      github_url = COALESCE(?, github_url),
      portfolio_url = COALESCE(?, portfolio_url),
      location = COALESCE(?, location),
      headline = COALESCE(?, headline),
      profile_json = ?
    WHERE id = ?`,
    [firstName, lastName, phone, bio, linkedIn, github, portfolio, location, headline, JSON.stringify(profileJson), req.user.userId]
  );

  res.json({ message: "Profile updated.", data: { userId: req.user.userId } });
});

// DELETE /api/Profile/DeleteProfile
router.delete("/DeleteProfile", (req, res) => {
  // Delete CV files first
  const cvs = queryAll("SELECT file_path FROM cvs WHERE user_id = ?", [req.user.userId]);
  for (const cv of cvs) {
    try { fs.unlinkSync(cv.file_path); } catch {}
  }
  run("DELETE FROM cvs WHERE user_id = ?", [req.user.userId]);
  run("DELETE FROM applications WHERE user_id = ?", [req.user.userId]);
  run("DELETE FROM users WHERE id = ?", [req.user.userId]);
  res.json({ message: "Profile deleted." });
});

export default router;
