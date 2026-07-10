import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import initDb from "./db.js";
import { seedDemoData } from "./seed.js";

import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import cvRoutes from "./routes/cv.js";
import jobsRoutes from "./routes/jobs.js";
import companiesRoutes from "./routes/companies.js";
import interviewRoutes from "./routes/interview.js";
import adminRoutes from "./routes/admin.js";
import analyticsRoutes from "./routes/analytics.js";
import notificationRoutes from "./routes/notifications.js";
import { getPublicAiStatus } from "./services/ai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// static files (CV downloads)
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

// routes
app.use("/api/Account", authRoutes);
app.use("/api/Profile", profileRoutes);
app.use("/api/Profile", cvRoutes);
app.use("/api/Job", jobsRoutes);
app.use("/api/Jobs", jobsRoutes);
app.use("/api/Category", jobsRoutes);
app.use("/api/Skill", jobsRoutes);
app.use("/api/Company", companiesRoutes);
app.use("/api/Companies", companiesRoutes);
app.use("/api/CompanyReview", companiesRoutes);
app.use("/api/ApplyJob", interviewRoutes);
app.use("/api/Interview", interviewRoutes);
app.use("/api/Notification", notificationRoutes);
app.use("/api/Notifications", notificationRoutes);
app.use("/api/Admin", adminRoutes);
app.use("/api/AnalysisForAdminDashboard", analyticsRoutes);

// Public health — no vendor names, keys, or model ids
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ai: getPublicAiStatus() });
});

const PORT = process.env.PORT || 5000;

initDb()
  .then(() => seedDemoData())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
      console.log("Demo logins → see SEED_CREDENTIALS.md");
    });
  });

export default app;
