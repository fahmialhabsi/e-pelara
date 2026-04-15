// middlewares/verifyToken.js

const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // Prioritaskan Authorization header, lalu cookie, lalu query param _token
  // Query param _token khusus untuk endpoint preview dokumen yang dibuka di tab baru
  const authHeader = req.header("Authorization");
  const token = authHeader
    ? authHeader.replace("Bearer ", "")
    : (req.cookies?.token || req.query?._token || null);

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token tidak ditemukan atau salah format." });
  }

  try {
    // Decode tanpa verifikasi untuk cek apakah ini SSO token (type: "sso")
    const unverified = jwt.decode(token);
    const isSsoToken = unverified && unverified.type === "sso";

    console.log(`[verifyToken] type=${unverified?.type || 'local'} isSso=${isSsoToken} ssoConfigured=${!!process.env.SSO_SHARED_SECRET} role=${unverified?.role || 'N/A'}`);

    let decoded;
    if (isSsoToken) {
      // SSO token dari SIGAP — verifikasi dengan SSO_SHARED_SECRET
      const ssoSecret = process.env.SSO_SHARED_SECRET;
      if (!ssoSecret) {
        console.error("[verifyToken] SSO_SHARED_SECRET tidak dikonfigurasi");
        return res
          .status(500)
          .json({ message: "Konfigurasi SSO tidak lengkap" });
      }
      decoded = jwt.verify(token, ssoSecret);
      console.log(`[verifyToken] SSO verified OK. role=${decoded.role}`);
    } else {
      // Token lokal e-Pelara — verifikasi dengan JWT_SECRET biasa
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    }

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
