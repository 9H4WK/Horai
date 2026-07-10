import { Router } from "express";
import { queryAll, queryOne } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/GetEmploymentRate", (_req, res) => {
  const accepted = queryOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Accepted'")?.count || 0;
  const total = queryOne("SELECT COUNT(*) as count FROM applications")?.count || 0;
  const rate = total ? Math.round((accepted / total) * 100) : 0;

  res.json({ data: { accepted, total, rate } });
});

router.get("/GetApplicationsDistribution", (_req, res) => {
  const rows = queryAll("SELECT status as label, COUNT(*) as value FROM applications GROUP BY status ORDER BY status");
  res.json({ data: rows, items: rows });
});

router.get("/GetTopSkills", (_req, res) => {
  res.json({
    data: [
      { label: "React", value: 12 },
      { label: "Node.js", value: 10 },
      { label: "SQL", value: 8 },
      { label: "Communication", value: 7 },
    ],
  });
});

export default router;
