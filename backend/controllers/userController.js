const { User, Role, Division } = require("../models");
const bcrypt = require("bcryptjs");

// Create new user
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, role_id, divisions_id, opd } = req.body;

    // Validasi role_id
    const role = await Role.findByPk(role_id);
    if (!role) return res.status(400).json({ message: "Invalid role_id" });

    // Validasi divisions_id
    const division = await Division.findByPk(divisions_id);
    if (!division)
      return res.status(400).json({ message: "Invalid division_id" });

    // Validasi hanya satu SUPER ADMIN
    if (role_id === 1) {
      const count = await User.count({ where: { role_id: 1 } });
      if (count > 0) {
        return res.status(400).json({
          message: "Hanya ada satu SUPER ADMIN yang dapat terdaftar.",
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role_id,
      divisions_id,
      opd,
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating user" });
  }
};

// Check whether a SUPER ADMIN already exists
exports.checkSuperAdmin = async (req, res) => {
  try {
    const count = await User.count({ where: { role_id: 1 } });
    res.json({ exists: count > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error checking super admin" });
  }
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving users" });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.id, 10);
    const currentUser = req.user;

    // 💡 PELAKSANA hanya bisa melihat data dirinya sendiri
    const normalizedRole = currentUser.role?.toUpperCase().replace(/\s+/g, "_");

    if (normalizedRole === "PELAKSANA" && currentUser.id !== requestedUserId) {
      return res.status(403).json({
        message:
          "Akses ditolak. Anda hanya dapat melihat data milik Anda sendiri.",
      });
    }

    const user = await User.findByPk(requestedUserId, {
      include: [
        { model: Role, as: "role", attributes: ["id", "name"] },
        { model: Division, as: "division", attributes: ["id", "name"] },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    res.json(user);
  } catch (error) {
    console.error("[getUserById]", error);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan saat mengambil data user." });
  }
};

// Ambil data user yang sedang login
exports.getMe = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const user = await User.findByPk(currentUserId, {
      include: [
        { model: Role, as: "role", attributes: ["id", "name"] },
        { model: Division, as: "division", attributes: ["id", "name"] },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    res.json(user);
  } catch (error) {
    console.error("[getMe]", error);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan saat mengambil data profil." });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { username, email, password, role_id, divisions_id, opd } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Jika role diganti ke SUPER ADMIN, cek apakah sudah ada
    if (
      role_id === 1 &&
      user.role_id !== 1 &&
      (await User.count({ where: { role_id: 1 } })) > 0
    ) {
      return res.status(400).json({
        message: "Hanya ada satu SUPER ADMIN yang dapat terdaftar.",
      });
    }

    // Hash password jika diubah
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await user.update({
        username,
        email,
        password: hashed,
        role_id,
        divisions_id,
        opd,
      });
    } else {
      await user.update({ username, email, role_id, divisions_id, opd });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating user" });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    await user.destroy();
    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting user" });
  }
};
