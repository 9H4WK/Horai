/**
 * Cross-platform first-run setup for people who clone the repo.
 * - Ensures .env exists (from .env.example)
 * - Ensures data/ and api/uploads/ directories exist
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

ensureDir(path.join(root, "data"));
ensureDir(path.join(root, "api", "uploads", "cvs"));
ensureDir(path.join(root, "api", "uploads", "logos"));

if (!fs.existsSync(examplePath)) {
  console.error("Missing .env.example — cannot scaffold .env");
  process.exit(1);
}

if (!fs.existsSync(envPath)) {
  let content = fs.readFileSync(examplePath, "utf8");
  // Give clones a unique local JWT so tokens aren't all identical
  const secret = crypto.randomBytes(24).toString("hex");
  content = content.replace(
    /JWT_SECRET=.*/,
    `JWT_SECRET=${secret}`,
  );
  fs.writeFileSync(envPath, content, "utf8");
  console.log("Created .env from .env.example (with a random JWT_SECRET).");
  console.log("Optional: add OPENAI_API_KEY to .env for live AI screening.");
} else {
  console.log(".env already exists — left unchanged.");
}

console.log("");
console.log("Next steps:");
console.log("  1. npm run api     # terminal 1 — API on http://localhost:5000");
console.log("  2. npm run dev     # terminal 2 — UI  on http://localhost:5173");
console.log("  3. Demo logins → SEED_CREDENTIALS.md");
console.log("");
