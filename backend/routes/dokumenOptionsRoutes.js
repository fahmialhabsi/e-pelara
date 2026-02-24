const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const dokumenOptions = [
  { value: "RPJMD", label: "RPJMD" },
  { value: "Renstra", label: "Renstra" },
  { value: "RKPD", label: "RKPD" },
  { value: "Renja", label: "Renja" },
  { value: "Rka", label: "RKA" },
  { value: "DPA", label: "DPA" },
  { value: "Pengkeg", label: "Pengelolaan Kegiatan" },
  { value: "Monev", label: "Monitoring & Evaluasi" },
  { value: "lpk-dispang", label: "LPK Dispang" },
  { value: "lk-dispang", label: "LK Dispang" },
  { value: "Lakip", label: "LAKIP" },
  { value: "cloneData", label: "Clone Data Periode" },
];

const normalize = (val) =>
  typeof val === "string" ? val.trim().toUpperCase().replace(/\s+/g, "_") : "";

router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  (req, res) => {
    const userRole = normalize(req.user.role); // 🔍 Normalize role

    let filtered = dokumenOptions;

    // 🔒 Khusus pelaksana hanya tampilkan Renja & DPA
    if (userRole === "PELAKSANA") {
      filtered = dokumenOptions.filter((opt) =>
        ["Renja", "DPA"].includes(opt.value)
      );
    }

    // 🔒 Administrator dan Pengawas tidak bisa akses cloneData
    if (["ADMINISTRATOR", "PENGAWAS"].includes(userRole)) {
      filtered = filtered.filter((opt) => opt.value !== "cloneData");
    }

    res.json(filtered);
  }
);

module.exports = router;
