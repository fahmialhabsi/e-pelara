// middlewares/verifyToken.js

const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token =
    req.cookies?.token || // JWT via cookie (HttpOnly) -- best practice
    (req.header("Authorization") &&
      req.header("Authorization").replace("Bearer ", ""));

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token tidak ditemukan atau salah format." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      role_id: decoded.role_id,
      divisions_id: decoded.divisions_id,
      opd: decoded.opd_penanggung_jawab,
      bidang_opd_penanggung_jawab: decoded.bidang_opd_penanggung_jawab,
      tahun: decoded.tahun, // tambahan
      periode_id: decoded.periode_id, // tambahan
    };
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};
module.exports = verifyToken;
