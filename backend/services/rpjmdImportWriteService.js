"use strict";

const {
  UrusanKinerja20212024,
  ApbdProyeksi20262030,
  RpjmdTargetTujuanSasaran20252029,
  ArahKebijakanRpjmdPdf,
  IkuRpjmd,
} = require("../models");

function toInt(v) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function pickDefined(body, keys) {
  const out = {};
  for (const k of keys) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

function str(v, maxLen) {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  if (maxLen && s.length > maxLen) return s.slice(0, maxLen);
  return s;
}

/** Angka dari format umum ID (titik ribuan / koma desimal). */
function parseNumLoose(v) {
  if (v === undefined || v === null) return null;
  let s = String(v).trim().replace(/\s/g, "");
  if (!s) return null;
  const lc = s.lastIndexOf(",");
  const ld = s.lastIndexOf(".");
  if (lc !== -1 && lc > ld) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function computeT31BaselineFromTargets(o) {
  const keys = ["target_2025", "target_2026", "target_2027", "target_2028", "target_2029", "target_2030"];
  const nums = keys.map((k) => parseNumLoose(o[k])).filter((n) => n !== null);
  if (!nums.length) return null;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  return String(Number(mean.toFixed(2)));
}

function assertPeriodeId(periodeId) {
  const pid = toInt(periodeId);
  if (!pid) {
    const e = new Error("periode_rpjmd_id tidak valid.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  return pid;
}

async function findOwned(Model, periodeId, id) {
  const pid = toInt(periodeId);
  const rid = toInt(id);
  if (!pid || !rid) {
    const e = new Error("ID periode atau baris tidak valid.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const row = await Model.findOne({ where: { id: rid, periode_rpjmd_id: pid } });
  if (!row) {
    const e = new Error("Data tidak ditemukan untuk periode ini.");
    e.code = "NOT_FOUND";
    throw e;
  }
  return row;
}

async function updateUrusanKinerja(periodeId, id, body) {
  const row = await findOwned(UrusanKinerja20212024, periodeId, id);
  const data = pickDefined(body, [
    "bidang_urusan",
    "no_urut",
    "indikator",
    "tahun_2021",
    "tahun_2022",
    "tahun_2023",
    "tahun_2024",
    "tahun_2025",
    "satuan",
  ]);
  if (data.bidang_urusan !== undefined) data.bidang_urusan = str(data.bidang_urusan, 8) || null;
  if (data.no_urut !== undefined) {
    const n = toInt(data.no_urut);
    if (n == null || n < 0) {
      const e = new Error("no_urut harus angka valid.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    data.no_urut = n;
  }
  if (data.indikator !== undefined) {
    const t = str(data.indikator, 65535);
    if (!t || !String(t).trim()) {
      const e = new Error("Indikator tidak boleh kosong.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    data.indikator = t;
  }
  for (const y of ["tahun_2021", "tahun_2022", "tahun_2023", "tahun_2024", "tahun_2025", "satuan"]) {
    if (data[y] !== undefined) data[y] = str(data[y], y === "satuan" ? 255 : 64) || null;
  }
  await row.update(data);
  return row.get({ plain: true });
}

async function deleteUrusanKinerja(periodeId, id) {
  const row = await findOwned(UrusanKinerja20212024, periodeId, id);
  await row.destroy();
  return { deleted: true, id: toInt(id) };
}

async function createUrusanKinerja(periodeId, body) {
  const pid = assertPeriodeId(periodeId);
  const b = body || {};
  const noUrut = toInt(b.no_urut);
  if (noUrut == null || noUrut < 0) {
    const e = new Error("no_urut wajib diisi (angka valid).");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const ind = str(b.indikator, 65535);
  if (!ind || !String(ind).trim()) {
    const e = new Error("Indikator tidak boleh kosong.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const row = await UrusanKinerja20212024.create({
    periode_rpjmd_id: pid,
    bidang_urusan: str(b.bidang_urusan, 8) || null,
    no_urut: noUrut,
    indikator: ind,
    tahun_2021: str(b.tahun_2021, 64) || null,
    tahun_2022: str(b.tahun_2022, 64) || null,
    tahun_2023: str(b.tahun_2023, 64) || null,
    tahun_2024: str(b.tahun_2024, 64) || null,
    tahun_2025: str(b.tahun_2025, 64) || null,
    satuan: str(b.satuan, 255) || null,
  });
  return row.get({ plain: true });
}

async function updateApbdProyeksi(periodeId, id, body) {
  const row = await findOwned(ApbdProyeksi20262030, periodeId, id);
  const data = pickDefined(body, [
    "kode_baris",
    "uraian",
    "target_2025",
    "proyeksi_2026",
    "proyeksi_2027",
    "proyeksi_2028",
    "proyeksi_2029",
    "proyeksi_2030",
  ]);
  if (data.uraian !== undefined) {
    const t = str(data.uraian, 65535);
    if (!t || !String(t).trim()) {
      const e = new Error("Uraian tidak boleh kosong.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    data.uraian = t;
  }
  if (data.kode_baris !== undefined) data.kode_baris = str(data.kode_baris, 32) || null;
  for (const k of ["target_2025", "proyeksi_2026", "proyeksi_2027", "proyeksi_2028", "proyeksi_2029", "proyeksi_2030"]) {
    if (data[k] !== undefined) data[k] = str(data[k], 64) || null;
  }
  await row.update(data);
  return row.get({ plain: true });
}

async function deleteApbdProyeksi(periodeId, id) {
  const row = await findOwned(ApbdProyeksi20262030, periodeId, id);
  await row.destroy();
  return { deleted: true, id: toInt(id) };
}

async function createApbdProyeksi(periodeId, body) {
  const pid = assertPeriodeId(periodeId);
  const b = body || {};
  const uraian = str(b.uraian, 65535);
  if (!uraian || !String(uraian).trim()) {
    const e = new Error("Uraian tidak boleh kosong.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const row = await ApbdProyeksi20262030.create({
    periode_rpjmd_id: pid,
    kode_baris: str(b.kode_baris, 32) || null,
    uraian,
    target_2025: str(b.target_2025, 64) || null,
    proyeksi_2026: str(b.proyeksi_2026, 64) || null,
    proyeksi_2027: str(b.proyeksi_2027, 64) || null,
    proyeksi_2028: str(b.proyeksi_2028, 64) || null,
    proyeksi_2029: str(b.proyeksi_2029, 64) || null,
    proyeksi_2030: str(b.proyeksi_2030, 64) || null,
  });
  return row.get({ plain: true });
}

async function updateTujuanSasaran(periodeId, id, body) {
  const row = await findOwned(RpjmdTargetTujuanSasaran20252029, periodeId, id);
  const data = pickDefined(body, [
    "urutan",
    "tujuan",
    "sasaran",
    "indikator",
    "target_2025",
    "target_2026",
    "target_2027",
    "target_2028",
    "target_2029",
    "target_2030",
    "ket",
  ]);
  if (data.urutan !== undefined) {
    const n = toInt(data.urutan);
    if (n == null || n < 0) {
      const e = new Error("urutan harus angka valid.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    data.urutan = n;
  }
  if (data.indikator !== undefined) {
    const t = str(data.indikator, 65535);
    if (!t || !String(t).trim()) {
      const e = new Error("Indikator tidak boleh kosong.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    data.indikator = t;
  }
  for (const k of ["tujuan", "sasaran", "ket"]) {
    if (data[k] !== undefined) data[k] = str(data[k], 65535) || null;
  }
  for (const k of ["target_2025", "target_2026", "target_2027", "target_2028", "target_2029", "target_2030"]) {
    if (data[k] !== undefined) data[k] = str(data[k], 128) || null;
  }
  const plain = row.get({ plain: true });
  const merged = { ...plain, ...data };
  const bl = computeT31BaselineFromTargets(merged);
  data.baseline_2024 = bl;
  await row.update(data);
  return row.get({ plain: true });
}

async function deleteTujuanSasaran(periodeId, id) {
  const row = await findOwned(RpjmdTargetTujuanSasaran20252029, periodeId, id);
  await row.destroy();
  return { deleted: true, id: toInt(id) };
}

async function createTujuanSasaran(periodeId, body) {
  const pid = assertPeriodeId(periodeId);
  const b = body || {};
  const maxU = await RpjmdTargetTujuanSasaran20252029.max("urutan", { where: { periode_rpjmd_id: pid } });
  const urutan = Math.max(0, Number(maxU) || 0) + 1;
  const indikator = str(b.indikator, 65535);
  if (!indikator || !String(indikator).trim()) {
    const e = new Error("Indikator tidak boleh kosong.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const tgt = {
    target_2025: str(b.target_2025, 128) || null,
    target_2026: str(b.target_2026, 128) || null,
    target_2027: str(b.target_2027, 128) || null,
    target_2028: str(b.target_2028, 128) || null,
    target_2029: str(b.target_2029, 128) || null,
    target_2030: str(b.target_2030, 128) || null,
  };
  const bl = computeT31BaselineFromTargets(tgt) || null;
  const row = await RpjmdTargetTujuanSasaran20252029.create({
    periode_rpjmd_id: pid,
    urutan,
    tujuan: str(b.tujuan, 65535) || null,
    sasaran: str(b.sasaran, 65535) || null,
    indikator,
    baseline_2024: bl,
    ...tgt,
    ket: str(b.ket, 65535) || null,
  });
  return row.get({ plain: true });
}

async function updateArahKebijakan(periodeId, id, body) {
  const row = await findOwned(ArahKebijakanRpjmdPdf, periodeId, id);
  const data = pickDefined(body, ["no_misi", "misi_ringkas", "arah_kebijakan"]);
  if (data.no_misi !== undefined) {
    const n = toInt(data.no_misi);
    if (n == null || n < 1) {
      const e = new Error("no_misi harus angka valid.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    data.no_misi = n;
  }
  if (data.misi_ringkas !== undefined) data.misi_ringkas = str(data.misi_ringkas, 512) || null;
  if (data.arah_kebijakan !== undefined) {
    const t = str(data.arah_kebijakan, 16777215);
    if (!t || !String(t).trim()) {
      const e = new Error("Arah kebijakan tidak boleh kosong.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    data.arah_kebijakan = t;
  }
  await row.update(data);
  return row.get({ plain: true });
}

async function deleteArahKebijakan(periodeId, id) {
  const row = await findOwned(ArahKebijakanRpjmdPdf, periodeId, id);
  await row.destroy();
  return { deleted: true, id: toInt(id) };
}

async function createArahKebijakan(periodeId, body) {
  const pid = assertPeriodeId(periodeId);
  const b = body || {};
  const noMisi = toInt(b.no_misi);
  if (noMisi == null || noMisi < 1) {
    const e = new Error("no_misi wajib diisi (angka ≥ 1).");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const arah = str(b.arah_kebijakan, 16777215);
  if (!arah || !String(arah).trim()) {
    const e = new Error("Arah kebijakan tidak boleh kosong.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const row = await ArahKebijakanRpjmdPdf.create({
    periode_rpjmd_id: pid,
    no_misi: noMisi,
    misi_ringkas: str(b.misi_ringkas, 512) || null,
    arah_kebijakan: arah,
  });
  return row.get({ plain: true });
}

async function updateIku(periodeId, id, body) {
  const row = await findOwned(IkuRpjmd, periodeId, id);
  const data = pickDefined(body, [
    "no_urut",
    "indikator",
    "baseline_2024",
    "target_2025",
    "target_2026",
    "target_2027",
    "target_2028",
    "target_2029",
    "target_2030",
  ]);
  if (data.no_urut !== undefined) {
    const n = toInt(data.no_urut);
    if (n == null || n < 0) {
      const e = new Error("no_urut harus angka valid.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    data.no_urut = n;
  }
  if (data.indikator !== undefined) {
    const t = str(data.indikator, 65535);
    if (!t || !String(t).trim()) {
      const e = new Error("Indikator tidak boleh kosong.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    data.indikator = t;
  }
  for (const k of ["baseline_2024", "target_2025", "target_2026", "target_2027", "target_2028", "target_2029", "target_2030"]) {
    if (data[k] !== undefined) data[k] = str(data[k], 128) || null;
  }
  await row.update(data);
  return row.get({ plain: true });
}

async function deleteIku(periodeId, id) {
  const row = await findOwned(IkuRpjmd, periodeId, id);
  await row.destroy();
  return { deleted: true, id: toInt(id) };
}

async function createIku(periodeId, body) {
  const pid = assertPeriodeId(periodeId);
  const b = body || {};
  const noUrut = toInt(b.no_urut);
  if (noUrut == null || noUrut < 0) {
    const e = new Error("no_urut wajib diisi (angka valid).");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const indikator = str(b.indikator, 65535);
  if (!indikator || !String(indikator).trim()) {
    const e = new Error("Indikator tidak boleh kosong.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const row = await IkuRpjmd.create({
    periode_rpjmd_id: pid,
    no_urut: noUrut,
    indikator,
    baseline_2024: str(b.baseline_2024, 128) || null,
    target_2025: str(b.target_2025, 128) || null,
    target_2026: str(b.target_2026, 128) || null,
    target_2027: str(b.target_2027, 128) || null,
    target_2028: str(b.target_2028, 128) || null,
    target_2029: str(b.target_2029, 128) || null,
    target_2030: str(b.target_2030, 128) || null,
  });
  return row.get({ plain: true });
}

const rpjmdIndikator = require("./rpjmdImportIndikatorService");

module.exports = {
  updateUrusanKinerja,
  deleteUrusanKinerja,
  createUrusanKinerja,
  updateApbdProyeksi,
  deleteApbdProyeksi,
  createApbdProyeksi,
  updateTujuanSasaran,
  deleteTujuanSasaran,
  createTujuanSasaran,
  updateArahKebijakan,
  deleteArahKebijakan,
  createArahKebijakan,
  updateIku,
  deleteIku,
  createIku,
  createIndikatorTujuan: rpjmdIndikator.createIndikatorTujuan,
  updateIndikatorTujuan: rpjmdIndikator.updateIndikatorTujuan,
  deleteIndikatorTujuan: rpjmdIndikator.deleteIndikatorTujuan,
  createIndikatorSasaran: rpjmdIndikator.createIndikatorSasaran,
  updateIndikatorSasaran: rpjmdIndikator.updateIndikatorSasaran,
  deleteIndikatorSasaran: rpjmdIndikator.deleteIndikatorSasaran,
  createIndikatorStrategi: rpjmdIndikator.createIndikatorStrategi,
  updateIndikatorStrategi: rpjmdIndikator.updateIndikatorStrategi,
  deleteIndikatorStrategi: rpjmdIndikator.deleteIndikatorStrategi,
  createIndikatorArahKebijakan: rpjmdIndikator.createIndikatorArahKebijakan,
  updateIndikatorArahKebijakan: rpjmdIndikator.updateIndikatorArahKebijakan,
  deleteIndikatorArahKebijakan: rpjmdIndikator.deleteIndikatorArahKebijakan,
  createIndikatorProgram: rpjmdIndikator.createIndikatorProgram,
  updateIndikatorProgram: rpjmdIndikator.updateIndikatorProgram,
  deleteIndikatorProgram: rpjmdIndikator.deleteIndikatorProgram,
  createIndikatorKegiatan: rpjmdIndikator.createIndikatorKegiatan,
  updateIndikatorKegiatan: rpjmdIndikator.updateIndikatorKegiatan,
  deleteIndikatorKegiatan: rpjmdIndikator.deleteIndikatorKegiatan,
  createIndikatorSubKegiatan: rpjmdIndikator.createIndikatorSubKegiatan,
  updateIndikatorSubKegiatan: rpjmdIndikator.updateIndikatorSubKegiatan,
  deleteIndikatorSubKegiatan: rpjmdIndikator.deleteIndikatorSubKegiatan,
};
