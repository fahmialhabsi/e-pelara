"use strict";

/**
 * MR Planning Tindak Lanjut Document Service — Modul TLHP
 * ---------------------------------------------------------------------------
 * Bukti dukung Tindak Lanjut (bukti setoran, surat pertanggungjawaban, berita
 * acara, dst). Copy-adapt dari mrPlanningMitigationDocumentService.js.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  sequelize,
  MrPlanningTindakLanjut,
  MrPlanningTindakLanjutDocument,
} = require("../../models");

const DOCUMENT_TYPES = Object.freeze({
  BUKTI_SETORAN: "BUKTI_SETORAN",
  SURAT_PERTANGGUNGJAWABAN: "SURAT_PERTANGGUNGJAWABAN",
  BERITA_ACARA_TINDAK_LANJUT: "BERITA_ACARA_TINDAK_LANJUT",
  SK_PENERAPAN: "SK_PENERAPAN",
  DOKUMEN_PENDUKUNG_LAINNYA: "DOKUMEN_PENDUKUNG_LAINNYA",
});

const DOCUMENT_TYPE_LABELS = Object.freeze({
  BUKTI_SETORAN: "Bukti Setoran",
  SURAT_PERTANGGUNGJAWABAN: "Surat Pertanggungjawaban",
  BERITA_ACARA_TINDAK_LANJUT: "Berita Acara Tindak Lanjut",
  SK_PENERAPAN: "SK Penerapan",
  DOKUMEN_PENDUKUNG_LAINNYA: "Dokumen Pendukung Lainnya",
});

const ACTIVE_STATUSES = Object.freeze(["draft", "aktif"]);

const getActorId = (user = {}) => user.id || user.user_id || user.userId || user.sub || null;

const toIntegerId = (value, label = "ID") => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error(`${label} tidak valid.`);
    error.status = 400;
    throw error;
  }

  return id;
};

const cleanText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const assertDocumentType = (value) => {
  const documentType = cleanText(value);

  if (!documentType || !DOCUMENT_TYPES[documentType]) {
    const error = new Error("Jenis dokumen tidak sesuai.");
    error.status = 400;
    error.code = "MR_TINDAK_LANJUT_DOCUMENT_INVALID_TYPE";
    error.allowed_document_types = Object.values(DOCUMENT_TYPES);
    throw error;
  }

  return documentType;
};

const assertRequiredText = (value, message) => {
  const text = cleanText(value);

  if (!text) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }

  return text;
};

const assertUploadedFile = (file) => {
  if (!file) {
    const error = new Error("Dokumen wajib diunggah.");
    error.status = 400;
    error.code = "MR_TINDAK_LANJUT_DOCUMENT_FILE_REQUIRED";
    throw error;
  }

  if (!file.filename || !file.path) {
    const error = new Error("Dokumen belum dapat diproses.");
    error.status = 400;
    error.code = "MR_TINDAK_LANJUT_DOCUMENT_FILE_INVALID";
    throw error;
  }

  return file;
};

const getFileChecksum = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
};

const removeUploadedFileQuietly = (file) => {
  try {
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  } catch (_) {
    // Pembersihan file tidak boleh mengganggu response utama.
  }
};

const normalizeFilePath = (filePath) => {
  if (!filePath) return null;
  return filePath.replace(/\\/g, "/");
};

const buildFileUrl = (file) => {
  if (!file?.path) return null;

  const normalized = normalizeFilePath(file.path);
  const uploadIndex = normalized.indexOf("/uploads/");

  return uploadIndex >= 0 ? normalized.slice(uploadIndex) : null;
};

const findTindakLanjutOrFail = async (tindakLanjutId, options = {}) => {
  const id = toIntegerId(tindakLanjutId, "ID Tindak Lanjut");

  const tindakLanjut = await MrPlanningTindakLanjut.findOne({
    where: { id, is_active: true },
    transaction: options.transaction,
  });

  if (!tindakLanjut) {
    const error = new Error("Tindak Lanjut tidak ditemukan.");
    error.status = 404;
    error.code = "MR_TINDAK_LANJUT_NOT_FOUND";
    throw error;
  }

  return tindakLanjut;
};

const formatDocument = (document) => {
  if (!document) return null;

  const plain = typeof document.get === "function" ? document.get({ plain: true }) : document;

  return {
    ...plain,
    document_type_label: DOCUMENT_TYPE_LABELS[plain.document_type] || plain.document_type,
  };
};

const createDocument = async ({ tindakLanjutId, body = {}, file, user }) => {
  const uploadedFile = assertUploadedFile(file);
  const actorId = getActorId(user);

  try {
    return await sequelize.transaction(async (transaction) => {
      const tindakLanjut = await findTindakLanjutOrFail(tindakLanjutId, { transaction });

      const documentType = assertDocumentType(body.document_type);
      const documentTitle = assertRequiredText(body.document_title, "Judul dokumen wajib diisi.");

      const checksum = getFileChecksum(uploadedFile.path);

      const document = await MrPlanningTindakLanjutDocument.create(
        {
          mr_planning_tindak_lanjut_id: tindakLanjut.id,
          mr_planning_temuan_rekomendasi_id: tindakLanjut.mr_planning_temuan_rekomendasi_id,
          mr_planning_temuan_id: tindakLanjut.mr_planning_temuan_id,
          context_id: tindakLanjut.context_id,

          document_type: documentType,
          document_title: documentTitle,
          document_number: cleanText(body.document_number),
          document_date: cleanText(body.document_date),
          description: cleanText(body.description),

          file_name: uploadedFile.filename,
          original_file_name: uploadedFile.originalname || uploadedFile.filename,
          file_path: normalizeFilePath(uploadedFile.path),
          file_url: buildFileUrl(uploadedFile),
          mime_type: uploadedFile.mimetype,
          file_size: uploadedFile.size || 0,
          storage_provider: "local",
          checksum,

          status_dokumen: "aktif",
          is_active: true,

          uploaded_by: actorId,
          uploaded_at: new Date(),

          created_by: actorId,
          updated_by: actorId,
        },
        { transaction },
      );

      return formatDocument(document);
    });
  } catch (error) {
    removeUploadedFileQuietly(uploadedFile);
    throw error;
  }
};

const listDocumentsByTindakLanjut = async ({ tindakLanjutId }) => {
  const tindakLanjut = await findTindakLanjutOrFail(tindakLanjutId);

  const documents = await MrPlanningTindakLanjutDocument.findAll({
    where: {
      mr_planning_tindak_lanjut_id: tindakLanjut.id,
      is_active: true,
      status_dokumen: ACTIVE_STATUSES,
    },
    order: [
      ["uploaded_at", "DESC"],
      ["id", "DESC"],
    ],
  });

  return documents.map(formatDocument);
};

const getDocumentDetail = async ({ documentId }) => {
  const id = toIntegerId(documentId, "ID Dokumen");

  const document = await MrPlanningTindakLanjutDocument.findOne({
    where: { id, is_active: true },
  });

  if (!document) {
    const error = new Error("Dokumen tidak ditemukan.");
    error.status = 404;
    error.code = "MR_TINDAK_LANJUT_DOCUMENT_NOT_FOUND";
    throw error;
  }

  return formatDocument(document);
};

const cancelDocument = async ({ documentId, body = {}, user }) => {
  const id = toIntegerId(documentId, "ID Dokumen");
  const actorId = getActorId(user);
  const cancelReason = assertRequiredText(body.cancel_reason, "Alasan pembatalan dokumen wajib diisi.");

  return sequelize.transaction(async (transaction) => {
    const document = await MrPlanningTindakLanjutDocument.findOne({
      where: { id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!document) {
      const error = new Error("Dokumen tidak ditemukan.");
      error.status = 404;
      error.code = "MR_TINDAK_LANJUT_DOCUMENT_NOT_FOUND";
      throw error;
    }

    if (!document.is_active || document.status_dokumen === "dibatalkan") {
      const error = new Error("Dokumen sudah dibatalkan sebelumnya.");
      error.status = 409;
      error.code = "MR_TINDAK_LANJUT_DOCUMENT_ALREADY_CANCELLED";
      throw error;
    }

    await document.update(
      {
        is_active: false,
        status_dokumen: "dibatalkan",
        cancelled_by: actorId,
        cancelled_at: new Date(),
        cancel_reason: cancelReason,
        updated_by: actorId,
      },
      { transaction },
    );

    return formatDocument(document);
  });
};

const getDocumentForDownload = async ({ documentId }) => {
  const document = await getDocumentDetail({ documentId });

  if (!document?.file_path) {
    const error = new Error("Berkas dokumen tidak ditemukan.");
    error.status = 404;
    error.code = "MR_TINDAK_LANJUT_DOCUMENT_FILE_NOT_FOUND";
    throw error;
  }

  const absolutePath = path.resolve(document.file_path);

  if (!fs.existsSync(absolutePath)) {
    const error = new Error("Berkas dokumen tidak ditemukan pada penyimpanan.");
    error.status = 404;
    error.code = "MR_TINDAK_LANJUT_DOCUMENT_STORAGE_FILE_NOT_FOUND";
    throw error;
  }

  return {
    document,
    absolutePath,
    originalFileName: document.original_file_name || document.file_name,
    mimeType: document.mime_type || "application/octet-stream",
  };
};

module.exports = {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  createDocument,
  listDocumentsByTindakLanjut,
  getDocumentDetail,
  cancelDocument,
  getDocumentForDownload,
};
