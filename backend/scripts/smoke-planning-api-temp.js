"use strict";
/**
 * Smoke test planning v2 API — requires server on PORT (default 3000).
 * Usage: node scripts/smoke-planning-api-temp.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const jwt = require("jsonwebtoken");

const PORT = process.env.PORT || 3000;
const BASE = `http://127.0.0.1:${PORT}`;

const token = jwt.sign(
  {
    id: 1,
    email: "smoke@test.local",
    username: "smoke",
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
  const results = [];

  results.push(["GET /api/rkpd/dokumen", await req("GET", "/api/rkpd/dokumen")]);

  const postRkpd = await req("POST", "/api/rkpd/dokumen", {
    periode_id: 2,
    tahun: 2026,
    judul: "Smoke RKPD 2026 (api test)",
    status: "draft",
  });
  results.push(["POST /api/rkpd/dokumen", postRkpd]);

  let rkpdId = postRkpd.body?.data?.id;
  if (!rkpdId) {
    const list = await req("GET", "/api/rkpd/dokumen");
    rkpdId = list.body?.data?.[0]?.id;
  }

  const postItem = rkpdId
    ? await req("POST", "/api/rkpd/item", {
        rkpd_dokumen_id: rkpdId,
        program: "P1",
        indikator: "I1",
        pagu: 1000,
      })
    : { status: 0, body: { skip: true } };
  results.push(["POST /api/rkpd/item", postItem]);

  const rkpdItemId = postItem.body?.data?.id;

  const db = require("../models");
  if (rkpdId) {
    try {
      await db.RkpdDokumen.update({ is_test: true }, { where: { id: rkpdId } });
    } catch (e) {
      console.warn("[smoke] skip rkpd is_test:", e.message);
    }
  }
  let pd = await db.PerangkatDaerah.findOne({ raw: true });
  if (!pd) {
    const row = await db.PerangkatDaerah.create({
      kode: "SMOKE",
      nama: "Smoke Test PD",
      aktif: true,
      is_test: true,
    });
    pd = row.get({ plain: true });
  } else if (pd.kode === "SMOKE" || /smoke/i.test(String(pd.nama || ""))) {
    try {
      await db.PerangkatDaerah.update({ is_test: true }, { where: { id: pd.id } });
    } catch (e) {
      console.warn("[smoke] skip pd is_test:", e.message);
    }
  }
  const periode = await db.PeriodeRpjmd.findOne({
    where: { tahun_awal: { [db.Sequelize.Op.lte]: 2026 }, tahun_akhir: { [db.Sequelize.Op.gte]: 2026 } },
    raw: true,
  });
  let renstra = periode
    ? await db.RenstraPdDokumen.findOne({
        where: { periode_id: periode.id, perangkat_daerah_id: pd.id },
        raw: true,
      })
    : null;

  if (!pd || !periode) {
    results.push([
      "SKIP renja flow — missing PD or periode",
      { status: 0, body: { pd: !!pd, periode: !!periode } },
    ]);
  } else if (!renstra) {
    const created = await db.RenstraPdDokumen.create({
      periode_id: periode.id,
      perangkat_daerah_id: pd.id,
      judul: "Smoke Renstra PD (api test)",
      versi: 1,
      status: "draft",
      is_test: true,
    });
    renstra = created.get({ plain: true });
  } else if (renstra && /\(api test\)/i.test(String(renstra.judul || ""))) {
    try {
      await db.RenstraPdDokumen.update({ is_test: true }, { where: { id: renstra.id } });
    } catch (e) {
      console.warn("[smoke] skip renstra is_test:", e.message);
    }
  }

  const renstraId = renstra?.id;

  const postRenja =
    pd && periode && renstraId && rkpdId
      ? await req("POST", "/api/renja/dokumen", {
          periode_id: periode.id,
          tahun: 2026,
          perangkat_daerah_id: pd.id,
          renstra_pd_dokumen_id: renstraId,
          rkpd_dokumen_id: rkpdId,
          judul: "Smoke Renja (api test)",
          status: "draft",
        })
      : { status: 0, body: { skip: true, reason: "setup" } };
  results.push(["POST /api/renja/dokumen", postRenja]);

  const renjaDocId = postRenja.body?.data?.id;

  const postRenjaItem =
    renjaDocId && rkpdItemId
      ? await req("POST", "/api/renja/item", {
          renja_dokumen_id: renjaDocId,
          program: "PR1",
          indikator: "RI1",
          pagu: 500,
        })
      : { status: 0, body: { skip: true } };
  results.push(["POST /api/renja/item", postRenjaItem]);

  const renjaItemId = postRenjaItem.body?.data?.id;

  const link =
    renjaItemId && rkpdItemId
      ? await req("POST", `/api/renja/item/${renjaItemId}/link-rkpd`, {
          rkpd_item_id: rkpdItemId,
        })
      : { status: 0, body: { skip: true } };
  results.push(["POST /api/renja/item/:id/link-rkpd", link]);

  const getLink =
    renjaItemId && link.status !== 0
      ? await req("GET", `/api/renja/item/${renjaItemId}/rkpd-link`)
      : { status: 0, body: { skip: true } };
  results.push(["GET /api/renja/item/:id/rkpd-link", getLink]);

  results.push([
    "GET /api/audit/perencanaan-consistency",
    await req("GET", "/api/audit/perencanaan-consistency"),
  ]);

  await db.sequelize.close();

  console.log(JSON.stringify(results, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
