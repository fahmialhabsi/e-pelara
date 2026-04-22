"use strict";

const {
  UrusanKinerja20212024,
  ApbdProyeksi20262030,
  RpjmdTargetTujuanSasaran20252029,
  ArahKebijakanRpjmdPdf,
  IkuRpjmd,
} = require("../models");
const indRpjmd = require("./rpjmdImportIndikatorService");

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

function clampLimit(raw) {
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function clampOffset(raw) {
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

async function listModel(Model, periodeId, query) {
  const limit = clampLimit(query.limit);
  const offset = clampOffset(query.offset);
  const where = { periode_rpjmd_id: periodeId };
  const { count, rows } = await Model.findAndCountAll({
    where,
    order: [["id", "ASC"]],
    limit,
    offset,
    raw: true,
  });
  return { rows, total: count, limit, offset };
}

async function summary(periodeId) {
  const where = { periode_rpjmd_id: periodeId };
  const [u, a, t, r, i] = await Promise.all([
    UrusanKinerja20212024.count({ where }),
    ApbdProyeksi20262030.count({ where }),
    RpjmdTargetTujuanSasaran20252029.count({ where }),
    ArahKebijakanRpjmdPdf.count({ where }),
    IkuRpjmd.count({ where }),
  ]);
  return {
    periode_rpjmd_id: periodeId,
    urusan_kinerja_2021_2024: u,
    apbd_proyeksi_2026_2030: a,
    rpjmd_target_tujuan_sasaran_2025_2029: t,
    arah_kebijakan_rpjmd: r,
    iku_rpjmd: i,
  };
}

module.exports = {
  listUrusanKinerja: (pid, q) => listModel(UrusanKinerja20212024, pid, q),
  listApbdProyeksi: (pid, q) => listModel(ApbdProyeksi20262030, pid, q),
  listTujuanSasaran: (pid, q) => listModel(RpjmdTargetTujuanSasaran20252029, pid, q),
  listArahKebijakan: (pid, q) => listModel(ArahKebijakanRpjmdPdf, pid, q),
  listIku: (pid, q) => listModel(IkuRpjmd, pid, q),
  listIndikatorTujuan: indRpjmd.listIndikatorTujuan,
  listIndikatorSasaran: indRpjmd.listIndikatorSasaran,
  listIndikatorStrategi: indRpjmd.listIndikatorStrategi,
  listIndikatorArahKebijakan: indRpjmd.listIndikatorArahKebijakan,
  listIndikatorProgram: indRpjmd.listIndikatorProgram,
  listIndikatorKegiatan: indRpjmd.listIndikatorKegiatan,
  listIndikatorSubKegiatan: indRpjmd.listIndikatorSubKegiatan,
  summary,
};
