'use strict';

const {
  IndikatorRenstra,
  RealisasiIndikatorRenstra,
  RenstraOPD,
  RenstraTujuan,
  RenstraSasaran,
  RenstraStrategi,
  RenstraKebijakan,
  RenstraProgram,
  RenstraKegiatan,
} = require('../models');
const { Op } = require('sequelize');

/**
 * Dipakai bersama oleh realisasiIndikatorRenstraController.getHierarchy (dashboard
 * LPK Dispang) dan lpkDispangPrintController (cetak PDF/Word) — supaya logic
 * penyusunan tree Tujuan->Sasaran->Program->Kegiatan + IKU/IKK tidak diduplikasi.
 */
async function buildRealisasiIndikatorHierarchy({ renstra_id, tahun }) {
  const renstra = await RenstraOPD.findByPk(renstra_id, {
    attributes: ['id', 'nama_opd', 'tahun_mulai', 'tahun_akhir'],
  });

  const [tujuans, sasarans, strategis, kebijakans, programs, kegiatans, indikators] =
    await Promise.all([
      RenstraTujuan.findAll({ where: { renstra_id } }),
      RenstraSasaran.findAll({ where: { renstra_id } }),
      RenstraStrategi.findAll({ where: { renstra_id } }),
      RenstraKebijakan.findAll({ where: { renstra_id } }),
      RenstraProgram.findAll({ where: { renstra_id } }),
      RenstraKegiatan.findAll({ where: { renstra_id } }),
      IndikatorRenstra.findAll({
        where: {
          renstra_id,
          stage: { [Op.in]: ['tujuan', 'sasaran', 'program', 'kegiatan', 'iku', 'ikk'] },
        },
      }),
    ]);

  let realisasiMap = {};
  if (tahun && indikators.length > 0) {
    const ids = indikators.map((i) => i.id);
    const rows = await RealisasiIndikatorRenstra.findAll({
      where: { indikator_renstra_id: { [Op.in]: ids }, tahun: String(tahun) },
    });
    realisasiMap = Object.fromEntries(rows.map((r) => [r.indikator_renstra_id, r]));
  }

  const strategiById = new Map(strategis.map((s) => [s.id, s]));
  const kebijakanById = new Map(kebijakans.map((k) => [k.id, k]));
  const programById = new Map(programs.map((p) => [p.id, p]));

  const resolveSasaranIdFromProgram = (programId) => {
    const program = programById.get(programId);
    const kebijakan = program ? kebijakanById.get(program.kebijakan_id) : null;
    const strategi = kebijakan ? strategiById.get(kebijakan.strategi_id) : null;
    return strategi?.sasaran_id || null;
  };

  const offset =
    renstra?.tahun_mulai && tahun
      ? Math.min(Math.max(Number(tahun) - Number(renstra.tahun_mulai) + 1, 1), 6)
      : 1;

  const buildIndikatorList = (stage, refId) =>
    indikators
      .filter((i) => i.stage === stage && i.ref_id === refId)
      .map((ind) => {
        const real = realisasiMap[ind.id];
        return {
          id: ind.id,
          nama_indikator: ind.nama_indikator,
          satuan: ind.satuan,
          target: ind[`target_tahun_${offset}`],
          nilai_realisasi: real ? real.nilai_realisasi : null,
        };
      });

  const tree = tujuans.map((t) => ({
    id: t.id,
    no_tujuan: t.no_tujuan,
    isi_tujuan: t.isi_tujuan,
    indikator: buildIndikatorList('tujuan', t.id),
    sasaran: sasarans
      .filter((s) => s.tujuan_id === t.id)
      .map((s) => ({
        id: s.id,
        nomor: s.nomor,
        isi_sasaran: s.isi_sasaran,
        indikator: buildIndikatorList('sasaran', s.id),
        program: programs
          .filter((p) => resolveSasaranIdFromProgram(p.id) === s.id)
          .map((p) => ({
            id: p.id,
            kode_program: p.kode_program,
            nama_program: p.nama_program,
            indikator: buildIndikatorList('program', p.id),
            kegiatan: kegiatans
              .filter((k) => k.program_id === p.id)
              .map((k) => ({
                id: k.id,
                kode_kegiatan: k.kode_kegiatan,
                nama_kegiatan: k.nama_kegiatan,
                indikator: buildIndikatorList('kegiatan', k.id),
              })),
          })),
      })),
  }));

  // IKU & IKK: indikator level OPD yang berdiri sendiri (ref_id = renstra_id),
  // bukan bagian dari tree Tujuan->Sasaran->Program->Kegiatan di atas.
  const renstraIdNum = Number(renstra_id);
  const iku = buildIndikatorList('iku', renstraIdNum);
  const ikk = buildIndikatorList('ikk', renstraIdNum);

  return { renstra, tree, iku, ikk };
}

module.exports = { buildRealisasiIndikatorHierarchy };
