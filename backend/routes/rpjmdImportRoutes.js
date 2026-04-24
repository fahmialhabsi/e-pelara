"use strict";

const express = require("express");
const multer = require("multer");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const ctrl = require("../controllers/rpjmdImportController");

const roles = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const uploadIndikatorXlsx = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.post(
  "/indikator/preview",
  verifyToken,
  allowRoles(roles),
  uploadIndikatorXlsx.single("file"),
  ctrl.previewIndikatorImport
);
router.post("/indikator/apply", verifyToken, allowRoles(roles), ctrl.applyIndikatorImport);

router.get("/summary/:periodeId", verifyToken, allowRoles(roles), ctrl.getSummary);
router.get("/summary", verifyToken, allowRoles(roles), ctrl.getSummary);

router.get("/urusan-kinerja/:periodeId", verifyToken, allowRoles(roles), ctrl.listUrusanKinerja);
router.get("/urusan-kinerja", verifyToken, allowRoles(roles), ctrl.listUrusanKinerja);

router.get("/apbd-proyeksi/:periodeId", verifyToken, allowRoles(roles), ctrl.listApbdProyeksi);
router.get("/apbd-proyeksi", verifyToken, allowRoles(roles), ctrl.listApbdProyeksi);

router.get("/tujuan-sasaran/:periodeId", verifyToken, allowRoles(roles), ctrl.listTujuanSasaran);
router.get("/tujuan-sasaran", verifyToken, allowRoles(roles), ctrl.listTujuanSasaran);

router.get("/arah-kebijakan/:periodeId", verifyToken, allowRoles(roles), ctrl.listArahKebijakan);
router.get("/arah-kebijakan", verifyToken, allowRoles(roles), ctrl.listArahKebijakan);

router.get("/iku/:periodeId", verifyToken, allowRoles(roles), ctrl.listIku);
router.get("/iku", verifyToken, allowRoles(roles), ctrl.listIku);

router.post("/urusan-kinerja/:periodeId", verifyToken, allowRoles(roles), ctrl.createUrusanKinerja);
router.put("/urusan-kinerja/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.updateUrusanKinerja);
router.delete("/urusan-kinerja/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.deleteUrusanKinerja);

router.post("/apbd-proyeksi/:periodeId", verifyToken, allowRoles(roles), ctrl.createApbdProyeksi);
router.put("/apbd-proyeksi/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.updateApbdProyeksi);
router.delete("/apbd-proyeksi/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.deleteApbdProyeksi);

router.post("/tujuan-sasaran/:periodeId", verifyToken, allowRoles(roles), ctrl.createTujuanSasaran);
router.put("/tujuan-sasaran/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.updateTujuanSasaran);
router.delete("/tujuan-sasaran/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.deleteTujuanSasaran);

router.post("/arah-kebijakan/:periodeId", verifyToken, allowRoles(roles), ctrl.createArahKebijakan);
router.put("/arah-kebijakan/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.updateArahKebijakan);
router.delete("/arah-kebijakan/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.deleteArahKebijakan);

router.post("/iku/:periodeId", verifyToken, allowRoles(roles), ctrl.createIku);
router.put("/iku/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.updateIku);
router.delete("/iku/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.deleteIku);

router.get("/indikator-tujuan/:periodeId", verifyToken, allowRoles(roles), ctrl.listIndikatorTujuan);
router.get("/indikator-tujuan", verifyToken, allowRoles(roles), ctrl.listIndikatorTujuan);
router.post("/indikator-tujuan/:periodeId", verifyToken, allowRoles(roles), ctrl.createIndikatorTujuan);
router.put("/indikator-tujuan/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.updateIndikatorTujuan);
router.delete("/indikator-tujuan/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.deleteIndikatorTujuan);

router.get("/indikator-sasaran/:periodeId", verifyToken, allowRoles(roles), ctrl.listIndikatorSasaran);
router.get("/indikator-sasaran", verifyToken, allowRoles(roles), ctrl.listIndikatorSasaran);
router.post("/indikator-sasaran/:periodeId", verifyToken, allowRoles(roles), ctrl.createIndikatorSasaran);
router.put("/indikator-sasaran/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.updateIndikatorSasaran);
router.delete("/indikator-sasaran/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.deleteIndikatorSasaran);

router.get("/indikator-strategi/:periodeId", verifyToken, allowRoles(roles), ctrl.listIndikatorStrategi);
router.get("/indikator-strategi", verifyToken, allowRoles(roles), ctrl.listIndikatorStrategi);
router.post("/indikator-strategi/:periodeId", verifyToken, allowRoles(roles), ctrl.createIndikatorStrategi);
router.put("/indikator-strategi/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.updateIndikatorStrategi);
router.delete("/indikator-strategi/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.deleteIndikatorStrategi);

router.get("/indikator-arah-kebijakan/:periodeId", verifyToken, allowRoles(roles), ctrl.listIndikatorArahKebijakan);
router.get("/indikator-arah-kebijakan", verifyToken, allowRoles(roles), ctrl.listIndikatorArahKebijakan);
router.post("/indikator-arah-kebijakan/:periodeId", verifyToken, allowRoles(roles), ctrl.createIndikatorArahKebijakan);
router.put("/indikator-arah-kebijakan/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.updateIndikatorArahKebijakan);
router.delete("/indikator-arah-kebijakan/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.deleteIndikatorArahKebijakan);

router.get("/indikator-program/:periodeId", verifyToken, allowRoles(roles), ctrl.listIndikatorProgram);
router.get("/indikator-program", verifyToken, allowRoles(roles), ctrl.listIndikatorProgram);
router.post("/indikator-program/:periodeId", verifyToken, allowRoles(roles), ctrl.createIndikatorProgram);
router.put("/indikator-program/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.updateIndikatorProgram);
router.delete("/indikator-program/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.deleteIndikatorProgram);

router.get("/indikator-kegiatan/:periodeId", verifyToken, allowRoles(roles), ctrl.listIndikatorKegiatan);
router.get("/indikator-kegiatan", verifyToken, allowRoles(roles), ctrl.listIndikatorKegiatan);
router.post("/indikator-kegiatan/:periodeId", verifyToken, allowRoles(roles), ctrl.createIndikatorKegiatan);
router.put("/indikator-kegiatan/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.updateIndikatorKegiatan);
router.delete("/indikator-kegiatan/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.deleteIndikatorKegiatan);

router.get("/indikator-sub-kegiatan/:periodeId", verifyToken, allowRoles(roles), ctrl.listIndikatorSubKegiatan);
router.get("/indikator-sub-kegiatan", verifyToken, allowRoles(roles), ctrl.listIndikatorSubKegiatan);
router.post("/indikator-sub-kegiatan/:periodeId", verifyToken, allowRoles(roles), ctrl.createIndikatorSubKegiatan);
router.put("/indikator-sub-kegiatan/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.updateIndikatorSubKegiatan);
router.delete("/indikator-sub-kegiatan/:periodeId/:id", verifyToken, allowRoles(roles), ctrl.deleteIndikatorSubKegiatan);

module.exports = router;
