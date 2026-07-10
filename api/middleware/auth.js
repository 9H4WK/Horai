import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "searchera-local-secret-key-2024";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = decoded;
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    authMiddleware(req, res, () => {
      if (req.user.role !== role && req.user.role !== "Admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    });
  };
}
