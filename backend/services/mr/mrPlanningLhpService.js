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
} = require("../../models");

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
    last_revised_at: new Date(),
    last_revised_by: userId,
    updated_by: userId,
  });

  return lhp;
};

const activateLhp = async ({ lhpId, user } = {}) => {
  const userId = getActorId(user);
  const lhp = await findLhpOrFail(lhpId);

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
  createLhp,
  updateDraftLhp,
  activateLhp,
  archiveLhp,
  uploadLhpFile,
  getLhpDetail,
  listLhp,
  findLhpOrFail,
};
