// backend/controllers/renstra_indikatorController.js
const {
  IndikatorRenstra,
  IndikatorTujuan,
  IndikatorSasaran,
  IndikatorStrategi,
  IndikatorArahKebijakan,
  IndikatorProgram,
  IndikatorKegiatan,
  IndikatorSubKegiatan,
  RenstraOPD,
  RenstraStrategi,
  RenstraKegiatan,
  RenstraProgram,
  RenstraSubkegiatan,
  SubKegiatan,
} = require('../models');
const { Op } = require('sequelize');
const { programWhereForRenstraOpdQuery } = require('../helpers/renstraOpdProgramFilter');
const {
  validateRenstraIndicatorHierarchy,
} = require('../services/renstraIndicatorHierarchyValidationService');

// ✅ Helper untuk validasi renstra_id
const validateRenstraId = (req, res) => {
  const renstraId = req.body.renstra_id || req.query.renstra_id;
  if (!renstraId) {
    res.status(400).json({ error: 'renstra_id wajib diisi' });
    return null;
  }
  return renstraId;
};

// ✅ Mapping stage Renstra ke model indikator RPJMD
function getRpjmdModelByStage(stage) {
  switch (String(stage || '').toLowerCase()) {
    case 'tujuan':
      return IndikatorTujuan;
    case 'sasaran':
      return IndikatorSasaran;
    case 'strategi':
      return IndikatorStrategi;
    case 'kebijakan':
      return IndikatorArahKebijakan;
    case 'program':
      return IndikatorProgram;
    case 'kegiatan':
      return IndikatorKegiatan;
    case 'sub_kegiatan':
      return IndikatorSubKegiatan;
    default:
      return null;
  }
}

// ✅ Inject pagu RPJMD dari indikator sumber RPJMD
async function attachTotalPaguRpjmd(rows) {
  const jsonRows = rows.map((row) => (typeof row.toJSON === 'function' ? row.toJSON() : row));

  const tujuanSourceIds = jsonRows
    .filter((row) => row.stage === 'tujuan' && row.source_indikator_id)
    .map((row) => row.source_indikator_id);

  const sasaranSourceIds = jsonRows
    .filter((row) => row.stage === 'sasaran' && row.source_indikator_id)
    .map((row) => row.source_indikator_id);

  const strategiSourceIds = jsonRows
    .filter((row) => row.stage === 'strategi' && row.source_indikator_id)
    .map((row) => row.source_indikator_id);

  const kebijakanSourceIds = jsonRows
    .filter((row) => row.stage === 'kebijakan' && row.source_indikator_id)
    .map((row) => row.source_indikator_id);

  const programSourceIds = jsonRows
    .filter((row) => row.stage === 'program' && row.source_indikator_id)
    .map((row) => row.source_indikator_id);

  const kegiatanSourceIds = jsonRows
    .filter((row) => row.stage === 'kegiatan' && row.source_indikator_id)
    .map((row) => row.source_indikator_id);

  const subKegiatanSourceIds = jsonRows
    .filter((row) => row.stage === 'sub_kegiatan' && row.source_indikator_id)
    .map((row) => row.source_indikator_id);

  const tujuanPaguRows = tujuanSourceIds.length
    ? await IndikatorTujuan.findAll({
        where: { id: { [Op.in]: tujuanSourceIds } },
        attributes: ['id', 'pagu_cached', 'pagu_cached_at'],
        raw: true,
      })
    : [];

  const sasaranPaguRows = sasaranSourceIds.length
    ? await IndikatorSasaran.findAll({
        where: { id: { [Op.in]: sasaranSourceIds } },
        attributes: ['id', 'pagu_cached', 'pagu_cached_at'],
        raw: true,
      })
    : [];

  const strategiPaguRows = strategiSourceIds.length
    ? await IndikatorStrategi.findAll({
        where: { id: { [Op.in]: strategiSourceIds } },
        attributes: ['id', 'pagu_cached', 'pagu_cached_at'],
        raw: true,
      })
    : [];

  const kebijakanPaguRows = kebijakanSourceIds.length
    ? await IndikatorArahKebijakan.findAll({
        where: { id: { [Op.in]: kebijakanSourceIds } },
        attributes: ['id', 'pagu_cached', 'pagu_cached_at'],
        raw: true,
      })
    : [];

  const programPaguRows = programSourceIds.length
    ? await IndikatorProgram.findAll({
        where: { id: { [Op.in]: programSourceIds } },
        attributes: ['id', 'pagu_cached', 'pagu_cached_at'],
        raw: true,
      })
    : [];

  const kegiatanPaguRows = kegiatanSourceIds.length
    ? await IndikatorKegiatan.findAll({
        where: { id: { [Op.in]: kegiatanSourceIds } },
        attributes: ['id', 'pagu_cached', 'pagu_cached_at'],
        raw: true,
      })
    : [];

  const subKegiatanPaguRows = subKegiatanSourceIds.length
    ? await IndikatorSubKegiatan.findAll({
        where: { id: { [Op.in]: subKegiatanSourceIds } },
        attributes: ['id', 'pagu_cached', 'pagu_cached_at'],
        raw: true,
      })
    : [];

  const tujuanPaguMap = new Map(tujuanPaguRows.map((item) => [Number(item.id), item]));

  const sasaranPaguMap = new Map(sasaranPaguRows.map((item) => [Number(item.id), item]));

  const strategiPaguMap = new Map(strategiPaguRows.map((item) => [Number(item.id), item]));

  const kebijakanPaguMap = new Map(kebijakanPaguRows.map((item) => [Number(item.id), item]));

  const programPaguMap = new Map(programPaguRows.map((item) => [Number(item.id), item]));

  const kegiatanPaguMap = new Map(kegiatanPaguRows.map((item) => [Number(item.id), item]));

  const subKegiatanPaguMap = new Map(subKegiatanPaguRows.map((item) => [Number(item.id), item]));

  return jsonRows.map((row) => {
    let sourcePagu = null;

    if (row.stage === 'tujuan') {
      sourcePagu = tujuanPaguMap.get(Number(row.source_indikator_id));
    }

    if (row.stage === 'sasaran') {
      sourcePagu = sasaranPaguMap.get(Number(row.source_indikator_id));
    }

    if (row.stage === 'strategi') {
      sourcePagu = strategiPaguMap.get(Number(row.source_indikator_id));
    }

    if (row.stage === 'kebijakan') {
      sourcePagu = kebijakanPaguMap.get(Number(row.source_indikator_id));
    }

    if (row.stage === 'program') {
      sourcePagu = programPaguMap.get(Number(row.source_indikator_id));
    }

    if (row.stage === 'kegiatan') {
      sourcePagu = kegiatanPaguMap.get(Number(row.source_indikator_id));
    }

    if (row.stage === 'sub_kegiatan') {
      sourcePagu = subKegiatanPaguMap.get(Number(row.source_indikator_id));
    }

    const paguCached = Number(sourcePagu?.pagu_cached || 0);

    return {
      ...row,
      pagu_cached: paguCached,
      pagu_cached_at: sourcePagu?.pagu_cached_at || null,
      total_pagu_rpjmd: paguCached,
    };
  });
}

// CREATE
exports.create = async (req, res) => {
  try {
    const renstraId = validateRenstraId(req, res);
    if (!renstraId) return;

    const data = await IndikatorRenstra.create({
      ...req.body,
      renstra_id: renstraId,
    });
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// READ ALL
exports.findAll = async (req, res) => {
  try {
    const { renstra_id, tahun_mulai, stage, ref_id, sasaran_id } = req.query;

    const whereClause = {};

    if (renstra_id) {
      Object.assign(whereClause, await programWhereForRenstraOpdQuery(renstra_id));
    }

    if (stage) whereClause.stage = stage;

    if (String(stage || '').toLowerCase() === 'tujuan' && req.query.tujuan_id) {
      const renstraTujuanId = Number(req.query.tujuan_id);

      const renstraTujuan = await require('../models').RenstraTujuan.findByPk(renstraTujuanId, {
        attributes: ['id', 'rpjmd_tujuan_id'],
        raw: true,
      });

      if (!renstraTujuan?.rpjmd_tujuan_id) {
        return res.json([]);
      }

      whereClause.ref_id = Number(renstraTujuan.rpjmd_tujuan_id);
    }

    if (ref_id) {
      whereClause.ref_id = Number(ref_id);
    } else if (String(stage || '').toLowerCase() === 'sasaran' && sasaran_id != null) {
      /**
       * Import RPJMD: `ref_id` = PK `indikatorsasarans` untuk sasaran tersebut
       * bukan `sasaran.id` dari dropdown.
       */
      const sid = Number(sasaran_id);

      if (Number.isFinite(sid)) {
        const { RenstraSasaran } = require('../models');

        // 🔥 FIX: cari berdasarkan rpjmd_sasaran_id BUKAN id
        const renstraSasaran = await RenstraSasaran.findOne({
          where: {
            [Op.or]: [{ id: sid }, { rpjmd_sasaran_id: sid }],
          },
          attributes: ['id', 'rpjmd_sasaran_id'],
          raw: true,
        });

        if (!renstraSasaran) {
          return res.json([]);
        }

        const rpjmdSasaranId = renstraSasaran.rpjmd_sasaran_id;

        const rpjmdRows = await IndikatorSasaran.findAll({
          where: { sasaran_id: rpjmdSasaranId },
          attributes: ['id'],
          raw: true,
        });

        const refIds = rpjmdRows.map((r) => r.id).filter(Boolean);

        if (!refIds.length) {
          return res.json([]);
        }

        whereClause.ref_id = { [Op.in]: refIds };
      }
    }

    const data = await IndikatorRenstra.findAll({
      where: whereClause,
      include: [
        {
          model: RenstraOPD,
          as: 'renstra',
          attributes: ['id', 'bidang_opd', 'sub_bidang_opd'],
          ...(tahun_mulai && {
            where: { tahun_mulai: parseInt(tahun_mulai, 10) },
          }),
        },
      ],
    });

    const result = await attachTotalPaguRpjmd(data);

    res.json(result);
  } catch (err) {
    console.error('❌ [IndikatorRenstra.findAll] error:', err);
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
exports.findOne = async (req, res) => {
  try {
    const data = await IndikatorRenstra.findByPk(req.params.id, {
      include: [
        {
          model: RenstraOPD,
          as: 'renstra',
          attributes: ['id', 'bidang_opd', 'sub_bidang_opd'],
        },
      ],
    });

    if (!data) return res.status(404).json({ message: 'Data not found' });

    const [result] = await attachTotalPaguRpjmd([data]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const renstraId = validateRenstraId(req, res);
    if (!renstraId) return;

    const id = req.params.id;
    const [updated] = await IndikatorRenstra.update(
      { ...req.body, renstra_id: renstraId },
      { where: { id } },
    );
    if (!updated) return res.status(404).json({ message: 'Data not found' });

    const updatedData = await IndikatorRenstra.findByPk(id);
    res.json(updatedData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await IndikatorRenstra.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Data not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** ENUM `indikator_renstra.tipe_indikator` memakai "Proses"; sumber RPJMD sering "Process". */
function mapTipeIndikatorToRenstra(tipe) {
  if (tipe == null || tipe === '') return null;
  const u = String(tipe).trim();
  if (u === 'Process') return 'Proses';
  if (['Impact', 'Outcome', 'Output', 'Proses'].includes(u)) return u;
  if (u === 'Input') return 'Output';
  return 'Output';
}

function getParentRefIdByStage(stage, item) {
  switch (stage) {
    case 'tujuan':
      return item.tujuan_id;
    case 'sasaran':
      return item.sasaran_id;
    case 'strategi':
      return item.strategi_id;
    case 'kebijakan':
      return item.arah_kebijakan_id;
    case 'program':
      return item.program_id;
    case 'kegiatan':
      return item.kegiatan_id;
    case 'sub_kegiatan':
      return item.sub_kegiatan_id;
    default:
      return null;
  }
}

async function resolveRenstraRefIdByStage(stage, item, renstraId) {
  if (stage === 'strategi') {
    const rpjmdStrategiId = item.strategi_id;

    if (!rpjmdStrategiId) return null;

    const renstraStrategi = await RenstraStrategi.findOne({
      where: {
        renstra_id: renstraId,
        rpjmd_strategi_id: rpjmdStrategiId,
      },
      attributes: ['id'],
      raw: true,
    });

    return renstraStrategi?.id ?? null;
  }

  if (stage === 'program') {
    const rpjmdProgramId = item.program_id;

    if (!rpjmdProgramId) return null;

    const renstraProgram = await RenstraProgram.findOne({
      where: {
        renstra_id: renstraId,
        rpjmd_program_id: rpjmdProgramId,
      },
      attributes: ['id'],
      raw: true,
    });

    return renstraProgram?.id ?? null;
  }

  if (stage === 'kegiatan') {
    const rpjmdKegiatanId = item.kegiatan_id;

    if (!rpjmdKegiatanId) return null;

    const renstraKegiatan = await RenstraKegiatan.findOne({
      where: {
        renstra_id: renstraId,
        rpjmd_kegiatan_id: rpjmdKegiatanId,
      },
      attributes: ['id'],
      raw: true,
    });

    return renstraKegiatan?.id ?? null;
  }

  if (stage === 'sub_kegiatan') {
    const rpjmdSubKegiatanId = item.sub_kegiatan_id;

    if (!rpjmdSubKegiatanId) return null;

    const renstraSubKegiatan = await RenstraSubkegiatan.findOne({
      where: {
        sub_kegiatan_id: rpjmdSubKegiatanId,
      },
      include: [
        {
          model: RenstraProgram,
          as: 'program',
          attributes: [],
          where: {
            renstra_id: renstraId,
          },
        },
      ],
      attributes: ['id'],
      raw: true,
    });

    return renstraSubKegiatan?.id ?? null;
  }

  return getParentRefIdByStage(stage, item);
}

// IMPORT from RPJMD
exports.importFromRPJMD = async (req, res) => {
  try {
    const renstraId = validateRenstraId(req, res);
    if (!renstraId) return;

    const { stage, source_doc = 'rpjmd' } = req.body;

    let sourceModel;
    switch (stage) {
      case 'tujuan':
        sourceModel = IndikatorTujuan;
        break;
      case 'sasaran':
        sourceModel = IndikatorSasaran;
        break;
      case 'strategi':
        sourceModel = IndikatorStrategi;
        break;
      case 'kebijakan':
        sourceModel = IndikatorArahKebijakan;
        break;
      case 'program':
        sourceModel = IndikatorProgram;
        break;
      case 'kegiatan':
        sourceModel = IndikatorKegiatan;
        break;
      case 'sub_kegiatan':
        sourceModel = IndikatorSubKegiatan;
        break;
      default:
        return res.status(400).json({ error: 'Stage tidak valid' });
    }

    const indikatorList = await sourceModel.findAll({
      where: {
        jenis_dokumen: {
          [Op.like]: '%RPJMD%',
        },
      },
    });

    if (!indikatorList.length) {
      return res.status(404).json({ message: `Tidak ada data ${stage} di ${source_doc}` });
    }

    const newData = (
      await Promise.all(
        indikatorList.map(async (item) => {
          const parentRefId = await resolveRenstraRefIdByStage(stage, item, renstraId);

          if (!parentRefId) return null;

          return {
            ref_id: parentRefId, // ✅ FIX DI SINI
            source_indikator_id: item.id,
            stage,
            kode_indikator: item.kode_indikator,
            nama_indikator: item.nama_indikator,
            satuan: item.satuan,
            definisi_operasional: item.definisi_operasional,
            metode_penghitungan: item.metode_penghitungan,
            baseline: item.baseline ?? item.target_awal ?? item.capaian_tahun_1 ?? null,
            lokasi: (() => {
              const raw = item.lokasi ?? item.sumber_data ?? item.keterangan ?? null;
              if (raw == null || String(raw).trim() === '') return null;
              return String(raw).trim().slice(0, 255);
            })(),
            target_tahun_1: item.target_tahun_1,
            target_tahun_2: item.target_tahun_2,
            target_tahun_3: item.target_tahun_3,
            target_tahun_4: item.target_tahun_4,
            target_tahun_5: item.target_tahun_5,
            target_tahun_6: item.target_tahun_6 ?? null,
            pagu_tahun_1: item.pagu_tahun_1 ?? null,
            pagu_tahun_2: item.pagu_tahun_2 ?? null,
            pagu_tahun_3: item.pagu_tahun_3 ?? null,
            pagu_tahun_4: item.pagu_tahun_4 ?? null,
            pagu_tahun_5: item.pagu_tahun_5 ?? null,
            pagu_tahun_6: item.pagu_tahun_6 ?? null,
            jenis_indikator: item.jenis_indikator,
            tipe_indikator: mapTipeIndikatorToRenstra(item.tipe_indikator),
            kriteria_kuantitatif: item.kriteria_kuantitatif,
            kriteria_kualitatif: item.kriteria_kualitatif,
            sumber_data: item.sumber_data,
            penanggung_jawab: item.penanggung_jawab != null ? String(item.penanggung_jawab) : null,
            keterangan: item.keterangan,
            tahun: item.tahun,
            jenis_dokumen: 'renstra',
            renstra_id: renstraId,
          };
        }),
      )
    ).filter(Boolean);

    const existingRows = await IndikatorRenstra.findAll({
      where: {
        renstra_id: renstraId,
        stage,
        ref_id: {
          [Op.in]: newData.map((item) => item.ref_id),
        },
      },
      attributes: ['ref_id', 'source_indikator_id'],
      raw: true,
    });

    const existingKeys = new Set(
      existingRows.map((item) => `${Number(item.ref_id)}:${Number(item.source_indikator_id)}`),
    );

    const filteredNewData = newData.filter(
      (item) => !existingKeys.has(`${Number(item.ref_id)}:${Number(item.source_indikator_id)}`),
    );

    const inserted = filteredNewData.length
      ? await IndikatorRenstra.bulkCreate(filteredNewData)
      : [];

    res.json({
      message: `Import ${stage} dari ${source_doc} berhasil. Baru: ${inserted.length}, dilewati: ${existingRows.length}`,
      data: inserted,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// VALIDASI HIRARKI INDIKATOR RENSTRA
exports.validateHierarchy = async (req, res) => {
  try {
    const renstraId = req.query.renstra_id || req.body?.renstra_id;

    if (!renstraId) {
      return res.status(400).json({ error: 'renstra_id wajib diisi' });
    }

    const result = await validateRenstraIndicatorHierarchy(renstraId);

    res.json(result);
  } catch (err) {
    console.error('❌ [IndikatorRenstra.validateHierarchy] error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getRenstraAktif = async (req, res) => {
  try {
    const { tahun } = req.query;
    if (!tahun) return res.status(400).json({ error: 'Tahun wajib diisi' });

    const renstra = await RenstraOPD.findOne({
      where: { tahun_mulai: tahun, is_aktif: 1 },
    });

    if (!renstra) {
      return res.status(404).json({ message: `Renstra aktif tahun ${tahun} tidak ditemukan` });
    }

    res.json(renstra);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// GET indikator program
exports.getIndikatorProgram = async (req, res) => {
  const { program_id } = req.query;
  const data = await IndikatorProgram.findAll({
    where: { program_id },
  });
  res.json(data);
};

// GET indikator kegiatan
exports.getIndikatorKegiatan = async (req, res) => {
  try {
    const { kegiatan_id } = req.query;
    const data = await IndikatorKegiatan.findAll({
      where: { kode_indikator: kegiatan_id || '' },
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server internal.' });
  }
};

// GET indikator sub kegiatan
exports.getIndikatorSubKegiatan = async (req, res) => {
  try {
    const { subkegiatan_id } = req.query;
    const data = await SubKegiatan.findAll({
      where: { kode_sub_kegiatan: subkegiatan_id || '' },
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server internal.' });
  }
};

// 1. FUNGSI UNTUK MENGISI DROPDOWN CASCADING SECARA AMAN (ANTI-KOSONG)
exports.getCascadingList = async (req, res) => {
  try {
    const { renstra_id, target_stage, parent_ref_id } = req.query;

    if (!renstra_id || !target_stage) {
      return res.status(400).json({ error: 'renstra_id dan target_stage wajib diisi' });
    }

    const whereClause = { renstra_id, stage: target_stage };

    // Jika user memilih level di bawah Tujuan/Sasaran, filter berdasarkan relasi entitas induknya
    if (parent_ref_id) {
      const parentId = Number(parent_ref_id);
      const { RenstraKegiatan, RenstraSubkegiatan } = require('../models');

      if (target_stage === 'kegiatan') {
        // Cari kegiatan yang berada di bawah Program tertentu
        const kegiatanIds = await RenstraKegiatan.findAll({
          // HAPUS renstra_id dari sini, sisakan program_id saja
          where: { program_id: parentId },
          attributes: ['id'],
          raw: true,
        }).then((rows) => rows.map((r) => r.id));

        whereClause.ref_id = { [Op.in]: kegiatanIds };
      } else if (target_stage === 'sub_kegiatan') {
        const subKegiatanIds = await RenstraSubkegiatan.findAll({
          where: { kegiatan_id: parentId }, // <-- Diubah ke kolom yang benar
          attributes: ['id'],
          raw: true,
        }).then((rows) => rows.map((r) => r.id));

        whereClause.ref_id = { [Op.in]: subKegiatanIds };
      }
    }

    const indicators = await IndikatorRenstra.findAll({
      where: whereClause,
      attributes: ['id', 'ref_id', 'kode_indikator', 'nama_indikator', 'stage'],
      order: [['kode_indikator', 'ASC']],
    });

    return res.json(indicators);
  } catch (err) {
    console.error('❌ [getCascadingList] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// 2. FUNGSI UNTUK MELACAK AKAR DAMPAK KE ATAS (RISK PROPAGATION)
exports.getRiskPropagation = async (req, res) => {
  try {
    const { id } = req.params;
    const propagationTree = [];

    // Ambil indikator aktif tempat risiko melekat
    const activeIndicator = await IndikatorRenstra.findByPk(id, { raw: true });
    if (!activeIndicator) {
      return res.status(404).json({ message: 'Indikator tidak ditemukan.' });
    }

    propagationTree.push({
      stage: activeIndicator.stage,
      kode: activeIndicator.kode_indikator,
      nama: activeIndicator.nama_indikator,
    });

    const { RenstraSubkegiatan, RenstraKegiatan, RenstraProgram } = require('../models');

    // Lakukan pelacakan berantai ke atas berdasarkan struktur database Anda
    if (activeIndicator.stage === 'sub_kegiatan') {
      const subKeg = await RenstraSubkegiatan.findByPk(activeIndicator.ref_id, {
        include: [
          {
            model: RenstraKegiatan,
            as: 'kegiatan',
            include: [{ model: RenstraProgram, as: 'program_renstra' }], // 🛠️ Ubah alias ke 'program_renstra'
          },
        ],
      });

      if (subKeg?.kegiatan) {
        propagationTree.unshift({
          stage: 'kegiatan',
          kode: subKeg.kegiatan.kode_kegiatan,
          nama: subKeg.kegiatan.nama_kegiatan,
        });
        if (subKeg.kegiatan.program_renstra) {
          // 🛠️ Sesuaikan pemanggilan objek
          propagationTree.unshift({
            stage: 'program',
            kode: subKeg.kegiatan.program_renstra.kode_program, // 🛠️ Sesuaikan pemanggilan objek
            nama: subKeg.kegiatan.program_renstra.nama_program, // 🛠️ Sesuaikan pemanggilan objek
          });
        }
      }
    } else if (activeIndicator.stage === 'kegiatan') {
      const keg = await RenstraKegiatan.findByPk(activeIndicator.ref_id, {
        include: [{ model: RenstraProgram, as: 'program_renstra' }], // 🛠️ Ubah alias ke 'program_renstra'
      });
      if (keg?.program_renstra) {
        // 🛠️ Sesuaikan pemanggilan objek
        propagationTree.unshift({
          stage: 'program',
          kode: keg.program_renstra.kode_program, // 🛠️ Sesuaikan pemanggilan objek
          nama: keg.program_renstra.nama_program, // 🛠️ Sesuaikan pemanggilan objek
        });
      }
    }

    return res.json({
      message: 'Jalur penularan dampak risiko berhasil dianalisis.',
      propagation_path: propagationTree,
    });
  } catch (err) {
    console.error('❌ [getRiskPropagation] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
