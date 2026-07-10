import dotenv from "dotenv";
import OpenAI from "openai";

const CV_ANALYSIS_SYSTEM_PROMPT =
  "You are a CV/resume analyzer. Extract structured information from the CV text and return a JSON object with these fields: summary (string), skills (array of strings), experience (array of {title, company, duration}), education (array of {degree, institution, year}), projects (array of {name, description}), strengths (array of strings), suggestions (array of strings), suggestedProfile (object with headline, bio, location, linkedinUrl, githubUrl, portfolioUrl when found). Return ONLY the raw JSON object with no markdown formatting, no code fences, and no extra text. Leave fields empty when not found so the user can fill or edit profile details after upload.";

const FALLBACK_ANALYSIS = {
  summary: "AI analysis unavailable.",
  skills: [],
  experience: [],
  education: [],
  projects: [],
  strengths: [],
  suggestions: [],
  suggestedProfile: {},
};

/** Reload .env so OPENAI_API_KEY changes take effect without a full redeploy cycle when process is restarted or re-read. */
function reloadEnv() {
  try {
    dotenv.config({ override: true });
  } catch {
    // ignore
  }
}

function maskKeyInitials(apiKey) {
  if (!apiKey || typeof apiKey !== "string") return "—";
  const key = apiKey.trim();
  if (key.length < 10) return "••••";
  // e.g. sk-…abc1  (never full key)
  return `${key.slice(0, 3)}…${key.slice(-4)}`;
}

function createOpenAIClient(apiKey) {
  if (!apiKey || !String(apiKey).trim()) return null;
  // Accept standard OpenAI keys (sk-…) and project keys
  return new OpenAI({ apiKey: String(apiKey).trim() });
}

function createGrokClient(apiKey) {
  if (!apiKey || !String(apiKey).trim()) return null;
  return new OpenAI({
    apiKey: String(apiKey).trim(),
    baseURL: process.env.GROK_BASE_URL || "https://api.x.ai/v1",
  });
}

/**
 * Prefer OpenAI. Optional AI_PROVIDER=grok for alternate backend.
 * Re-reads env each call so updating OPENAI_API_KEY in .env + process restart (or env reload) picks up the new key.
 */
function createProvider() {
  reloadEnv();

  const preferred = (process.env.AI_PROVIDER || "openai").toLowerCase().trim();
  const openaiKey = process.env.OPENAI_API_KEY || "";
  const grokKey = process.env.GROK_API_KEY || "";

  // Default / openai mode: only OpenAI — no silent alternate vendor
  if (preferred === "openai" || preferred === "" || preferred === "default") {
    const client = createOpenAIClient(openaiKey);
    if (client) {
      return {
        name: "openai",
        label: "Primary",
        initials: "OAI",
        client,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        keyInitials: maskKeyInitials(openaiKey),
      };
    }
    console.warn("AI: OPENAI_API_KEY not set. Screening assistant offline.");
    return null;
  }

  if (preferred === "grok") {
    const client = createGrokClient(grokKey);
    if (client) {
      return {
        name: "grok",
        label: "Alt",
        initials: "ALT",
        client,
        model: process.env.GROK_MODEL || "grok-2",
        keyInitials: maskKeyInitials(grokKey),
      };
    }
    console.warn("AI: Grok selected but GROK_API_KEY missing.");
    return null;
  }

  console.warn(`AI: Unknown AI_PROVIDER="${preferred}". Use openai or grok.`);
  return null;
}

// Short cache so we don't rebuild clients every request, but keys can refresh quickly
let cachedProvider = null;
let cachedAt = 0;
const CACHE_MS = 15_000;

export function getProvider() {
  const now = Date.now();
  if (!cachedProvider || now - cachedAt > CACHE_MS) {
    cachedProvider = createProvider();
    cachedAt = now;
  }
  return cachedProvider;
}

export function resetProvider() {
  cachedProvider = null;
  cachedAt = 0;
}

/** Public-safe: never expose vendor names or keys on open endpoints */
export function getPublicAiStatus() {
  const provider = getProvider();
  return {
    ready: Boolean(provider),
  };
}

/**
 * Employer/admin only status — generic wording, model + key initials.
 * Does not spell out third-party product names in the API response fields used by UI.
 */
export function getEmployerAiStatus() {
  const provider = getProvider();
  if (!provider) {
    return {
      connected: false,
      status: "offline",
      model: null,
      apiInitials: null,
      keyHint: null,
      message: "Screening assistant offline — set OPENAI_API_KEY in server .env",
    };
  }

  return {
    connected: true,
    status: "online",
    model: provider.model,
    apiInitials: provider.initials,
    keyHint: provider.keyInitials,
    message: "Screening assistant connected",
  };
}

// Backward-compatible internal info (server logs / tests only — do not send raw to public UI)
export function getProviderInfo() {
  const provider = getProvider();
  if (!provider) return { configured: false, provider: null, model: null };
  return {
    configured: true,
    provider: provider.name,
    model: provider.model,
    initials: provider.initials,
  };
}

export async function analyzeCV(cvText) {
  const provider = getProvider();
  if (!provider) {
    return { ...FALLBACK_ANALYSIS, summary: "Analysis unavailable — assistant not configured." };
  }

  const truncated = String(cvText || "").slice(0, 12000);
  if (!truncated.trim()) return { ...FALLBACK_ANALYSIS, summary: "No text content to analyze." };

  try {
    const body = {
      model: provider.model,
      messages: [
        { role: "system", content: CV_ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: truncated },
      ],
      max_tokens: 2000,
    };

    if (provider.name === "openai") {
      body.response_format = { type: "json_object" };
    }

    const completion = await provider.client.chat.completions.create(body);

    const raw = completion.choices[0]?.message?.content || "";
    const cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn(`AI analysis failed (${provider.name}):`, err.message);
    if (err.status) console.warn("Status:", err.status);
    return { ...FALLBACK_ANALYSIS, summary: "Analysis temporarily unavailable." };
  }
}

/**
 * Lightweight connectivity probe for employer status (does not leak errors to public).
 */
export async function probeAiConnection() {
  const provider = getProvider();
  if (!provider) {
    return { ok: false, ...getEmployerAiStatus() };
  }

  try {
    // Minimal chat probe — cheap model call
    const completion = await provider.client.chat.completions.create({
      model: provider.model,
      messages: [{ role: "user", content: 'Reply with JSON: {"ok":true}' }],
      max_tokens: 20,
    });
    const text = completion.choices[0]?.message?.content || "";
    const ok = /ok/i.test(text) || text.length > 0;
    return {
      ok,
      ...getEmployerAiStatus(),
      probed: true,
    };
  } catch (err) {
    console.warn("AI probe failed:", err.message);
    return {
      ok: false,
      connected: false,
      status: "error",
      model: provider.model,
      apiInitials: provider.initials,
      keyHint: provider.keyInitials,
      message: "Key present but request failed — check OPENAI_API_KEY",
      probed: true,
    };
  }
}
