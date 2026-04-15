/**
 * API modul Laporan Keuangan — BAS, jurnal, saldo.
 * Base: /api (dipasang di server.js sebagai app.use("/api", ...))
 */
"use strict";

const express = require("express");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const kode = require("../controllers/lkKodeAkunController");
const jurnal = require("../controllers/lkJurnalController");
const saldo = require("../controllers/lkSaldoController");
const bku = require("../controllers/lkBkuController");
const lra = require("../controllers/lkLraController");
const neraca = require("../controllers/lkNeracaController");
const asetTetap = require("../controllers/lkAsetTetapController");
const kewajiban = require("../controllers/lkKewajibanController");
const persediaan = require("../controllers/lkPersediaanController");
const lo = require("../controllers/lkLoController");
const lpe = require("../controllers/lkLpeController");
const penyusutan = require("../controllers/lkPenyusutanController");
const lak = require("../controllers/lkLakController");
const calk = require("../controllers/lkCalkController");
const lkDash = require("../controllers/lkDashboardController");
const lkSync = require("../controllers/lkSyncController");
const lkGen = require("../controllers/lkGeneratorController");

const LK_READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const LK_WRITE = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"];
const LRA_KUNCI = ["SUPER_ADMIN", "PPK-SKPD", "PPK_SKPD"];

const router = express.Router();
router.use(verifyToken);

router.get("/kode-akun/tree", allowRoles(LK_READ), kode.tree);
router.get("/kode-akun/detail", allowRoles(LK_READ), kode.detail);
router.get("/kode-akun/saldo", allowRoles(LK_READ), kode.saldoByKode);
router.get("/kode-akun", allowRoles(LK_READ), kode.list);

router.post("/saldo-akun/recalculate/:tahun", allowRoles(LK_WRITE), saldo.recalculate);
router.get("/saldo-akun/:tahun/:bulan", allowRoles(LK_READ), saldo.byTahunBulan);
router.get("/saldo-akun/:tahun", allowRoles(LK_READ), saldo.byTahun);

router.post("/jurnal/:id/post", allowRoles(LK_WRITE), jurnal.post);
router.post("/jurnal/:id/void", allowRoles(LK_WRITE), jurnal.void);
router.get("/jurnal/:id", allowRoles(LK_READ), jurnal.getById);
router.put("/jurnal/:id", allowRoles(LK_WRITE), jurnal.update);
router.post("/jurnal", allowRoles(LK_WRITE), jurnal.create);
router.get("/jurnal", allowRoles(LK_READ), jurnal.list);

router.get("/bku/ringkasan/:tahun/:bulan", allowRoles(LK_READ), bku.ringkasan);
router.get("/bku/saldo-akhir/:tahun/:bulan", allowRoles(LK_READ), bku.saldoAkhir);
router.get("/bku/cetak/:tahun/:bulan", allowRoles(LK_READ), bku.cetak);
router.get("/bku/up/:tahun", allowRoles(LK_READ), bku.listUp);
router.post("/bku/up", allowRoles(LK_WRITE), bku.createUp);
router.post("/bku/sync-sigap", allowRoles(LK_WRITE), bku.syncSigap);
router.post("/bku/preview-jurnal", allowRoles(LK_READ), bku.previewJurnal);
router.get("/bku/rekonsiliasi/:tahun/:bulan", allowRoles(LK_READ), bku.rekonsiliasiKas);
router.get("/bku", allowRoles(LK_READ), bku.list);
router.post("/bku", allowRoles(LK_WRITE), bku.create);
router.get("/bku/:id", allowRoles(LK_READ), bku.getById);
router.put("/bku/:id", allowRoles(LK_WRITE), bku.update);

router.get("/lra/:tahun/perbandingan", allowRoles(LK_READ), lra.perbandingan);
router.post("/lra/:tahun/generate", allowRoles(LK_WRITE), lra.generate);
router.post("/lra/:tahun/kunci", allowRoles(LRA_KUNCI), lra.kunci);
router.get("/lra/:tahun/crosscheck", allowRoles(LK_READ), lra.crosscheck);
router.get("/lra/:tahun/export", allowRoles(LK_READ), lra.export);
router.get("/lra/:tahun", allowRoles(LK_READ), lra.list);

router.post("/neraca/:tahun/generate", allowRoles(LK_WRITE), neraca.generate);
router.get("/neraca/:tahun/perbandingan", allowRoles(LK_READ), neraca.perbandingan);
router.post("/neraca/:tahun/kunci", allowRoles(LRA_KUNCI), neraca.kunci);
router.get("/neraca/:tahun/export", allowRoles(LK_READ), neraca.export);
router.get("/neraca/:tahun", allowRoles(LK_READ), neraca.list);

router.get(
  "/aset-tetap/penyusutan/:tahun",
  allowRoles(LK_READ),
  asetTetap.penyusutanTahun,
);
router.get("/aset-tetap", allowRoles(LK_READ), asetTetap.list);
router.post("/aset-tetap", allowRoles(LK_WRITE), asetTetap.create);
router.put("/aset-tetap/:id", allowRoles(LK_WRITE), asetTetap.update);

router.get("/kewajiban", allowRoles(LK_READ), kewajiban.list);
router.post("/kewajiban", allowRoles(LK_WRITE), kewajiban.create);

router.get("/persediaan/:tahun", allowRoles(LK_READ), persediaan.listByTahun);
router.post("/persediaan", allowRoles(LK_WRITE), persediaan.create);
router.put("/persediaan/:id", allowRoles(LK_WRITE), persediaan.update);

router.post("/lo/:tahun/generate", allowRoles(LK_WRITE), lo.generate);
router.post("/lo/:tahun/kunci", allowRoles(LRA_KUNCI), lo.kunci);
router.get("/lo/:tahun", allowRoles(LK_READ), lo.list);

router.post("/lpe/:tahun/generate", allowRoles(LK_WRITE), lpe.generate);
router.post("/lpe/:tahun/kunci", allowRoles(LRA_KUNCI), lpe.kunci);
router.get("/lpe/:tahun/validasi", allowRoles(LK_READ), lpe.validasi);
router.get("/lpe/:tahun", allowRoles(LK_READ), lpe.list);

router.get("/penyusutan/:tahun/preview", allowRoles(LK_READ), penyusutan.preview);
router.post("/penyusutan/:tahun/proses", allowRoles(LK_WRITE), penyusutan.proses);

router.post("/lak/:tahun/generate", allowRoles(LK_WRITE), lak.generate);
router.get("/lak/:tahun/validasi", allowRoles(LK_READ), lak.validasi);
router.get("/lak/:tahun/export", allowRoles(LK_READ), lak.exportData);
router.post("/lak/:tahun/kunci", allowRoles(LRA_KUNCI), lak.kunci);
router.get("/lak/:tahun", allowRoles(LK_READ), lak.list);

router.get("/calk/:tahun/status", allowRoles(LK_READ), calk.status);
router.get("/calk/:tahun/preview", allowRoles(LK_READ), calk.preview);
router.post("/calk/:tahun/generate-all", allowRoles(LK_WRITE), calk.generateAll);
router.post(
  "/calk/:tahun/bab/:template_id/refresh-data",
  allowRoles(LK_WRITE),
  calk.refreshBabData,
);
router.get("/calk/:tahun/:template_id", allowRoles(LK_READ), calk.getBab);
router.put("/calk/:tahun/:template_id", allowRoles(LK_WRITE), calk.putBab);
router.get("/calk/:tahun", allowRoles(LK_READ), calk.listTahun);

router.get("/lk/dashboard/:tahun", allowRoles(LK_READ), lkDash.dashboard);
router.post("/lk/sync-kinerja", allowRoles(LK_WRITE), lkSync.syncKinerja);

router.get("/lk/:tahun/validasi", allowRoles(LK_READ), lkGen.validasi);
router.post("/lk/:tahun/generate-pdf", allowRoles(LK_WRITE), lkGen.generatePdf);
router.get("/lk/:tahun/download-pdf", allowRoles(LK_READ), lkGen.downloadPdf);
router.get("/lk/:tahun/riwayat-generate", allowRoles(LK_READ), lkGen.riwayat);
router.post("/lk/:tahun/finalisasi", allowRoles(LRA_KUNCI), lkGen.finalisasi);
router.get("/lk/:tahun/preview-html", allowRoles(LK_READ), lkGen.previewHtml);

module.exports = router;
