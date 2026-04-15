"use strict";

const { Op } = require("sequelize");
const {
  MasterProgram,
  MasterKegiatan,
  MasterSubKegiatan,
} = require("../models");

/**
 * Memastikan kombinasi master program → kegiatan → sub sah untuk satu regulasi_versi.
 * Hanya mempertimbangkan baris master dengan is_active = true (setelah migrasi Sprint 1).
 *
 * @param {object} params
 * @param {number} params.regulasiVersiId
 * @param {number} params.masterProgramId
 * @param {number} params.masterKegiatanId
 * @param {number} params.masterSubKegiatanId
 * @returns {Promise<{ valid: boolean, errors: string[] }>}
 */
async function assertHierarchy({
  regulasiVersiId,
  masterProgramId,
  masterKegiatanId,
  masterSubKegiatanId,
}) {
  const errors = [];
  const vid = Number(regulasiVersiId);
  const pid = Number(masterProgramId);
  const kid = Number(masterKegiatanId);
  const sid = Number(masterSubKegiatanId);

  if (!Number.isInteger(vid) || vid < 1) {
    errors.push("regulasi_versi_id tidak valid");
  }
  if (!Number.isInteger(pid) || pid < 1) {
    errors.push("master_program_id tidak valid");
  }
  if (!Number.isInteger(kid) || kid < 1) {
    errors.push("master_kegiatan_id tidak valid");
  }
  if (!Number.isInteger(sid) || sid < 1) {
    errors.push("master_sub_kegiatan_id tidak valid");
  }
  if (errors.length) return { valid: false, errors };

  const activeWhere = {
    [Op.or]: [{ is_active: true }, { is_active: { [Op.is]: null } }],
  };

  const program = await MasterProgram.findOne({
    where: { id: pid, regulasi_versi_id: vid, ...activeWhere },
    attributes: ["id", "regulasi_versi_id", "kode_program_full"],
  });
  if (!program) {
    errors.push(
      "Program master tidak ditemukan, tidak aktif, atau regulasi_versi_id tidak cocok",
    );
    return { valid: false, errors };
  }

  const kegiatan = await MasterKegiatan.findOne({
    where: {
      id: kid,
      master_program_id: pid,
      ...activeWhere,
    },
    attributes: [
      "id",
      "master_program_id",
      "regulasi_versi_id",
      "kode_kegiatan_full",
    ],
  });
  if (!kegiatan) {
    errors.push(
      "Kegiatan master tidak ditemukan, tidak aktif, atau bukan anak dari program yang dipilih",
    );
    return { valid: false, errors };
  }

  if (
    kegiatan.regulasi_versi_id != null &&
    Number(kegiatan.regulasi_versi_id) !== vid
  ) {
    errors.push(
      "regulasi_versi_id pada master_kegiatan tidak sama dengan permintaan",
    );
    return { valid: false, errors };
  }

  const sub = await MasterSubKegiatan.findOne({
    where: {
      id: sid,
      master_kegiatan_id: kid,
      ...activeWhere,
    },
    attributes: [
      "id",
      "master_kegiatan_id",
      "regulasi_versi_id",
      "kode_sub_kegiatan_full",
    ],
  });
  if (!sub) {
    errors.push(
      "Sub kegiatan master tidak ditemukan, tidak aktif, atau bukan anak dari kegiatan yang dipilih",
    );
    return { valid: false, errors };
  }

  if (sub.regulasi_versi_id != null && Number(sub.regulasi_versi_id) !== vid) {
    errors.push(
      "regulasi_versi_id pada master_sub_kegiatan tidak sama dengan permintaan",
    );
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Validasi hierarki untuk transaksi sub_kegiatan dari payload master.
 * Urutan: gunakan master_program_id / master_kegiatan_id dari body jika ada;
 * jika tidak, derive dari MasterSubKegiatan → MasterKegiatan → MasterProgram.
 *
 * @param {object} params
 * @param {number} params.regulasiVersiId
 * @param {number} params.masterSubKegiatanId
 * @param {number|undefined|null} [params.masterKegiatanId]
 * @param {number|undefined|null} [params.masterProgramId]
 * @returns {Promise<{ valid: boolean, errors: string[] }>}
 */
async function assertSubKegiatanMasterPayload({
  regulasiVersiId,
  masterSubKegiatanId,
  masterKegiatanId,
  masterProgramId,
}) {
  const vid = Number(regulasiVersiId);
  const sid = Number(masterSubKegiatanId);
  if (!Number.isInteger(vid) || vid < 1) {
    return { valid: false, errors: ["regulasi_versi_id tidak valid"] };
  }
  if (!Number.isInteger(sid) || sid < 1) {
    return { valid: false, errors: ["master_sub_kegiatan_id tidak valid"] };
  }

  const sub = await MasterSubKegiatan.findOne({
    where: { id: sid },
    include: [
      {
        model: MasterKegiatan,
        as: "masterKegiatan",
        required: true,
        include: [
          {
            model: MasterProgram,
            as: "masterProgram",
            required: true,
            attributes: ["id", "regulasi_versi_id", "kode_program_full"],
          },
        ],
        attributes: [
          "id",
          "master_program_id",
          "regulasi_versi_id",
          "kode_kegiatan_full",
        ],
      },
    ],
    attributes: ["id", "master_kegiatan_id", "regulasi_versi_id", "kode_sub_kegiatan_full"],
  });

  if (!sub || !sub.masterKegiatan) {
    return {
      valid: false,
      errors: [
        "Master sub kegiatan tidak ditemukan atau relasi kegiatan master tidak lengkap",
      ],
    };
  }

  const derivedKegiatanId = Number(sub.master_kegiatan_id);
  const derivedProgramId = Number(sub.masterKegiatan.master_program_id);

  const optK = masterKegiatanId != null ? Number(masterKegiatanId) : null;
  const optP = masterProgramId != null ? Number(masterProgramId) : null;

  if (optK != null && Number.isInteger(optK) && optK !== derivedKegiatanId) {
    return {
      valid: false,
      errors: [
        "master_kegiatan_id tidak cocok dengan induk master_sub_kegiatan yang dipilih",
      ],
    };
  }
  if (optP != null && Number.isInteger(optP) && optP !== derivedProgramId) {
    return {
      valid: false,
      errors: [
        "master_program_id tidak cocok dengan induk master_sub_kegiatan yang dipilih",
      ],
    };
  }

  return assertHierarchy({
    regulasiVersiId: vid,
    masterProgramId: derivedProgramId,
    masterKegiatanId: derivedKegiatanId,
    masterSubKegiatanId: sid,
  });
}

module.exports = {
  assertHierarchy,
  assertSubKegiatanMasterPayload,
};
