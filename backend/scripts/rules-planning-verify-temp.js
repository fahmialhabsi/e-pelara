"use strict";
/**
 * Business-rule checks for planning v2 — needs server + DB (JWT from .env).
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const jwt = require("jsonwebtoken");

const PORT = process.env.PORT || 3000;
const BASE = `http://127.0.0.1:${PORT}`;

const token = jwt.sign(
  {
    id: 1,
    email: "rules@test.local",
    username: "rules",
    role: "SUPER_ADMIN",
    role_id: 1,
    divisions_id: 1,
    opd_penanggung_jawab: "x",
    bidang_opd_penanggung_jawab: "x",
    tahun: 2026,
    periode_id: 2,
  },
  process.env.JWT_SECRET,
  { expiresIn: "1h" },
);

async function req(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text };
  }
  return { status: r.status, body: json };
}

(async () => {
  const out = [];
  const db = require("../models");
  const { Op } = db.Sequelize;

  const pd = await db.PerangkatDaerah.findOne({ raw: true });
  const periode = await db.PeriodeRpjmd.findOne({
    where: { id: 2 },
    raw: true,
  });
  const renstra = await db.RenstraPdDokumen.findOne({
    where: { periode_id: 2, perangkat_daerah_id: pd.id },
    raw: true,
  });

  const rkpdA = await req("POST", "/api/rkpd/dokumen", {
    periode_id: 2,
    tahun: 2026,
    judul: "Rules test RKPD A",
    status: "draft",
  });
  const rkpdAId = rkpdA.body?.data?.id;

  const rkpdB = await req("POST", "/api/rkpd/dokumen", {
    periode_id: 2,
    tahun: 2026,
    judul: "Rules test RKPD B",
    status: "draft",
  });
  const rkpdBId = rkpdB.body?.data?.id;

  await req("POST", "/api/rkpd/item", {
    rkpd_dokumen_id: rkpdAId,
    indikator: "x",
    pagu: 1,
  });
  const rkiA = (
    await db.RkpdItem.findOne({
      where: { rkpd_dokumen_id: rkpdAId },
      order: [["id", "DESC"]],
      raw: true,
    })
  )?.id;

  await req("POST", "/api/rkpd/item", {
    rkpd_dokumen_id: rkpdBId,
    indikator: "x",
    pagu: 1,
  });
  const rkiB = (
    await db.RkpdItem.findOne({
      where: { rkpd_dokumen_id: rkpdBId },
      order: [["id", "DESC"]],
      raw: true,
    })
  )?.id;

  const rkiA2Res = await req("POST", "/api/rkpd/item", {
    rkpd_dokumen_id: rkpdAId,
    indikator: "x2",
    pagu: 1,
  });
  const rkiA2 = rkiA2Res.body?.data?.id;

  // 1) Draft: rkpd boleh null
  const r1 = await req("POST", "/api/renja/dokumen", {
    periode_id: 2,
    tahun: 2026,
    perangkat_daerah_id: pd.id,
    renstra_pd_dokumen_id: renstra.id,
    rkpd_dokumen_id: null,
    judul: "R1 draft no rkpd",
    status: "draft",
  });
  out.push({
    rule: "1 renja draft rkpd null allowed",
    expect: "201",
    got: r1.status,
    pass: r1.status === 201,
    sample: r1.body?.data?.id,
  });
  const renjaNoRkpdId = r1.body?.data?.id;

  // 2) Review: rkpd wajib
  const r2 = await req("PUT", `/api/renja/dokumen/${renjaNoRkpdId}`, {
    status: "review",
  });
  out.push({
    rule: "2 review tanpa rkpd_dokumen_id ditolak",
    expect: "400",
    got: r2.status,
    pass: r2.status === 400,
    message: r2.body?.message,
  });

  // 3) Tahun renja vs rkpd
  const r3 = await req("POST", "/api/renja/dokumen", {
    periode_id: 2,
    tahun: 2027,
    perangkat_daerah_id: pd.id,
    renstra_pd_dokumen_id: renstra.id,
    rkpd_dokumen_id: rkpdAId,
    judul: "bad tahun",
    status: "draft",
  });
  out.push({
    rule: "3 tahun renja vs rkpd mismatch ditolak saat create",
    expect: "400",
    got: r3.status,
    pass: r3.status === 400,
    message: r3.body?.message,
  });

  // 4) Renja + rkpd konsisten, item tanpa map → final gagal
  const r4a = await req("POST", "/api/renja/dokumen", {
    periode_id: 2,
    tahun: 2026,
    perangkat_daerah_id: pd.id,
    renstra_pd_dokumen_id: renstra.id,
    rkpd_dokumen_id: rkpdAId,
    judul: "R4 final test",
    status: "draft",
  });
  const r4doc = r4a.body?.data?.id;
  await req("POST", "/api/renja/item", {
    renja_dokumen_id: r4doc,
    indikator: "ok",
    pagu: 100,
  });
  const r4b = await req("PUT", `/api/renja/dokumen/${r4doc}`, { status: "final" });
  out.push({
    rule: "4 final tanpa mapping item → ditolak",
    expect: "400",
    got: r4b.status,
    pass: r4b.status === 400,
    message: String(r4b.body?.message || "").slice(0, 200),
  });

  // 5) Final dengan map tapi indikator kosong
  const r5a = await req("POST", "/api/renja/dokumen", {
    periode_id: 2,
    tahun: 2026,
    perangkat_daerah_id: pd.id,
    renstra_pd_dokumen_id: renstra.id,
    rkpd_dokumen_id: rkpdAId,
    judul: "R5 indikator",
    status: "draft",
  });
  const r5doc = r5a.body?.data?.id;
  const r5item = await req("POST", "/api/renja/item", {
    renja_dokumen_id: r5doc,
    indikator: " ",
    pagu: 10,
  });
  const r5iid = r5item.body?.data?.id;
  await req("POST", `/api/renja/item/${r5iid}/link-rkpd`, { rkpd_item_id: rkiA });
  const r5b = await req("PUT", `/api/renja/dokumen/${r5doc}`, { status: "final" });
  out.push({
    rule: "5 final indikator kosong/whitespace → ditolak",
    expect: "400",
    got: r5b.status,
    pass: r5b.status === 400,
    message: String(r5b.body?.message || "").slice(0, 200),
  });

  // 6) Final pagu null
  const r6a = await req("POST", "/api/renja/dokumen", {
    periode_id: 2,
    tahun: 2026,
    perangkat_daerah_id: pd.id,
    renstra_pd_dokumen_id: renstra.id,
    rkpd_dokumen_id: rkpdAId,
    judul: "R6 pagu",
    status: "draft",
  });
  const r6doc = r6a.body?.data?.id;
  const r6item = await req("POST", "/api/renja/item", {
    renja_dokumen_id: r6doc,
    indikator: "ada",
    pagu: null,
  });
  const r6iid = r6item.body?.data?.id;
  await req("POST", `/api/renja/item/${r6iid}/link-rkpd`, { rkpd_item_id: rkiA });
  const r6b = await req("PUT", `/api/renja/dokumen/${r6doc}`, { status: "final" });
  out.push({
    rule: "6 final pagu null → ditolak",
    expect: "400",
    got: r6b.status,
    pass: r6b.status === 400,
    message: String(r6b.body?.message || "").slice(0, 200),
  });

  // 7) RKPD final: item tanpa indikator
  const r7rkpd = await req("POST", "/api/rkpd/dokumen", {
    periode_id: 2,
    tahun: 2026,
    judul: "RKPD final bad item",
    status: "draft",
  });
  const r7id = r7rkpd.body?.data?.id;
  await req("POST", "/api/rkpd/item", {
    rkpd_dokumen_id: r7id,
    indikator: "",
    pagu: 1,
  });
  const r7b = await req("PUT", `/api/rkpd/dokumen/${r7id}`, { status: "final" });
  out.push({
    rule: "7 rkpd final item tanpa indikator → ditolak",
    expect: "400",
    got: r7b.status,
    pass: r7b.status === 400,
    message: String(r7b.body?.message || "").slice(0, 200),
  });

  // 8) Dua RKPD final sama tahun — hanya satu is_final_active
  const f1 = await req("PUT", `/api/rkpd/dokumen/${rkpdAId}`, { status: "final" });
  const f2 = await req("PUT", `/api/rkpd/dokumen/${rkpdBId}`, { status: "final" });
  const activeCount = await db.RkpdDokumen.count({
    where: { tahun: 2026, status: "final", is_final_active: true },
  });
  out.push({
    rule: "8-9 dua RKPD final tahun sama → satu is_final_active (service)",
    expect: "activeCount===1 after both final",
    got: activeCount,
    pass: activeCount === 1 && f1.status === 200 && f2.status === 200,
    note: "f1/f2 status " + f1.status + "/" + f2.status,
  });

  // 9) Renja: dua final sama tahun+PD
  const j1 = await req("POST", "/api/renja/dokumen", {
    periode_id: 2,
    tahun: 2026,
    perangkat_daerah_id: pd.id,
    renstra_pd_dokumen_id: renstra.id,
    rkpd_dokumen_id: rkpdAId,
    judul: "J1",
    status: "draft",
  });
  const j1id = j1.body?.data?.id;
  const ji1 = await req("POST", "/api/renja/item", {
    renja_dokumen_id: j1id,
    indikator: "a",
    pagu: 1,
  });
  await req("POST", `/api/renja/item/${ji1.body.data.id}/link-rkpd`, {
    rkpd_item_id: rkiA,
  });
  await req("PUT", `/api/renja/dokumen/${j1id}`, { status: "final" });

  const j2 = await req("POST", "/api/renja/dokumen", {
    periode_id: 2,
    tahun: 2026,
    perangkat_daerah_id: pd.id,
    renstra_pd_dokumen_id: renstra.id,
    rkpd_dokumen_id: rkpdAId,
    judul: "J2",
    status: "draft",
  });
  const j2id = j2.body?.data?.id;
  const ji2 = await req("POST", "/api/renja/item", {
    renja_dokumen_id: j2id,
    indikator: "b",
    pagu: 2,
  });
  await req("POST", `/api/renja/item/${ji2.body.data.id}/link-rkpd`, {
    rkpd_item_id: rkiA2,
  });
  await req("PUT", `/api/renja/dokumen/${j2id}`, { status: "final" });

  const renjaActive = await db.RenjaDokumen.count({
    where: {
      tahun: 2026,
      perangkat_daerah_id: pd.id,
      status: "final",
      is_final_active: true,
    },
  });
  out.push({
    rule: "10 dua Renja final tahun+PD sama → satu is_final_active",
    expect: "renjaActive===1",
    got: renjaActive,
    pass: renjaActive === 1,
  });

  // PD mismatch: buat renstra PD lain (PD lain) — perlu PD kedua
  let pd2 = await db.PerangkatDaerah.findOne({
    where: { id: { [Op.ne]: pd.id } },
    raw: true,
  });
  if (!pd2) {
    pd2 = (
      await db.PerangkatDaerah.create({
        kode: "PD2",
        nama: "PD Dua",
        aktif: true,
      })
    ).get({ plain: true });
  }
  const rs2 = await db.RenstraPdDokumen.create({
    periode_id: 2,
    perangkat_daerah_id: pd2.id,
    judul: "Renstra PD2",
    versi: 1,
    status: "draft",
  });
  const badPd = await req("POST", "/api/renja/dokumen", {
    periode_id: 2,
    tahun: 2026,
    perangkat_daerah_id: pd.id,
    renstra_pd_dokumen_id: rs2.id,
    rkpd_dokumen_id: rkpdAId,
    judul: "bad PD",
    status: "draft",
  });
  out.push({
    rule: "perangkat_daerah vs renstra_pd konsisten (create)",
    expect: "400",
    got: badPd.status,
    pass: badPd.status === 400,
    message: badPd.body?.message,
  });

  console.log(JSON.stringify(out, null, 2));
  await db.sequelize.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
