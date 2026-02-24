const jwt = require("jsonwebtoken");

const normalizeRole = (role) =>
  typeof role === "string"
    ? role.trim().toUpperCase().replace(/\s+/g, "_")
    : "";

const allowRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!Array.isArray(allowedRoles)) {
        throw new Error("allowedRoles must be an array");
      }

      const authHeader = req.header("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ message: "Token tidak ditemukan atau salah format." });
      }

      const token = authHeader.replace("Bearer ", "");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const userRole = normalizeRole(decoded.role);
      const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

      if (!normalizedAllowedRoles.includes(userRole)) {
        return res
          .status(403)
          .json({ message: "Akses ditolak. Role tidak diizinkan." });
      }

      req.user = decoded; // attach user info to request
      next();
    } catch (error) {
      console.error("[allowRoles]", error.message);
      return res
        .status(401)
        .json({ message: "Token tidak valid atau telah kadaluarsa." });
    }
  };
};

module.exports = allowRoles;
