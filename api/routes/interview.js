import { Router } from "express";
import { queryAll, queryOne, run, runAndGetId } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { screenApplication, computeHeuristicScreening, tierFromScore } from "../services/screening.js";
import { getEmployerAiStatus, probeAiConnection, resetProvider } from "../services/ai.js";
import { createNotification } from "./notifications.js";

const router = Router();

function requireJobSeeker(req, res, next) {
  if (req.user.role !== "JobSeeker") {
    return res.status(403).json({ message: "Only job seekers can apply for jobs." });
  }
  next();
}

function requireReviewer(req, res, next) {
  if (req.user.role !== "Employer" && req.user.role !== "Admin") {
    return res.status(403).json({ message: "Only employers or admins can review applications." });
  }
  next();
}

function safeJsonParse(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function loadUserProfile(userId) {
  const user = queryOne(
    `SELECT id, email, role, profile_json, user_name, first_name, last_name, phone, bio,
            linkedin_url, github_url, portfolio_url, location, headline
     FROM users WHERE id = ?`,
    [userId],
  );
  if (!user) return null;

  const profileJson = safeJsonParse(user.profile_json, {}) || {};
  return {
    ...user,
    firstName: user.first_name,
    lastName: user.last_name,
    linkedIn: user.linkedin_url,
    github: user.github_url,
    portfolio: user.portfolio_url,
    profileJson,
    skills: profileJson.skills || [],
    experience: profileJson.experience || [],
    education: profileJson.education || [],
    projects: profileJson.projects || [],
  };
}

function loadCvAnalysis(userId) {
  const cv = queryOne(
    `SELECT id, file_path, file_name, analysis_json, created_at
     FROM cvs WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
    [userId],
  );
  if (!cv) return { cv: null, analysis: {} };
  return {
    cv,
    analysis: safeJsonParse(cv.analysis_json, {}) || {},
  };
}

function loadJob(jobId) {
  return queryOne(
    `SELECT j.*, c.company_name as companyName, c.employer_id as employerId
     FROM jobs j
     LEFT JOIN companies c ON j.company_id = c.id
     WHERE j.id = ?`,
    [jobId],
  );
}

function ensureEmployerOwnsApplication(req, application) {
  if (req.user.role === "Admin") return true;
  if (req.user.role !== "Employer") return false;
  if (!application) return false;
  const job = loadJob(application.job_id || application.jobId);
  return job && Number(job.employerId) === Number(req.user.userId);
}

function mapApplicationRow(app) {
  const screening = safeJsonParse(app.screening_json || app.screeningJson, null);
  const cvAnalysis = safeJsonParse(app.cvAnalysisJson, null);
  const profileJson = safeJsonParse(app.profileJson, {}) || {};
  const name =
    [app.applicantFirstName, app.applicantLastName].filter(Boolean).join(" ") ||
    app.applicantName ||
    app.applicantEmail;

  const matchScore =
    app.match_score != null
      ? Number(app.match_score)
      : screening?.matchScore != null
        ? Number(screening.matchScore)
        : null;

  const fitTier = app.fit_tier || screening?.fitTier || (matchScore != null ? tierFromScore(matchScore).tier : null);

  return {
    id: app.id,
    applicationId: app.id,
    userId: app.userId,
    jobId: app.jobId,
    status: app.status,
    appliedAt: app.appliedAt,
    decidedAt: app.decided_at || app.decidedAt || null,
    hrComment: app.hr_comment || app.hrComment || null,
    matchScore,
    fitTier,
    fitLabel: screening?.fitLabel || (matchScore != null ? tierFromScore(matchScore).label : null),
    jobTitle: app.jobTitle,
    companyName: app.companyName,
    applicantEmail: app.applicantEmail,
    applicantName: name,
    applicantFirstName: app.applicantFirstName,
    applicantLastName: app.applicantLastName,
    applicantHeadline: app.applicantHeadline || null,
    applicantLocation: app.applicantLocation || null,
    applicantPhone: app.applicantPhone || null,
    applicantLinkedIn: app.applicantLinkedIn || null,
    applicantGithub: app.applicantGithub || null,
    cvFileName: app.cvFileName,
    cvDownloadUrl: app.cvFilePath ? `/api/uploads/cvs/${String(app.cvFilePath).split(/[/\\]/).pop()}` : null,
    sessionId: app.sessionId,
    JobTitle: app.jobTitle,
    CompanyName: app.companyName,
    Status: app.status,
    CreatedAt: app.appliedAt,
    applicant: {
      id: app.userId,
      email: app.applicantEmail,
      name,
      headline: app.applicantHeadline || null,
      location: app.applicantLocation || null,
      phone: app.applicantPhone || null,
      linkedIn: app.applicantLinkedIn || null,
      github: app.applicantGithub || null,
      bio: app.applicantBio || null,
      skills: profileJson.skills || cvAnalysis?.skills || [],
      experience: profileJson.experience || cvAnalysis?.experience || [],
      education: profileJson.education || cvAnalysis?.education || [],
      projects: profileJson.projects || cvAnalysis?.projects || [],
    },
    cvAnalysis,
    screening,
    profileJson,
  };
}

function applicationSelect(whereClause = "", params = []) {
  return queryAll(
    `
    SELECT
      a.id,
      a.user_id as userId,
      a.job_id as jobId,
      a.status,
      a.created_at as appliedAt,
      a.hr_comment,
      a.screening_json,
      a.match_score,
      a.fit_tier,
      a.decided_at,
      j.title as jobTitle,
      j.description as jobDescription,
      j.summary as jobSummary,
      j.location as jobLocation,
      j.job_type as jobType,
      c.company_name as companyName,
      c.employer_id as employerId,
      u.email as applicantEmail,
      u.user_name as applicantName,
      u.first_name as applicantFirstName,
      u.last_name as applicantLastName,
      u.headline as applicantHeadline,
      u.location as applicantLocation,
      u.phone as applicantPhone,
      u.linkedin_url as applicantLinkedIn,
      u.github_url as applicantGithub,
      u.bio as applicantBio,
      u.profile_json as profileJson,
      cv.file_name as cvFileName,
      cv.file_path as cvFilePath,
      cv.analysis_json as cvAnalysisJson,
      (SELECT MIN(id) FROM interview_sessions WHERE application_id = a.id) as sessionId
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    LEFT JOIN companies c ON j.company_id = c.id
    JOIN users u ON a.user_id = u.id
    LEFT JOIN cvs cv ON cv.id = (
      SELECT id FROM cvs WHERE user_id = u.id ORDER BY id DESC LIMIT 1
    )
    ${whereClause}
    ORDER BY
      CASE WHEN a.match_score IS NULL THEN 1 ELSE 0 END,
      a.match_score DESC,
      a.created_at DESC
  `,
    params,
  ).map(mapApplicationRow);
}

function attachJobRanks(apps) {
  const byJob = new Map();
  for (const app of apps) {
    const key = String(app.jobId);
    if (!byJob.has(key)) byJob.set(key, []);
    byJob.get(key).push(app);
  }

  for (const group of byJob.values()) {
    group
      .slice()
      .sort((a, b) => (Number(b.matchScore) || 0) - (Number(a.matchScore) || 0))
      .forEach((app, index) => {
        app.rankInJob = index + 1;
        app.totalInJob = group.length;
      });
  }

  return apps;
}

async function buildAndStoreScreening(applicationId, userId, jobId) {
  const job = loadJob(jobId);
  const profile = loadUserProfile(userId);
  const { analysis } = loadCvAnalysis(userId);

  if (!job || !profile) {
    return computeHeuristicScreening({ job: job || {}, profile: profile || {}, cvAnalysis: analysis });
  }

  const screening = await screenApplication({ job, profile, cvAnalysis: analysis });
  run(
    `UPDATE applications
     SET screening_json = ?, match_score = ?, fit_tier = ?
     WHERE id = ?`,
    [JSON.stringify(screening), screening.matchScore, screening.fitTier, applicationId],
  );
  return screening;
}

function extractDecisionComment(req) {
  const body = req.body || {};
  return String(
    body.comment ??
      body.Comment ??
      body.reason ??
      body.Reason ??
      body.hrComment ??
      body.HrComment ??
      req.query?.reason ??
      req.query?.comment ??
      "",
  ).trim();
}

// POST /api/ApplyJob/ApplyJob/:jobId
router.post("/ApplyJob/:jobId", authMiddleware, requireJobSeeker, async (req, res) => {
  try {
    const job = loadJob(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found." });

    const existing = queryOne("SELECT id, status FROM applications WHERE user_id = ? AND job_id = ?", [
      req.user.userId,
      req.params.jobId,
    ]);
    if (existing) {
      return res.json({
        data: {
          id: existing.id,
          applicationId: existing.id,
          status: existing.status,
          alreadyApplied: true,
        },
      });
    }

    const id = runAndGetId("INSERT INTO applications (user_id, job_id, status) VALUES (?, ?, ?)", [
      req.user.userId,
      req.params.jobId,
      "Submitted",
    ]);

    // Full jobseeker profile + CV used for AI/heuristic screening
    let screening = null;
    try {
      screening = await buildAndStoreScreening(id, req.user.userId, req.params.jobId);
    } catch (screenErr) {
      console.warn("Screening on apply failed:", screenErr.message);
      screening = computeHeuristicScreening({
        job,
        profile: loadUserProfile(req.user.userId) || {},
        cvAnalysis: loadCvAnalysis(req.user.userId).analysis,
      });
      run(
        `UPDATE applications SET screening_json = ?, match_score = ?, fit_tier = ? WHERE id = ?`,
        [JSON.stringify(screening), screening.matchScore, screening.fitTier, id],
      );
    }

    // Notify employer
    if (job.employerId) {
      createNotification({
        userId: job.employerId,
        title: "New application",
        message: `A candidate applied for ${job.title}. AI match score: ${screening?.matchScore ?? "N/A"}.`,
        type: "application",
        relatedId: id,
      });
    }

    res.json({
      data: {
        id,
        applicationId: id,
        status: "Submitted",
        matchScore: screening?.matchScore ?? null,
        fitTier: screening?.fitTier ?? null,
        screening,
      },
    });
  } catch (err) {
    console.error("ApplyJob error:", err);
    res.status(500).json({ message: err.message || "Failed to apply for job." });
  }
});

// POST /api/ApplyJob/Start/:applicationId
router.post("/Start/:applicationId", authMiddleware, (req, res) => {
  const existing = queryOne("SELECT id FROM interview_sessions WHERE application_id = ? ORDER BY id LIMIT 1", [
    req.params.applicationId,
  ]);
  if (existing) {
    return res.json({ data: { sessionId: existing.id, status: "InProgress" } });
  }

  const sessionId = runAndGetId(
    "INSERT INTO interview_sessions (application_id, questions_json, status) VALUES (?, ?, ?)",
    [
      req.params.applicationId,
      JSON.stringify([
        "Tell me about yourself.",
        "Why are you interested in this role?",
        "What is your greatest strength?",
      ]),
      "InProgress",
    ],
  );
  run("UPDATE applications SET status = ? WHERE id = ? AND status = ?", [
    "Interview",
    req.params.applicationId,
    "Submitted",
  ]);
  res.json({ data: { sessionId, status: "InProgress" } });
});

// GET /api/ApplyJob/NextQuestion/:sessionId
router.get("/NextQuestion/:sessionId", authMiddleware, (req, res) => {
  const session = queryOne("SELECT * FROM interview_sessions WHERE id = ?", [req.params.sessionId]);
  if (!session) return res.status(404).json({ message: "Session not found." });
  const questions = safeJsonParse(session.questions_json, []) || [];
  const answers = safeJsonParse(session.answers_json, []) || [];
  const next = questions[answers.length] || null;
  res.json({
    data: next
      ? { questionId: answers.length + 1, questionText: next, prompt: next, options: [], isCompleted: false }
      : null,
    isCompleted: !next,
  });
});

// POST /api/ApplyJob/SubmitAnswer
router.post("/SubmitAnswer", authMiddleware, (req, res) => {
  const { sessionId, answer } = req.body || {};
  const session = queryOne("SELECT * FROM interview_sessions WHERE id = ?", [sessionId]);
  if (!session) return res.status(404).json({ message: "Session not found." });
  const answers = safeJsonParse(session.answers_json, []) || [];
  answers.push(answer);
  run("UPDATE interview_sessions SET answers_json = ? WHERE id = ?", [JSON.stringify(answers), sessionId]);
  res.json({ message: "Answer submitted." });
});

// GET /api/ApplyJob/Result/:sessionId
router.get("/Result/:sessionId", authMiddleware, (req, res) => {
  const session = queryOne("SELECT * FROM interview_sessions WHERE id = ?", [req.params.sessionId]);
  if (!session) return res.status(404).json({ message: "Session not found." });

  const application = queryOne("SELECT * FROM applications WHERE id = ?", [session.application_id]);
  const screening = safeJsonParse(application?.screening_json, null);

  res.json({
    data: {
      sessionId: session.id,
      status: session.status || "Completed",
      score: session.score ?? screening?.matchScore ?? 85,
      passed: (session.score ?? screening?.matchScore ?? 85) >= 55,
      summary: screening?.summary || "Good overall performance.",
      feedback: screening?.reasoning || "Strong communication skills. Consider adding more technical depth.",
      recommendation: screening?.recommendation || "Proceed to next round.",
      matchScore: screening?.matchScore ?? null,
      fitTier: screening?.fitTier ?? null,
    },
  });
});

// GET /api/ApplyJob/GetApplication/:id
router.get("/GetApplication/:id", authMiddleware, (req, res) => {
  const apps = applicationSelect("WHERE a.id = ?", [req.params.id]);
  const app = apps[0];
  if (!app) return res.status(404).json({ message: "Application not found." });

  if (req.user.role === "JobSeeker" && Number(app.userId) !== Number(req.user.userId)) {
    return res.status(403).json({ message: "You can only view your own applications." });
  }
  if (req.user.role === "Employer" && !ensureEmployerOwnsApplication(req, { job_id: app.jobId, jobId: app.jobId })) {
    return res.status(403).json({ message: "You can only view applications for your jobs." });
  }

  const ranked = attachJobRanks(applicationSelect("WHERE a.job_id = ?", [app.jobId]));
  const withRank = ranked.find((a) => Number(a.id) === Number(app.id)) || app;

  res.json({ data: withRank });
});

// POST /api/ApplyJob/Rescreen/:id  — re-run AI screening for an application
router.post("/Rescreen/:id", authMiddleware, requireReviewer, async (req, res) => {
  try {
    const row = queryOne("SELECT * FROM applications WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ message: "Application not found." });
    if (!ensureEmployerOwnsApplication(req, row)) {
      return res.status(403).json({ message: "You can only rescreen applications for your jobs." });
    }

    const screening = await buildAndStoreScreening(row.id, row.user_id, row.job_id);
    res.json({ message: "Application re-screened.", data: { matchScore: screening.matchScore, screening } });
  } catch (err) {
    console.error("Rescreen error:", err);
    res.status(500).json({ message: err.message || "Failed to rescreen application." });
  }
});

// POST /api/ApplyJob/AcceptApplication/:id
router.post("/AcceptApplication/:id", authMiddleware, requireReviewer, (req, res) => {
  try {
    const applicationId = req.params.id;
    const row = queryOne("SELECT * FROM applications WHERE id = ?", [applicationId]);
    if (!row) return res.status(404).json({ message: "Application not found." });

    if (!ensureEmployerOwnsApplication(req, row)) {
      return res.status(403).json({ message: "You can only accept applications for your jobs." });
    }

    const comment = extractDecisionComment(req);
    const decidedAt = new Date().toISOString();

    run(
      `UPDATE applications
       SET status = ?, hr_comment = ?, decided_at = ?
       WHERE id = ?`,
      ["Accepted", comment || null, decidedAt, applicationId],
    );

    const job = loadJob(row.job_id);
    const jobTitle = job?.title || "the role";
    const message = comment
      ? `Congratulations! Your application for ${jobTitle} was accepted.\n\nMessage from the hiring team:\n${comment}`
      : `Congratulations! Your application for ${jobTitle} was accepted.`;

    createNotification({
      userId: row.user_id,
      title: "Application accepted",
      message,
      type: "decision",
      relatedId: Number(applicationId),
    });

    res.json({
      message: "Application accepted.",
      data: {
        id: Number(applicationId),
        status: "Accepted",
        hrComment: comment || null,
        decidedAt,
      },
    });
  } catch (err) {
    console.error("AcceptApplication error:", err);
    res.status(500).json({ message: err.message || "Failed to accept application." });
  }
});

// POST /api/ApplyJob/RejectApplication/:id
router.post("/RejectApplication/:id", authMiddleware, requireReviewer, (req, res) => {
  try {
    const applicationId = req.params.id;
    const row = queryOne("SELECT * FROM applications WHERE id = ?", [applicationId]);
    if (!row) return res.status(404).json({ message: "Application not found." });

    if (!ensureEmployerOwnsApplication(req, row)) {
      return res.status(403).json({ message: "You can only reject applications for your jobs." });
    }

    const comment = extractDecisionComment(req);
    const decidedAt = new Date().toISOString();

    run(
      `UPDATE applications
       SET status = ?, hr_comment = ?, decided_at = ?
       WHERE id = ?`,
      ["Rejected", comment || null, decidedAt, applicationId],
    );

    const job = loadJob(row.job_id);
    const jobTitle = job?.title || "the role";
    const message = comment
      ? `Your application for ${jobTitle} was not successful this time.\n\nMessage from the hiring team:\n${comment}`
      : `Your application for ${jobTitle} was not successful this time. Thank you for applying.`;

    createNotification({
      userId: row.user_id,
      title: "Application update",
      message,
      type: "decision",
      relatedId: Number(applicationId),
    });

    res.json({
      message: "Application rejected.",
      data: {
        id: Number(applicationId),
        status: "Rejected",
        hrComment: comment || null,
        reason: comment || null,
        decidedAt,
      },
    });
  } catch (err) {
    console.error("RejectApplication error:", err);
    res.status(500).json({ message: err.message || "Failed to reject application." });
  }
});

// GET /api/ApplyJob/AiStatus — employer/admin only (model + key initials; no public vendor branding)
router.get("/AiStatus", authMiddleware, requireReviewer, async (req, res) => {
  try {
    resetProvider();
    const probe = String(req.query.probe || "") === "1";
    const data = probe ? await probeAiConnection() : getEmployerAiStatus();
    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: "Unable to read assistant status." });
  }
});

// GET /api/ApplyJob/AllApplications
router.get("/AllApplications", authMiddleware, async (req, res) => {
  try {
    let apps;

    if (req.user.role === "JobSeeker") {
      apps = applicationSelect("WHERE a.user_id = ?", [req.user.userId]);
    } else if (req.user.role === "Employer") {
      apps = applicationSelect("WHERE c.employer_id = ?", [req.user.userId]);
    } else {
      apps = applicationSelect();
    }

    // Fast heuristic backfill for unscored apps (full AI runs on apply + Rescreen)
    if (req.user.role === "Employer" || req.user.role === "Admin") {
      for (const app of apps) {
        if (app.screening && app.matchScore != null) continue;
        try {
          const job = loadJob(app.jobId);
          const profile = loadUserProfile(app.userId);
          const { analysis } = loadCvAnalysis(app.userId);
          const screening = computeHeuristicScreening({
            job: job || {},
            profile: profile || {},
            cvAnalysis: analysis || {},
          });
          run(
            `UPDATE applications SET screening_json = ?, match_score = ?, fit_tier = ? WHERE id = ?`,
            [JSON.stringify(screening), screening.matchScore, screening.fitTier, app.id],
          );
          app.screening = screening;
          app.matchScore = screening.matchScore;
          app.fitTier = screening.fitTier;
          app.fitLabel = screening.fitLabel;
        } catch (e) {
          console.warn("Lazy screen failed for app", app.id, e.message);
        }
      }
    }

    apps = attachJobRanks(apps);

    // Optional query filters for HR tooling
    const { jobId, status, minScore, sort } = req.query || {};
    if (jobId) apps = apps.filter((a) => String(a.jobId) === String(jobId));
    if (status) apps = apps.filter((a) => String(a.status).toLowerCase() === String(status).toLowerCase());
    if (minScore != null && minScore !== "") {
      const min = Number(minScore);
      apps = apps.filter((a) => (Number(a.matchScore) || 0) >= min);
    }

    if (sort === "score") {
      apps = [...apps].sort((a, b) => (Number(b.matchScore) || 0) - (Number(a.matchScore) || 0));
    } else if (sort === "date") {
      apps = [...apps].sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0));
    } else if (sort === "name") {
      apps = [...apps].sort((a, b) => String(a.applicantName || "").localeCompare(String(b.applicantName || "")));
    }

    res.json({ data: apps, items: apps, total: apps.length });
  } catch (err) {
    console.error("AllApplications error:", err);
    res.status(500).json({ message: err.message || "Failed to load applications." });
  }
});

// POST /api/ApplyJob/GetInsight/:jobId
router.post("/GetInsight/:jobId", authMiddleware, (req, res) => {
  const apps = applicationSelect("WHERE a.job_id = ?", [req.params.jobId]);
  const scores = apps.map((a) => Number(a.matchScore)).filter((n) => !Number.isNaN(n));
  const avg = scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : null;

  const skillCounts = new Map();
  for (const app of apps) {
    for (const skill of app.screening?.candidateSkills || app.cvAnalysis?.skills || []) {
      const key = String(skill).trim();
      if (!key) continue;
      skillCounts.set(key, (skillCounts.get(key) || 0) + 1);
    }
  }

  const topSkills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill]) => skill);

  res.json({
    data: {
      totalApplicants: apps.length,
      averageScore: avg,
      topSkills,
      accepted: apps.filter((a) => String(a.status).toLowerCase().includes("accept")).length,
      rejected: apps.filter((a) => String(a.status).toLowerCase().includes("reject")).length,
      pending: apps.filter((a) => {
        const s = String(a.status).toLowerCase();
        return !s.includes("accept") && !s.includes("reject");
      }).length,
      recommendation:
        avg == null
          ? "Not enough scored applications yet."
          : avg >= 70
            ? "Strong applicant pool for this role."
            : "Consider broadening outreach or refining requirements.",
    },
  });
});

export default router;
