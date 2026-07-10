/**
 * Demo seed for HORAI Labs — single-company recruitment portal.
 * Safe to call on every boot: upserts by email / company name.
 */
import bcrypt from "bcryptjs";
import { queryOne, run, runAndGetId, saveDb } from "./db.js";

export const SEED_CREDENTIALS = {
  company: "HORAI Labs",
  accounts: {
    admin: {
      email: "admin@horailabs.com",
      password: "Admin123!",
      role: "Admin",
      note: "System admin dashboard",
    },
    hr: {
      email: "hr@horailabs.com",
      password: "HrDemo123!",
      role: "Employer",
      note: "HR / hiring desk for HORAI Labs",
    },
    perfectSeeker: {
      email: "aisha.okello@gmail.com",
      password: "SeekerDemo123!",
      role: "JobSeeker",
      note: "Strong match for Senior Full-Stack Engineer",
    },
    weakSeeker: {
      email: "sam.mwangi@gmail.com",
      password: "SeekerDemo123!",
      role: "JobSeeker",
      note: "Weaker match (marketing background) for engineering role",
    },
  },
};

const PERFECT_PROFILE = {
  education: [
    {
      degree: "BSc Computer Science",
      institution: "University of Nairobi",
      year: "2020",
    },
  ],
  experience: [
    {
      title: "Full-Stack Engineer",
      company: "TechBridge Africa",
      duration: "2021 – Present",
      description: "Built React + Node platforms serving 50k users.",
    },
    {
      title: "Junior Software Developer",
      company: "Nairobi Softworks",
      duration: "2019 – 2021",
      description: "REST APIs, PostgreSQL, CI/CD.",
    },
  ],
  projects: [
    {
      name: "TalentFlow",
      description: "Applicant tracking prototype with skill matching.",
    },
  ],
  skills: [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "Express",
    "PostgreSQL",
    "SQL",
    "Docker",
    "REST API",
    "Agile",
  ],
};

const PERFECT_CV_ANALYSIS = {
  summary:
    "Full-stack engineer with deep React and Node.js experience, strong product sense, and proven delivery of production web platforms.",
  skills: PERFECT_PROFILE.skills,
  experience: PERFECT_PROFILE.experience,
  education: PERFECT_PROFILE.education,
  projects: PERFECT_PROFILE.projects,
  strengths: [
    "End-to-end product delivery",
    "Modern React architecture",
    "Backend API design",
    "Clear technical communication",
  ],
  suggestions: ["Highlight cloud certifications if available"],
  suggestedProfile: {
    headline: "Senior Full-Stack Engineer · React & Node.js",
    bio: "I build reliable web products from UX to API. Looking to join HORAI Labs engineering.",
    location: "Nairobi, Kenya",
  },
};

const WEAK_PROFILE = {
  education: [{ degree: "BA Marketing", institution: "Kenyatta University", year: "2018" }],
  experience: [
    {
      title: "Marketing Coordinator",
      company: "Bright Ads Ltd",
      duration: "2019 – Present",
      description: "Campaigns, social media, content calendars.",
    },
  ],
  projects: [],
  skills: ["Marketing", "SEO", "Content Writing", "Communication", "Excel"],
};

const WEAK_CV_ANALYSIS = {
  summary: "Marketing professional focused on campaigns and content; limited software engineering exposure.",
  skills: WEAK_PROFILE.skills,
  experience: WEAK_PROFILE.experience,
  education: WEAK_PROFILE.education,
  projects: [],
  strengths: ["Campaign planning", "Written communication"],
  suggestions: ["Gain foundational coding skills if targeting engineering roles"],
  suggestedProfile: {
    headline: "Marketing Coordinator",
    bio: "Brand storytelling and digital campaigns.",
    location: "Nairobi, Kenya",
  },
};

const JOBS = [
  {
    title: "Senior Full-Stack Engineer",
    category: "1",
    department: "Engineering",
    jobType: "1",
    salary: "KES 250,000 – 350,000 / month",
    location: "Nairobi · Hybrid",
    deadline: "2026-12-31",
    summary: "Ship product features across React and Node for HORAI Labs platforms.",
    description: `Department: Engineering

About the role
Join HORAI Labs to design and build the systems that power how we hire and grow our team. You will own features end-to-end across React frontends and Node.js services.

What you'll do
- Build and maintain production web applications
- Design REST APIs and data models
- Collaborate with product and design on delivery

What we look for
- Strong JavaScript/TypeScript, React, and Node.js
- Experience with SQL databases and Docker
- Clear written and verbal communication
- 3+ years building web products`,
  },
  {
    title: "Data Scientist",
    category: "2",
    department: "Data & Insights",
    jobType: "1",
    salary: "KES 220,000 – 320,000 / month",
    location: "Nairobi · Hybrid",
    deadline: "2026-12-15",
    summary: "Turn hiring and product data into actionable models for HORAI Labs.",
    description: `Department: Data & Insights

About the role
Help HORAI Labs understand candidate quality signals and product analytics with rigorous, ethical data science.

What you'll do
- Build models and dashboards for recruitment outcomes
- Partner with engineering on data pipelines
- Present insights to hiring leadership

What we look for
- Python, SQL, statistics, and machine learning fundamentals
- Clear storytelling with data
- Experience with real-world messy datasets`,
  },
  {
    title: "Product Manager",
    category: "3",
    department: "Product",
    jobType: "1",
    salary: "KES 200,000 – 300,000 / month",
    location: "Nairobi · Hybrid",
    deadline: "2026-11-30",
    summary: "Own the roadmap for HORAI Labs hiring and people products.",
    description: `Department: Product

About the role
Define problems, prioritize solutions, and ship value for applicants and hiring teams inside HORAI Labs.

What we look for
- Product sense and stakeholder management
- Ability to write crisp requirements
- Experience shipping B2B or internal tools`,
  },
  {
    title: "UX Designer",
    category: "4",
    department: "Design",
    jobType: "1",
    salary: "KES 180,000 – 260,000 / month",
    location: "Nairobi · Hybrid",
    deadline: "2026-11-30",
    summary: "Craft clear, human application and hiring experiences for HORAI Labs.",
    description: `Department: Design

About the role
Design flows that make applying and reviewing applications feel simple and fair.

What we look for
- Portfolio of UX/UI work (Figma)
- User research and interaction design skills
- Collaboration with engineering and product`,
  },
  {
    title: "Marketing Specialist",
    category: "5",
    department: "Growth",
    jobType: "1",
    salary: "KES 150,000 – 220,000 / month",
    location: "Nairobi · On-site",
    deadline: "2026-12-20",
    summary: "Grow awareness of HORAI Labs careers and employer brand.",
    description: `Department: Growth

About the role
Run campaigns that attract high-quality applicants to open roles at HORAI Labs.

What we look for
- Content, SEO, and campaign experience
- Strong writing and channel experimentation
- Comfort measuring results`,
  },
];

async function ensureUser({ email, password, role, firstName, lastName, headline, bio, location, phone, profileJson }) {
  const existing = queryOne("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
  const passwordHash = await bcrypt.hash(password, 10);

  if (existing) {
    run(
      `UPDATE users SET
        password_hash = ?,
        role = ?,
        user_name = ?,
        first_name = ?,
        last_name = ?,
        headline = COALESCE(?, headline),
        bio = COALESCE(?, bio),
        location = COALESCE(?, location),
        phone = COALESCE(?, phone),
        profile_json = COALESCE(?, profile_json)
       WHERE id = ?`,
      [
        passwordHash,
        role,
        email.split("@")[0],
        firstName,
        lastName,
        headline || null,
        bio || null,
        location || null,
        phone || null,
        profileJson ? JSON.stringify(profileJson) : null,
        existing.id,
      ],
    );
    return existing.id;
  }

  return runAndGetId(
    `INSERT INTO users (
      email, password_hash, role, user_name, first_name, last_name,
      headline, bio, location, phone, profile_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      email.toLowerCase(),
      passwordHash,
      role,
      email.split("@")[0],
      firstName,
      lastName,
      headline || null,
      bio || null,
      location || null,
      phone || null,
      profileJson ? JSON.stringify(profileJson) : null,
    ],
  );
}

function ensureCv(userId, fileName, analysis) {
  const existing = queryOne("SELECT id FROM cvs WHERE user_id = ?", [userId]);
  const payload = JSON.stringify(analysis);
  if (existing) {
    run("UPDATE cvs SET file_name = ?, analysis_json = ? WHERE id = ?", [fileName, payload, existing.id]);
    return existing.id;
  }
  return runAndGetId(
    "INSERT INTO cvs (user_id, file_path, file_name, analysis_json) VALUES (?, ?, ?, ?)",
    [userId, `seed://${fileName}`, fileName, payload],
  );
}

function ensureCompany(employerId) {
  const existing = queryOne("SELECT id FROM companies WHERE company_name = ? LIMIT 1", ["HORAI Labs"]);
  if (existing) {
    run(
      `UPDATE companies SET
        description = ?,
        industry = ?,
        website = ?,
        location = ?,
        employer_id = ?
       WHERE id = ?`,
      [
        "HORAI Labs builds intelligent tools for fairer, faster hiring. This portal is our internal careers and recruitment system.",
        "Technology · HR Tech",
        "https://horailabs.example",
        "Nairobi, Kenya",
        employerId,
        existing.id,
      ],
    );
    return existing.id;
  }

  return runAndGetId(
    `INSERT INTO companies (company_name, description, industry, website, location, employer_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "HORAI Labs",
      "HORAI Labs builds intelligent tools for fairer, faster hiring. This portal is our internal careers and recruitment system.",
      "Technology · HR Tech",
      "https://horailabs.example",
      "Nairobi, Kenya",
      employerId,
    ],
  );
}

function ensureJobs(companyId) {
  for (const job of JOBS) {
    const existing = queryOne(
      "SELECT id FROM jobs WHERE company_id = ? AND title = ? LIMIT 1",
      [companyId, job.title],
    );
    if (existing) {
      run(
        `UPDATE jobs SET
          description = ?, summary = ?, job_type = ?, salary_range = ?,
          location = ?, deadline = ?, category = ?
         WHERE id = ?`,
        [
          job.description,
          job.summary,
          job.jobType,
          job.salary,
          job.location,
          job.deadline,
          job.category,
          existing.id,
        ],
      );
    } else {
      runAndGetId(
        `INSERT INTO jobs (company_id, title, description, summary, job_type, salary_range, location, deadline, category)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          job.title,
          job.description,
          job.summary,
          job.jobType,
          job.salary,
          job.location,
          job.deadline,
          job.category,
        ],
      );
    }
  }
}

function migrateSeedEmail(fromEmail, toEmail) {
  const oldRow = queryOne("SELECT id FROM users WHERE email = ?", [fromEmail.toLowerCase()]);
  if (!oldRow) return;
  const conflict = queryOne("SELECT id FROM users WHERE email = ?", [toEmail.toLowerCase()]);
  if (conflict) return; // gmail account already exists; leave both (ensureUser refreshes gmail row)
  run("UPDATE users SET email = ? WHERE id = ?", [toEmail.toLowerCase(), oldRow.id]);
}

export async function seedDemoData() {
  try {
    // Rename older demo addresses → gmail (idempotent)
    migrateSeedEmail("aisha.okello@demo.horailabs.com", SEED_CREDENTIALS.accounts.perfectSeeker.email);
    migrateSeedEmail("sam.mwangi@demo.horailabs.com", SEED_CREDENTIALS.accounts.weakSeeker.email);

    // Keep legacy admin if present; always ensure HORAI admin
    await ensureUser({
      email: SEED_CREDENTIALS.accounts.admin.email,
      password: SEED_CREDENTIALS.accounts.admin.password,
      role: "Admin",
      firstName: "System",
      lastName: "Admin",
      headline: "HORAI Labs Administrator",
    });

    const hrId = await ensureUser({
      email: SEED_CREDENTIALS.accounts.hr.email,
      password: SEED_CREDENTIALS.accounts.hr.password,
      role: "Employer",
      firstName: "Grace",
      lastName: "Kamau",
      headline: "Head of Talent · HORAI Labs",
      bio: "I lead hiring for HORAI Labs across engineering, product, design, and growth.",
      location: "Nairobi, Kenya",
      phone: "+254 700 000 001",
    });

    const companyId = ensureCompany(hrId);
    ensureJobs(companyId);

    const perfectId = await ensureUser({
      email: SEED_CREDENTIALS.accounts.perfectSeeker.email,
      password: SEED_CREDENTIALS.accounts.perfectSeeker.password,
      role: "JobSeeker",
      firstName: "Aisha",
      lastName: "Okello",
      headline: "Senior Full-Stack Engineer · React & Node.js",
      bio: "I build reliable web products from UX to API. Excited to join HORAI Labs engineering.",
      location: "Nairobi, Kenya",
      phone: "+254 700 000 010",
      profileJson: PERFECT_PROFILE,
    });
    ensureCv(perfectId, "aisha-okello-cv.pdf", PERFECT_CV_ANALYSIS);

    const weakId = await ensureUser({
      email: SEED_CREDENTIALS.accounts.weakSeeker.email,
      password: SEED_CREDENTIALS.accounts.weakSeeker.password,
      role: "JobSeeker",
      firstName: "Sam",
      lastName: "Mwangi",
      headline: "Marketing Coordinator",
      bio: "Brand storytelling and digital campaigns.",
      location: "Nairobi, Kenya",
      profileJson: WEAK_PROFILE,
    });
    ensureCv(weakId, "sam-mwangi-cv.pdf", WEAK_CV_ANALYSIS);

    saveDb();
    console.log("Seed ready: HORAI Labs + demo accounts (see SEED_CREDENTIALS.md)");
  } catch (err) {
    console.warn("Seed failed:", err.message);
  }
}

export default seedDemoData;
