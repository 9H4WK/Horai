import initSqlJs from "sql.js";
import fs from "fs";

const SQL = await initSqlJs();
const buf = fs.readFileSync("data/searchera.sqlite");
const db = new SQL.Database(buf);

const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
console.log("tables", tables[0]?.values);

const apps = db.exec("SELECT * FROM applications");
console.log("apps columns", apps[0]?.columns);
console.log("apps rows", apps[0]?.values);

const users = db.exec("SELECT id, email, role FROM users");
console.log("users", users[0]?.values);

const jobs = db.exec("SELECT id, title, company_id FROM jobs");
console.log("jobs", jobs[0]?.values);

const cos = db.exec("SELECT id, company_name, employer_id FROM companies");
console.log("companies", cos[0]?.values);

const cvs = db.exec("SELECT id, user_id, file_name, length(analysis_json) as len FROM cvs");
console.log("cvs", cvs[0]?.values);

const notif = db.exec("SELECT * FROM notifications LIMIT 5");
console.log("notifications", notif[0]?.values ?? "empty");
