'use strict';

/**
 * Orkestrasi rule engine ProSN — satu-satunya tempat yang boleh menulis
 * skor_indikatif_internal (mandat §16: "Backend sebagai Sumber Kebenaran").
 * Frontend TIDAK PERNAH mengirim skor; endpoint ini selalu menghitung ulang
 * dari data mentah tersimpan di DB.
 */

const db = require('../../models');
const { ProsnError } = require('./prosnpWorkflowService');
const { hitungB11 } = require('./ruleEngine/prosnpB11RuleEngine');
const { hitungB12 } = require('./ruleEngine/prosnpB12RuleEngine');
const { hitungB13 } = require('./ruleEngine/prosnpB13RuleEngine');
const { hitungB14 } = require('./ruleEngine/prosnpB14RuleEngine');
const {
  hitungStatusTier,
  hitungChecklistProporsional,
  hitungPelaporanBerkala,
  hitungCapaianPersentaseBertingkat,
} = require('./ruleEngine/prosnpGenericTierRuleEngine');
const evidenceGate = require('./prosnpEvidenceGateService');

async function getPengisianKonteks(pengisianId, tenantId, transaction) {
  const pengisian = await db.ProsnPengisian.findOne({
    where: { id: pengisianId, tenant_id: tenantId },
    include: [{
      model: db.ProsnIndikator, as: 'indikator',
      include: [{ model: db.ProsnPeriode, as: 'periode' }, { model: db.ProsnMasterIndikator, as: 'masterIndikator' }],
    }],
    transaction,
  });
  if (!pengisian) throw new ProsnError('Pengisian tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
  return pengisian;
}

async function simpanSkor(pengisianId, hasil, transaction, extra = {}) {
  await db.ProsnPengisian.update({
    skor_indikatif_internal: hasil.skor,
    skor_alasan: hasil.alasan,
    skor_detail: hasil.detail,
    skor_dihitung_at: new Date(),
    ...extra,
  }, { where: { id: pengisianId }, transaction });
}

async function hitungUlangB11(pengisianId, tenantId) {
  return db.sequelize.transaction(async (transaction) => {
    const pengisian = await getPengisianKonteks(pengisianId, tenantId, transaction);
    if (pengisian.indikator.tipe_form !== 'penugasan_kdh') throw new ProsnError('Indikator ini bukan bertipe Penugasan KDH.', 409, 'PROSNP_TIPE_MISMATCH');
    const surat = await db.ProsnSuratPenugasan.findAll({ where: { pengisian_id: pengisianId, tenant_id: tenantId }, raw: true, transaction });
    // Evidence gate (mandat §6.1): cek SEKALI per surat, cache hasilnya jadi closure sinkron utk pure fn.
    const validitasBukti = new Map();
    for (const s of surat) validitasBukti.set(s.id, await evidenceGate.suratMemilikiBuktiValid(s.id, tenantId, transaction));
    const hasil = hitungB11(surat, pengisian.indikator.periode, (suratId) => validitasBukti.get(suratId) || false);
    await simpanSkor(pengisianId, hasil, transaction);
    return hasil;
  });
}

async function hitungUlangB12(pengisianId, tenantId) {
  return db.sequelize.transaction(async (transaction) => {
    const pengisian = await getPengisianKonteks(pengisianId, tenantId, transaction);
    if (pengisian.indikator.tipe_form !== 'koordinasi_forkopimda') throw new ProsnError('Indikator ini bukan bertipe Koordinasi Forkopimda.', 409, 'PROSNP_TIPE_MISMATCH');
    const rapat = await db.ProsnRapatForkopimda.findAll({ where: { pengisian_id: pengisianId, tenant_id: tenantId }, raw: true, transaction });
    // Evidence gate (mandat §6.2): PER RAPAT, bukan generik per-indikator — satu undangan
    // tidak boleh melegitimasi rapat lain.
    const evidenceCache = new Map();
    for (const r of rapat) evidenceCache.set(r.id, await evidenceGate.rapatMemilikiBuktiLengkap(r.id, tenantId, transaction));
    const hasil = hitungB12(rapat, pengisian.indikator.periode, (rapatId) => evidenceCache.get(rapatId) || { lengkap: false, kurang: ['undangan', 'daftar_hadir', 'notulen'] });
    await simpanSkor(pengisianId, hasil, transaction);
    return hasil;
  });
}

async function hitungUlangB13(pengisianId, tenantId) {
  const { transaksiTerverifikasiUntukPeriode, jalankanRekonsiliasi, resolveCutoff } = require('./prosnpB13SemesterService');
  return db.sequelize.transaction(async (transaction) => {
    const pengisian = await getPengisianKonteks(pengisianId, tenantId, transaction);
    if (pengisian.indikator.tipe_form !== 'cadangan_pangan_beras') throw new ProsnError('Indikator ini bukan bertipe Cadangan Pangan Beras.', 409, 'PROSNP_TIPE_MISMATCH');
    const periode = pengisian.indikator.periode;
    const tanggalCutoff = resolveCutoff(periode);
    const tahun = String(periode.tahun);

    // Rekonsiliasi Semester (mandat §9): pastikan carry-forward Semester II ada &
    // sinkron dgn saldo akhir Semester I SEBELUM menghitung skor.
    const rekonsiliasi = await jalankanRekonsiliasi(pengisian, tenantId, pengisian.diisi_oleh || pengisian.created_by, transaction);

    // Ledger dibaca lintas periode (semua periode tenant tahun ini) TAPI setiap transaksi
    // fisik hanya tersimpan sekali (di periode asalnya) — carry-forward Semester II sudah
    // mewakili akumulasi Semester I sehingga TIDAK query ulang transaksi mentah Semester I
    // di sini (mencegah double counting, mandat §9.1). Untuk Semester I sendiri (tidak ada
    // carry-forward), cukup baca transaksi periode itu sendiri.
    const { included, excluded } = await transaksiTerverifikasiUntukPeriode(periode.id, tenantId, tanggalCutoff, transaction);

    const target = await db.ProsnCadanganTarget.findOne({ where: { tenant_id: tenantId, tahun_target: tahun, status_aktif: true }, transaction });
    const targetEvidenceValid = target ? await evidenceGate.targetMemilikiKeputusanValid(target.id, tenantId, transaction) : false;
    const hasil = hitungB13(
      included,
      target ? target.get({ plain: true }) : null,
      tanggalCutoff,
      targetEvidenceValid,
      excluded,
      rekonsiliasi,
      periode.semester,
    );
    await simpanSkor(pengisianId, hasil, transaction);
    return hasil;
  });
}

async function hitungUlangB14(pengisianId, tenantId) {
  return db.sequelize.transaction(async (transaction) => {
    const pengisian = await getPengisianKonteks(pengisianId, tenantId, transaction);
    if (pengisian.indikator.tipe_form !== 'inovasi_dan_perkada') throw new ProsnError('Indikator ini bukan bertipe Inovasi dan Perkada.', 409, 'PROSNP_TIPE_MISMATCH');
    const inovasiList = await db.ProsnInovasi.findAll({ where: { pengisian_id: pengisianId, tenant_id: tenantId }, transaction });
    // Evidence gate (mandat §6.4): BUKTI_IMPLEMENTASI & PERKADA harus terikat ke inovasi yang sama.
    const evidenceCache = new Map();
    for (const inovasi of inovasiList) evidenceCache.set(inovasi.id, await evidenceGate.inovasiEvidenceStatus(inovasi.id, tenantId, transaction));
    const hasil = hitungB14(
      inovasiList.map((i) => i.get({ plain: true })),
      (id) => evidenceCache.get(id)?.adaDokumenPerkada || false,
      (id) => evidenceCache.get(id)?.adaBuktiImplementasi || false,
    );
    await simpanSkor(pengisianId, hasil, transaction);
    return hasil;
  });
}

/** MBG 2.1 — Indicator Foundation §5. Evidence-driven murni: skor dari tier
 * yang evidence-nya SENDIRI terbukti, BUKAN dari status_kelembagaan yang
 * dideklarasikan operator (koreksi wajib #3). */
async function hitungUlangMbgSatgas(pengisianId, tenantId) {
  return db.sequelize.transaction(async (transaction) => {
    const pengisian = await getPengisianKonteks(pengisianId, tenantId, transaction);
    if (pengisian.indikator.tipe_form !== 'status_bertingkat_evidence') throw new ProsnError('Indikator ini bukan bertipe status bertingkat (evidence).', 409, 'PROSNP_TIPE_MISMATCH');
    const kriteriaSkor = pengisian.indikator.masterIndikator?.kriteria_skor;
    if (!kriteriaSkor) throw new ProsnError('Kriteria skor master indikator belum dikonfigurasi.', 500, 'PROSNP_KRITERIA_SKOR_MISSING');
    const satgas = await db.ProsnSatgasMbg.findOne({ where: { pengisian_id: pengisianId, tenant_id: tenantId }, transaction });
    const evidenceSet = satgas ? await evidenceGate.kategoriValidSetUntukSatgasMbg(satgas.id, tenantId, transaction) : new Set();
    const hasilMentah = hitungStatusTier(kriteriaSkor, evidenceSet);
    const hasil = {
      skor: hasilMentah.skor,
      alasan: hasilMentah.alasan,
      detail: {
        status_dideklarasikan: satgas?.status_kelembagaan || null,
        status_terverifikasi: hasilMentah.status_terverifikasi,
        evidence_requirement_provenance: pengisian.indikator.masterIndikator?.evidence_requirement_provenance,
      },
    };
    await simpanSkor(pengisianId, hasil, transaction);
    return hasil;
  });
}

/** MBG 2.2 — checklist proporsional komponen sarpras (koreksi wajib #2). */
async function hitungUlangMbgSarpras(pengisianId, tenantId) {
  return db.sequelize.transaction(async (transaction) => {
    const pengisian = await getPengisianKonteks(pengisianId, tenantId, transaction);
    if (pengisian.indikator.tipe_form !== 'checklist_proporsional_evidence') throw new ProsnError('Indikator ini bukan bertipe checklist proporsional (evidence).', 409, 'PROSNP_TIPE_MISMATCH');
    const kriteriaSkor = pengisian.indikator.masterIndikator?.kriteria_skor;
    if (!kriteriaSkor) throw new ProsnError('Kriteria skor master indikator belum dikonfigurasi.', 500, 'PROSNP_KRITERIA_SKOR_MISSING');
    const komponen = await db.ProsnSarprasKomponenMbg.findAll({ where: { pengisian_id: pengisianId, tenant_id: tenantId }, raw: true, transaction });
    const evidenceSet = await evidenceGate.kategoriValidSetUntukIndikator(pengisian.indikator_id, tenantId, transaction);
    const hasilMentah = hitungChecklistProporsional(komponen, kriteriaSkor, evidenceSet);
    const hasil = {
      skor: hasilMentah.skor,
      alasan: hasilMentah.alasan || hasilMentah.excluded_reason,
      detail: {
        proporsi_tersedia: hasilMentah.proporsi,
        excluded_reason: hasilMentah.excluded_reason || null,
        evidence_requirement_provenance: pengisian.indikator.masterIndikator?.evidence_requirement_provenance,
      },
    };
    await simpanSkor(pengisianId, hasil, transaction);
    return hasil;
  });
}

/** MBG 2.3 — pelaporan berkala, data_lengkap DIHITUNG (koreksi wajib #1). */
async function hitungUlangMbgLaporan(pengisianId, tenantId) {
  return db.sequelize.transaction(async (transaction) => {
    const pengisian = await getPengisianKonteks(pengisianId, tenantId, transaction);
    if (pengisian.indikator.tipe_form !== 'pelaporan_berkala_evidence') throw new ProsnError('Indikator ini bukan bertipe pelaporan berkala (evidence).', 409, 'PROSNP_TIPE_MISMATCH');
    const kriteriaSkor = pengisian.indikator.masterIndikator?.kriteria_skor;
    if (!kriteriaSkor) throw new ProsnError('Kriteria skor master indikator belum dikonfigurasi.', 500, 'PROSNP_KRITERIA_SKOR_MISSING');
    const laporanTerbaru = await db.ProsnLaporanSatgasMbg.findOne({
      where: { pengisian_id: pengisianId, tenant_id: tenantId },
      order: [['tanggal_wajib_lapor', 'DESC']],
      transaction,
    });
    // Evidence PER-RECORD laporan spesifik — laporan bulan lain TIDAK boleh melegitimasi ini.
    const evidenceSet = laporanTerbaru ? await evidenceGate.kategoriValidSetUntukLaporanSatgasMbg(laporanTerbaru.id, tenantId, transaction) : new Set();
    const hasilMentah = hitungPelaporanBerkala(laporanTerbaru ? laporanTerbaru.get({ plain: true }) : null, kriteriaSkor, evidenceSet);
    const hasil = {
      skor: hasilMentah.skor,
      alasan: hasilMentah.alasan,
      detail: {
        laporan_id_dinilai: laporanTerbaru?.id || null,
        tepat_waktu: hasilMentah.tepat_waktu,
        data_lengkap: hasilMentah.data_lengkap,
        evidence_requirement_provenance: pengisian.indikator.masterIndikator?.evidence_requirement_provenance,
      },
    };
    await simpanSkor(pengisianId, hasil, transaction);
    return hasil;
  });
}

/** MBG 2.4/2.5/2.6 — capaian persentase bertingkat, reuse kolom generik pengisian
 * (target_nilai/realisasi_nilai/rasio_nilai). Realisasi >100% (koreksi wajib #5)
 * disimpan apa adanya, tier dicari dgn nilai dibatasi maksimum. */
async function hitungUlangMbgCapaianPersentase(pengisianId, tenantId) {
  return db.sequelize.transaction(async (transaction) => {
    const pengisian = await getPengisianKonteks(pengisianId, tenantId, transaction);
    if (pengisian.indikator.tipe_form !== 'capaian_persentase_bertingkat') throw new ProsnError('Indikator ini bukan bertipe capaian persentase bertingkat.', 409, 'PROSNP_TIPE_MISMATCH');
    const kriteriaSkor = pengisian.indikator.masterIndikator?.kriteria_skor;
    if (!kriteriaSkor) throw new ProsnError('Kriteria skor master indikator belum dikonfigurasi.', 500, 'PROSNP_KRITERIA_SKOR_MISSING');
    const evidenceSet = await evidenceGate.kategoriValidSetUntukIndikator(pengisian.indikator_id, tenantId, transaction);
    const sumberDataLengkap = !!(pengisian.sumber_data_tanggal_posisi && pengisian.sumber_data_referensi_dokumen);
    const hasilMentah = hitungCapaianPersentaseBertingkat(pengisian.realisasi_nilai, pengisian.target_nilai, kriteriaSkor, evidenceSet, { sumberDataLengkap });
    const hasil = {
      skor: hasilMentah.skor,
      alasan: hasilMentah.alasan,
      detail: {
        persentase_realisasi_aktual: hasilMentah.persentase_realisasi_aktual,
        excluded_reason: hasilMentah.excluded_reason || null,
        peringatan_sumber_data: hasilMentah.peringatan_sumber_data || null,
        evidence_requirement_provenance: pengisian.indikator.masterIndikator?.evidence_requirement_provenance,
      },
    };
    await simpanSkor(pengisianId, hasil, transaction, { rasio_nilai: hasilMentah.persentase_realisasi_aktual });
    return hasil;
  });
}

const HITUNG_ULANG_BY_TIPE_FORM = {
  penugasan_kdh: hitungUlangB11,
  koordinasi_forkopimda: hitungUlangB12,
  cadangan_pangan_beras: hitungUlangB13,
  inovasi_dan_perkada: hitungUlangB14,
  status_bertingkat_evidence: hitungUlangMbgSatgas,
  checklist_proporsional_evidence: hitungUlangMbgSarpras,
  pelaporan_berkala_evidence: hitungUlangMbgLaporan,
  capaian_persentase_bertingkat: hitungUlangMbgCapaianPersentase,
};

async function hitungUlang(pengisianId, tenantId) {
  const pengisian = await getPengisianKonteks(pengisianId, tenantId);
  const fn = HITUNG_ULANG_BY_TIPE_FORM[pengisian.indikator.tipe_form];
  if (!fn) throw new ProsnError('Indikator ini belum mendukung rule engine otomatis (tipe_form generik/legacy).', 409, 'PROSNP_RULE_ENGINE_UNSUPPORTED');
  return fn(pengisianId, tenantId);
}

module.exports = {
  hitungUlang, hitungUlangB11, hitungUlangB12, hitungUlangB13, hitungUlangB14,
  hitungUlangMbgSatgas, hitungUlangMbgSarpras, hitungUlangMbgLaporan, hitungUlangMbgCapaianPersentase,
};
