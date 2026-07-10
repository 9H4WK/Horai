/**
 * Quick OpenAI connectivity check (server-side).
 * Usage: node scripts/test-openai.mjs
 * Requires OPENAI_API_KEY in .env and AI_PROVIDER=openai (default).
 */
import "dotenv/config";
import { resetProvider, getProvider, getEmployerAiStatus, analyzeCV } from "../api/services/ai.js";

resetProvider();
const provider = getProvider();
const status = getEmployerAiStatus();

console.log("Employer-facing status:", status);

if (!provider) {
  console.log("\nFAIL: No provider. Set OPENAI_API_KEY in .env then re-run.");
  process.exit(1);
}

console.log("\nInternal provider:", provider.name, provider.model);

try {
  const sample = `
Jane Doe
Full-Stack Engineer
Skills: React, Node.js, TypeScript, PostgreSQL
Experience: Built hiring platforms at Acme (2021-2024)
Education: BSc Computer Science
`;
  const result = await analyzeCV(sample);
  console.log("\nCV analyze sample keys:", Object.keys(result));
  console.log("summary:", String(result.summary || "").slice(0, 160));
  console.log("skills:", result.skills?.slice?.(0, 6));
  console.log("\nOK: OpenAI path responded.");
} catch (e) {
  console.error("\nFAIL:", e.message);
  process.exit(1);
}
