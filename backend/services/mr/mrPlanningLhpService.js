"use strict";

/**
 * MR Planning LHP Service — Modul TLHP
 * ---------------------------------------------------------------------------
 * LHP (Laporan Hasil Pemeriksaan/Pengawasan) adalah entitas kepala dari
 * hierarki SIPTL: LHP -> Temuan -> Rekomendasi -> Tindak Lanjut.
 *
 * Guard:
 * - Frontend hanya boleh mengirim field bisnis. Field teknis (label
 *   denormalisasi, counter, status_dokumen, lock) wajib diisi backend.
 * - LHP tidak memakai approval workflow draft/verifikasi/approved/ditolak —
 *   siklusnya draft -> aktif -> diarsipkan (lihat rencana implementasi §0
 *   Judgment Call, LHP adalah registrasi dokumen sumber, bukan putusan bisnis
 *   yang perlu disetujui berjenjang).
 */

const fs = require("fs");
const crypto = require("crypto");

const {
  MrPlanningLhp,
  MrReferenceItem,
  MrReferenceGroup,
  RenstraOPD,
} = require("../../models");

// Sprint 8 -- S8: LHP/Temuan OPD authorization boundary.
// LHP/Temuan-specific helper (BUKAN reuse/generalisasi dari
// resolveMrPlanningRiskOpdBoundary di mrPlanningRiskService.js -- kode
// Sprint 7 yang sudah accepted TIDAK disentuh) karena namespace opd_id di
// keluarga LHP/Temuan BERBEDA dari keluarga Risk: LHP/Temuan.opd_id memakai
// RenstraOPD.id (lihat komentar resolveLabelsForPayload di bawah), sedangkan
// Risk memakai OpdPenanggungJawab.id lewat OpdPenanggungJawab.findOne. Caller
// identity (user.opd) tetap string nama OPD yang sama pada kedua keluarga
// (konvensi existing di seluruh aplikasi) -- hanya tabel resolusi targetnya
// yang beda, jadi resolusi caller di sini memakai RenstraOPD.findOne({where:
// {nama_opd: user.opd}}), pola name-based matching yang SUDAH established
// dipakai lintas modul MR (lihat mrAutoFillAggregatorService.js
// resolveRenstraOpdNamaOpd/resolveOpdPenanggungJawabIds) untuk masalah
// id-space yang sama persis. SUPER_ADMIN tetap tenant-wide. Fail closed
// kalau resolusi caller gagal karena error internal.
async function resolveMrPlanningLhpOpdBoundary({ user, targetOpdId }) {
  if (user?.role === "SUPER_ADMIN") {
    return { ok: true, superAdmin: true, callerOpdId: null };
  }

  if (targetOpdId === null || targetOpdId === undefined) {
    // Target belum/tidak punya opd_id -- biarkan alur existing (404/422)
    // yang menangani, bukan boundary check ini.
    return { ok: true, superAdmin: false, callerOpdId: null };
  }

  const opdName = user?.opd;
  if (!opdName) {
    return {
      ok: false,
      status: 403,
      error: {
        message: "Anda tidak berwenang melakukan aksi ini pada LHP/Temuan milik OPD lain.",
        code: "MR_LHP_TEMUAN_OPD_FORBIDDEN",
      },
    };
  }

  let callerOpdId = null;
  try {
    const renstraOpdRow = await RenstraOPD.findOne({ where: { nama_opd: opdName } });
    callerOpdId = renstraOpdRow?.id ?? null;
  } catch (err) {
    return {
      ok: false,
      status: 503,
      error: {
        message: "Batas kewenangan OPD untuk LHP/Temuan tidak dapat diverifikasi saat ini. Aksi ditolak sementara demi keamanan data -- silakan coba lagi.",
        code: "MR_LHP_TEMUAN_OPD_BOUNDARY_UNAVAILABLE",
      },
    };
  }

  if (callerOpdId === null || callerOpdId !== targetOpdId) {
    return {
      ok: false,
      status: 403,
      error: {
        message: "Anda tidak berwenang melakukan aksi ini pada LHP/Temuan milik OPD lain.",
        code: "MR_LHP_TEMUAN_OPD_FORBIDDEN",
      },
    };
  }

  return { ok: true, superAdmin: false, callerOpdId };
}

// Melempar MrPlanningLhpServiceError yang konsisten dengan pola error
// existing di file ini dari hasil resolveMrPlanningLhpOpdBoundary yang
// ok:false. Didefinisikan sebelum class MrPlanningLhpServiceError secara
// tekstual, tapi aman dipanggil di sini karena hanya direferensikan di
// dalam fungsi (tidak dieksekusi saat module load) -- class declaration
// di bawah sudah ter-hoist pada saat fungsi ini benar-benar dipanggil.
function throwMrPlanningLhpOpdBoundaryError(boundaryResult) {
  throw new MrPlanningLhpServiceError(boundaryResult.error.message, {
    status: boundaryResult.status,
    code: boundaryResult.error.code,
  });
}

const toPositiveIntOrNull = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const ALLOWED_CREATE_UPDATE_FIELDS = new Set([
  "entitas_pemeriksa_ref_id",
  "jenis_pemeriksaan_ref_id",
  "nomor_lhp",
  "judul_lhp",
  "tanggal_lhp",
  "tahun_lhp",
  "tahun",
  "ringkasan_lhp",
  "periode_pemeriksaan_awal",
  "periode_pemeriksaan_akhir",
  "opd_id",
  "surat_tugas_nomor",
  "surat_tugas_tanggal",
  "tanggal_terima_lhp",
  "nomor_surat_pengantar",
  "tanggal_surat_pengantar",
  "perihal_surat_pengantar",
  "context_id",
  "alasan_revisi",
]);

class MrPlanningLhpServiceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "MrPlanningLhpServiceError";
    this.status = options.status || 400;
    this.statusCode = options.status || 400;
    this.code = options.code || "MR_LHP_VALIDATION_ERROR";
    this.blocked = options.blocked !== undefined ? options.blocked : true;
    this.details = options.details || {};
  }
}

const throwValidation = (message, details = {}, code = "MR_LHP_VALIDATION_ERROR") => {
  throw new MrPlanningLhpServiceError(message, { status: 400, code, details });
};

const getActorId = (user) => user?.id || user?.user_id || user?.userId || null;

const pickAllowedFields = (body = {}) => {
  const payload = {};
  const blocked = [];

  Object.keys(body || {}).forEach((key) => {
    if (ALLOWED_CREATE_UPDATE_FIELDS.has(key)) {
      payload[key] = body[key];
      return;
    }
    blocked.push(key);
  });

  if (blocked.length > 0) {
    throwValidation("Field tidak diperbolehkan.", { fields: blocked }, "MR_LHP_BLOCKED_FIELDS");
  }

  return payload;
};

const resolveReferenceLabel = async (id, options = {}) => {
  if (!id) return null;

  const item = await MrReferenceItem.findByPk(id, {
    include: [{ model: MrReferenceGroup, as: "group", required: false }],
    ...options,
  });

  if (!item) {
    throwValidation("Reference item tidak ditemukan.", { reference_id: id }, "MR_REFERENCE_NOT_FOUND");
  }

  return {
    id: item.id,
    kode_group: item.group?.kode_group || null,
    kode_item: item.kode_item,
    label: item.nama_item || item.nilai_text || item.kode_item,
    is_active: Boolean(item.is_active),
  };
};

const ensureReferenceGroup = (ref, expectedGroup, fieldName) => {
  if (!ref) return;

  if (!ref.is_active) {
    throwValidation("Reference item tidak aktif.", { field: fieldName, reference_id: ref.id });
  }

  if (ref.kode_group !== expectedGroup) {
    throwValidation("Reference item tidak sesuai group yang diizinkan.", {
      field: fieldName,
      reference_id: ref.id,
      kode_group: ref.kode_group,
      expected_group: expectedGroup,
    });
  }
};

const resolveLabelsForPayload = async (payload = {}, options = {}) => {
  const resolved = { ...payload };

  if (payload.entitas_pemeriksa_ref_id) {
    const ref = await resolveReferenceLabel(payload.entitas_pemeriksa_ref_id, options);
    ensureReferenceGroup(ref, "MR_TLHP_ENTITAS_PEMERIKSA", "entitas_pemeriksa_ref_id");
    resolved.entitas_pemeriksa = ref?.label || null;
  }

  if (payload.jenis_pemeriksaan_ref_id) {
    const ref = await resolveReferenceLabel(payload.jenis_pemeriksaan_ref_id, options);
    ensureReferenceGroup(ref, "MR_TLHP_JENIS_PEMERIKSAAN", "jenis_pemeriksaan_ref_id");
    resolved.jenis_pemeriksaan = ref?.label || null;
  }

  // opd_id di LHP memakai RenstraOPD.id (konvensi sama dengan opd_id di form
  // Step 1 wizard MR — lihat StepContext.jsx), BUKAN OpdPenanggungJawab.id.
  // nama_opd diresolusi & didenormalisasi di sini (bukan disimpan langsung dari
  // frontend) supaya Temuan yang mewarisi opd_id/nama_opd dari LHP (lihat
  // createTemuan di mrPlanningTemuanService.js) selalu punya label yang PERSIS
  // sama dengan RenstraOPD.nama_opd — dropdown "Pilih Data Temuan" di wizard MR
  // (getTemuanOptions, mrAutoFillAggregatorService.js) mencocokkan by nama_opd,
  // bukan opd_id, karena OpdPenanggungJawab punya banyak baris duplikat per OPD.
  if (payload.opd_id) {
    const renstraOpd = await RenstraOPD.findByPk(payload.opd_id);
    resolved.nama_opd = renstraOpd?.nama_opd || null;
  }

  return resolved;
};

const addDaysToDateOnly = (dateValue, days) => {
  if (!dateValue) return null;

  const base = new Date(dateValue);
  if (Number.isNaN(base.getTime())) return null;

  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
};

const findLhpOrFail = async (lhpId, options = {}) => {
  const lhp = await MrPlanningLhp.findByPk(lhpId, options);

  if (!lhp) {
    throw new MrPlanningLhpServiceError("LHP tidak ditemukan.", {
      status: 404,
      code: "MR_LHP_NOT_FOUND",
    });
  }

  return lhp;
};

const createLhp = async ({ body = {}, user } = {}) => {
  const userId = getActorId(user);
  const allowedPayload = pickAllowedFields(body);

  if (!allowedPayload.nomor_lhp || !allowedPayload.judul_lhp) {
    throwValidation("Nomor LHP dan Judul LHP wajib diisi.", {
      missing_fields: ["nomor_lhp", "judul_lhp"].filter((f) => !allowedPayload[f]),
    });
  }

  // Sprint 8 -- S8L-001: payload.opd_id bukan bukti otorisasi -- caller
  // OPD-scoped harus divalidasi terhadap OPD-nya sendiri SEBELUM LHP baru
  // dibuat. Tidak menulis ulang (silently rewrite) opd_id yang tidak
  // berwenang -- permintaan yang tidak cocok DITOLAK sebelum create.
  const intendedOpdIdLhp = toPositiveIntOrNull(allowedPayload.opd_id);
  const boundaryCreateLhp = await resolveMrPlanningLhpOpdBoundary({
    user,
    targetOpdId: intendedOpdIdLhp,
  });
  if (!boundaryCreateLhp.ok) {
    throwMrPlanningLhpOpdBoundaryError(boundaryCreateLhp);
  }

  const labelPayload = await resolveLabelsForPayload(allowedPayload);

  return MrPlanningLhp.create({
    ...labelPayload,
    status_dokumen: "draft",
    is_locked: false,
    is_active: true,
    dibuat_oleh: userId,
    dibuat_pada: new Date(),
    created_by: userId,
    updated_by: userId,
  });
};

const updateDraftLhp = async ({ lhpId, body = {}, user } = {}) => {
  const userId = getActorId(user);
  const lhp = await findLhpOrFail(lhpId);

  // Sprint 8 -- S8L-002: otorisasi terhadap stored lhp.opd_id SEBELUM
  // mutasi apa pun -- ditempatkan sebelum guard status_dokumen supaya
  // caller yang tidak berwenang tidak mendapat informasi status LHP milik
  // OPD lain sama sekali.
  const boundaryUpdateLhp = await resolveMrPlanningLhpOpdBoundary({
    user,
    targetOpdId: lhp?.opd_id ?? null,
  });
  if (!boundaryUpdateLhp.ok) {
    throwMrPlanningLhpOpdBoundaryError(boundaryUpdateLhp);
  }

  if (lhp.status_dokumen !== "draft") {
    throw new MrPlanningLhpServiceError(
      "LHP hanya dapat diubah selagi berstatus Draft.",
      { status: 400, code: "MR_LHP_NOT_DRAFT" },
    );
  }

  const allowedPayload = pickAllowedFields(body);
  const merged = { ...lhp.get({ plain: true }), ...allowedPayload };
  const labelPayload = await resolveLabelsForPayload(merged);

  await lhp.update({
    ...allowedPayload,
    entitas_pemeriksa: labelPayload.entitas_pemeriksa,
    jenis_pemeriksaan: labelPayload.jenis_pemeriksaan,
    nama_opd: labelPayload.nama_opd,
    last_revised_at: new Date(),
    last_revised_by: userId,
    updated_by: userId,
  });

  return lhp;
};

const activateLhp = async ({ lhpId, user } = {}) => {
  const userId = getActorId(user);
  const lhp = await findLhpOrFail(lhpId);

  // Sprint 8 -- S8L-003
  const boundaryActivateLhp = await resolveMrPlanningLhpOpdBoundary({
    user,
    targetOpdId: lhp?.opd_id ?? null,
  });
  if (!boundaryActivateLhp.ok) {
    throwMrPlanningLhpOpdBoundaryError(boundaryActivateLhp);
  }

  if (lhp.status_dokumen !== "draft") {
    throw new MrPlanningLhpServiceError(
      "Hanya LHP berstatus Draft yang bisa diaktifkan.",
      { status: 400, code: "MR_LHP_NOT_DRAFT" },
    );
  }

  const plain = lhp.get({ plain: true });
  const labelPayload = await resolveLabelsForPayload(plain);
  const batasWaktu = addDaysToDateOnly(plain.tanggal_terima_lhp, 60);

  await lhp.update({
    entitas_pemeriksa: labelPayload.entitas_pemeriksa,
    jenis_pemeriksaan: labelPayload.jenis_pemeriksaan,
    nama_opd: labelPayload.nama_opd,
    batas_waktu_tindak_lanjut: batasWaktu,
    status_dokumen: "aktif",
    last_revised_at: new Date(),
    last_revised_by: userId,
    updated_by: userId,
  });

  return lhp;
};

const archiveLhp = async ({ lhpId, user } = {}) => {
  const userId = getActorId(user);
  const lhp = await findLhpOrFail(lhpId);

  // Sprint 8 -- S8L-004
  const boundaryArchiveLhp = await resolveMrPlanningLhpOpdBoundary({
    user,
    targetOpdId: lhp?.opd_id ?? null,
  });
  if (!boundaryArchiveLhp.ok) {
    throwMrPlanningLhpOpdBoundaryError(boundaryArchiveLhp);
  }

  if (lhp.status_dokumen !== "aktif") {
    throw new MrPlanningLhpServiceError(
      "Hanya LHP berstatus Aktif yang bisa diarsipkan.",
      { status: 400, code: "MR_LHP_NOT_ACTIVE" },
    );
  }

  await lhp.update({
    status_dokumen: "diarsipkan",
    last_revised_at: new Date(),
    last_revised_by: userId,
    updated_by: userId,
  });

  return lhp;
};

const normalizeFilePath = (filePath) => (filePath ? filePath.replace(/\\/g, "/") : null);

const buildFileUrl = (file) => {
  if (!file?.path) return null;
  const normalized = normalizeFilePath(file.path);
  const uploadIndex = normalized.indexOf("/uploads/");
  return uploadIndex >= 0 ? normalized.slice(uploadIndex) : null;
};

const getFileChecksum = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
};

const uploadLhpFile = async ({ lhpId, file, user } = {}) => {
  if (!file || !file.filename || !file.path) {
    throw new MrPlanningLhpServiceError("Berkas LHP wajib diunggah.", {
      status: 400,
      code: "MR_LHP_FILE_REQUIRED",
    });
  }

  const userId = getActorId(user);
  const lhp = await findLhpOrFail(lhpId);

  // Sprint 8 -- S8L-005
  const boundaryUploadLhp = await resolveMrPlanningLhpOpdBoundary({
    user,
    targetOpdId: lhp?.opd_id ?? null,
  });
  if (!boundaryUploadLhp.ok) {
    throwMrPlanningLhpOpdBoundaryError(boundaryUploadLhp);
  }

  await lhp.update({
    file_name: file.filename,
    original_file_name: file.originalname || file.filename,
    file_path: normalizeFilePath(file.path),
    file_url: buildFileUrl(file),
    mime_type: file.mimetype,
    file_size: file.size || 0,
    storage_provider: "local",
    checksum: getFileChecksum(file.path),
    last_revised_at: new Date(),
    last_revised_by: userId,
    updated_by: userId,
  });

  return lhp;
};

// =====================================================
// B01-F01 — METADATA COMPLETION UNTUK LHP AKTIF/DIARSIPKAN (IMPORT)
// =====================================================
// Latar belakang (Wave 2 Operational UAT finding B01-F01):
// mrPlanningTlhpImportService.js.findOrCreateLhp() membuat LHP dari import
// PDF Matriks Pemantauan TLHP BPK dengan nomor_lhp placeholder
// ("IMPORT-BPK-{tahun}-{stamp}") dan ringkasan_lhp yang secara eksplisit
// meminta user melengkapi Nomor LHP/Surat Tugas/Surat Pengantar yang
// sebenarnya — lalu LANGSUNG mengaktifkan LHP tersebut (findOrCreateLhp
// selalu memanggil activateLhp setelah createLhp, karena Temuan hanya bisa
// dibuat di bawah LHP aktif). Akibatnya updateDraftLhp() yang men-guard
// status_dokumen==="draft" TIDAK PERNAH bisa dipakai untuk melengkapi field
// administratif tersebut pada LHP hasil import — user terkunci permanen
// dari mengoreksi typo/melengkapi provenance dokumen resmi.
//
// Guard (sesuai mandat §Wave 2 B01-F01 — TIDAK membuka LHP aktif menjadi
// full-editable secara umum):
// - Field yang diizinkan HANYA metadata administratif/provenance dokumen
//   (nomor surat, tanggal surat, ringkasan, tanggal terima) — field yang
//   secara desain import ditinggalkan sebagai placeholder/tidak lengkap.
// - TIDAK termasuk: status_dokumen, is_locked, jumlah_temuan,
//   jumlah_rekomendasi (counter bisnis turunan dari Temuan — lihat
//   mrPlanningTemuanService.js), context_id, opd_id/entitas_pemeriksa_ref_id/
//   jenis_pemeriksaan_ref_id (mengubah field ini akan merusak label
//   denormalisasi yang sudah diwariskan ke Temuan turunan — lihat
//   resolveLabelsForPayload/createTemuan).
// - Diizinkan pada status_dokumen IN (aktif, diarsipkan) — draft sudah
//   dilayani updateDraftLhp() yang jauh lebih permisif.
// - alasan_revisi WAJIB diisi (jejak audit minimal: siapa mengubah apa,
//   kenapa) — LHP tidak memakai history table terpisah (lihat komentar
//   modul di atas), sehingga alasan_revisi + last_revised_at/by pada baris
//   aktif adalah satu-satunya jejak yang tersedia untuk operasi ini,
//   konsisten dengan pola field yang sudah ada di model (tidak menambah
//   tabel/migrasi baru).
const METADATA_COMPLETION_ALLOWED_FIELDS = Object.freeze([
  "nomor_lhp",
  "judul_lhp",
  "tanggal_lhp",
  "surat_tugas_nomor",
  "surat_tugas_tanggal",
  "nomor_surat_pengantar",
  "tanggal_surat_pengantar",
  "perihal_surat_pengantar",
  "tanggal_terima_lhp",
  "ringkasan_lhp",
]);

const completeLhpMetadata = async ({ lhpId, body = {}, user } = {}) => {
  const userId = getActorId(user);
  const lhp = await findLhpOrFail(lhpId);

  // Sprint 8 -- S8L-006
  const boundaryCompleteLhp = await resolveMrPlanningLhpOpdBoundary({
    user,
    targetOpdId: lhp?.opd_id ?? null,
  });
  if (!boundaryCompleteLhp.ok) {
    throwMrPlanningLhpOpdBoundaryError(boundaryCompleteLhp);
  }

  if (!["aktif", "diarsipkan"].includes(lhp.status_dokumen)) {
    throw new MrPlanningLhpServiceError(
      "Pelengkapan metadata ini hanya berlaku untuk LHP berstatus Aktif atau Diarsipkan. LHP berstatus Draft dapat diedit langsung melalui endpoint update biasa.",
      { status: 400, code: "MR_LHP_METADATA_COMPLETION_WRONG_STATUS", details: { status_dokumen: lhp.status_dokumen } },
    );
  }

  // alasan_revisi bukan bagian dari METADATA_COMPLETION_ALLOWED_FIELDS (field
  // itu daftar field METADATA yang boleh diubah), tapi WAJIB dikirim di body
  // dan divalidasi terpisah di bawah — dikecualikan di sini supaya tidak
  // salah ditolak sebagai "field tidak diperbolehkan" (bug ditemukan oleh
  // fresh regression B01-T04c, root-caused sebelum diperbaiki).
  const requestedKeys = Object.keys(body || {}).filter((key) => key !== "alasan_revisi");
  const blockedKeys = requestedKeys.filter((key) => !METADATA_COMPLETION_ALLOWED_FIELDS.includes(key));

  if (blockedKeys.length > 0) {
    throwValidation(
      "Field tidak diperbolehkan untuk pelengkapan metadata LHP aktif/diarsipkan.",
      { fields: blockedKeys, allowed_fields: [...METADATA_COMPLETION_ALLOWED_FIELDS] },
      "MR_LHP_METADATA_COMPLETION_BLOCKED_FIELDS",
    );
  }

  const allowedPayload = {};
  METADATA_COMPLETION_ALLOWED_FIELDS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      allowedPayload[key] = body[key];
    }
  });

  if (Object.keys(allowedPayload).length === 0) {
    throwValidation(
      "Tidak ada field metadata yang dikirim untuk dilengkapi.",
      {},
      "MR_LHP_METADATA_COMPLETION_EMPTY",
    );
  }

  if (!body.alasan_revisi || !String(body.alasan_revisi).trim()) {
    throwValidation(
      "Alasan pelengkapan/perubahan metadata wajib diisi untuk menjaga jejak audit.",
      {},
      "MR_LHP_METADATA_COMPLETION_REASON_REQUIRED",
    );
  }

  await lhp.update({
    ...allowedPayload,
    alasan_revisi: body.alasan_revisi,
    last_revised_at: new Date(),
    last_revised_by: userId,
    updated_by: userId,
  });

  return lhp;
};

const getLhpDetail = async (lhpId) => {
  return findLhpOrFail(lhpId, {
    include: [
      { model: MrReferenceItem, as: "entitas_pemeriksa_ref", required: false },
      { model: MrReferenceItem, as: "jenis_pemeriksaan_ref", required: false },
    ],
  });
};

const listLhp = async ({ tahun, entitas_pemeriksa_ref_id, opd_id, status_dokumen } = {}) => {
  const where = { is_active: true };

  if (tahun) where.tahun = tahun;
  if (entitas_pemeriksa_ref_id) where.entitas_pemeriksa_ref_id = entitas_pemeriksa_ref_id;
  if (opd_id) where.opd_id = opd_id;
  if (status_dokumen) where.status_dokumen = status_dokumen;

  return MrPlanningLhp.findAll({
    where,
    order: [
      ["tahun", "DESC"],
      ["id", "DESC"],
    ],
  });
};

module.exports = {
  MrPlanningLhpServiceError,
  ALLOWED_CREATE_UPDATE_FIELDS,
  METADATA_COMPLETION_ALLOWED_FIELDS,

  // Sprint 8 -- S8: LHP/Temuan-specific OPD authorization boundary helper,
  // dipakai ulang oleh mrPlanningTemuanService.js (SEMUA beroperasi pada
  // namespace opd_id RenstraOPD.id yang sama).
  resolveMrPlanningLhpOpdBoundary,
  throwMrPlanningLhpOpdBoundaryError,

  createLhp,
  updateDraftLhp,
  completeLhpMetadata,
  activateLhp,
  archiveLhp,
  uploadLhpFile,
  getLhpDetail,
  listLhp,
  findLhpOrFail,
};
