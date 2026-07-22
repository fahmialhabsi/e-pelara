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

// CRUD manual untuk realisasi capaian indikator Renstra stage sasaran/program/kegiatan.
// Beda dari pengkegRealisasiSyncService.js yang otomatis dari Pengkeg (stage sub_kegiatan);
// level di atas sub_kegiatan bersifat kualitatif/agregat sehingga perlu diisi manual.

module.exports = {
  // GET /api/realisasi-indikator-renstra?renstra_id=&tahun=&stage=
  async getAll(req, res) {
    try {
      const { renstra_id, tahun, stage } = req.query;
      if (!renstra_id) return res.status(400).json({ error: 'renstra_id wajib diisi' });

      const stageFilter = stage ? [stage] : ['sasaran', 'program', 'kegiatan'];
      const indikators = await IndikatorRenstra.findAll({
        where: { renstra_id, stage: { [Op.in]: stageFilter } },
        order: [
          ['stage', 'ASC'],
          ['id', 'ASC'],
        ],
      });

      let realisasiMap = {};
      if (tahun && indikators.length > 0) {
        const ids = indikators.map((i) => i.id);
        const rows = await RealisasiIndikatorRenstra.findAll({
          where: { indikator_renstra_id: { [Op.in]: ids }, tahun: String(tahun) },
        });
        realisasiMap = Object.fromEntries(rows.map((r) => [r.indikator_renstra_id, r]));
      }

      const data = indikators.map((ind) => {
        const real = realisasiMap[ind.id];
        return {
          id: ind.id,
          stage: ind.stage,
          ref_id: ind.ref_id,
          kode_indikator: ind.kode_indikator,
          nama_indikator: ind.nama_indikator,
          satuan: ind.satuan,
          nilai_realisasi: real ? real.nilai_realisasi : null,
          keterangan: real ? real.keterangan : null,
          realisasi_id: real ? real.id : null,
        };
      });

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/realisasi-indikator-renstra/hierarchy?renstra_id=&tahun=
  // Tree Tujuan->Sasaran->Program->Kegiatan (Sub Kegiatan TIDAK di sini — dropdown-nya
  // dari DPA langsung, lihat pengkegController.dpaOptions, karena link
  // renstra_tabel_subkegiatan masih kosong).
  async getHierarchy(req, res) {
    try {
      const { renstra_id, tahun } = req.query;
      if (!renstra_id) return res.status(400).json({ error: 'renstra_id wajib diisi' });

      const renstra = await RenstraOPD.findByPk(renstra_id, { attributes: ['id', 'tahun_mulai'] });

      const [tujuans, sasarans, strategis, kebijakans, programs, kegiatans, indikators] =
        await Promise.all([
          RenstraTujuan.findAll({ where: { renstra_id } }),
          RenstraSasaran.findAll({ where: { renstra_id } }),
          RenstraStrategi.findAll({ where: { renstra_id } }),
          RenstraKebijakan.findAll({ where: { renstra_id } }),
          RenstraProgram.findAll({ where: { renstra_id } }),
          RenstraKegiatan.findAll({ where: { renstra_id } }),
          IndikatorRenstra.findAll({
            where: { renstra_id, stage: { [Op.in]: ['tujuan', 'sasaran', 'program', 'kegiatan'] } },
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

      res.json(tree);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/realisasi-indikator-renstra  { indikator_renstra_id, tahun, nilai_realisasi, keterangan }
  async upsert(req, res) {
    try {
      const { indikator_renstra_id, tahun, nilai_realisasi, keterangan } = req.body;
      if (!indikator_renstra_id || !tahun) {
        return res.status(400).json({ error: 'indikator_renstra_id dan tahun wajib diisi' });
      }

      const [row] = await RealisasiIndikatorRenstra.findOrCreate({
        where: { indikator_renstra_id, tahun: String(tahun) },
        defaults: { nilai_realisasi, keterangan },
      });
      await row.update({ nilai_realisasi, keterangan });

      res.json(row);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
