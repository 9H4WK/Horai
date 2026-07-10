import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import fs from "fs";
import { queryOne, run, runAndGetId, saveDb } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { analyzeCV } from "../services/ai.js";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads", "cvs");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authMiddleware);

async function extractPdfText(filePath) {
  const parser = new PDFParse({ data: fs.readFileSync(filePath) });
  try {
    const result = await parser.getText();
    return result.text || "";
  } finally {
    await parser.destroy();
  }
}

function requireJobSeeker(req, res, next) {
  if (req.user.role !== "JobSeeker") {
    return res.status(403).json({ message: "Only job seekers can upload a CV." });
  }
  next();
}

// POST /api/Profile/UploadCV
router.post("/UploadCV", requireJobSeeker, upload.single("CVFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    let textContent = "";

    if (fileName.toLowerCase().endsWith(".pdf")) {
      textContent = await extractPdfText(filePath);
    } else {
      textContent = fs.readFileSync(filePath, "utf-8");
    }

    const analysis = await analyzeCV(textContent);

    // Delete old CV if exists
    const old = queryOne("SELECT id, file_path FROM cvs WHERE user_id = ?", [req.user.userId]);
    if (old) {
      try { fs.unlinkSync(old.file_path); } catch {}
      run("DELETE FROM cvs WHERE id = ?", [old.id]);
    }

    const cvId = runAndGetId(
      "INSERT INTO cvs (user_id, file_path, file_name, analysis_json) VALUES (?, ?, ?, ?)",
      [req.user.userId, filePath, fileName, JSON.stringify(analysis)]
    );

    res.json({
      message: "CV uploaded successfully.",
      data: {
        id: cvId,
        fileName,
        downloadUrl: `/api/uploads/cvs/${path.basename(filePath)}`,
        analysis,
      },
    });
  } catch (err) {
    console.error("UploadCV error:", err);
    res.status(500).json({ message: err.message || "Failed to upload CV." });
  }
});

// GET /api/Profile/GetCVData
router.get("/GetCVData", (req, res) => {
  const cv = queryOne("SELECT id, file_path, file_name, analysis_json, created_at FROM cvs WHERE user_id = ?", [req.user.userId]);
  if (!cv) {
    return res.json({ data: null, message: "No CV found." });
  }

  res.json({
    data: {
      id: cv.id,
      fileName: cv.file_name,
      downloadUrl: `/api/uploads/cvs/${path.basename(cv.file_path)}`,
      analysis: cv.analysis_json ? JSON.parse(cv.analysis_json) : null,
      createdAt: cv.created_at,
    },
  });
});

export default router;
