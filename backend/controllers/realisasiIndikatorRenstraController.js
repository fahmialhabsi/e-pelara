'use strict';

const { IndikatorRenstra, RealisasiIndikatorRenstra, Lakip, RenstraOPD } = require('../models');
const { Op } = require('sequelize');
const {
  buildRealisasiIndikatorHierarchy,
} = require('../services/realisasiIndikatorRenstraHierarchyService');
const { flagNeedsRecallAman } = require('../services/recallDataService');

// Sprint 5 — S5-05 (S4-DISC-011): upsert() sebelumnya menerima
// indikator_renstra_id dari req.body tanpa constraint opd_id apa pun.
// Kepemilikan diresolusi lewat rantai yang SAMA PERSIS dengan AD-S4-01:
// IndikatorRenstra.renstra_id -> RenstraOPD.id -> RenstraOPD.nama_opd,
// dibandingkan langsung terhadap req.user.opd (TIDAK ada hop kedua lewat
// OpdPenanggungJawab, konsisten dengan konvensi yang sudah ditetapkan di
// controllers/renstra_tabelTujuanController.js Sprint 4). SUPER_ADMIN
// dikecualikan (otoritas tenant-wide, S4-DISC-003 precedent). Fail closed
// (503) bila resolusi kepemilikan gagal karena error internal.
async function assertRealisasiIndikatorRenstraOpdBoundary(req, indikatorRenstraId) {
  if (req.user?.role === 'SUPER_ADMIN') return { ok: true };

  let indikator;
  try {
    indikator = await IndikatorRenstra.findByPk(indikatorRenstraId, {
      include: [{ model: RenstraOPD, as: 'renstra' }],
    });
  } catch (err) {
    return {
      ok: false,
      status: 503,
      body: {
        error: 'Batas kewenangan OPD untuk indikator ini tidak dapat diverifikasi saat ini. Aksi ditolak sementara demi keamanan data — silakan coba lagi.',
        code: 'REALISASI_INDIKATOR_RENSTRA_OPD_BOUNDARY_UNAVAILABLE',
      },
    };
  }

  const targetOpdName = indikator?.renstra?.nama_opd ?? null;
  if (targetOpdName === null || targetOpdName === undefined) {
    // Indikator/relasi OPD tidak ditemukan — biarkan alur existing (404/422
    // via findOrCreate) yang menangani, bukan boundary check ini.
    return { ok: true };
  }

  const callerOpdName = req.user?.opd;
  if (!callerOpdName || callerOpdName !== targetOpdName) {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'Anda tidak berwenang mengubah realisasi indikator Renstra milik OPD lain.',
        code: 'REALISASI_INDIKATOR_RENSTRA_OPD_FORBIDDEN',
      },
    };
  }

  return { ok: true };
}

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

      // S5-05: OPD A tidak boleh create/update realisasi terhadap indikator
      // milik pohon Renstra OPD B. Validasi HARUS selesai sebelum
      // findOrCreate/update dijalankan.
      const boundaryUpsert = await assertRealisasiIndikatorRenstraOpdBoundary(
        req,
        indikator_renstra_id,
      );
      if (!boundaryUpsert.ok) {
        return res.status(boundaryUpsert.status).json(boundaryUpsert.body);
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
