import { Router } from "express";
import bcrypt from "bcryptjs";
import { queryOne, run, runAndGetId, saveDb } from "../db.js";
import { signToken } from "../middleware/auth.js";

const router = Router();

const allowedRoles = new Set(["JobSeeker", "Employer", "Admin"]);

function normalizeRole(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  if (normalized === "employer" || normalized === "company") return "Employer";
  if (normalized === "admin" || normalized === "administrator") return "Admin";
  return "JobSeeker";
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    userName: user.user_name || user.email,
    role: user.role,
    userType: user.role,
    isAdmin: user.role === "Admin",
  };
}

// POST /api/Account/Login
router.post("/Login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = queryOne("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
  if (!user) {
    return res.status(400).json({ message: "Invalid email or password." });
  }

  if (user.is_locked) {
    return res.status(403).json({ message: "This account has been locked by an administrator." });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(400).json({ message: "Invalid email or password." });
  }

  run("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    userName: user.user_name || user.email,
  });

  res.json({
    token,
    userType: user.role,
    role: user.role,
    isAdmin: user.role === "Admin",
    email: user.email,
    userName: user.user_name || user.email,
    user: publicUser(user),
    message: "Login successful.",
  });
});

// POST /api/Account/Register
router.post("/Register", async (req, res) => {
  const { email, password, confirmPassword, userType, currentStatus, userName, firstName, lastName } = req.body;
  const role = normalizeRole(req.body.role || userType || currentStatus);

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }
  if (!allowedRoles.has(role)) {
    return res.status(400).json({ message: "Invalid account type." });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  const existing = queryOne("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
  if (existing) {
    return res.status(400).json({ message: "Email already registered." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = runAndGetId(
    "INSERT INTO users (email, password_hash, role, user_name, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)",
    [email.toLowerCase(), passwordHash, role, userName || email, firstName || null, lastName || null]
  );

  const token = signToken({
    userId: userId,
    email: email.toLowerCase(),
    role,
    userName: userName || email,
  });

  res.status(201).json({
    token,
    userType: role,
    role,
    isAdmin: role === "Admin",
    email,
    userName: userName || email,
    user: {
      id: userId,
      email: email.toLowerCase(),
      userName: userName || email,
      role,
      userType: role,
      isAdmin: role === "Admin",
    },
    message: "Registration successful.",
  });
});

// POST /api/Account/ForgotPassword
router.post("/ForgotPassword", (req, res) => {
  // No-op: no email verification in this simplified version
  res.json({ message: "If this email exists, a reset link would be sent. (Email disabled in demo mode)" });
});

// POST /api/Account/ResetPassword
router.post("/ResetPassword", (req, res) => {
  res.json({ message: "Password reset not implemented in demo mode." });
});

// GET /api/Account/ConfirmEmail
router.get("/ConfirmEmail", (req, res) => {
  res.json({ message: "Email confirmed." });
});

export default router;
