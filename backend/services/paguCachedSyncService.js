const {
  IndikatorTujuan,
  IndikatorSasaran,
  IndikatorStrategi,
  IndikatorArahKebijakan,
  IndikatorProgram,
  IndikatorKegiatan,
  IndikatorSubKegiatan,
  SubKegiatan,
} = require("../models");

const {
  attachPaguByIndikatorKode,
} = require("./paguAggregatorService");

async function syncTablePaguCached(Model) {
  const rows = await Model.findAll();

  const rowsWithPagu = await attachPaguByIndikatorKode(rows);

  await Promise.all(
    rowsWithPagu.map((row) => {
      const pagu = Number(row.get?.("pagu") ?? row.pagu ?? 0);

      return Model.update(
        {
          pagu_cached: pagu,
          pagu_cached_at: new Date(),
        },
        {
          where: { id: row.id },
        }
      );
    })
  );

  return rowsWithPagu.length;
}

async function syncIndikatorSubKegiatanPaguCached() {
  const rows = await IndikatorSubKegiatan.findAll({ raw: true });

  const subKegiatanIds = [
    ...new Set(
      rows
        .map((row) => row.sub_kegiatan_id)
        .filter(Boolean)
        .map(Number)
    ),
  ];

  const subRows = await SubKegiatan.findAll({
    attributes: ["id", "pagu_anggaran"],
    where: {
      id: subKegiatanIds,
    },
    raw: true,
  });

  const paguBySubKegiatanId = new Map(
    subRows.map((row) => [Number(row.id), Number(row.pagu_anggaran || 0)])
  );

  await Promise.all(
    rows.map((row) => {
      const pagu = row.sub_kegiatan_id
        ? Number(paguBySubKegiatanId.get(Number(row.sub_kegiatan_id)) || 0)
        : 0;

      return IndikatorSubKegiatan.update(
        {
          pagu_cached: pagu,
          pagu_cached_at: new Date(),
        },
        {
          where: { id: row.id },
        }
      );
    })
  );

  return rows.length;
}

async function syncAllPaguCached() {
  return {
    tujuan: await syncTablePaguCached(IndikatorTujuan),
    sasaran: await syncTablePaguCached(IndikatorSasaran),
    strategi: await syncTablePaguCached(IndikatorStrategi),
    arah_kebijakan: await syncTablePaguCached(IndikatorArahKebijakan),
    program: await syncTablePaguCached(IndikatorProgram),
    kegiatan: await syncTablePaguCached(IndikatorKegiatan),

    // khusus ISK jangan pakai prefix aggregator
    sub_kegiatan: await syncIndikatorSubKegiatanPaguCached(),
  };
}

module.exports = {
  syncAllPaguCached,
  syncTablePaguCached,
  syncIndikatorSubKegiatanPaguCached,
};