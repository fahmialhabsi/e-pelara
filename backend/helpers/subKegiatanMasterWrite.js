"use strict";

const { assertSubKegiatanMasterPayload } = require("../middlewares/validateHierarchy");

function hasOwn(obj, key) {
  return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
}

function parsePositiveInt(val) {
  if (val === undefined || val === null || val === "") return null;
  const n = Number.parseInt(String(val).trim(), 10);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

function isMasterPayload(body) {
  if (!body || typeof body !== "object") return false;
  return (
    hasOwn(body, "master_sub_kegiatan_id") ||
    hasOwn(body, "masterSubKegiatanId") ||
    hasOwn(body, "regulasi_versi_id") ||
    hasOwn(body, "regulasiVersiId")
  );
}

function isCompleteMasterPayload(body) {
  if (!body || typeof body !== "object") return false;
  const sid = parsePositiveInt(body.master_sub_kegiatan_id ?? body.masterSubKegiatanId);
  const vid = parsePositiveInt(body.regulasi_versi_id ?? body.regulasiVersiId);
  return sid != null && vid != null;
}

/**
 * Gabungkan field master dari body (prioritas) dan baris existing (update).
 * @param {object} body
 * @param {import('sequelize').Model|null} existing
 */
function mergeMasterContext(body, existing) {
  const b = body || {};
  const e = existing;

  let master_sub_kegiatan_id;
  let regulasi_versi_id;

  if (hasOwn(b, "master_sub_kegiatan_id") || hasOwn(b, "masterSubKegiatanId")) {
    const raw = b.master_sub_kegiatan_id ?? b.masterSubKegiatanId;
    master_sub_kegiatan_id =
      raw === null || raw === "" ? null : parsePositiveInt(raw);
  } else {
    master_sub_kegiatan_id = e?.master_sub_kegiatan_id ?? null;
  }

  if (hasOwn(b, "regulasi_versi_id") || hasOwn(b, "regulasiVersiId")) {
    const raw = b.regulasi_versi_id ?? b.regulasiVersiId;
    regulasi_versi_id = raw === null || raw === "" ? null : parsePositiveInt(raw);
  } else {
    regulasi_versi_id = e?.regulasi_versi_id ?? null;
  }

  const master_kegiatan_id = parsePositiveInt(
    b.master_kegiatan_id ?? b.masterKegiatanId,
  );
  const master_program_id = parsePositiveInt(
    b.master_program_id ?? b.masterProgramId,
  );

  return {
    master_sub_kegiatan_id,
    regulasi_versi_id,
    master_kegiatan_id: master_kegiatan_id ?? undefined,
    master_program_id: master_program_id ?? undefined,
  };
}

function mergedIsComplete(merged) {
  return (
    merged.master_sub_kegiatan_id != null &&
    merged.regulasi_versi_id != null
  );
}

/**
 * Baris yang sudah punya FK master tidak boleh diturunkan ke flow legacy.
 */
function isExistingMasterBound(existing) {
  if (!existing) return false;
  if (String(existing.input_mode || "") === "MASTER") return true;
  if (existing.master_sub_kegiatan_id != null) return true;
  return false;
}

/**
 * @param {object} opts
 * @param {object} opts.body
 * @param {import('sequelize').Model|null} opts.existing
 * @param {string} opts.operationalMode
 */
async function prepareSubKegiatanMasterWrite({ body, existing, operationalMode }) {
  const mode = String(operationalMode || "LEGACY").toUpperCase();
  const merged = mergeMasterContext(body, existing);
  const complete = mergedIsComplete(merged);
  const masterBound = isExistingMasterBound(existing);

  if (masterBound) {
    if (merged.master_sub_kegiatan_id == null || merged.regulasi_versi_id == null) {
      return {
        ok: false,
        status: 400,
        code: "MASTER_FIELDS_REQUIRED",
        message:
          "Baris sudah terikat master; master_sub_kegiatan_id dan regulasi_versi_id harus tetap lengkap (kirim di body atau pertahankan nilai existing).",
      };
    }
  }

  if (isMasterPayload(body) && !isCompleteMasterPayload(body)) {
    return {
      ok: false,
      status: 400,
      code: "MASTER_FIELDS_REQUIRED",
      message:
        "Field master tidak lengkap: kirim master_sub_kegiatan_id dan regulasi_versi_id bersamaan.",
    };
  }

  if (mode === "MASTER" && !complete) {
    return {
      ok: false,
      status: 400,
      code: "MASTER_FIELDS_REQUIRED",
      message:
        "Mode MASTER: master_sub_kegiatan_id dan regulasi_versi_id wajib (pada body atau dari baris yang sudah terikat master).",
    };
  }

  if (complete) {
    const hier = await assertSubKegiatanMasterPayload({
      regulasiVersiId: merged.regulasi_versi_id,
      masterSubKegiatanId: merged.master_sub_kegiatan_id,
      masterKegiatanId: merged.master_kegiatan_id,
      masterProgramId: merged.master_program_id,
    });
    if (!hier.valid) {
      return {
        ok: false,
        status: 400,
        code: "INVALID_HIERARCHY",
        message: "Hierarki master tidak valid untuk regulasi ini.",
        details: hier.errors,
      };
    }
    return {
      ok: true,
      input_mode: "MASTER",
      merged,
      transitionWarning: null,
    };
  }

  if (mode === "TRANSITION") {
    return {
      ok: true,
      input_mode: "LEGACY",
      merged,
      transitionWarning:
        "Transaksi legacy (tanpa master) di mode TRANSITION; pertimbangkan penyesuaian sebelum mode MASTER.",
    };
  }

  return {
    ok: true,
    input_mode: "LEGACY",
    merged,
    transitionWarning: null,
  };
}

module.exports = {
  isMasterPayload,
  isCompleteMasterPayload,
  mergeMasterContext,
  prepareSubKegiatanMasterWrite,
  isExistingMasterBound,
};
