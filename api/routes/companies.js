import { Router } from "express";
import multer from "multer";
import { queryAll, queryOne, run, runAndGetId } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
const upload = multer();

function requireEmployer(req, res, next) {
  if (req.user.role !== "Employer" && req.user.role !== "Admin") {
    return res.status(403).json({ message: "Only employers can create companies." });
  }
  next();
}

function mapCompany(company) {
  if (!company) return null;
  return {
    ...company,
    companyId: company.id,
    companyName: company.company_name,
    CompanyName: company.company_name,
    employerId: company.employer_id,
    EmployerId: company.employer_id,
    averageRating: company.average_rating,
    reviewCount: company.review_count,
    createdAt: company.created_at,
  };
}

// GET /api/Company/GetAllCompanies
router.get("/GetAllCompanies", (req, res) => {
  const companies = queryAll("SELECT * FROM companies ORDER BY created_at DESC").map(mapCompany);
  res.json({ data: companies, items: companies });
});

// GET /api/Company/GetCompanyById/:id
router.get("/GetCompanyById/:id", (req, res) => {
  const company = queryOne("SELECT * FROM companies WHERE id = ?", [req.params.id]);
  if (!company) return res.status(404).json({ message: "Company not found." });
  res.json({ data: mapCompany(company) });
});

// GET /api/Company/GetMyCompany — employer workspace company
router.get("/GetMyCompany", authMiddleware, (req, res) => {
  if (req.user.role !== "Employer" && req.user.role !== "Admin") {
    return res.status(403).json({ message: "Only employers can access a company workspace." });
  }

  const company = queryOne(
    "SELECT * FROM companies WHERE employer_id = ? ORDER BY id ASC LIMIT 1",
    [req.user.userId],
  );

  if (!company) {
    return res.json({ data: null, message: "No company profile yet." });
  }

  res.json({ data: mapCompany(company) });
});

// POST /api/Company/AddCompany
router.post("/AddCompany", authMiddleware, requireEmployer, upload.none(), (req, res) => {
  const { CompanyName, Description, Industry, Website, Location } = req.body;
  if (!CompanyName) {
    return res.status(400).json({ message: "Company name is required." });
  }

  const id = runAndGetId(
    "INSERT INTO companies (company_name, description, industry, website, location, employer_id) VALUES (?, ?, ?, ?, ?, ?)",
    [CompanyName, Description || null, Industry || null, Website || null, Location || null, req.user.userId]
  );
  res.json({ message: "Company created.", data: { id, companyId: id } });
});

// GET /api/CompanyReview/GetCompanyDetailsById/:id
router.get("/GetCompanyDetailsById/:id", (req, res) => {
  const company = queryOne("SELECT * FROM companies WHERE id = ?", [req.params.id]);
  if (!company) return res.status(404).json({ message: "Company not found." });
  res.json({ data: mapCompany(company) });
});

// GET /api/CompanyReview/GetAllJobsForSpecificCompany/:id
router.get("/GetAllJobsForSpecificCompany/:id", (req, res) => {
  const jobs = queryAll("SELECT * FROM jobs WHERE company_id = ? ORDER BY created_at DESC", [req.params.id]);
  res.json({ data: jobs, items: jobs });
});

// GET /api/CompanyReview/GetCompanyReviews/:id
router.get("/GetCompanyReviews/:id", (req, res) => {
  res.json({ data: [], items: [] });
});

// POST /api/CompanyReview/AddCompanyReview
router.post("/AddCompanyReview", authMiddleware, (req, res) => {
  res.json({ message: "Review added." });
});

export default router;
