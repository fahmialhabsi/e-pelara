'use strict';

/**
 * Source-Driven DPA Mapping (mandat corrective pass §10) — dropdown berjenjang
 * tahun -> OPD -> Program -> Kegiatan -> Sub Kegiatan (whitelist), dan
 * pengambilan pagu/realisasi APBD nyata untuk Target Cadangan Pangan Beras
 * (B.1.3), satu-satunya register ProSN yang punya dimensi anggaran yang wajar
 * ditelusuri ke APBD.
 *
 * SEMUA query di sini membaca tabel nyata (prosnp_nomenklatur_mapping, dpa,
 * dpa_realisasi_bulanan, perangkat_daerah) — bukan data reka-reka. Whitelist
 * dijaga oleh status_relevansi: default core/direct_conditional/supporting;
 * context_only hanya muncul bila diminta eksplisit; excluded TIDAK PERNAH
 * ditampilkan (mandat §10).
 */
const db = require('../../models');
const { ProsnError } = require('./prosnpWorkflowService');

const DEFAULT_STATUSES = ['core', 'direct_conditional', 'supporting'];

function statusesUntuk(includeContextOnly) {
  return includeContextOnly ? [...DEFAULT_STATUSES, 'context_only'] : DEFAULT_STATUSES;
}

async function mappingWhitelist(masterIndikatorId, includeContextOnly) {
  return db.ProsnNomenklaturMapping.findAll({
    where: { master_indikator_id: masterIndikatorId, status_relevansi: statusesUntuk(includeContextOnly), is_active: true },
    raw: true,
  });
}

async function listTahunTersedia(masterIndikatorId, { includeContextOnly = false } = {}) {
  const mapping = await mappingWhitelist(masterIndikatorId, includeContextOnly);
  const kodeList = mapping.map((m) => m.kode_sub_kegiatan);
  if (!kodeList.length) return [];
  const rows = await db.Dpa.findAll({ where: { kode_sub_kegiatan: kodeList }, attributes: ['tahun'], group: ['tahun'], order: [['tahun', 'DESC']], raw: true });
  return rows.map((r) => r.tahun);
}

// PENTING: Dpa.opd_id merujuk ruang ID `opd_penanggung_jawab` (dipakai
// ekosistem RKA/DPA/RKPD lama), BUKAN `perangkat_daerah.id` (dipakai tabel
// ProSN sendiri: prosnp_periode.perangkat_daerah_id). Dua ruang ID ini
// dijembatani oleh `perangkat_daerah_opd_mapping` — dikonfirmasi nyata di DB
// (perangkat_daerah_id=3 "Dinas Pangan Provinsi Maluku Utara" <-> opd_penanggung_jawab_id=107
// "Dinas Pangan"). Dropdown OPD di sini HARUS lewat mapping ini, bukan
// menyamakan kedua ID secara langsung (akan selalu kosong/salah data).
async function listOpdTersedia(masterIndikatorId, tahun, { includeContextOnly = false } = {}) {
  const mapping = await mappingWhitelist(masterIndikatorId, includeContextOnly);
  const kodeList = mapping.map((m) => m.kode_sub_kegiatan);
  if (!kodeList.length) return [];
  const rows = await db.Dpa.findAll({ where: { kode_sub_kegiatan: kodeList, tahun: String(tahun) }, attributes: ['opd_id'], group: ['opd_id'], raw: true });
  const opdPjIds = [...new Set(rows.map((r) => r.opd_id).filter(Boolean))];
  if (!opdPjIds.length) return [];
  const opdPjRows = await db.OpdPenanggungJawab.findAll({ where: { id: opdPjIds }, attributes: ['id', 'nama_opd', 'nama_bidang_opd'], raw: true });
  const pdMapping = await db.PerangkatDaerahOpdMapping.findAll({ where: { opd_penanggung_jawab_id: opdPjIds }, include: [{ model: db.PerangkatDaerah, as: 'perangkatDaerah', attributes: ['id', 'nama'] }] });
  return opdPjRows.map((opd) => {
    const pd = pdMapping.find((m) => m.opd_penanggung_jawab_id === opd.id)?.perangkatDaerah || null;
    return { opd_penanggung_jawab_id: opd.id, nama_opd: opd.nama_opd, nama_bidang_opd: opd.nama_bidang_opd, perangkat_daerah_id: pd?.id || null, perangkat_daerah_nama: pd?.nama || null };
  }).sort((a, b) => (a.nama_opd || '').localeCompare(b.nama_opd || ''));
}

async function listProgramTersedia(masterIndikatorId, tahun, opdId, { includeContextOnly = false } = {}) {
  const mapping = await mappingWhitelist(masterIndikatorId, includeContextOnly);
  const kodeList = mapping.map((m) => m.kode_sub_kegiatan);
  if (!kodeList.length) return [];
  const rows = await db.Dpa.findAll({
    where: { kode_sub_kegiatan: kodeList, tahun: String(tahun), opd_id: opdId },
    attributes: ['kode_program', 'program'], group: ['kode_program', 'program'], raw: true,
  });
  return rows.map((r) => ({ kode_program: r.kode_program, nama_program: r.program }));
}

async function listKegiatanTersedia(masterIndikatorId, tahun, opdId, kodeProgram, { includeContextOnly = false } = {}) {
  const mapping = await mappingWhitelist(masterIndikatorId, includeContextOnly);
  const kodeList = mapping.map((m) => m.kode_sub_kegiatan);
  if (!kodeList.length) return [];
  const rows = await db.Dpa.findAll({
    where: { kode_sub_kegiatan: kodeList, tahun: String(tahun), opd_id: opdId, kode_program: kodeProgram },
    attributes: ['kode_kegiatan', 'kegiatan'], group: ['kode_kegiatan', 'kegiatan'], raw: true,
  });
  return rows.map((r) => ({ kode_kegiatan: r.kode_kegiatan, nama_kegiatan: r.kegiatan }));
}

async function listSubKegiatanTersedia(masterIndikatorId, tahun, opdId, kodeKegiatan, { includeContextOnly = false } = {}) {
  const mapping = await mappingWhitelist(masterIndikatorId, includeContextOnly);
  const kodeList = mapping.map((m) => m.kode_sub_kegiatan);
  if (!kodeList.length) return [];
  const dpaRows = await db.Dpa.findAll({
    where: { kode_sub_kegiatan: kodeList, tahun: String(tahun), opd_id: opdId, kode_kegiatan: kodeKegiatan },
    raw: true,
  });
  return dpaRows.map((dpa) => {
    const map = mapping.find((m) => m.kode_sub_kegiatan === dpa.kode_sub_kegiatan);
    return {
      dpa_id: dpa.id,
      kode_sub_kegiatan: dpa.kode_sub_kegiatan,
      nama_sub_kegiatan: dpa.sub_kegiatan,
      pagu_dpa: Number(dpa.anggaran || 0),
      approval_status: dpa.approval_status,
      status_relevansi: map?.status_relevansi || null,
      master_sub_kegiatan_id: map?.master_sub_kegiatan_id || null,
    };
  });
}

async function ambilSnapshot(masterIndikatorId, tahun, opdId, kodeSubKegiatan, { includeContextOnly = false } = {}) {
  const mapping = await mappingWhitelist(masterIndikatorId, includeContextOnly);
  const map = mapping.find((m) => m.kode_sub_kegiatan === kodeSubKegiatan);
  if (!map) throw new ProsnError('Sub kegiatan yang dipilih tidak termasuk daftar whitelist nomenklatur ProSN untuk indikator ini.', 409, 'PROSNP_DPA_SOURCE_NOT_WHITELISTED');
  const dpa = await db.Dpa.findOne({ where: { kode_sub_kegiatan: kodeSubKegiatan, tahun: String(tahun), opd_id: opdId } });
  if (!dpa) throw new ProsnError('Data DPA tidak ditemukan untuk kombinasi tahun/OPD/sub kegiatan yang dipilih.', 404, 'PROSNP_DPA_SOURCE_NOT_FOUND');
  const realisasiRow = await db.DpaRealisasiBulanan.findOne({ where: { dpa_id: dpa.id }, attributes: [[db.sequelize.fn('SUM', db.sequelize.col('jumlah')), 'total']], raw: true });
  const realisasi = Number(realisasiRow?.total || 0);
  return {
    source_tahun: String(tahun),
    source_opd_id: Number(opdId),
    source_sub_kegiatan_id: map.master_sub_kegiatan_id,
    source_dpa_id: dpa.id,
    source_pagu_dpa: Number(dpa.anggaran || 0),
    source_realisasi: realisasi,
    detail: {
      kode_program: dpa.kode_program, nama_program: dpa.program,
      kode_kegiatan: dpa.kode_kegiatan, nama_kegiatan: dpa.kegiatan,
      kode_sub_kegiatan: dpa.kode_sub_kegiatan, nama_sub_kegiatan: dpa.sub_kegiatan,
      status_relevansi: map.status_relevansi, approval_status: dpa.approval_status,
    },
  };
}

/**
 * B.1.3 DPA/DPPA Authoritative Operational Target (mandat corrective "B.1.3
 * DPA/DPPA Authoritative Target Source") — TERPISAH dari `ambilSnapshot()` di
 * atas (yang tetap dipakai apa adanya utk dropdown pagu/realisasi lintas
 * indikator). Fungsi di bawah ini HANYA utk membaca target_ton operasional
 * B.1.3 dari Sub Kegiatan EXACT (bukan whitelist/dropdown/fuzzy):
 *
 *   2.09.03.1.02.0005 — Pengelolaan Cadangan Pangan Pemerintah Provinsi
 *
 * Exact code adalah authoritative mapping (hardcode literal, BUKAN diturunkan
 * dari tabel whitelist yang bisa berubah diam-diam) — mandat §2.
 */
const B13_KODE_SUB_KEGIATAN_CADANGAN_PANGAN = '2.09.03.1.02.0005';

function normalisasiSatuan(u) {
  return u ? String(u).trim().toLowerCase() : null;
}

/**
 * Parser aman target+satuan dari `dpa.target` (STRING bebas format, mandat
 * §5). `satuanWhitelist` = satuan resmi dari `prosnp_nomenklatur_mapping`
 * (data terverifikasi, BUKAN tebakan) — dipakai HANYA saat string target
 * tidak menyertakan satuan inline sendiri. TIDAK PERNAH mengasumsikan Ton
 * bila tidak ada bukti eksplisit (baik inline maupun whitelist confirmed).
 */
function parseTargetTonDpa(rawTarget, satuanWhitelist) {
  const raw = rawTarget === null || rawTarget === undefined ? '' : String(rawTarget).trim();
  if (!raw) {
    return {
      target_value_raw: null, target_unit_raw: null, target_ton: null,
      parsing_status: 'EMPTY', requires_review: true,
      alasan: 'Field target pada data DPA/DPPA kosong — tidak dapat dijadikan target operasional B.1.3.',
    };
  }
  const m = raw.match(/^([\d.,]+)\s*([a-zA-Z]+)?\s*$/);
  if (!m) {
    return {
      target_value_raw: raw, target_unit_raw: null, target_ton: null,
      parsing_status: 'UNRECOGNIZED_FORMAT', requires_review: true,
      alasan: `Format target "${raw}" pada data DPA/DPPA tidak dikenali sebagai angka (dengan/tanpa satuan).`,
    };
  }
  const numeric = Number(m[1].replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return {
      target_value_raw: raw, target_unit_raw: m[2] || satuanWhitelist || null, target_ton: null,
      parsing_status: 'INVALID_NUMERIC', requires_review: true,
      alasan: `Nilai angka "${m[1]}" pada target DPA/DPPA tidak valid (harus berupa angka > 0).`,
    };
  }
  const satuanInline = normalisasiSatuan(m[2]);
  if (satuanInline) {
    if (satuanInline !== 'ton') {
      return {
        target_value_raw: raw, target_unit_raw: m[2], target_ton: null,
        parsing_status: 'AMBIGUOUS_UNIT', requires_review: true,
        alasan: `Target DPA/DPPA "${raw}" memakai satuan "${m[2]}", bukan Ton — tidak dapat diasumsikan Ton secara otomatis.`,
      };
    }
    return { target_value_raw: raw, target_unit_raw: 'Ton', target_ton: numeric, parsing_status: 'OK', requires_review: false, alasan: null };
  }
  // Tidak ada satuan inline pada string — HANYA gunakan satuan whitelist nomenklatur
  // (data terverifikasi dari `prosnp_nomenklatur_mapping.satuan`) sebagai bukti satuan.
  if (normalisasiSatuan(satuanWhitelist) === 'ton') {
    return { target_value_raw: raw, target_unit_raw: satuanWhitelist, target_ton: numeric, parsing_status: 'OK', requires_review: false, alasan: null };
  }
  return {
    target_value_raw: raw, target_unit_raw: satuanWhitelist || null, target_ton: null,
    parsing_status: 'AMBIGUOUS_UNIT', requires_review: true,
    alasan: `Angka "${m[1]}" ditemukan pada data DPA/DPPA, tetapi satuan Ton tidak dapat dipastikan (satuan whitelist nomenklatur: ${satuanWhitelist || 'tidak diketahui'}).`,
  };
}

/**
 * Precedence deterministik DPA vs DPPA (mandat §3): HANYA `is_active_version
 * = true` yang menjadi sinyal presedensi utama, diurutkan `version DESC`
 * sbg diagnostic ordering. Bila >1 baris aktif ditemukan sekaligus (anomali),
 * TIDAK memilih diam-diam — dikembalikan sbg AMBIGUOUS_ACTIVE_VERSION supaya
 * pemanggil menolak menjadikannya authoritative tanpa tinjauan manual.
 */
async function resolveActiveDpaExact(tahun, opdId, kodeSubKegiatan, transaction) {
  const rows = await db.Dpa.findAll({
    where: { kode_sub_kegiatan: kodeSubKegiatan, tahun: String(tahun), opd_id: opdId, is_active_version: true },
    order: [['version', 'DESC']],
    transaction,
  });
  if (rows.length === 0) return { status: 'NOT_FOUND', dpa: null, candidates: [] };
  if (rows.length > 1) return { status: 'AMBIGUOUS_ACTIVE_VERSION', dpa: rows[0], candidates: rows };
  return { status: 'FOUND', dpa: rows[0], candidates: rows };
}

/**
 * Resolusi target operasional tahunan B.1.3 dari DPA/DPPA aktif Sub Kegiatan
 * EXACT `2.09.03.1.02.0005` (mandat corrective, generik utk tahun berapa pun
 * — TIDAK ADA hardcode angka/tahun tertentu di sini).
 */
async function resolveOperationalTargetB13(tahun, opdId, { transaction } = {}) {
  const kodeSubKegiatan = B13_KODE_SUB_KEGIATAN_CADANGAN_PANGAN;
  const resolusi = await resolveActiveDpaExact(tahun, opdId, kodeSubKegiatan, transaction);
  if (resolusi.status === 'NOT_FOUND') {
    return {
      ditemukan: false, requires_review: true, kode_sub_kegiatan: kodeSubKegiatan,
      alasan: `Tidak ditemukan data DPA/DPPA aktif (is_active_version=true) untuk Sub Kegiatan ${kodeSubKegiatan} tahun ${tahun} pada OPD terpilih.`,
    };
  }
  if (resolusi.status === 'AMBIGUOUS_ACTIVE_VERSION') {
    return {
      ditemukan: false, requires_review: true, kode_sub_kegiatan: kodeSubKegiatan,
      alasan: `Ditemukan lebih dari satu versi DPA/DPPA berstatus aktif (is_active_version=true) sekaligus untuk Sub Kegiatan ${kodeSubKegiatan} tahun ${tahun} — pemilihan otomatis dibatalkan demi keamanan data, perlu tinjauan manual.`,
      kandidat_ambigu: resolusi.candidates.map((d) => ({ dpa_id: d.id, version: d.version, jenis_dokumen: d.jenis_dokumen })),
    };
  }
  const dpa = resolusi.dpa;
  const mappingRow = await db.ProsnNomenklaturMapping.findOne({ where: { kode_sub_kegiatan: kodeSubKegiatan, is_active: true }, transaction, raw: true });
  const parsed = parseTargetTonDpa(dpa.target, mappingRow?.satuan || null);
  return {
    ditemukan: true,
    requires_review: parsed.requires_review,
    alasan: parsed.alasan,
    kode_sub_kegiatan: kodeSubKegiatan,
    nama_sub_kegiatan: dpa.sub_kegiatan,
    source_dpa_id: dpa.id,
    source_tahun: String(tahun),
    source_opd_id: Number(opdId),
    source_sub_kegiatan_id: mappingRow?.master_sub_kegiatan_id || null,
    jenis_dokumen: dpa.jenis_dokumen,
    version: dpa.version,
    is_active_version: dpa.is_active_version,
    indikator_raw: dpa.indikator,
    target_value_raw: parsed.target_value_raw,
    target_unit_raw: parsed.target_unit_raw,
    target_ton: parsed.target_ton,
    parsing_status: parsed.parsing_status,
    source_pagu_dpa: Number(dpa.anggaran || 0),
    source_realisasi: Number(dpa.realisasi || 0),
  };
}

module.exports = {
  DEFAULT_STATUSES,
  listTahunTersedia,
  listOpdTersedia,
  listProgramTersedia,
  listKegiatanTersedia,
  listSubKegiatanTersedia,
  ambilSnapshot,
  B13_KODE_SUB_KEGIATAN_CADANGAN_PANGAN,
  parseTargetTonDpa,
  resolveActiveDpaExact,
  resolveOperationalTargetB13,
};
