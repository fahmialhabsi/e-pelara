const { Program, RenstraKegiatan, RenstraOPD, Kegiatan, RenstraProgram } = require('../models');
const { Op } = require('sequelize');
const {
  programWhereForRenstraOpdQuery,
  renstraOpdSiblingIds,
} = require('../helpers/renstraOpdProgramFilter');

/**
 * Pastikan setiap kegiatan RPJMD (tabel `kegiatan`) yang program_id-nya sama dengan
 * renstra_program.rpjmd_program_id punya pasangan di `renstra_kegiatan`.
 * Tanpa ini, master kegiatan + sub_kegiatan sudah ada di DB tetapi dropdown Renstra
 * (yang membaca renstra_kegiatan) tetap kosong untuk baris tersebut.
 */
async function ensureRenstraKegiatanRowsForRenstraOpd(renstraOpdId) {
  const programWhere = await programWhereForRenstraOpdQuery(renstraOpdId);
  const programs = await RenstraProgram.findAll({
    where: programWhere,
    attributes: ['id', 'renstra_id', 'rpjmd_program_id'],
  });

  for (const p of programs) {
    if (!p.rpjmd_program_id) continue;

    const masters = await Kegiatan.unscoped().findAll({
      where: { program_id: p.rpjmd_program_id },
      attributes: ['id', 'kode_kegiatan', 'nama_kegiatan', 'bidang_opd_penanggung_jawab'],
    });

    for (const k of masters) {
      const byRpjmd = await RenstraKegiatan.findOne({
        where: { program_id: p.id, rpjmd_kegiatan_id: k.id },
      });
      if (byRpjmd) continue;

      const byKode = await RenstraKegiatan.findOne({
        where: { program_id: p.id, kode_kegiatan: k.kode_kegiatan },
      });
      if (byKode) {
        if (byKode.rpjmd_kegiatan_id == null) {
          await byKode.update({ rpjmd_kegiatan_id: k.id });
        }
        continue;
      }

      await RenstraKegiatan.create({
        program_id: p.id,
        renstra_id: p.renstra_id ?? null,
        rpjmd_kegiatan_id: k.id,
        kode_kegiatan: k.kode_kegiatan,
        nama_kegiatan: k.nama_kegiatan,
        bidang_opd: k.bidang_opd_penanggung_jawab ?? '',
      });
    }
  }
}

async function validateKegiatanChain({ program_renstra_id, kegiatan_id, renstra_id }) {
  const programRenstra = await RenstraProgram.findByPk(program_renstra_id);

  if (!programRenstra) {
    return {
      ok: false,
      status: 404,
      error: 'PROGRAM_RENSTRA_NOT_FOUND',
      message: 'Program Renstra tidak ditemukan.',
    };
  }

  if (
    renstra_id &&
    programRenstra.renstra_id &&
    Number(programRenstra.renstra_id) !== Number(renstra_id)
  ) {
    return {
      ok: false,
      status: 400,
      error: 'CHAIN_MISMATCH',
      message: 'Program Renstra tidak sesuai dengan Renstra aktif.',
    };
  }

  const kegiatan = await Kegiatan.unscoped().findByPk(kegiatan_id);

  if (!kegiatan) {
    return {
      ok: false,
      status: 404,
      error: 'KEGIATAN_RPJMD_NOT_FOUND',
      message: 'Kegiatan RPJMD tidak ditemukan.',
    };
  }

  if (Number(kegiatan.program_id) !== Number(programRenstra.rpjmd_program_id)) {
    return {
      ok: false,
      status: 400,
      error: 'CHAIN_MISMATCH',
      message:
        'Kegiatan RPJMD tidak berada di bawah Program RPJMD milik Program Renstra yang dipilih.',
    };
  }

  return {
    ok: true,
    programRenstra,
    kegiatan,
  };
}

/**
 * Membuat Renstra Kegiatan baru (tanpa rpjmd_kegiatan_id)
 */
exports.create = async (req, res) => {
  try {
    const {
      program_renstra_id,
      kegiatan_id,
      kode_kegiatan,
      nama_kegiatan,
      renstra_id,
      bidang_opd,
    } = req.body;

    if (!program_renstra_id) {
      return res.status(400).json({
        error: 'PROGRAM_RENSTRA_REQUIRED',
        message: 'Program Renstra wajib dipilih.',
      });
    }

    if (!kegiatan_id) {
      return res.status(400).json({
        error: 'KEGIATAN_REQUIRED',
        message: 'Kegiatan wajib dipilih.',
      });
    }

    if (!kode_kegiatan || !nama_kegiatan) {
      return res.status(400).json({
        error: 'KEGIATAN_DETAIL_REQUIRED',
        message: 'Kode dan nama kegiatan wajib diisi.',
      });
    }

    const chain = await validateKegiatanChain({
      program_renstra_id,
      kegiatan_id,
      renstra_id,
    });

    if (!chain.ok) {
      return res.status(chain.status).json({
        error: chain.error,
        message: chain.message,
      });
    }

    const existing = await RenstraKegiatan.findOne({
      where: {
        program_id: program_renstra_id,
        rpjmd_kegiatan_id: kegiatan_id,
        renstra_id: renstra_id || null,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'DUPLICATE_RENSTRA_KEGIATAN',
        message: 'Kegiatan Renstra ini sudah pernah ditambahkan.',
      });
    }

    const data = await RenstraKegiatan.create({
      program_id: program_renstra_id,
      rpjmd_kegiatan_id: kegiatan_id,
      kode_kegiatan: chain.kegiatan.kode_kegiatan || kode_kegiatan,
      nama_kegiatan: chain.kegiatan.nama_kegiatan || nama_kegiatan,
      renstra_id: renstra_id || null,
      bidang_opd: chain.kegiatan.bidang_opd_penanggung_jawab || bidang_opd || '',
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('🔥 Error create Renstra Kegiatan:', err);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Gagal menyimpan data. Silakan coba lagi.',
    });
  }
};

/**
 * Update Renstra Kegiatan (tanpa rpjmd_kegiatan_id wajib)
 */
exports.update = async (req, res) => {
  try {
    const id = req.params.id;

    const existingData = await RenstraKegiatan.findByPk(id);

    if (!existingData) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const program_renstra_id =
      req.body.program_renstra_id || req.body.program_id || existingData.program_id;
    const kegiatan_id =
      req.body.kegiatan_id || req.body.rpjmd_kegiatan_id || existingData.rpjmd_kegiatan_id;
    const renstra_id = req.body.renstra_id ?? existingData.renstra_id;

    const chain = await validateKegiatanChain({
      program_renstra_id,
      kegiatan_id,
      renstra_id,
    });

    if (!chain.ok) {
      return res.status(chain.status).json({
        error: chain.error,
        message: chain.message,
      });
    }

    const duplicate = await RenstraKegiatan.findOne({
      where: {
        id: { [Op.ne]: id },
        program_id: program_renstra_id,
        rpjmd_kegiatan_id: kegiatan_id,
        renstra_id: renstra_id || null,
      },
    });

    if (duplicate) {
      return res.status(409).json({
        error: 'DUPLICATE_RENSTRA_KEGIATAN',
        message: 'Kegiatan Renstra ini sudah pernah ditambahkan.',
      });
    }

    await existingData.update({
      program_id: program_renstra_id,
      rpjmd_kegiatan_id: kegiatan_id,
      kode_kegiatan: chain.kegiatan.kode_kegiatan,
      nama_kegiatan: chain.kegiatan.nama_kegiatan,
      renstra_id: renstra_id || null,
      bidang_opd: req.body.bidang_opd || chain.kegiatan.bidang_opd_penanggung_jawab || '',
    });

    res.json(existingData);
  } catch (err) {
    console.error('🔥 Error update Renstra Kegiatan:', err);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Gagal memperbarui data.',
    });
  }
};

/**
 * Ambil semua Renstra Kegiatan
 */
exports.findAll = async (req, res) => {
  try {
    const { renstra_id, tahun_mulai, program_id } = req.query;

    const whereClause = {};

    if (program_id) {
      whereClause.program_id = program_id;
    }

    if (renstra_id && !program_id) {
      try {
        await ensureRenstraKegiatanRowsForRenstraOpd(renstra_id);
      } catch (e) {
        console.error('ensureRenstraKegiatanRowsForRenstraOpd:', e.message);
      }
    }

    // Konteks Renstra OPD aktif: gabungkan (1) kegiatan yang program_id-nya
    // mengarah ke renstra_program milik sibling OPD, dan (2) kegiatan yang
    // renstra_id barisnya menempel langsung ke salah satu sibling.
    // Tanpa (2), baris yang program-nya "nyasar" / beda tautan tidak muncul di
    // dropdown padahal masih tampil di daftar global / DB.
    if (renstra_id && !program_id) {
      const programWhere = await programWhereForRenstraOpdQuery(renstra_id);
      const programs = await RenstraProgram.findAll({
        where: programWhere,
        attributes: ['id'],
      });
      const programIds = programs.map((p) => p.id);
      const renstraOpdIds = await renstraOpdSiblingIds(renstra_id);

      const orBranches = [];
      if (programIds.length) {
        orBranches.push({ program_id: { [Op.in]: programIds } });
      }
      if (renstraOpdIds.length) {
        orBranches.push({ renstra_id: { [Op.in]: renstraOpdIds } });
      }
      if (orBranches.length === 1) {
        Object.assign(whereClause, orBranches[0]);
      } else if (orBranches.length > 1) {
        whereClause[Op.or] = orBranches;
      }
    }

    const data = await RenstraKegiatan.findAll({
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
        {
          model: Kegiatan,
          as: 'kegiatan_rpjmd',
          attributes: ['id', 'kode_kegiatan', 'nama_kegiatan'],
        },
        {
          model: RenstraProgram,
          as: 'program_renstra',
          attributes: ['id', 'kode_program', 'nama_program'],
        },
      ],
      order: [['kode_kegiatan', 'ASC']],
    });

    const result = data.map((item) => ({
      ...item.toJSON(),
      bidang_opd: item.bidang_opd ?? '',
      renstra: {
        ...item.renstra?.toJSON(),
        bidang_opd: item.renstra?.bidang_opd ?? '',
        sub_bidang_opd: item.renstra?.sub_bidang_opd ?? '',
      },
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Ambil 1 Renstra Kegiatan by ID
 */
exports.findOne = async (req, res) => {
  try {
    const data = await RenstraKegiatan.findByPk(req.params.id, {
      include: [
        {
          model: RenstraOPD,
          as: 'renstra',
          attributes: ['id', 'bidang_opd', 'sub_bidang_opd'],
        },
        {
          model: Kegiatan,
          as: 'kegiatan_rpjmd',
          attributes: ['id', 'kode_kegiatan', 'nama_kegiatan'],
        },
        {
          model: RenstraProgram,
          as: 'program_renstra',
          attributes: ['id', 'kode_program', 'nama_program'],
        },
      ],
    });

    if (!data) return res.status(404).json({ message: 'Data not found' });

    const result = {
      ...data.toJSON(),
      bidang_opd: data.bidang_opd ?? '',
      renstra: {
        ...data.renstra?.toJSON(),
        bidang_opd: data.renstra?.bidang_opd ?? '',
        sub_bidang_opd: data.renstra?.sub_bidang_opd ?? '',
      },
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Ambil kegiatan berdasarkan programRenstraId
 * Tanpa mengubah data di tabel
 */
exports.findByProgramKode = async (req, res) => {
  try {
    const programId = Number(req.params.id || req.query.programId);
    if (!programId) return res.status(400).json({ error: 'Program ID wajib diberikan.' });

    // Ambil program yang terkait renstra
    const program = await Program.findByPk(programId, {
      include: [{ model: Kegiatan, as: 'kegiatan' }],
    });

    const kegiatan = program?.kegiatan || []; // gunakan ? untuk aman jika null

    const result = kegiatan.map((k) => ({
      value: k.id,
      id: k.id,
      label: `${k.kode_kegiatan} - ${k.nama_kegiatan}`,
      kode_kegiatan: k.kode_kegiatan,
      nama_kegiatan: k.nama_kegiatan,
      bidang_opd: k.bidang_opd_penanggung_jawab ?? '',
    }));

    res.json(result);
  } catch (err) {
    console.error('🔥 Error findByProgramKode:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Ambil kode & nama kegiatan sederhana (untuk dropdown frontend)
 */
exports.getKodeNamaKegiatan = async (req, res) => {
  try {
    const data = await RenstraKegiatan.findAll({
      include: [
        {
          model: Kegiatan,
          as: 'kegiatan_rpjmd',
          attributes: ['id', 'kode_kegiatan', 'nama_kegiatan', 'rpjmd_id'],
        },
      ],
      attributes: [],
    });

    const result = data.map((item) => ({
      kode_kegiatan: item.kegiatan_rpjmd.kode_kegiatan,
      nama_kegiatan: item.kegiatan_rpjmd.nama_kegiatan,
      kegiatan_rpjmd_id: item.kegiatan_rpjmd.id,
      rpjmd_id: item.kegiatan_rpjmd.rpjmd_id ?? null,
    }));

    res.json(result);
  } catch (err) {
    console.error('🔥 Error getKodeNamaKegiatan:', err);
    res.status(500).json({ message: 'Gagal mengambil kegiatan', error: err.message });
  }
};

exports.generateIndikatorKegiatan = async (req, res) => {
  try {
    const { namaOpd, kegiatanRenstra, tahunMulai } = req.body;
    if (!namaOpd || !kegiatanRenstra) {
      return res.status(400).json({ message: 'namaOpd dan kegiatanRenstra wajib diisi' });
    }
    const { generateIndikatorKegiatanRenstra } = require('../services/renstraAIService');
    const hasil = await generateIndikatorKegiatanRenstra({ namaOpd, kegiatanRenstra, tahunMulai });
    return res.json({ success: true, indikator: hasil });
  } catch (err) {
    console.error('[generateIndikatorKegiatan]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Hapus Renstra Kegiatan
 */
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await RenstraKegiatan.destroy({ where: { id } });

    if (!deleted) return res.status(404).json({ message: 'Data not found' });

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
