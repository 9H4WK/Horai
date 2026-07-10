import "dotenv/config";
import jwt from "jsonwebtoken";

const BASE = "http://localhost:5000";
const JWT_SECRET = process.env.JWT_SECRET || "searchera-local-secret-key-2024";

function tokenFor(userId, role, email) {
  return jwt.sign({ userId, role, email, userName: email }, JWT_SECRET, { expiresIn: "1h" });
}

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

const employer = tokenFor(3, "Employer", "rm@horai.com");
const seeker = tokenFor(2, "JobSeeker", "bireyo7839@epaynine.com");

console.log("--- Notifications (employer) ---");
let r = await api("/api/Notification/GetUserNotifications", { token: employer });
console.log(r.status, Array.isArray(r.data?.data) ? `count=${r.data.data.length}` : r.data);

console.log("--- All applications (employer) ---");
r = await api("/api/ApplyJob/AllApplications", { token: employer });
console.log(r.status, "total", r.data?.total ?? r.data?.data?.length);
const apps = r.data?.data || [];
if (apps[0]) {
  console.log("sample:", {
    id: apps[0].id,
    name: apps[0].applicantName,
    matchScore: apps[0].matchScore,
    fitTier: apps[0].fitTier,
    rankInJob: apps[0].rankInJob,
    status: apps[0].status,
  });
}

const target = apps.find((a) => String(a.status).toLowerCase() === "submitted") || apps[0];
if (!target) {
  console.error("No application to test");
  process.exit(1);
}

console.log("--- GetApplication", target.id, "---");
r = await api(`/api/ApplyJob/GetApplication/${target.id}`, { token: employer });
console.log(r.status, {
  matchScore: r.data?.data?.matchScore,
  hrComment: r.data?.data?.hrComment,
  rankInJob: r.data?.data?.rankInJob,
});

console.log("--- Reject with comment ---");
r = await api(`/api/ApplyJob/RejectApplication/${target.id}`, {
  method: "POST",
  token: employer,
  body: { comment: "Thank you for applying. We need more cloud experience for this role." },
});
console.log(r.status, r.data);

console.log("--- Seeker notifications ---");
r = await api("/api/Notification/GetUserNotifications", { token: seeker });
console.log(r.status, r.data?.data?.slice?.(0, 2) || r.data);

console.log("--- Seeker application view ---");
r = await api(`/api/ApplyJob/GetApplication/${target.id}`, { token: seeker });
console.log(r.status, {
  status: r.data?.data?.status,
  hrComment: r.data?.data?.hrComment,
});

// Re-open as submitted then accept to leave DB usable? Prefer leave rejected for realism.
// Accept another if available
const other = apps.find((a) => a.id !== target.id && String(a.status).toLowerCase() === "submitted");
if (other) {
  console.log("--- Accept with comment", other.id, "---");
  r = await api(`/api/ApplyJob/AcceptApplication/${other.id}`, {
    method: "POST",
    token: employer,
    body: { comment: "Great profile — we'd like to schedule a final interview next week." },
  });
  console.log(r.status, r.data);
}

console.log("DONE");
