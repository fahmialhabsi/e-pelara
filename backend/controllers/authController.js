const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op, ForeignKeyConstraintError } = require("sequelize");
const { User, Role, Division, PeriodeRpjmd } = require("../models");
const {
  getPlanContextForTenant,
  planFieldsForJwt,
} = require("../helpers/subscriptionPlanFeatures");

// Register
const register = async (req, res) => {
  const { username, email, password, role_id, divisions_id, opd } = req.body;
  const roleId = parseInt(role_id, 10);
  const divisionId = parseInt(divisions_id, 10);

  if (
    !username ||
    !email ||
    !password ||
    !roleId ||
    isNaN(roleId) ||
    !divisionId ||
    isNaN(divisionId) ||
    !opd
  ) {
    return res.status(400).json({
      message:
        "Username, email, password, role_id, divisions_id, dan opd wajib diisi dan valid.",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password minimal 8 karakter." });
  }

  try {
    const roleExists = await Role.findByPk(roleId);
    if (!roleExists)
      return res
        .status(400)
        .json({ message: `Role dengan ID ${roleId} tidak ditemukan.` });

    const divisionExists = await Division.findByPk(divisionId);
    if (!divisionExists)
      return res
        .status(400)
        .json({ message: `Divisi dengan ID ${divisionId} tidak ditemukan.` });

    const existingUser = await User.findOne({
      where: { [Op.or]: [{ username }, { email }] },
    });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Username atau email sudah terdaftar." });
    }

    // Only one SUPER ADMIN
    if (roleId === 1) {
      const superAdminCount = await User.count({ where: { role_id: 1 } });
      if (superAdminCount > 0) {
        return res.status(409).json({
          message: "Hanya ada satu SUPER ADMIN yang dapat terdaftar.",
        });
      }
    }

    // Ambil periode aktif berdasarkan tahun sekarang
    const tahunSekarang = new Date().getFullYear();
    const periode = await PeriodeRpjmd.findOne({
      where: {
        tahun_awal: { [Op.lte]: tahunSekarang },
        tahun_akhir: { [Op.gte]: tahunSekarang },
      },
    });

    if (!periode) {
      return res.status(400).json({
        message:
          "Periode RPJMD aktif tidak ditemukan untuk tahun saat ini. Silakan hubungi admin.",
      });
    }

    const tenantIdRaw = req.body?.tenant_id != null ? parseInt(String(req.body.tenant_id), 10) : 1;
    const tenant_id = Number.isFinite(tenantIdRaw) && tenantIdRaw > 0 ? tenantIdRaw : 1;

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role_id: roleId,
      divisions_id: divisionId,
      opd,
      periode_id: periode.id,
      tenant_id,
    });

    const division = await Division.findByPk(divisionId);

    const planCtx = await getPlanContextForTenant(newUser.tenant_id);
    const payload = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: roleExists.name,
      role_id: newUser.role_id,
      divisions_id: newUser.divisions_id,
      opd_penanggung_jawab: newUser.opd,
      bidang_opd_penanggung_jawab: division?.name,
      tahun: periode.tahun_awal,
      periode_id: periode.id,
      tenant_id: newUser.tenant_id,
      ...planFieldsForJwt(planCtx),
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 3600 * 1000,
    });

    res.status(201).json({
      message: "Registrasi berhasil!",
      token: accessToken,
      refreshToken,
      user: payload,
    });
  } catch (error) {
    console.error("[AuthController register]", error);
    if (error instanceof ForeignKeyConstraintError) {
      return res
        .status(400)
        .json({ message: "ID Role, Divisi, atau Periode tidak valid." });
    }
    res.status(500).json({ message: "Terjadi kesalahan di server." });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({
      where: { email },
      include: [
        { association: "role", attributes: ["name"] },
        { association: "division", attributes: ["name"] },
        { association: "periode", attributes: ["id", "tahun_awal"] },
      ],
    });

    if (!user)
      return res.status(400).json({ message: "Pengguna tidak ditemukan." });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(400).json({ message: "Kredensial tidak valid." });

    // Jika user belum punya periode terkait, isi otomatis
    if (!user.periode_id) {
      const tahunSekarang = new Date().getFullYear();
      const periodeAktif = await PeriodeRpjmd.findOne({
        where: {
          tahun_awal: { [Op.lte]: tahunSekarang },
          tahun_akhir: { [Op.gte]: tahunSekarang },
        },
      });

      if (!periodeAktif) {
        return res.status(400).json({
          message:
            "User tidak memiliki periode RPJMD dan tidak ditemukan periode aktif.",
        });
      }

      await user.update({ periode_id: periodeAktif.id });
      user.periode = periodeAktif; // inject agar bisa dipakai di payload
    }

    const tenantIdForPlan =
      user.tenant_id != null && Number(user.tenant_id) > 0
        ? Number(user.tenant_id)
        : 1;
    const planCtx = await getPlanContextForTenant(tenantIdForPlan);
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role?.name,
      role_id: user.role_id,
      divisions_id: user.divisions_id,
      opd_penanggung_jawab: user.opd,
      bidang_opd_penanggung_jawab: user.division?.name,
      tahun: user.periode?.tahun_awal,
      periode_id: user.periode?.id,
      tenant_id: tenantIdForPlan,
      ...planFieldsForJwt(planCtx),
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 3600 * 1000,
    });

    res.json({
      message: "Login berhasil!",
      token: accessToken,
      refreshToken,
      user: payload,
    });
  } catch (error) {
    console.error("[AuthController login]", error);
    res.status(500).json({ message: "Terjadi kesalahan di server." });
  }
};

// Refresh Token Handler — segarkan klaim paket dari DB
const refreshToken = async (req, res) => {
  const rt = req.cookies?.refreshToken;
  if (!rt) return res.status(401).json({ message: "Refresh token missing" });

  try {
    const decoded = jwt.verify(rt, process.env.JWT_REFRESH_SECRET);
    const { iat, exp, ...rest } = decoded;
    const tid =
      rest.tenant_id != null && Number(rest.tenant_id) > 0
        ? Number(rest.tenant_id)
        : 1;
    const planCtx = await getPlanContextForTenant(tid);
    const userPayload = { ...rest, ...planFieldsForJwt(planCtx) };
    const newAccessToken = jwt.sign(userPayload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });
    res.json({
      accessToken: newAccessToken,
      user: {
        plan_code: planCtx.plan_code,
        plan_nama: planCtx.plan_nama,
        plan_features: planCtx.plan_features,
      },
    });
  } catch (err) {
    if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Invalid refresh token" });
    }
    console.error("[AuthController refreshToken]", err);
    return res.status(500).json({ message: "Terjadi kesalahan di server." });
  }
};

const GENERIC_FORGOT_MESSAGE =
  "Jika email terdaftar, permintaan reset telah diproses. Sistem ini belum mengirim email otomatis; gunakan tautan reset yang ditampilkan (mode pengembangan) atau reset lewat skrip admin.";

/** Basis URL frontend untuk tautan reset: prioritas Origin browser, lalu env. */
function resolvePublicFrontendBase(req) {
  const origin = req.get("origin");
  if (origin && /^https?:\/\//i.test(origin)) {
    return origin.replace(/\/+$/, "");
  }
  const referer = req.get("referer");
  if (referer && /^https?:\/\//i.test(referer)) {
    try {
      const u = new URL(referer);
      return `${u.protocol}//${u.host}`.replace(/\/+$/, "");
    } catch (_) {
      /* ignore */
    }
  }
  return (
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:5173"
  ).replace(/\/+$/, "");
}

/** Minta tautan reset (token berlaku 1 jam). Tanpa SMTP, di non-production respons menyertakan resetUrl. */
const forgotPassword = async (req, res) => {
  try {
    const email = (req.body?.email || "").trim();
    if (!email) {
      return res.status(400).json({ message: "Email wajib diisi." });
    }

    const user = await User.findOne({ where: { email } });

    let resetToken = null;
    if (user) {
      resetToken = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      await user.update({
        password_reset_token: resetToken,
        password_reset_expires: expires,
      });
    }

    const payload = { message: GENERIC_FORGOT_MESSAGE };

    if (user && resetToken && process.env.NODE_ENV !== "production") {
      const base = resolvePublicFrontendBase(req);
      payload.hint =
        "Email tidak dikirim (belum ada SMTP). Buka tautan di bawah di browser yang sama dengan aplikasi. Jika port salah, salin token lalu buka /reset-password dari URL frontend Anda.";
      payload.resetUrl = `${base.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(
        resetToken,
      )}&email=${encodeURIComponent(email)}`;
    }

    return res.json(payload);
  } catch (error) {
    console.error("[AuthController forgotPassword]", error);
    const body = { message: "Terjadi kesalahan saat memproses permintaan." };
    if (process.env.NODE_ENV !== "production") {
      body.detail = error?.message;
      if (String(error?.message || "").includes("Unknown column")) {
        body.hint =
          "Jalankan migrasi DB: kolom password_reset_token / password_reset_expires belum ada di tabel users.";
      }
    }
    return res.status(500).json(body);
  }
};

/** Terapkan password baru dengan token dari lupa password. */
const resetPasswordWithToken = async (req, res) => {
  try {
    const email = (req.body?.email || "").trim();
    const token = (req.body?.token || "").trim();
    const password = req.body?.password;

    if (!email || !token) {
      return res
        .status(400)
        .json({ message: "Email dan token reset wajib diisi." });
    }
    if (!password || String(password).length < 8) {
      return res
        .status(400)
        .json({ message: "Password minimal 8 karakter." });
    }

    const user = await User.findOne({ where: { email } });
    if (
      !user ||
      !user.password_reset_token ||
      user.password_reset_token !== token
    ) {
      return res.status(400).json({
        message: "Token tidak valid atau sudah digunakan. Minta reset ulang.",
      });
    }
    if (
      !user.password_reset_expires ||
      new Date(user.password_reset_expires) <= new Date()
    ) {
      return res.status(400).json({
        message: "Token kedaluwarsa. Silakan minta reset password lagi.",
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    await user.update({
      password: hashedPassword,
      password_reset_token: null,
      password_reset_expires: null,
    });

    return res.json({ message: "Password berhasil diubah. Silakan login." });
  } catch (error) {
    console.error("[AuthController resetPasswordWithToken]", error);
    return res.status(500).json({ message: "Terjadi kesalahan di server." });
  }
};

// Logout endpoint - menghapus cookie
const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({ message: "Logout berhasil, token dihapus." });
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPasswordWithToken,
};
