"use strict";

const {
  MasterProgram,
  MasterKegiatan,
  MasterSubKegiatan,
  MasterIndikator,
} = require("../models");

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function categorizeMaps(oldList, newList, kodeFn, namaFn, idFn) {
  const oldMap = new Map(oldList.map((o) => [kodeFn(o), o]));
  const newMap = new Map(newList.map((n) => [kodeFn(n), n]));
  const unchanged = [];
  const changed = [];
  const deleted = [];
  const added = [];

  for (const [kode, o] of oldMap) {
    const n = newMap.get(kode);
    if (!n) {
      deleted.push({
        id: idFn(o),
        kode,
        nama: namaFn(o),
      });
    } else if (norm(namaFn(o)) === norm(namaFn(n))) {
      unchanged.push({
        idOld: idFn(o),
        idNew: idFn(n),
        kode,
        nama: namaFn(o),
      });
    } else {
      changed.push({
        idOld: idFn(o),
        idNew: idFn(n),
        kode,
        namaOld: namaFn(o),
        namaNew: namaFn(n),
      });
    }
  }

  for (const [kode, n] of newMap) {
    if (!oldMap.has(kode)) {
      added.push({
        id: idFn(n),
        kode,
        nama: namaFn(n),
      });
    }
  }

  return { unchanged, changed, deleted, added };
}

async function loadPrograms(regulasiVersiId) {
  return MasterProgram.findAll({
    where: { regulasi_versi_id: regulasiVersiId },
    attributes: [
      "id",
      "kode_program_full",
      "nama_program",
      "regulasi_versi_id",
    ],
    order: [["kode_program_full", "ASC"]],
    raw: true,
  });
}

async function loadKegiatans(regulasiVersiId) {
  return MasterKegiatan.findAll({
    where: { regulasi_versi_id: regulasiVersiId },
    attributes: [
      "id",
      "kode_kegiatan_full",
      "nama_kegiatan",
      "master_program_id",
      "regulasi_versi_id",
    ],
    order: [["kode_kegiatan_full", "ASC"]],
    raw: true,
  });
}

async function loadSubs(regulasiVersiId) {
  return MasterSubKegiatan.findAll({
    where: { regulasi_versi_id: regulasiVersiId },
    attributes: [
      "id",
      "kode_sub_kegiatan_full",
      "nama_sub_kegiatan",
      "master_kegiatan_id",
      "regulasi_versi_id",
    ],
    order: [["kode_sub_kegiatan_full", "ASC"]],
    raw: true,
  });
}

async function loadIndikators(regulasiVersiId) {
  return MasterIndikator.findAll({
    where: { regulasi_versi_id: regulasiVersiId },
    attributes: [
      "id",
      "master_sub_kegiatan_id",
      "indikator",
      "satuan",
      "urutan",
      "regulasi_versi_id",
    ],
    order: [
      ["master_sub_kegiatan_id", "ASC"],
      ["urutan", "ASC"],
    ],
    raw: true,
  });
}

/**
 * @param {number} fromVersiId
 * @param {number} toVersiId
 */
async function compareVersi(fromVersiId, toVersiId) {
  const [pOld, pNew, kOld, kNew, sOld, sNew, iOld, iNew] = await Promise.all([
    loadPrograms(fromVersiId),
    loadPrograms(toVersiId),
    loadKegiatans(fromVersiId),
    loadKegiatans(toVersiId),
    loadSubs(fromVersiId),
    loadSubs(toVersiId),
    loadIndikators(fromVersiId),
    loadIndikators(toVersiId),
  ]);

  const program = categorizeMaps(
    pOld,
    pNew,
    (r) => r.kode_program_full,
    (r) => r.nama_program,
    (r) => r.id,
  );
  const kegiatan = categorizeMaps(
    kOld,
    kNew,
    (r) => r.kode_kegiatan_full,
    (r) => r.nama_kegiatan,
    (r) => r.id,
  );
  const subKegiatan = categorizeMaps(
    sOld,
    sNew,
    (r) => r.kode_sub_kegiatan_full,
    (r) => r.nama_sub_kegiatan,
    (r) => r.id,
  );

  const indKey = (r) =>
    `${r.master_sub_kegiatan_id}|${norm(r.indikator)}|${norm(r.satuan)}`;
  const indikator = categorizeMaps(
    iOld,
    iNew,
    indKey,
    (r) => r.indikator,
    (r) => r.id,
  );

  return {
    regulasiVersiFromId: fromVersiId,
    regulasiVersiToId: toVersiId,
    program,
    kegiatan,
    subKegiatan,
    indikator,
    counts: {
      program: {
        unchanged: program.unchanged.length,
        changed: program.changed.length,
        deleted: program.deleted.length,
        added: program.added.length,
      },
      kegiatan: {
        unchanged: kegiatan.unchanged.length,
        changed: kegiatan.changed.length,
        deleted: kegiatan.deleted.length,
        added: kegiatan.added.length,
      },
      subKegiatan: {
        unchanged: subKegiatan.unchanged.length,
        changed: subKegiatan.changed.length,
        deleted: subKegiatan.deleted.length,
        added: subKegiatan.added.length,
      },
      indikator: {
        unchanged: indikator.unchanged.length,
        changed: indikator.changed.length,
        deleted: indikator.deleted.length,
        added: indikator.added.length,
      },
    },
  };
}

module.exports = {
  compareVersi,
  norm,
};
