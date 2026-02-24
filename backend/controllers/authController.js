const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op, ForeignKeyConstraintError } = require("sequelize");
const { User, Role, Division, PeriodeRpjmd } = require("../models");

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

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role_id: roleId,
      divisions_id: divisionId,
      opd,
      periode_id: periode.id,
    });

    const division = await Division.findByPk(divisionId);

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

// Refresh Token Handler
const refreshToken = (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken)
    return res.status(401).json({ message: "Refresh token missing" });

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid refresh token" });
    const { iat, exp, ...userPayload } = decoded;
    const newAccessToken = jwt.sign(userPayload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });
    res.json({ accessToken: newAccessToken });
  });
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

module.exports = { register, login, logout, refreshToken };
