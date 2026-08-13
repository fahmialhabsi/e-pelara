'use strict';

const express = require('express');
const controller = require('../controllers/prosnpController');
const b1x = require('../controllers/prosnpB1xController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const { uploadSingle } = require('../middlewares/prosnpUpload');

const router = express.Router();
const READ = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const ADMIN = ['SUPER_ADMIN', 'ADMINISTRATOR'];
const WRITE = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PELAKSANA'];
const REVIEW = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS'];
const INPUT = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PROSN_INPUT'];

router.get('/periode', verifyToken, allowRoles(READ), controller.listPeriode);
router.get('/konteks', verifyToken, allowRoles(READ), controller.getKonteks);
router.post('/periode', verifyToken, allowRoles(ADMIN), controller.createPeriode);
router.patch('/periode/:id', verifyToken, allowRoles(ADMIN), controller.updatePeriode);
router.get('/periode/:id', verifyToken, allowRoles(READ), controller.getPeriode);
router.post('/periode/:id/indikator', verifyToken, allowRoles(ADMIN), controller.createIndikator);
router.post('/periode/:id/inisialisasi-indikator', verifyToken, allowRoles(ADMIN), controller.initializeIndikator);
router.post('/periode/:id/aktifkan', verifyToken, allowRoles(ADMIN), controller.activatePeriode);
router.post('/periode/:id/arsipkan', verifyToken, allowRoles(INPUT), controller.archivePeriode);
router.post('/periode/:id/buka-kembali', verifyToken, allowRoles(ADMIN), controller.reopenPeriode);
router.post('/periode/:id/siap-ekspor', verifyToken, allowRoles(ADMIN), controller.siapkanEksporPeriode);
router.get('/periode/:id/ekspor/excel', verifyToken, allowRoles(READ), controller.exportExcel);
router.get('/periode/:id/ekspor/b13-template-nasional', verifyToken, allowRoles(READ), controller.exportB13TemplateNasional);
router.get('/periode/:id/dukungan-sistem', verifyToken, allowRoles(READ), controller.getDukunganSistem);
router.get('/pemeriksaan/antrian', verifyToken, allowRoles(REVIEW), controller.listAntrianPemeriksaan);
router.get('/kategori-referensi', verifyToken, allowRoles(READ), controller.listKategoriReferensi);
router.get('/pengisian/:id', verifyToken, allowRoles(READ), controller.getPengisian);
router.put('/pengisian/:id', verifyToken, allowRoles(WRITE), controller.updatePengisian);
router.post('/pengisian/:id/transisi', verifyToken, allowRoles(READ), controller.transitionPengisian);
router.get('/pengisian/:id/kesiapan-lengkap', verifyToken, allowRoles(READ), controller.checkCompletionReadiness);
router.post('/pengisian/:id/pemeriksaan', verifyToken, allowRoles(REVIEW), controller.periksaPengisian);
router.post('/pengisian/:id/bukti', verifyToken, allowRoles(WRITE), uploadSingle, controller.createBukti);
router.post('/bukti/:id/versi', verifyToken, allowRoles(WRITE), uploadSingle, controller.reviseBukti);
router.get('/bukti/:id/download', verifyToken, allowRoles(READ), controller.downloadBukti);
router.patch('/bukti-relasi/:id/checklist', verifyToken, allowRoles(REVIEW), controller.checklistBukti);
router.get('/pengisian/:id/bukti-entity', verifyToken, allowRoles(READ), controller.listBuktiEntity);
router.patch('/bukti/:id/verifikasi', verifyToken, allowRoles(REVIEW), controller.setStatusVerifikasiBukti);

// ── Evidence Rebind — bukti staging PENGISIAN -> entity spesifik (spek 35 v3 §7 Phase E) ──
router.post('/bukti/:buktiId/rebind', verifyToken, allowRoles(WRITE), b1x.rebindBukti);

// ── Autofill — Document Intelligence + Recall (spek 35 v3 §12/§27) ──
router.post('/bukti/:buktiId/analisis', verifyToken, allowRoles(WRITE), b1x.analisisBukti);
router.post('/pengisian/:pengisianId/autofill-apply', verifyToken, allowRoles(WRITE), b1x.terapkanAutofill);

// ── Data referensi B.1.1-B.1.4 ──
router.get('/master-indikator', verifyToken, allowRoles(READ), b1x.listMasterIndikator);
router.get('/nomenklatur-mapping', verifyToken, allowRoles(READ), b1x.listNomenklaturMapping);
router.get('/komoditas', verifyToken, allowRoles(READ), b1x.listKomoditas);

// ── B.1.1 Register Surat Penugasan ──
router.get('/pengisian/:pengisianId/surat-penugasan', verifyToken, allowRoles(READ), b1x.listSuratPenugasan);
router.post('/pengisian/:pengisianId/surat-penugasan', verifyToken, allowRoles(WRITE), b1x.createSuratPenugasan);
router.put('/surat-penugasan/:id', verifyToken, allowRoles(WRITE), b1x.updateSuratPenugasan);
router.delete('/surat-penugasan/:id', verifyToken, allowRoles(WRITE), b1x.deleteSuratPenugasan);

// ── B.1.2 Register Rapat Forkopimda ──
router.get('/pengisian/:pengisianId/rapat-forkopimda', verifyToken, allowRoles(READ), b1x.listRapatForkopimda);
router.post('/pengisian/:pengisianId/rapat-forkopimda', verifyToken, allowRoles(WRITE), b1x.createRapatForkopimda);
router.put('/rapat-forkopimda/:id', verifyToken, allowRoles(WRITE), b1x.updateRapatForkopimda);
router.delete('/rapat-forkopimda/:id', verifyToken, allowRoles(WRITE), b1x.deleteRapatForkopimda);

// ── B.1.3 Target KDH & Transaksi Stok ──
router.get('/cadangan-target', verifyToken, allowRoles(READ), b1x.listCadanganTarget);
router.post('/cadangan-target', verifyToken, allowRoles(ADMIN), b1x.createCadanganTarget);
router.put('/cadangan-target/:id', verifyToken, allowRoles(ADMIN), b1x.updateCadanganTarget);
router.post('/cadangan-target/:id/refresh-snapshot', verifyToken, allowRoles(ADMIN), b1x.refreshCadanganTargetSnapshot);

// Source-Driven DPA Mapping (mandat §10) — dropdown berjenjang tahun->OPD->Program->Kegiatan->SubKegiatan whitelist
router.get('/dpa-source/tahun', verifyToken, allowRoles(READ), b1x.listDpaSourceTahun);
router.get('/dpa-source/opd', verifyToken, allowRoles(READ), b1x.listDpaSourceOpd);
router.get('/dpa-source/program', verifyToken, allowRoles(READ), b1x.listDpaSourceProgram);
router.get('/dpa-source/kegiatan', verifyToken, allowRoles(READ), b1x.listDpaSourceKegiatan);
router.get('/dpa-source/sub-kegiatan', verifyToken, allowRoles(READ), b1x.listDpaSourceSubKegiatan);
router.get('/pengisian/:pengisianId/stok-transaksi', verifyToken, allowRoles(READ), b1x.listStokTransaksi);
router.post('/pengisian/:pengisianId/stok-transaksi', verifyToken, allowRoles(WRITE), b1x.createStokTransaksi);
router.put('/stok-transaksi/:id', verifyToken, allowRoles(WRITE), b1x.updateStokTransaksi);
router.delete('/stok-transaksi/:id', verifyToken, allowRoles(WRITE), b1x.deleteStokTransaksi);

// ── B.1.4 Register Inovasi ──
router.get('/pengisian/:pengisianId/inovasi', verifyToken, allowRoles(READ), b1x.listInovasi);
router.post('/pengisian/:pengisianId/inovasi', verifyToken, allowRoles(WRITE), b1x.createInovasi);
router.put('/inovasi/:id', verifyToken, allowRoles(WRITE), b1x.updateInovasi);
router.delete('/inovasi/:id', verifyToken, allowRoles(WRITE), b1x.deleteInovasi);

// ── Rule Engine ──
router.post('/pengisian/:pengisianId/hitung-ulang', verifyToken, allowRoles(READ), b1x.hitungUlangSkor);

// ── Internal Field Autofill (Sumber Data/Hambatan/Tindak Lanjut) — saran, READ-ONLY, tidak menulis DB ──
router.post('/pengisian/:pengisianId/internal-autofill-preview', verifyToken, allowRoles(READ), b1x.previewInternalAutofill);

// ── Rekonsiliasi Semester B.1.3 ──
router.post('/pengisian/:pengisianId/rekonsiliasi-alasan', verifyToken, allowRoles(WRITE), b1x.setAlasanRekonsiliasi);
router.get('/periode/:id/neraca-tahunan', verifyToken, allowRoles(READ), b1x.getNeracaTahunan);

// ── MBG 2.1 Satgas (Indicator Foundation spek 34) ──
router.get('/pengisian/:pengisianId/satgas-mbg', verifyToken, allowRoles(READ), b1x.getSatgasMbg);
router.post('/pengisian/:pengisianId/satgas-mbg', verifyToken, allowRoles(WRITE), b1x.createSatgasMbg);
router.put('/satgas-mbg/:id', verifyToken, allowRoles(WRITE), b1x.updateSatgasMbg);

// ── MBG 2.2 Sarpras Komponen ──
router.get('/pengisian/:pengisianId/sarpras-komponen-mbg', verifyToken, allowRoles(READ), b1x.listSarprasKomponenMbg);
router.post('/pengisian/:pengisianId/sarpras-komponen-mbg/bootstrap', verifyToken, allowRoles(WRITE), b1x.bootstrapSarprasKomponenMbg);
router.put('/sarpras-komponen-mbg/:id', verifyToken, allowRoles(WRITE), b1x.updateSarprasKomponenMbg);

// ── MBG 2.3 Laporan Satgas Berkala ──
router.get('/pengisian/:pengisianId/laporan-satgas-mbg', verifyToken, allowRoles(READ), b1x.listLaporanSatgasMbg);
router.post('/pengisian/:pengisianId/laporan-satgas-mbg', verifyToken, allowRoles(WRITE), b1x.createLaporanSatgasMbg);
router.put('/laporan-satgas-mbg/:id', verifyToken, allowRoles(WRITE), b1x.updateLaporanSatgasMbg);

// ── Ownership per-indikator (D4, ADMIN-only — koreksi wajib #7: PELAKSANA/PENGAWAS wajib ditolak) ──
router.post('/indikator/:id/kepemilikan', verifyToken, allowRoles(ADMIN), b1x.setKepemilikanIndikator);
router.get('/indikator/:id/kontributor', verifyToken, allowRoles(READ), b1x.listKontributorIndikator);
router.post('/indikator/:id/kontributor', verifyToken, allowRoles(ADMIN), b1x.tambahKontributorIndikator);
router.delete('/indikator-kontributor/:id', verifyToken, allowRoles(ADMIN), b1x.hapusKontributorIndikator);

// ── Master Indikator — edit kriteria_skor (ADMIN-only, koreksi wajib #2) ──
router.put('/master-indikator/:id/kriteria-skor', verifyToken, allowRoles(ADMIN), b1x.updateKriteriaSkorMasterIndikator);

// ── Master Indikator — pemetaan Indikator Renstra (ADMIN-only, spek 35 v3 §27) ──
router.put('/master-indikator/:id/mapping-renstra', verifyToken, allowRoles(ADMIN), b1x.setIndikatorRenstraMapping);

// ── Daftar OPD (dropdown Atur Kepemilikan) ──
router.get('/perangkat-daerah', verifyToken, allowRoles(READ), b1x.listPerangkatDaerah);

module.exports = router;
