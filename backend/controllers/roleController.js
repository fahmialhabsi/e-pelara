const { User, Role, Division } = require("../models");

// Create new role
exports.createRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    const newRole = await Role.create({ name, description });
    res.status(201).json(newRole);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating role" });
  }
};

// Get all roles
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ["id", "name", "description"],
      order: [["id", "ASC"]],
    });
    res.status(200).json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil data role." });
  }
};

// Get role by ID
exports.getRoleById = async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.id, 10);
    const currentUser = req.user;

    // Jika role-nya adalah PELAKSANA, hanya bisa melihat datanya sendiri
    if (
      currentUser.role === "PELAKSANA" &&
      currentUser.id !== requestedUserId
    ) {
      return res.status(403).json({
        message: "Akses ditolak: Anda tidak diizinkan melihat data user ini.",
      });
    }

    const user = await User.findByPk(requestedUserId, {
      include: [
        { model: Role, attributes: ["id", "name"] },
        { model: Division, attributes: ["id", "name"] },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error getting user by ID:", error);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan saat mengambil data user." });
  }
};

// Update role
exports.updateRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    const role = await Role.findByPk(req.params.id);
    if (role) {
      await role.update({ name, description });
      res.status(200).json(role);
    } else {
      res.status(404).json({ message: "Role not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating role" });
  }
};

// Delete role
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (role) {
      await role.destroy();
      res.status(200).json({ message: "Role deleted" });
    } else {
      res.status(404).json({ message: "Role not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting role" });
  }
};
