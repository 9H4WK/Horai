# Appendix A — Sample Code

> **Integrity note.** Every snippet below is either (a) trimmed directly from the
> shipped codebase (files are cited) or (b) explicitly marked as *GENERATED*
> because the module does not exist in the repository. Stack deviations from the
> proposal (plain JS/JSX instead of TypeScript/MUI, SQLite instead of PostgreSQL,
> a hosted-LLM JS service instead of a standalone Python spaCy microservice) are
> surfaced in the comments rather than silently "corrected".
>
> Secrets and environment values are stripped; placeholders are shown as
> `process.env.<NAME>`.

---

## Snippet 1 – Resume Parsing & Entity Extraction (Python, spaCy)

Status: **GENERATED reference implementation** (module absent from the repo).
The shipped system performs the equivalent steps in JavaScript: PDF text is read
with `pdf-parse` in `api/routes/cv.js`, and structured extraction (skills /
experience / education) is delegated to the LLM JSON contract in
`api/services/ai.js` (`analyzeCV`). Snippet 1 pins down the *declared* standalone
spaCy microservice so the design documentation can describe ingestion + NER
consistently with the rest of the system (same output keys as `analysis_json`).

```python
# Snippet 1 — Resume Parsing & Entity Extraction (Python, spaCy)
# GENERATED for the report: the repository ships no Python service.
# Runtime equivalent: api/routes/cv.js (PDF text) + api/services/ai.js (LLM extraction).
# Output keys intentionally mirror the JS analysis JSON so the Express API can consume
# either producer without changes.

import re
from pathlib import Path

import spacy
from docx import Document
from pdfminer.high_level import extract_text

nlp = spacy.load("en_core_web_md")           # NER labels: PERSON / ORG / GPE / DATE

# Gazetteer: NER alone is too weak for technical skills (they are common nouns),
# so domain terms are matched explicitly — the same fallback idea used by the
# heuristic screener's KNOWN_SKILLS list in api/services/screening.js.
SKILL_TERMS = ("python", "react", "postgresql", "docker", "aws", "java", "sql",
               "excel", "tableau", "powerbi", "figma", "agile", "machine learning",
               "communication", "leadership")

SECTION_RE = re.compile(
    r"^\s*(work\s+experience|experience|education|skills|projects|summary)\s*$",
    re.IGNORECASE,
)


def ingest(file_path: str) -> str:
    """Normalise PDF or DOCX to one plain-text stream (format-agnostic boundary)."""
    suffix = Path(file_path).suffix.lower()
    if suffix == ".pdf":
        return extract_text(file_path)                       # PDFMiner keeps layout order
    if suffix == ".docx":
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    return Path(file_path).read_text(encoding="utf-8", errors="ignore")


def extract_entities(text: str) -> list:
    """SpaCy NER pass; char offsets are retained for the explainability panel."""
    doc = nlp(text[:100_000])                                # guard: unusually long CVs
    return [
        {"text": ent.text, "label": ent.label_, "start": ent.start_char, "end": ent.end_char}
        for ent in doc.ents if ent.label_ in ("PERSON", "ORG", "GPE", "DATE")
    ]


def split_sections(text: str) -> dict:
    """Locate the experience/education blocks that structure the JSON output."""
    sections, current = {}, "summary"
    for line in text.splitlines():
        m = SECTION_RE.match(line.strip())
        current = m.group(1).lower().replace("work ", "") if m else current
        sections.setdefault(current, []).append(line)
    return {k: " ".join(v).strip() for k, v in sections.items()}


def build_resume_profile(file_path: str) -> dict:
    """Pipeline entry point: ingest -> NER -> gazetteer -> structured JSON.
    Served to the Express screening API with the same shape as the LLM's
    {'summary','skills','experience','education','strengths'} analysis object."""
    text = ingest(file_path)
    entities = extract_entities(text)
    sections = split_sections(text)
    skills = sorted({s for s in SKILL_TERMS if re.search(rf"\b{s}\b", text, re.I)})

    return {
        "summary": sections.get("summary", "")[:500].strip(),
        "skills": skills,                                   # [] when nothing captured
        "experience": [{"title": None, "company": e["text"], "duration": None}
                       for e in entities if e["label"] == "ORG"][:10],
        "education": [e["text"] for e in entities if e["label"] in ("ORG", "GPE")][:6],
        "projects": [],
        "strengths": skills[:5],
        "entities": entities,                               # kept for explainability
        "suggestedProfile": {"headline": None, "bio": None},
    }


if __name__ == "__main__":
    import json
    print(json.dumps(build_resume_profile("sample_resume.pdf"), indent=2))
```

---

## Snippet 2 – Semantic Candidate–Job Matching with Explainable Output

Real code, trimmed from `api/services/screening.js`. The deterministic scorer
weights skill overlap (75%) plus profile completeness; every result carries
per-requirement evidence (`skillMatches`), human-readable `strengths` / `gaps`
and a `reasoning` trace. When a provider key is configured, `aiScreenCandidate`
re-scored the same fields via the LLM and the heuristic result is used verbatim
as the offline fallback (`screenApplication`).

```javascript
// Snippet 2 — real code: api/services/screening.js (trimmed).
// Explainable rank bands used verbatim by the recruiter UI shortlist.

const FIT_TIERS = [
  { min: 85, tier: "excellent", label: "Excellent fit", recommendation: "Strongly recommend" },
  { min: 70, tier: "strong",    label: "Strong fit",    recommendation: "Recommend interview" },
  { min: 55, tier: "moderate",  label: "Moderate fit",  recommendation: "Review carefully" },
  { min: 40, tier: "weak",      label: "Weak fit",      recommendation: "Likely pass" },
  { min: 0,  tier: "poor",      label: "Poor fit",      recommendation: "Not recommended" },
];

export function tierFromScore(score) {
  const n = Number(score) || 0;
  return FIT_TIERS.find((t) => n >= t.min) || FIT_TIERS[FIT_TIERS.length - 1];
}

// Keyword lookup doubles as an NER stand-in when the LLM is offline.
function extractJobSkills(job = {}) {
  const text = [job.title, job.description, job.summary, job.category]
    .filter(Boolean).join(" ");
  const known = [ /* trimmed: the file lists 30+ terms e.g. javascript, react,
                      python, aws, docker, tableau, communication, agile */ ];
  return uniqueSkills(known.filter((skill) => text.toLowerCase().includes(skill)));
}

export function computeHeuristicScreening({ job, profile, cvAnalysis }) {
  const jobSkills = extractJobSkills(job);
  const candidateSkills = extractCandidateSkills(profile, cvAnalysis);
  const candidateSet = new Set(candidateSkills.map(normalizeSkill));

  // Per-requirement evidence: {skill, matched} — the explainability bedrock.
  const skillMatches = jobSkills.map((skill) => ({
    skill,
    matched: candidateSet.has(skill) ||
      [...candidateSet].some((c) => c.includes(skill) || skill.includes(c)),
    source: candidateSet.has(skill) ? "profile/cv" : "job requirement",
  }));

  const matchedCount = skillMatches.filter((s) => s.matched).length;
  const skillScore = jobSkills.length
    ? Math.round((matchedCount / Math.max(jobSkills.length, 1)) * 100)
    : Math.min(70, candidateSkills.length * 8);

  // Completeness bonus rewards documented experience/education/summary fields.
  const hasExperience = /* profile or CV experience array non-empty */;
  const profileBonus = [hasExperience, hasEducation, hasHeadline, hasBio]
    .filter(Boolean).length * 4;

  const matchScore = Math.max(5, Math.min(98,
    Math.round(skillScore * 0.75 + profileBonus + (candidateSkills.length > 0 ? 8 : 0))));

  return {
    matchScore,
    fitTier: tierFromScore(matchScore).tier,
    fitLabel: tierFromScore(matchScore).label,
    recommendation: tierFromScore(matchScore).recommendation,
    summary: cvAnalysis?.summary || profile.bio || `${profile.firstName || "Candidate"}
      shows a ${tierLabel.toLowerCase()} for ${job.title || "this role"} ...`,
    strengths: [ /* "Matched 5 role-relevant skills", "Documented work experience", ... */ ],
    gaps: skillMatches.filter((s) => !s.matched)
      .map((s) => `Missing or unclear: ${s.skill}`).slice(0, 5),
    skillMatches,                       // met / not-met matrix rendered in the UI
    reasoning: `Profile screen weighted skill overlap (${skillScore}%) plus profile completeness.`,
    source: "profile",                  // safe label, never exposes the vendor
    screenedAt: new Date().toISOString(),
  };
}
```

```javascript
// Snippet 2b — PROPOSED EXTENSION (generated; not in the repository).
// Promotes the Boolean matrix to the report's "met / partially met / not met"
// vocabulary with a confidence score, consumed unchanged by the snippet 5 UI.

export function classifyRequirement(skillMatch, cvAnalysis) {
  const nlp = (cvAnalysis.summary || "").toLowerCase();
  const softHit = nlp.includes(skillMatch.skill.toLowerCase());

  if (skillMatch.matched) {
    return { skill: skillMatch.skill, state: "met",         confidence: 0.95 };
  }
  if (softHit) {                         // term appears in CV prose but not profile
    return { skill: skillMatch.skill, state: "partially met", confidence: 0.55 };
  }
  return { skill: skillMatch.skill, state: "not met",     confidence: 0.85 };
}
```

---

## Snippet 3 – Express Screening Endpoint + Auth/Role Middleware

Real code, trimmed from `api/middleware/auth.js` and `api/routes/interview.js`.
On `POST /api/ApplyJob/ApplyJob/:jobId` the API already holds the applicant's CV
(uploaded by the job-seeker through `POST /api/Profile/UploadCV`), runs
`screenApplication` (heuristic + optional LLM enhancement), persists the
explanation JSON on the application row, and notifies the employer of the match
score. `GET /api/ApplyJob/AllApplications` returns the scored list that the
recruiter UI ranks (server-side sort by score, per-job `rankInJob`).

```javascript
// Snippet 3a — real code: api/middleware/auth.js (complete).
// JWT issuance/verification plus role checks reused by every protected route.

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "searchera-local-secret-key-2024";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ message: "Unauthorized" });
  req.user = decoded;                   // { userId, email, role, userName }
  next();
}

// Role gate: employers review/screen; admins inherit; job-seekers are blocked.
export function requireRole(role) {
  return (req, res, next) => {
    authMiddleware(req, res, () => {
      if (req.user.role !== role && req.user.role !== "Admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    });
  };
}
```

```javascript
// Snippet 3b — real code: api/routes/interview.js (trimmed).
// Screening is triggered at application time and on manual "Re-screen".

function requireJobSeeker(req, res, next) {
  if (req.user.role !== "JobSeeker") {
    return res.status(403).json({ message: "Only job seekers can apply for jobs." });
  }
  next();
}

async function buildAndStoreScreening(applicationId, userId, jobId) {
  const job = loadJob(jobId);                                  // jobs + company meta
  const profile = loadUserProfile(userId);                     // profile_json unpacked
  const { analysis } = loadCvAnalysis(userId);                 // LLM/heuristic CV JSON
  const screening = await screenApplication({ job, profile, cvAnalysis: analysis });
  run(`UPDATE applications SET screening_json = ?, match_score = ?, fit_tier = ?
       WHERE id = ?`,
      [JSON.stringify(screening), screening.matchScore, screening.fitTier, applicationId]);
  return screening;                                            // explainable payload
}

// POST /api/ApplyJob/ApplyJob/:jobId
router.post("/ApplyJob/:jobId", authMiddleware, requireJobSeeker, async (req, res) => {
  const job = loadJob(req.params.jobId);
  if (!job) return res.status(404).json({ message: "Job not found." });

  const existing = queryOne(
    "SELECT id, status FROM applications WHERE user_id = ? AND job_id = ?",
    [req.user.userId, req.params.jobId]);
  if (existing) return res.json({ data: { ...existing, alreadyApplied: true } });

  const id = runAndGetId(
    "INSERT INTO applications (user_id, job_id, status) VALUES (?, ?, ?)",
    [req.user.userId, req.params.jobId, "Submitted"]);

  let screening = null;
  try {
    screening = await buildAndStoreScreening(id, req.user.userId, req.params.jobId);
  } catch (err) {                       // never fail the application on AI outage
    screening = computeHeuristicScreening({ job, profile: ..., cvAnalysis: ... });
    run(`UPDATE applications SET screening_json = ?, match_score = ?, fit_tier = ?
         WHERE id = ?`, [JSON.stringify(screening), screening.matchScore, screening.fitTier, id]);
  }

  if (job.employerId) {
    createNotification({                 // recruiter sees score immediately
      userId: job.employerId,
      title: "New application",
      message: `A candidate applied for ${job.title}. AI match score: ${screening?.matchScore ?? "N/A"}.`,
      type: "application", relatedId: id,
    });
  }

  res.json({ data: { id, status: "Submitted", matchScore: screening?.matchScore ?? null,
                     fitTier: screening?.fitTier ?? null, screening } });
});
```

---

## Snippet 4 – Database Schema

Status: **adapted / generated for PostgreSQL**. The shipped MVP creates the same
tables in SQLite via `sql.js` (`api/db.js`), which is why the production columns
are preserved verbatim below (SQLite `AUTOINCREMENT` → `SERIAL`, `REAL` →
`NUMERIC`). `screening_results` is a **proposed normalisation**: today the
explanation JSON, score and tier are stored as columns *inside* `applications`
(`screening_json`, `match_score`, `fit_tier`), so extracting a results table is a
refactor rather than current behaviour.

```sql
-- Snippet 4 — PostgreSQL DDL: real columns from api/db.js, PostgreSQL-syntax.
-- GENERATED adaptation + normative screening_results table (see header note).

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,                      -- bcrypt (cost 10), never plaintext
  role          TEXT NOT NULL DEFAULT 'JobSeeker'   -- JobSeeker | Employer | Admin
                CHECK (role IN ('JobSeeker', 'Employer', 'Admin')),
  profile_json  TEXT,                               -- skills/experience/education payload
  user_name TEXT, first_name TEXT, last_name TEXT, phone TEXT,
  bio TEXT, linkedin_url TEXT, github_url TEXT, portfolio_url TEXT,
  location TEXT, headline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT, summary TEXT,
  job_type    TEXT, salary_range TEXT, location TEXT, deadline TEXT, category TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE applications (                          -- one seeker per job
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id         INTEGER NOT NULL REFERENCES jobs(id)  ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'Submitted',  -- Submitted|Interview|Accepted|Rejected
  hr_comment     TEXT,                               -- visible to the applicant
  screening_json TEXT,                               -- full explainable payload (MVP storage)
  match_score    NUMERIC(5,2),                       -- 0-100 composite score
  fit_tier       TEXT,                               -- excellent|strong|moderate|weak|poor
  decided_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);

CREATE TABLE resumes (                               -- "cvs" in the MVP schema
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_path     TEXT,                                -- uploads/cvs/<uuid>.pdf (10 MB cap)
  file_name     TEXT,
  analysis_json TEXT,                                -- LLM/heuristic extraction result
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROPOSED normalisation of the screening output (not yet extracted in the MVP).
CREATE TABLE screening_results (
  id             SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  match_score    NUMERIC(5,2) NOT NULL,
  fit_tier       TEXT NOT NULL,
  requirement_json TEXT NOT NULL,                    -- [{skill, matched}] matrix
  strengths_json   TEXT,                             -- human-readable evidence
  gaps_json        TEXT,                             -- missing requirements
  reasoning      TEXT,                               -- free-text explanation trace
  source         TEXT NOT NULL DEFAULT 'profile',    -- 'profile' | 'assisted'
  screened_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, screened_at)               -- full re-screen audit trail
);

CREATE INDEX idx_applications_job_score
  ON applications (job_id, match_score DESC);        -- serves the ranked shortlist
```

---

## Snippet 5 – Recruiter's AI-Ranked Shortlist (React)

Real code: `src/components/pages/EmployerApplicationsPage.jsx` (ranked card +
match ring) and `EmployerApplicationReviewPage.jsx` (explanation panel / skill
matrix). Note the files are **JSX, not TSX** — typed interfaces are the
recommended migration. Tailwind utility classes produce the score badges; the
match ring is a hand-rolled SVG gauge (no Material-UI).

```jsx
// Snippet 5 — real code: EmployerApplicationsPage.jsx + EmployerApplicationReviewPage.jsx.
// Deterministic score colour thresholds mirror the FIT_TIERS bands (snippet 2).

const scoreColor = (score) => {
  if (score == null) return "#9CA3AF";
  if (score >= 85) return "#1B4332";   // excellent
  if (score >= 70) return "#2D6A4F";   // strong
  if (score >= 55) return "#C26A42";   // moderate
  if (score >= 40) return "#D97706";   // weak
  return "#9CA3AF";                    // poor / unknown
};

const MatchRing = ({ score, size = 56 }) => {
  const value = score == null ? null : Math.max(0, Math.min(100, Number(score)));
  const stroke = 5, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const offset = value == null ? c : c - (value / 100) * c;
  const color = scoreColor(value);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="#F1E4DC" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
                strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-poppins-semibold" style={{ color }}>
          {value == null ? "—" : Math.round(value)}
        </span>
        <span className="mt-0.5 text-[9px] uppercase tracking-wide text-gray-400">match</span>
      </div>
    </div>
  );
};

// Ranked card body (renderCard, trimmed): rank badge, tier badge, AI verdict.
<article className="group relative overflow-hidden rounded-3xl border ... bg-white p-5">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div className="flex min-w-0 flex-1 items-start gap-4">
      <MatchRing score={application.matchScore} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {rank != null && (
            <span className="... bg-[#FFF2EA] ... text-[#C26A42]">
              <Trophy className="h-3 w-3" />
              #{rank}{application.totalInJob ? ` of ${application.totalInJob}` : ""}
            </span>
          )}
          {tierLabel && (
            <span className={`... ${tierStyles[tier] || "bg-gray-100 text-gray-700"}`}>
              {tierLabel}
            </span>
          )}
        </div>
        <h2 className="truncate text-lg font-poppins-semibold text-[#1B1B1B]">{name}</h2>
        {summary && <p className="mt-2 line-clamp-2 text-sm ...">{summary}</p>}
        {application.recommendation && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#7A3E1D]">
            <Sparkles className="h-3.5 w-3.5" />
            AI: {application.recommendation}
          </p>
        )}
      </div>
    </div>
  </div>
</article>

// Explanation panel: the per-requirement met/not-met matrix (review page).
{skillMatches.length > 0 && (
  <Section icon={UserCheck} title="Skill match matrix">
    <div className="flex flex-wrap gap-2">
      {skillMatches.map((item, i) => {
        const skill = typeof item === "string" ? item : item.skill;
        const matched = typeof item === "string" ? true : Boolean(item.matched);
        return (
          <span key={`${skill}-${i}`}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  matched
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                    : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}>
            {matched ? "✓ " : "✗ "}{skill}
          </span>
        );
      })}
    </div>
  </Section>
)}
```

---

## Snippet 6 – Security: Hashing, JWT Verification, Input Limits

Real code, trimmed from `api/routes/auth.js`, `api/middleware/auth.js` (full
listing appeared in Snippet 3a), `api/routes/cv.js` and `api/index.js`. Passwords
are bcrypt-hashed at cost 10 and never logged; requests are constrained by body
and upload limits; validation is field-presence + role allow-lists (no ORM
sanitisation layer — parameterised SQL statements are used throughout `db.js`).

```javascript
// Snippet 6a — real code: bcrypt hashing + login verification (api/routes/auth.js).

const allowedRoles = new Set(["JobSeeker", "Employer", "Admin"]);

router.post("/Register", async (req, res) => {
  const { email, password, confirmPassword, userType, userName, firstName, lastName } = req.body;
  const role = normalizeRole(req.body.role || userType);   // whitelists the role string

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
  if (existing) return res.status(400).json({ message: "Email already registered." });

  const passwordHash = await bcrypt.hash(password, 10);     // cost factor 10
  const userId = runAndGetId(
    "INSERT INTO users (email, password_hash, role, user_name, first_name, last_name) " +
    "VALUES (?, ?, ?, ?, ?, ?)",
    [email.toLowerCase(), passwordHash, role, userName || email, firstName || null, lastName || null]);

  const token = signToken({ userId, email: email.toLowerCase(), role, userName });
  res.status(201).json({ token, role, userType: role, message: "Registration successful." });
});

router.post("/Login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }
  const user = queryOne("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
  if (!user) return res.status(400).json({ message: "Invalid email or password." });
  // Identical error text for unknown email vs wrong password: no user enumeration.

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(400).json({ message: "Invalid email or password." });

  const token = signToken({ userId: user.id, email: user.email, role: user.role,
                            userName: user.user_name || user.email });
  res.json({ token, role: user.role, isAdmin: user.role === "Admin", user: publicUser(user) });
});
```

```javascript
// Snippet 6b — real code: request/upload limits and provider-key hygiene.

// api/index.js — body size ceiling to blunt oversized-payload abuse.
app.use(express.json({ limit: "5mb" }));

// api/routes/cv.js — file-type-less, size-capped, randomised storage names.
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },          // 10 MB CV cap
});

// api/services/ai.js — API keys are masked in every admin-facing response.
function maskKeyInitials(apiKey) {
  if (!apiKey || typeof apiKey !== "string") return "—";
  const key = apiKey.trim();
  if (key.length < 10) return "••••";
  return `${key.slice(0, 3)}…${key.slice(-4)}`;     // e.g. "sk-…abc1", never the full key
}

// Public health endpoint exposes readiness only — no vendor names or model ids.
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ai: getPublicAiStatus() });   // { ready: true|false }
});
```

---

## Mapping of snippets to report sections

| Snippet | Source | Report section |
|---|---|---|
| 1 | generated (spaCy microservice spec) | Design — NLP service |
| 2 | `api/services/screening.js` (+ 2b generated) | Matching & explainability |
| 3 | `api/middleware/auth.js`, `api/routes/interview.js` | API design |
| 4 | `api/db.js` adapted to PostgreSQL (+ proposed table) | Data model |
| 5 | `src/components/pages/Employer*Page.jsx` | UI implementation |
| 6 | `api/routes/auth.js`, `cv.js`, `index.js`, `services/ai.js` | Security considerations |
