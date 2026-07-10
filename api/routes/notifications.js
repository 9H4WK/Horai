import { Router } from "express";
import { queryAll, queryOne, run, runAndGetId } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

function mapNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    notificationId: row.id,
    userId: row.user_id,
    title: row.title || "Notification",
    message: row.message,
    type: row.type || "info",
    isRead: Boolean(row.is_read),
    relatedId: row.related_id,
    createdAt: row.created_at,
    // ASP.NET-style aliases for older clients
    Title: row.title || "Notification",
    Message: row.message,
    IsRead: Boolean(row.is_read),
    CreatedAt: row.created_at,
    NotificationType: row.type || "info",
  };
}

export function createNotification({ userId, title, message, type = "info", relatedId = null }) {
  if (!userId || !message) return null;
  const id = runAndGetId(
    `INSERT INTO notifications (user_id, title, message, type, is_read, related_id)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [userId, title || "Notification", message, type, relatedId],
  );
  return id;
}

// GET /api/Notification/GetUserNotifications
router.get("/GetUserNotifications", authMiddleware, (req, res) => {
  const rows = queryAll(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`,
    [req.user.userId],
  );
  const data = rows.map(mapNotification);
  res.json({ data, items: data });
});

// GET /api/Notification/GetDetailForNotification/:id
router.get("/GetDetailForNotification/:id", authMiddleware, (req, res) => {
  const row = queryOne(
    "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.userId],
  );
  if (!row) return res.status(404).json({ message: "Notification not found." });

  if (!row.is_read) {
    run("UPDATE notifications SET is_read = 1 WHERE id = ?", [row.id]);
    row.is_read = 1;
  }

  res.json({ data: mapNotification(row) });
});

// POST /api/Notification/SendNotification/:id  (id = target user id)
router.post("/SendNotification/:id", authMiddleware, (req, res) => {
  if (req.user.role !== "Employer" && req.user.role !== "Admin") {
    return res.status(403).json({ message: "Only employers or admins can send notifications." });
  }

  const targetUserId = Number(req.params.id);
  const message = String(req.body?.message || req.body?.Message || "").trim();
  const title = String(req.body?.title || req.body?.Title || "Message").trim();
  const type = String(req.body?.type || req.body?.Type || "info").trim();

  if (!targetUserId || !message) {
    return res.status(400).json({ message: "Target user and message are required." });
  }

  const target = queryOne("SELECT id FROM users WHERE id = ?", [targetUserId]);
  if (!target) return res.status(404).json({ message: "User not found." });

  const id = createNotification({
    userId: targetUserId,
    title,
    message,
    type,
    relatedId: req.body?.relatedId || null,
  });

  res.status(201).json({ message: "Notification sent.", data: { id } });
});

// POST /api/Notification/MarkAllRead
router.post("/MarkAllRead", authMiddleware, (req, res) => {
  run("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [req.user.userId]);
  res.json({ message: "All notifications marked as read." });
});

export default router;
