/** Sample up to 3 rows per RPJMD PDF import table. */
const db = require("../models");

(async () => {
  const lim = { limit: 3, order: [["id", "ASC"]] };
  const u = await db.UrusanKinerja20212024.findAll(lim);
  const a = await db.ApbdProyeksi20262030.findAll(lim);
  const t = await db.RpjmdTargetTujuanSasaran20252029.findAll(lim);
  const r = await db.ArahKebijakanRpjmdPdf.findAll(lim);
  const i = await db.IkuRpjmd.findAll(lim);
  const trim = (rows) =>
    rows.map((x) => {
      const o = x.get({ plain: true });
      if (o.arah_kebijakan && o.arah_kebijakan.length > 200) {
        o.arah_kebijakan = o.arah_kebijakan.slice(0, 200) + "…";
      }
      if (o.indikator && o.indikator.length > 160) {
        o.indikator = o.indikator.slice(0, 160) + "…";
      }
      return o;
    });
  console.log(
    JSON.stringify(
      {
        urusan_kinerja_2021_2024: trim(u),
        apbd_proyeksi_2026_2030: trim(a),
        rpjmd_target_tujuan_sasaran_2025_2029: trim(t),
        arah_kebijakan_rpjmd: trim(r),
        iku_rpjmd: trim(i),
      },
      null,
      2
    )
  );
  await db.sequelize.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
