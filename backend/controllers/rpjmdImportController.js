"use strict";

const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const tenantContext = require("../lib/tenantContext");
const svc = require("../services/rpjmdImportReadService");
const writeSvc = require("../services/rpjmdImportWriteService");
const indSvc = require("../services/rpjmdImportIndikatorService");
const indExcel = require("../services/rpjmdImportIndikatorExcelFlow");
const { RPJMD_INDIKATOR_IMPORT_TABLES } = indExcel;
const { nodeErrorMessage, nodeErrorMessageSafe } = require("../utils/nodeErrorMessage");

async function resolveDefaultPeriodeId() {
  const rows = await sequelize.query(
    `SELECT id FROM periode_rpjmds WHERE tahun_awal = 2025 AND tahun_akhir = 2029 LIMIT 1`,
    { type: QueryTypes.SELECT },
  );
  if (rows[0]?.id) return rows[0].id;
  const rows2 = await sequelize.query(
    `SELECT id FROM periode_rpjmds WHERE tahun_awal <= 2029 AND tahun_akhir >= 2025 ORDER BY tahun_awal DESC LIMIT 1`,
    { type: QueryTypes.SELECT },
  );
  return rows2[0]?.id ?? null;
}

function ok(res, data, meta = undefined) {
  const body = { success: true, data };
  if (meta != null) body.meta = meta;
  return res.json(body);
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function extractErrorMessage(e) {
  return nodeErrorMessageSafe(e);
}

exports.getSummary = async (req, res) => {
  try {
    let pid = parseInt(req.params.periodeId, 10);
    if (Number.isNaN(pid)) pid = await resolveDefaultPeriodeId();
    if (!pid) return fail(res, 404, "periode_rpjmd tidak ditemukan");
    const data = await svc.summary(pid);
    return ok(res, data);
  } catch (e) {
    return fail(res, 500, e.message || "Gagal memuat ringkasan impor");
  }
};

exports.listUrusanKinerja = async (req, res) => {
  try {
    let pid = parseInt(req.params.periodeId, 10);
    if (Number.isNaN(pid)) pid = await resolveDefaultPeriodeId();
    if (!pid) return fail(res, 404, "periode_rpjmd tidak ditemukan");
    const { rows, total, limit, offset } = await svc.listUrusanKinerja(pid, req.query);
    return ok(res, rows, { total, limit, offset });
  } catch (e) {
    return fail(res, 500, e.message || "Gagal memuat data");
  }
};

exports.listApbdProyeksi = async (req, res) => {
  try {
    let pid = parseInt(req.params.periodeId, 10);
    if (Number.isNaN(pid)) pid = await resolveDefaultPeriodeId();
    if (!pid) return fail(res, 404, "periode_rpjmd tidak ditemukan");
    const { rows, total, limit, offset } = await svc.listApbdProyeksi(pid, req.query);
    return ok(res, rows, { total, limit, offset });
  } catch (e) {
    return fail(res, 500, e.message || "Gagal memuat data");
  }
};

exports.listTujuanSasaran = async (req, res) => {
  try {
    let pid = parseInt(req.params.periodeId, 10);
    if (Number.isNaN(pid)) pid = await resolveDefaultPeriodeId();
    if (!pid) return fail(res, 404, "periode_rpjmd tidak ditemukan");
    const { rows, total, limit, offset } = await svc.listTujuanSasaran(pid, req.query);
    return ok(res, rows, { total, limit, offset });
  } catch (e) {
    return fail(res, 500, e.message || "Gagal memuat data");
  }
};

exports.listArahKebijakan = async (req, res) => {
  try {
    let pid = parseInt(req.params.periodeId, 10);
    if (Number.isNaN(pid)) pid = await resolveDefaultPeriodeId();
    if (!pid) return fail(res, 404, "periode_rpjmd tidak ditemukan");
    const { rows, total, limit, offset } = await svc.listArahKebijakan(pid, req.query);
    return ok(res, rows, { total, limit, offset });
  } catch (e) {
    return fail(res, 500, e.message || "Gagal memuat data");
  }
};

exports.listIku = async (req, res) => {
  try {
    let pid = parseInt(req.params.periodeId, 10);
    if (Number.isNaN(pid)) pid = await resolveDefaultPeriodeId();
    if (!pid) return fail(res, 404, "periode_rpjmd tidak ditemukan");
    const { rows, total, limit, offset } = await svc.listIku(pid, req.query);
    return ok(res, rows, { total, limit, offset });
  } catch (e) {
    return fail(res, 500, e.message || "Gagal memuat data");
  }
};

const listIndikator =
  (fn) =>
  async (req, res) => {
    try {
      let pid = parseInt(req.params.periodeId, 10);
      if (Number.isNaN(pid)) pid = await resolveDefaultPeriodeId();
      if (!pid) return fail(res, 404, "periode_rpjmd tidak ditemukan");
      const { rows, total, limit, offset } = await fn(pid, req.query);
      return ok(res, rows, { total, limit, offset });
    } catch (e) {
      return fail(res, 500, e.message || "Gagal memuat data");
    }
  };

exports.listIndikatorTujuan = listIndikator(indSvc.listIndikatorTujuan);
exports.listIndikatorSasaran = listIndikator(indSvc.listIndikatorSasaran);
exports.listIndikatorStrategi = listIndikator(indSvc.listIndikatorStrategi);
exports.listIndikatorArahKebijakan = listIndikator(indSvc.listIndikatorArahKebijakan);
exports.listIndikatorProgram = listIndikator(indSvc.listIndikatorProgram);
exports.listIndikatorKegiatan = listIndikator(indSvc.listIndikatorKegiatan);
exports.listIndikatorSubKegiatan = listIndikator(indSvc.listIndikatorSubKegiatan);

function writeErr(res, e) {
  const msg = extractErrorMessage(e) || "Operasi gagal";
  if (e.code === "NOT_FOUND") return fail(res, 404, msg);
  if (e.code === "BAD_REQUEST") return fail(res, 400, msg);
  if (e.code === "CONFLICT") return fail(res, 409, msg);
  if (e.name === "SequelizeUniqueConstraintError") {
    return fail(res, 409, msg.includes("Duplicate") || msg.length > 5 ? msg : "Konflik data unik (mis. kode sudah dipakai).");
  }
  const dup =
    /duplicate entry|already exists|unique constraint|ER_DUP_ENTRY/i.test(msg) ||
    /duplicate entry|ER_DUP_ENTRY/i.test(String(e?.parent?.sqlMessage || ""));
  if (dup) return fail(res, 409, msg);
  return fail(res, 500, msg);
}

exports.updateUrusanKinerja = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const id = parseInt(req.params.id, 10);
    const data = await writeSvc.updateUrusanKinerja(pid, id, req.body || {});
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.deleteUrusanKinerja = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const id = parseInt(req.params.id, 10);
    const data = await writeSvc.deleteUrusanKinerja(pid, id);
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.updateApbdProyeksi = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const id = parseInt(req.params.id, 10);
    const data = await writeSvc.updateApbdProyeksi(pid, id, req.body || {});
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.deleteApbdProyeksi = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const id = parseInt(req.params.id, 10);
    const data = await writeSvc.deleteApbdProyeksi(pid, id);
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.updateTujuanSasaran = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const id = parseInt(req.params.id, 10);
    const data = await writeSvc.updateTujuanSasaran(pid, id, req.body || {});
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.deleteTujuanSasaran = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const id = parseInt(req.params.id, 10);
    const data = await writeSvc.deleteTujuanSasaran(pid, id);
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.updateArahKebijakan = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const id = parseInt(req.params.id, 10);
    const data = await writeSvc.updateArahKebijakan(pid, id, req.body || {});
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.deleteArahKebijakan = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const id = parseInt(req.params.id, 10);
    const data = await writeSvc.deleteArahKebijakan(pid, id);
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.updateIku = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const id = parseInt(req.params.id, 10);
    const data = await writeSvc.updateIku(pid, id, req.body || {});
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.deleteIku = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const id = parseInt(req.params.id, 10);
    const data = await writeSvc.deleteIku(pid, id);
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.createUrusanKinerja = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const data = await writeSvc.createUrusanKinerja(pid, req.body || {});
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.createApbdProyeksi = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const data = await writeSvc.createApbdProyeksi(pid, req.body || {});
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.createTujuanSasaran = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const data = await writeSvc.createTujuanSasaran(pid, req.body || {});
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.createArahKebijakan = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const data = await writeSvc.createArahKebijakan(pid, req.body || {});
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.createIku = async (req, res) => {
  try {
    const pid = parseInt(req.params.periodeId, 10);
    const data = await writeSvc.createIku(pid, req.body || {});
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

function indUpdate(fn) {
  return async (req, res) => {
    try {
      const pid = parseInt(req.params.periodeId, 10);
      const id = parseInt(req.params.id, 10);
      const data = await fn(pid, id, req.body || {});
      return ok(res, data);
    } catch (e) {
      return writeErr(res, e);
    }
  };
}

function indCreate(fn) {
  return async (req, res) => {
    try {
      const pid = parseInt(req.params.periodeId, 10);
      const data = await fn(pid, req.body || {});
      return ok(res, data);
    } catch (e) {
      return writeErr(res, e);
    }
  };
}

function indDelete(fn) {
  return async (req, res) => {
    try {
      const pid = parseInt(req.params.periodeId, 10);
      const id = parseInt(req.params.id, 10);
      const data = await fn(pid, id);
      return ok(res, data);
    } catch (e) {
      return writeErr(res, e);
    }
  };
}

exports.createIndikatorTujuan = indCreate(indSvc.createIndikatorTujuan);
exports.updateIndikatorTujuan = indUpdate(indSvc.updateIndikatorTujuan);
exports.deleteIndikatorTujuan = indDelete(indSvc.deleteIndikatorTujuan);

exports.createIndikatorSasaran = indCreate(indSvc.createIndikatorSasaran);
exports.updateIndikatorSasaran = indUpdate(indSvc.updateIndikatorSasaran);
exports.deleteIndikatorSasaran = indDelete(indSvc.deleteIndikatorSasaran);

exports.createIndikatorStrategi = indCreate(indSvc.createIndikatorStrategi);
exports.updateIndikatorStrategi = indUpdate(indSvc.updateIndikatorStrategi);
exports.deleteIndikatorStrategi = indDelete(indSvc.deleteIndikatorStrategi);

exports.createIndikatorArahKebijakan = indCreate(indSvc.createIndikatorArahKebijakan);
exports.updateIndikatorArahKebijakan = indUpdate(indSvc.updateIndikatorArahKebijakan);
exports.deleteIndikatorArahKebijakan = indDelete(indSvc.deleteIndikatorArahKebijakan);

exports.createIndikatorProgram = indCreate(indSvc.createIndikatorProgram);
exports.updateIndikatorProgram = indUpdate(indSvc.updateIndikatorProgram);
exports.deleteIndikatorProgram = indDelete(indSvc.deleteIndikatorProgram);

exports.createIndikatorKegiatan = indCreate(indSvc.createIndikatorKegiatan);
exports.updateIndikatorKegiatan = indUpdate(indSvc.updateIndikatorKegiatan);
exports.deleteIndikatorKegiatan = indDelete(indSvc.deleteIndikatorKegiatan);

exports.createIndikatorSubKegiatan = indCreate(indSvc.createIndikatorSubKegiatan);
exports.updateIndikatorSubKegiatan = indUpdate(indSvc.updateIndikatorSubKegiatan);
exports.deleteIndikatorSubKegiatan = indDelete(indSvc.deleteIndikatorSubKegiatan);

exports.previewIndikatorImport = async (req, res) => {
  try {
    const pid = parseInt(String(req.query.periodeId || req.body?.periodeId || ""), 10);
    if (!Number.isFinite(pid) || pid < 1) {
      return fail(res, 400, "Query periodeId wajib diisi (angka valid).");
    }
    const importTable = String(req.query.importTable || req.body?.importTable || "")
      .trim()
      .toLowerCase()
      .replace(/-/g, "_");
    if (!importTable || !RPJMD_INDIKATOR_IMPORT_TABLES.includes(importTable)) {
      return fail(
        res,
        400,
        `Query importTable wajib. Nilai: ${RPJMD_INDIKATOR_IMPORT_TABLES.join(", ")}.`,
      );
    }
    if (!req.file || !req.file.buffer) {
      return fail(res, 400, "Berkas Excel wajib diupload (field form: file).");
    }
    const tid = Number(req.user?.tenant_id);
    const tenantId = Number.isFinite(tid) && tid > 0 ? tid : 1;
    const data = await tenantContext.run({ tenantId }, () =>
      indExcel.buildPreview(pid, req.file.buffer, { tables: [importTable] }),
    );
    return ok(res, data);
  } catch (e) {
    return writeErr(res, e);
  }
};

exports.applyIndikatorImport = async (req, res) => {
  try {
    const { previewId, periodeId } = req.body || {};
    const pid = parseInt(String(periodeId || ""), 10);
    if (!Number.isFinite(pid) || pid < 1) {
      return fail(res, 400, "Body periodeId wajib diisi (angka valid).");
    }
    if (!previewId || String(previewId).trim() === "") {
      return fail(res, 400, "Body previewId wajib diisi (hasil unggah pratinjau).");
    }
    const userId = req.user?.id ?? null;
    const tid = Number(req.user?.tenant_id);
    const tenantId = Number.isFinite(tid) && tid > 0 ? tid : 1;
    /**
     * verifyToken memanggil tenantContext.run(..., () => next()). Pada beberapa
     * kombinasi Express + async handler, konteks AsyncLocalStorage bisa tidak
     * membungkus seluruh `await` di rute. Jalankan apply di dalam run lagi
     * agar hook tenant (beforeFind / beforeValidate) selalu punya tenant_id.
     */
    const data = await tenantContext.run({ tenantId }, () =>
      indExcel.applyPreview(pid, previewId, { userId }),
    );
    return ok(res, data);
  } catch (e) {
    console.error("[applyIndikatorImport]", nodeErrorMessage(e), e?.name, e?.errors);
    return writeErr(res, e);
  }
};
