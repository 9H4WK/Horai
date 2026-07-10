import { getProvider } from "./ai.js";

const FIT_TIERS = [
  { min: 85, tier: "excellent", label: "Excellent fit", recommendation: "Strongly recommend" },
  { min: 70, tier: "strong", label: "Strong fit", recommendation: "Recommend interview" },
  { min: 55, tier: "moderate", label: "Moderate fit", recommendation: "Review carefully" },
  { min: 40, tier: "weak", label: "Weak fit", recommendation: "Likely pass" },
  { min: 0, tier: "poor", label: "Poor fit", recommendation: "Not recommended" },
];

export function tierFromScore(score) {
  const n = Number(score) || 0;
  return FIT_TIERS.find((t) => n >= t.min) || FIT_TIERS[FIT_TIERS.length - 1];
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    return value.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function normalizeSkill(skill) {
  if (!skill) return "";
  if (typeof skill === "string") return skill.trim().toLowerCase();
  return String(skill.name || skill.skillName || skill.title || "").trim().toLowerCase();
}

function uniqueSkills(list) {
  const seen = new Set();
  const out = [];
  for (const item of asArray(list)) {
    const key = normalizeSkill(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(typeof item === "string" ? item.trim() : item.name || item.skillName || item.title || key);
  }
  return out;
}

function extractJobSkills(job = {}) {
  const text = [job.title, job.description, job.summary, job.category].filter(Boolean).join(" ");
  const known = [
    "javascript", "typescript", "react", "node", "node.js", "python", "java", "sql", "aws",
    "docker", "kubernetes", "machine learning", "data", "sales", "marketing", "excel",
    "communication", "leadership", "agile", "scrum", "figma", "ui/ux", "go", "c#",
    "postgresql", "mongodb", "etl", "spark", "airflow", "tableau", "powerbi",
  ];
  const found = known.filter((skill) => text.toLowerCase().includes(skill));
  return uniqueSkills(found);
}

function extractCandidateSkills(profile = {}, cvAnalysis = {}) {
  return uniqueSkills([
    ...asArray(profile.skills),
    ...asArray(profile.profileJson?.skills),
    ...asArray(cvAnalysis.skills),
  ]);
}

/**
 * Deterministic skill/profile overlap scoring used as primary or AI fallback.
 */
export function computeHeuristicScreening({ job, profile, cvAnalysis }) {
  const jobSkills = extractJobSkills(job);
  const candidateSkills = extractCandidateSkills(profile, cvAnalysis);
  const candidateSet = new Set(candidateSkills.map(normalizeSkill));

  const skillMatches = (jobSkills.length ? jobSkills : candidateSkills.slice(0, 8)).map((skill) => {
    const key = normalizeSkill(skill);
    const matched = candidateSet.has(key) ||
      [...candidateSet].some((c) => c.includes(key) || key.includes(c));
    return { skill, matched, source: matched ? "profile/cv" : "job requirement" };
  });

  const matchedCount = skillMatches.filter((s) => s.matched).length;
  const skillScore = jobSkills.length
    ? Math.round((matchedCount / Math.max(jobSkills.length, 1)) * 100)
    : Math.min(70, candidateSkills.length * 8);

  const hasExperience = asArray(profile.experience || profile.profileJson?.experience || cvAnalysis.experience).length > 0;
  const hasEducation = asArray(profile.education || profile.profileJson?.education || cvAnalysis.education).length > 0;
  const hasHeadline = Boolean(profile.headline || cvAnalysis.suggestedProfile?.headline);
  const hasBio = Boolean(profile.bio || cvAnalysis.summary);
  const profileBonus = [hasExperience, hasEducation, hasHeadline, hasBio].filter(Boolean).length * 4;

  const matchScore = Math.max(5, Math.min(98, Math.round(skillScore * 0.75 + profileBonus + (candidateSkills.length > 0 ? 8 : 0))));
  const tierMeta = tierFromScore(matchScore);

  const strengths = [];
  if (matchedCount > 0) strengths.push(`Matched ${matchedCount} role-relevant skill${matchedCount === 1 ? "" : "s"}`);
  if (hasExperience) strengths.push("Documented work experience");
  if (hasEducation) strengths.push("Education history available");
  if (Array.isArray(cvAnalysis.strengths)) strengths.push(...cvAnalysis.strengths.slice(0, 3));

  const gaps = skillMatches.filter((s) => !s.matched).map((s) => `Missing or unclear: ${s.skill}`).slice(0, 5);
  if (!hasExperience) gaps.push("Limited experience details on profile");
  if (!cvAnalysis?.summary && !profile.bio) gaps.push("No CV/profile summary available");

  return {
    matchScore,
    fitTier: tierMeta.tier,
    fitLabel: tierMeta.label,
    recommendation: tierMeta.recommendation,
    summary:
      cvAnalysis?.summary ||
      profile.bio ||
      `${profile.firstName || "Candidate"} shows a ${tierMeta.label.toLowerCase()} for ${job.title || "this role"} based on profile and CV signals.`,
    strengths: strengths.slice(0, 6),
    gaps: gaps.slice(0, 6),
    skillMatches,
    candidateSkills: candidateSkills.slice(0, 16),
    jobSkills: jobSkills.slice(0, 16),
    experienceFit: hasExperience
      ? "Experience signals present in profile/CV."
      : "Experience signals are thin — request more detail if advancing.",
    educationFit: hasEducation
      ? "Education history is on file."
      : "Education history not provided.",
    profileHighlights: [
      profile.headline,
      profile.location,
      profile.linkedIn || profile.linkedin_url,
    ].filter(Boolean),
    reasoning: `Profile screen weighted skill overlap (${skillScore}%) plus profile completeness.`,
    source: "profile",
    screenedAt: new Date().toISOString(),
  };
}

async function aiScreenCandidate({ job, profile, cvAnalysis, heuristic }) {
  const provider = getProvider();
  if (!provider) return null;

  const payload = {
    job: {
      title: job.title,
      description: String(job.description || "").slice(0, 2500),
      summary: job.summary,
      location: job.location,
      jobType: job.job_type || job.jobType,
      category: job.category,
    },
    candidate: {
      name: [profile.first_name || profile.firstName, profile.last_name || profile.lastName].filter(Boolean).join(" "),
      headline: profile.headline,
      bio: profile.bio,
      location: profile.location,
      skills: heuristic.candidateSkills,
      experience: profile.experience || profile.profileJson?.experience || cvAnalysis.experience || [],
      education: profile.education || profile.profileJson?.education || cvAnalysis.education || [],
      projects: profile.projects || profile.profileJson?.projects || cvAnalysis.projects || [],
      cvSummary: cvAnalysis.summary,
      cvStrengths: cvAnalysis.strengths,
    },
    heuristicBaseline: {
      matchScore: heuristic.matchScore,
      skillMatches: heuristic.skillMatches,
    },
  };

  try {
    const body = {
      model: provider.model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert technical recruiter. Score how well a candidate fits a job using their full profile and CV analysis. Return ONLY raw JSON with keys: matchScore (0-100 number), summary (string), strengths (string[]), gaps (string[]), recommendation (string), reasoning (string), experienceFit (string), educationFit (string), skillMatches (array of {skill, matched boolean}). Be fair, specific, and concise. No markdown.",
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
      max_tokens: 1200,
    };

    if (provider.name === "openai") {
      body.response_format = { type: "json_object" };
    }

    const completion = await provider.client.chat.completions.create(body);
    const raw = completion.choices[0]?.message?.content || "";
    const cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const matchScore = Math.max(0, Math.min(100, Number(parsed.matchScore) || heuristic.matchScore));
    const tierMeta = tierFromScore(matchScore);

    return {
      ...heuristic,
      matchScore,
      fitTier: tierMeta.tier,
      fitLabel: tierMeta.label,
      recommendation: parsed.recommendation || tierMeta.recommendation,
      summary: parsed.summary || heuristic.summary,
      strengths: asArray(parsed.strengths).length ? asArray(parsed.strengths).slice(0, 8) : heuristic.strengths,
      gaps: asArray(parsed.gaps).length ? asArray(parsed.gaps).slice(0, 8) : heuristic.gaps,
      skillMatches: Array.isArray(parsed.skillMatches) && parsed.skillMatches.length
        ? parsed.skillMatches
        : heuristic.skillMatches,
      experienceFit: parsed.experienceFit || heuristic.experienceFit,
      educationFit: parsed.educationFit || heuristic.educationFit,
      reasoning: parsed.reasoning || heuristic.reasoning,
      // Never expose vendor names to clients
      source: "assisted",
      screenedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("AI screening failed:", err.message);
    return null;
  }
}

/**
 * Full screening: heuristic always, AI enhancement when provider is available.
 */
export async function screenApplication({ job, profile, cvAnalysis }) {
  const heuristic = computeHeuristicScreening({ job, profile, cvAnalysis });
  const ai = await aiScreenCandidate({ job, profile, cvAnalysis, heuristic });
  return ai || heuristic;
}

// Re-export provider accessor for health checks if needed
export { getProvider } from "./ai.js";
