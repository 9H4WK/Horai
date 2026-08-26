import initSqlJs from "sql.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "searchera.sqlite");

let db = null;

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const filebuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'JobSeeker',
      profile_json TEXT,
      user_name TEXT,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      bio TEXT,
      linkedin_url TEXT,
      github_url TEXT,
      portfolio_url TEXT,
      location TEXT,
      headline TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.run("ALTER TABLE users ADD COLUMN profile_json TEXT");
  } catch {}

  try {
    db.run("ALTER TABLE users ADD COLUMN is_locked INTEGER DEFAULT 0");
  } catch {}

  try {
    db.run("ALTER TABLE users ADD COLUMN last_login_at DATETIME");
  } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      description TEXT,
      industry TEXT,
      website TEXT,
      location TEXT,
      logo_path TEXT,
      employer_id INTEGER,
      average_rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      summary TEXT,
      job_type TEXT,
      salary_range TEXT,
      location TEXT,
      deadline TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cvs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      file_path TEXT,
      file_name TEXT,
      analysis_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      job_id INTEGER NOT NULL,
      status TEXT DEFAULT 'Submitted',
      hr_comment TEXT,
      screening_json TEXT,
      match_score REAL,
      fit_tier TEXT,
      decided_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Lightweight migrations for existing SQLite files
  const applicationColumns = [
    ["hr_comment", "TEXT"],
    ["screening_json", "TEXT"],
    ["match_score", "REAL"],
    ["fit_tier", "TEXT"],
    ["decided_at", "DATETIME"],
  ];
  for (const [col, type] of applicationColumns) {
    try {
      db.run(`ALTER TABLE applications ADD COLUMN ${col} ${type}`);
    } catch {
      // column already exists
    }
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      related_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const notificationColumns = [
    ["title", "TEXT"],
    ["type", "TEXT"],
    ["related_id", "INTEGER"],
  ];
  for (const [col, type] of notificationColumns) {
    try {
      db.run(`ALTER TABLE notifications ADD COLUMN ${col} ${type}`);
    } catch {
      // column already exists
    }
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS interview_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      questions_json TEXT,
      answers_json TEXT,
      score REAL,
      status TEXT DEFAULT 'InProgress',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const adminEmail = process.env.ADMIN_EMAIL || "admin@searchera.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";
  const existingAdmin = queryOne("SELECT id FROM users WHERE email = ?", [adminEmail.toLowerCase()]);

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    db.run(
      "INSERT INTO users (email, password_hash, role, user_name, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)",
      [adminEmail.toLowerCase(), passwordHash, "Admin", "Admin", "System", "Admin"]
    );
  }

  saveDb();
  // Demo seed (HORAI Labs) is loaded from api/index.js after init to avoid circular imports
  return db;
}

export function getDb() {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export function queryAll(sql, params = []) {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

export function run(sql, params = []) {
  getDb().run(sql, params);
  saveDb();
}

export function runAndGetId(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
  const res = queryOne("SELECT last_insert_rowid() as id");
  saveDb();
  return res.id;
}

export default initDb;
