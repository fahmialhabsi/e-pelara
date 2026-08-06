'use strict';

const { IndikatorRenstra, RealisasiIndikatorRenstra, Lakip } = require('../models');
const { Op } = require('sequelize');
const {
  buildRealisasiIndikatorHierarchy,
} = require('../services/realisasiIndikatorRenstraHierarchyService');
const { flagNeedsRecallAman } = require('../services/recallDataService');

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

      const { tree, iku, ikk } = await buildRealisasiIndikatorHierarchy({ renstra_id, tahun });
      res.json({ tree, iku, ikk });
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

      // Tandai LAKIP tahun ini perlu di-recall (coarse per-tahun, sama seperti
      // granularitas tandaiPerluRecall Renja — belum ada FK bersih indikator->LAKIP).
      flagNeedsRecallAman(Lakip, { tahun: String(tahun) }, {
        reason: 'Realisasi indikator Renstra diperbarui',
      });

      res.json(row);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
