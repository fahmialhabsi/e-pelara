const { Op } = require("sequelize");
const { RenstraOPD, OpdPenanggungJawab } = require("../models");

/**
 * Klausa WHERE untuk renstra_program.renstra_id saat memfilter dari konteks Renstra OPD.
 * renstra_program.renstra_id → FK ke renstra_opd.id. Beberapa baris renstra_opd bisa
 * punya opd_id sama (periode berbeda); data program/tabel lama bisa menempel ke id lama
 * sementara Renstra "aktif" punya id baru — filter tunggal mengembalikan kosong.
 */
/** ID renstra_opd untuk OPD yang sama (periode berbeda), termasuk id yang diminta. */
async function renstraOpdSiblingIds(renstra_opd_id) {
  const rid = Number(renstra_opd_id);
  if (!Number.isFinite(rid)) return [];

  const ro = await RenstraOPD.findByPk(rid, {
    attributes: ["id", "opd_id", "nama_opd", "rpjmd_id"],
    include: [
      {
        model: OpdPenanggungJawab,
        as: "opd",
        attributes: ["nama_opd"],
        required: false,
      },
    ],
  });
  if (!ro) return [rid];

  const idSet = new Set([rid]);

  const label =
    (ro.nama_opd && String(ro.nama_opd).trim()) ||
    (ro.opd?.nama_opd && String(ro.opd.nama_opd).trim()) ||
    "";

  // Sama opd_id (referensi opd_penanggung_jawab identik)
  if (ro.opd_id != null) {
    const byOpdId = await RenstraOPD.findAll({
      where: { opd_id: ro.opd_id },
      attributes: ["id"],
    });
    byOpdId.forEach((r) => idSet.add(r.id));
  }

  // Instansi sama menurut nama + periode RPJMD, walau opd_id beda (mis. 348 vs 107 untuk "Dinas Pangan").
  if (label && ro.rpjmd_id != null) {
    const byNamaRpjmd = await RenstraOPD.findAll({
      where: { rpjmd_id: ro.rpjmd_id, nama_opd: label },
      attributes: ["id"],
    });
    byNamaRpjmd.forEach((r) => idSet.add(r.id));

    const byOpdNamaRpjmd = await RenstraOPD.findAll({
      where: { rpjmd_id: ro.rpjmd_id },
      attributes: ["id"],
      include: [
        {
          model: OpdPenanggungJawab,
          as: "opd",
          where: { nama_opd: label },
          attributes: [],
          required: true,
        },
      ],
    });
    byOpdNamaRpjmd.forEach((r) => idSet.add(r.id));
  }

  // Data lama: opd_id kosong — satukan periode lewat nama OPD (sama seperti filter getAktif non-admin).
  if (ro.opd_id == null && label) {
    const byNamaCol = await RenstraOPD.findAll({
      where: { nama_opd: label },
      attributes: ["id"],
    });
    const byOpdJoin = await RenstraOPD.findAll({
      attributes: ["id"],
      include: [
        {
          model: OpdPenanggungJawab,
          as: "opd",
          where: { nama_opd: label },
          attributes: [],
          required: true,
        },
      ],
    });
    byNamaCol.forEach((r) => idSet.add(r.id));
    byOpdJoin.forEach((r) => idSet.add(r.id));
  }

  const out = [...idSet];
  return out.length ? out : [rid];
}

async function programWhereForRenstraOpdQuery(renstra_opd_id) {
  const ids = await renstraOpdSiblingIds(renstra_opd_id);
  return ids.length > 0 ? { renstra_id: { [Op.in]: ids } } : { renstra_id: Number(renstra_opd_id) };
}

module.exports = { programWhereForRenstraOpdQuery, renstraOpdSiblingIds };
