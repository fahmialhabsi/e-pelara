'use strict';

/**
 * B.1.3 RKA Authoritative Target FALLBACK (corrective "B.1.3 RKA
 * Authoritative Target Fallback"). Dipakai HANYA sbg fallback ketika
 * DPA/DPPA (prosnpDpaSourceService.resolveOperationalTargetB13) tidak
 * dapat menghasilkan target valid — TIDAK PERNAH menimpa DPA/DPPA yang
 * valid; orkestrasi precedence (coba DPA dulu) ada di
 * prosnpCadanganPanganService.resolveTargetSource(), bukan di sini.
 *
 * Root cause temuan audit sebelumnya: generateDpaFromRka()
 * (derivationEngineService.js) menyalin field generic `rka.indikator`/
 * `rka.target` (SELALU NULL di alur kerja nyata) BUKAN
 * `rka.target_keluaran`/`rka.satuan_keluaran` (yang sesungguhnya
 * terisi, Permendagri 77/2020) — defect itu SENGAJA TIDAK diperbaiki di
 * sini (scope terpisah, lihat mandat §16); fungsi ini murni membaca
 * langsung dari tabel `rka`, tidak menyentuh `derivationEngineService.js`.
 *
 * Eligibility ketat (mandat §4): is_active_version=true DAN
 * approval_status='APPROVED' — KEDUANYA wajib, bukan salah satu saja.
 * `rkaRevisiService.cloneRkaToNextTahapan()` membuktikan baris revisi
 * baru dibuat dgn is_active_version=true DAN approval_status='DRAFT'
 * sekaligus — active SAJA tidak pernah cukup utk RKA (beda dgn asumsi
 * yang berlaku utk Dpa).
 */
const db = require('../../models');
const { B13_KODE_SUB_KEGIATAN_CADANGAN_PANGAN, parseTargetTonDpa } = require('./prosnpDpaSourceService');

/**
 * Precedence deterministik: HANYA baris is_active_version=true DAN
 * approval_status='APPROVED' yang dipertimbangkan (WHERE, bukan filter
 * setelah query). `ORDER BY version DESC` sbg diagnostic ordering bila
 * lebih dari satu tahapan authoritative eksis. Jika >1 baris memenuhi
 * syarat sekaligus (anomali), TIDAK memilih diam-diam.
 */
async function resolveActiveApprovedRkaExact(tahun, opdId, kodeSubKegiatan, transaction) {
  const rows = await db.Rka.findAll({
    where: {
      kode_sub_kegiatan: kodeSubKegiatan, tahun: String(tahun), opd_id: opdId,
      is_active_version: true, approval_status: 'APPROVED',
    },
    order: [['version', 'DESC']],
    transaction,
  });
  if (rows.length === 0) return { status: 'NOT_FOUND', rka: null, candidates: [] };
  if (rows.length > 1) return { status: 'AMBIGUOUS_ACTIVE_APPROVED', rka: rows[0], candidates: rows };
  return { status: 'FOUND', rka: rows[0], candidates: rows };
}

/**
 * Resolusi target operasional tahunan B.1.3 dari RKA aktif+APPROVED Sub
 * Kegiatan EXACT `2.09.03.1.02.0005` (generik utk tahun berapa pun — TIDAK
 * ADA hardcode angka/tahun tertentu). Sumber target: `target_keluaran` +
 * `satuan_keluaran` (BUKAN `indikator`/`target` generic yang selalu NULL).
 */
async function resolveOperationalTargetB13FromRka(tahun, opdId, { transaction } = {}) {
  const kodeSubKegiatan = B13_KODE_SUB_KEGIATAN_CADANGAN_PANGAN;
  const resolusi = await resolveActiveApprovedRkaExact(tahun, opdId, kodeSubKegiatan, transaction);
  if (resolusi.status === 'NOT_FOUND') {
    return {
      ditemukan: false, requires_review: true, kode_sub_kegiatan: kodeSubKegiatan,
      alasan: `Tidak ditemukan RKA aktif+APPROVED (is_active_version=true DAN approval_status='APPROVED') untuk Sub Kegiatan ${kodeSubKegiatan} tahun ${tahun} pada OPD terpilih.`,
    };
  }
  if (resolusi.status === 'AMBIGUOUS_ACTIVE_APPROVED') {
    return {
      ditemukan: false, requires_review: true, kode_sub_kegiatan: kodeSubKegiatan,
      alasan: `Ditemukan lebih dari satu RKA berstatus aktif+APPROVED sekaligus untuk Sub Kegiatan ${kodeSubKegiatan} tahun ${tahun} — pemilihan otomatis dibatalkan demi keamanan data, perlu tinjauan manual.`,
      kandidat_ambigu: resolusi.candidates.map((r) => ({ rka_id: r.id, version: r.version, tahapan: r.tahapan, approval_status: r.approval_status })),
    };
  }
  const rka = resolusi.rka;
  const parsed = parseTargetTonDpa(rka.target_keluaran, rka.satuan_keluaran);
  return {
    ditemukan: true,
    requires_review: parsed.requires_review,
    alasan: parsed.alasan,
    kode_sub_kegiatan: kodeSubKegiatan,
    nama_sub_kegiatan: rka.sub_kegiatan,
    source_rka_id: rka.id,
    source_tahun: String(tahun),
    source_opd_id: Number(opdId),
    tahapan: rka.tahapan,
    version: rka.version,
    is_active_version: rka.is_active_version,
    approval_status: rka.approval_status,
    keluaran_raw: rka.keluaran,
    target_value_raw: parsed.target_value_raw,
    target_unit_raw: parsed.target_unit_raw,
    target_ton: parsed.target_ton,
    parsing_status: parsed.parsing_status,
  };
}

module.exports = { resolveActiveApprovedRkaExact, resolveOperationalTargetB13FromRka };
