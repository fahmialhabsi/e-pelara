const { Op } = require('sequelize');

const { RenstraProgram, RenstraOPD, ProgramArahKebijakan } = require('../models');
const { programWhereForRenstraOpdQuery } = require('../helpers/renstraOpdProgramFilter');

const normalizePositiveInt = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
};

const resolveArahKebijakanId = (query = {}) =>
  normalizePositiveInt(query.arah_kebijakan_id ?? query.kebijakan_id ?? query.renstra_kebijakan_id);

const resolveProgramIdsByArahKebijakan = async (arahKebijakanId) => {
  const rows = await ProgramArahKebijakan.findAll({
    where: { arah_kebijakan_id: arahKebijakanId },
    attributes: ['program_id'],
    raw: true,
  });

  return rows.map((row) => String(row?.program_id ?? '').trim()).filter(Boolean);
};

const buildProgramWhereClause = async ({ renstraId, arahKebijakanId }) => {
  let whereClause = {};

  if (renstraId) {
    whereClause = await programWhereForRenstraOpdQuery(renstraId);
  }

  if (arahKebijakanId) {
    const programIds = await resolveProgramIdsByArahKebijakan(arahKebijakanId);
    whereClause.rpjmd_program_id = {
      [Op.in]: programIds.length > 0 ? programIds : ['__no_program_scope_match__'],
    };
  }

  return whereClause;
};

// 🔧 CREATE
exports.create = async (req, res) => {
  let {
    kode_program,
    nama_program,
    renstra_id,
    rpjmd_program_id,
    rpjmd_arah_id,
    renstra_kebijakan_id,
    opd_penanggung_jawab,
    bidang_opd_penanggung_jawab,
  } = req.body;

  // ── Koersi tipe data ──────────────────────────────────────────────────────
  // rpjmd_program_id: simpan sebagai string (boleh masuk sebagai angka/string)
  if (rpjmd_program_id !== undefined && rpjmd_program_id !== null) {
    rpjmd_program_id = String(rpjmd_program_id);
  }

  // renstra_id: simpan sebagai integer
  const renstraIdNum = Number(renstra_id);

  // ── Validasi ──────────────────────────────────────────────────────────────
  if (!rpjmd_program_id || rpjmd_program_id.trim() === '') {
    return res.status(400).json({ error: 'rpjmd_program_id wajib diisi' });
  }

  if (!kode_program || typeof kode_program !== 'string' || kode_program.trim() === '') {
    return res.status(400).json({ error: 'kode_program wajib diisi dan harus berupa string' });
  }

  if (kode_program.length > 20) {
    return res.status(400).json({ error: 'kode_program maksimal 20 karakter' });
  }

  if (!nama_program || typeof nama_program !== 'string' || nama_program.trim() === '') {
    return res.status(400).json({ error: 'nama_program wajib diisi dan harus berupa string' });
  }

  if (!renstra_id || isNaN(renstraIdNum) || renstraIdNum <= 0) {
    return res.status(400).json({ error: 'renstra_id wajib diisi dan harus berupa angka positif' });
  }

  if (opd_penanggung_jawab && typeof opd_penanggung_jawab !== 'string') {
    return res.status(400).json({ error: 'opd_penanggung_jawab harus berupa string' });
  }

  if (bidang_opd_penanggung_jawab && typeof bidang_opd_penanggung_jawab !== 'string') {
    return res.status(400).json({ error: 'bidang_opd_penanggung_jawab harus berupa string' });
  }

  try {
    // Cek duplikasi
    const existing = await RenstraProgram.findOne({
      where: { kode_program, renstra_id: renstraIdNum },
    });

    if (existing) {
      return res.status(400).json({
        error: 'Program dengan kode ini sudah ada di Renstra terkait',
      });
    }

    const data = await RenstraProgram.create({
      kode_program: kode_program.trim(),
      nama_program: nama_program.trim(),
      renstra_id: renstraIdNum,
      rpjmd_program_id: rpjmd_program_id.trim(),
      // Model RenstraProgram tidak punya kolom rpjmd_arah_id/renstra_kebijakan_id —
      // kolom aslinya kebijakan_id (rpjmd_arah_id cuma helper filter di frontend).
      kebijakan_id: normalizePositiveInt(renstra_kebijakan_id),
      opd_penanggung_jawab: opd_penanggung_jawab || '',
      bidang_opd_penanggung_jawab: bidang_opd_penanggung_jawab || '',
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 🔍 FIND ALL
exports.findAll = async (req, res) => {
  try {
    const { renstra_id, tahun_mulai } = req.query;
    const arahKebijakanId = resolveArahKebijakanId(req.query);
    const hasArahFilter = [
      req.query.arah_kebijakan_id,
      req.query.kebijakan_id,
      req.query.renstra_kebijakan_id,
    ].some((value) => value !== undefined && value !== null && String(value).trim() !== '');

    if (hasArahFilter && !arahKebijakanId) {
      return res.json([]);
    }

    const whereClause = await buildProgramWhereClause({
      renstraId: renstra_id,
      arahKebijakanId,
    });

    // Ambil semua program Renstra, termasuk OPD dan Bidang
    const data = await RenstraProgram.findAll({
      where: whereClause,
      attributes: [
        'id',
        'kode_program',
        'nama_program',
        'renstra_id',
        'rpjmd_program_id',
        'opd_penanggung_jawab',
        'bidang_opd_penanggung_jawab',
      ],
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

    // Jika ada field null di database, kita bisa beri default kosong
    const formattedData = data.map((item) => ({
      id: item.id,
      kode_program: item.kode_program,
      nama_program: item.nama_program,
      renstra_id: item.renstra_id,
      rpjmd_program_id: item.rpjmd_program_id,
      opd_penanggung_jawab: item.opd_penanggung_jawab || '',
      bidang_opd_penanggung_jawab: item.bidang_opd_penanggung_jawab || '',
      renstra: item.renstra,
    }));

    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔍 FIND ONE
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;

    const data = await RenstraProgram.findByPk(id, {
      attributes: [
        'id',
        'kode_program',
        'nama_program',
        'renstra_id',
        'rpjmd_program_id',
        'opd_penanggung_jawab',
        'bidang_opd_penanggung_jawab',
        'kebijakan_id',
      ],
      include: [
        {
          model: RenstraOPD,
          as: 'renstra',
          attributes: ['id', 'bidang_opd', 'sub_bidang_opd'],
        },
      ],
    });

    if (!data) return res.status(404).json({ message: 'Data not found' });

    const formattedData = {
      id: data.id,
      kode_program: data.kode_program,
      nama_program: data.nama_program,
      renstra_id: data.renstra_id,
      rpjmd_program_id: data.rpjmd_program_id,
      opd_penanggung_jawab: data.opd_penanggung_jawab || '',
      bidang_opd_penanggung_jawab: data.bidang_opd_penanggung_jawab || '',
      // Alias sesuai nama field yang dipakai form frontend (ProgramRenstraForm.jsx).
      renstra_kebijakan_id: data.kebijakan_id,
      renstra: data.renstra,
    };

    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ UPDATE
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    let {
      kode_program,
      nama_program,
      renstra_id,
      rpjmd_program_id,
      opd_penanggung_jawab,
      bidang_opd_penanggung_jawab,
      renstra_kebijakan_id,
    } = req.body;

    // ── Koersi tipe data ────────────────────────────────────────────────────
    opd_penanggung_jawab = opd_penanggung_jawab || '';
    bidang_opd_penanggung_jawab = bidang_opd_penanggung_jawab || '';

    if (rpjmd_program_id !== undefined && rpjmd_program_id !== null) {
      rpjmd_program_id = String(rpjmd_program_id);
    }

    const renstraIdNum = renstra_id ? Number(renstra_id) : undefined;
    // Nama field kolom DB adalah kebijakan_id, tapi form frontend mengirim
    // renstra_kebijakan_id (lihat ProgramRenstraForm.jsx generatePayload).
    const kebijakanIdNum = renstra_kebijakan_id ? Number(renstra_kebijakan_id) : undefined;

    // ── Validasi ringan ─────────────────────────────────────────────────────
    if (kode_program !== undefined && typeof kode_program !== 'string') {
      return res.status(400).json({ error: 'kode_program harus berupa string' });
    }

    if (nama_program !== undefined && typeof nama_program !== 'string') {
      return res.status(400).json({ error: 'nama_program harus berupa string' });
    }

    if (renstra_id !== undefined && (isNaN(renstraIdNum) || renstraIdNum <= 0)) {
      return res.status(400).json({ error: 'renstra_id harus berupa angka positif' });
    }

    if (renstra_kebijakan_id !== undefined && (isNaN(kebijakanIdNum) || kebijakanIdNum <= 0)) {
      return res.status(400).json({ error: 'renstra_kebijakan_id harus berupa angka positif' });
    }

    if (typeof opd_penanggung_jawab !== 'string') {
      return res.status(400).json({ error: 'opd_penanggung_jawab harus berupa string' });
    }

    if (typeof bidang_opd_penanggung_jawab !== 'string') {
      return res.status(400).json({ error: 'bidang_opd_penanggung_jawab harus berupa string' });
    }

    const existing = await RenstraProgram.findByPk(id);
    if (!existing) return res.status(404).json({ message: 'Data not found' });

    const updatePayload = {
      opd_penanggung_jawab,
      bidang_opd_penanggung_jawab,
    };
    if (kode_program !== undefined) updatePayload.kode_program = kode_program.trim();
    if (nama_program !== undefined) updatePayload.nama_program = nama_program.trim();
    if (renstraIdNum !== undefined) updatePayload.renstra_id = renstraIdNum;
    if (rpjmd_program_id !== undefined) updatePayload.rpjmd_program_id = rpjmd_program_id.trim();
    if (kebijakanIdNum !== undefined) updatePayload.kebijakan_id = kebijakanIdNum;

    // Sequelize/MySQL melaporkan affectedCount=0 kalau nilai baru identik dengan
    // yang lama — itu BUKAN berarti data tidak ada, jadi jangan dipakai untuk cek 404.
    await RenstraProgram.update(updatePayload, { where: { id } });

    const updatedData = await RenstraProgram.findByPk(id, {
      attributes: [
        'id',
        'kode_program',
        'nama_program',
        'renstra_id',
        'rpjmd_program_id',
        'opd_penanggung_jawab',
        'bidang_opd_penanggung_jawab',
        'kebijakan_id',
      ],
    });

    res.json({
      ...updatedData.toJSON(),
      renstra_kebijakan_id: updatedData.kebijakan_id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 🗑️ DELETE
exports.generateIndikatorProgram = async (req, res) => {
  try {
    const { namaOpd, programRenstra, tahunMulai } = req.body;
    if (!namaOpd || !programRenstra) {
      return res.status(400).json({ message: 'namaOpd dan programRenstra wajib diisi' });
    }
    const { generateIndikatorProgramRenstra } = require('../services/renstraAIService');
    const hasil = await generateIndikatorProgramRenstra({ namaOpd, programRenstra, tahunMulai });
    return res.json({ success: true, indikator: hasil });
  } catch (err) {
    console.error('[generateIndikatorProgram]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;

    const deleted = await RenstraProgram.destroy({
      where: { id },
    });

    if (!deleted) return res.status(404).json({ message: 'Data not found' });

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
