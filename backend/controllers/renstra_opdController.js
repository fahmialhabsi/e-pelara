// controllers/renstra_opdController.js
const db = require('../models');
const { RenstraOPD, OpdPenanggungJawab, RPJMD, ActivityLog } = db;
const { Op } = require('sequelize');
const { recallRenstraOpd } = require('../services/renstraOpdRecallService');

// Sprint 6 — S6-01: update/setAktif/recall RenstraOPD sebelumnya hanya
// findByPk(id)/update(where:{id}) tanpa constraint opd_id, meski
// renstra_opdModel.js punya kolom opd_id langsung pada row (RenstraOPD
// adalah tabel identitas OPD itu sendiri). Boundary di bawah mengikuti
// PERSIS pola assertRkaOpdBoundary di controllers/rkaController.js (S5-01)
// — resolusi nama OPD -> id lewat OpdPenanggungJawab, server-derived dari
// req.user.opd (TIDAK PERNAH dari req.body/req.query/req.params).
// SUPER_ADMIN dikecualikan (otoritas tenant-wide, S4-DISC-003 precedent).
// Fail closed (503) bila resolusi kepemilikan gagal karena error internal.
// Menerima row RenstraOPD yang SUDAH di-load untuk menghindari query
// duplikat, dan mengembalikan callerOpdId agar caller (mis. setAktif) bisa
// men-scope mutasi lanjutan ke OPD milik pemanggil.
async function assertRenstraOpdBoundary(req, renstraRow) {
  if (req.user?.role === 'SUPER_ADMIN') return { ok: true, callerOpdId: null, superAdmin: true };

  const targetOpdId = renstraRow?.opd_id ?? null;
  if (targetOpdId === null || targetOpdId === undefined) {
    // Dokumen tidak ditemukan / belum punya opd_id — biarkan validasi
    // normal (404/422 existing) yang menangani, bukan boundary check ini.
    return { ok: true, callerOpdId: null, superAdmin: false };
  }

  const opdName = req.user?.opd;
  if (!opdName) {
    return {
      ok: false,
      status: 403,
      body: {
        message: 'Anda tidak berwenang melakukan aksi ini pada Renstra OPD milik OPD lain.',
        code: 'RENSTRA_OPD_FORBIDDEN',
      },
    };
  }

  let callerOpdId = null;
  try {
    const opdRow = await OpdPenanggungJawab.findOne({ where: { nama_opd: opdName } });
    callerOpdId = opdRow?.id ?? null;
  } catch (err) {
    return {
      ok: false,
      status: 503,
      body: {
        message: 'Batas kewenangan OPD tidak dapat diverifikasi saat ini. Aksi ditolak sementara demi keamanan data — silakan coba lagi.',
        code: 'RENSTRA_OPD_BOUNDARY_UNAVAILABLE',
      },
    };
  }

  if (callerOpdId === null || callerOpdId !== targetOpdId) {
    return {
      ok: false,
      status: 403,
      body: {
        message: 'Anda tidak berwenang melakukan aksi ini pada Renstra OPD milik OPD lain.',
        code: 'RENSTRA_OPD_FORBIDDEN',
      },
    };
  }

  return { ok: true, callerOpdId, superAdmin: false };
}

// Role yang boleh melihat data semua OPD (tidak dibatasi per-OPD)
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR'];

async function assertActiveRpjmd(rpjmd_id) {
  if (rpjmd_id == null || String(rpjmd_id).trim() === '') {
    return { ok: false, message: 'rpjmd_id wajib diisi.' };
  }
  const rid = Number.parseInt(String(rpjmd_id), 10);
  if (!Number.isInteger(rid) || rid < 1) {
    return { ok: false, message: 'rpjmd_id tidak valid.' };
  }

  const row = await RPJMD.findByPk(rid);
  if (!row) return { ok: false, message: 'RPJMD tidak ditemukan.' };
  // enforce minimal: harus aktif (kolom tersedia di model)
  if (row.is_active_version === false) {
    return { ok: false, message: 'RPJMD tidak aktif. Pilih RPJMD aktif.' };
  }
  return { ok: true, row };
}

// ✅ CREATE
exports.create = async (req, res) => {
  try {
    if (!req.body.opd_id) {
      return res.status(400).json({ message: 'opd_id wajib diisi' });
    }

    const rpjmdCheck = await assertActiveRpjmd(req.body.rpjmd_id);
    if (!rpjmdCheck.ok) {
      return res.status(400).json({ message: rpjmdCheck.message });
    }

    const opd = await OpdPenanggungJawab.findByPk(req.body.opd_id);
    if (!opd) {
      return res.status(400).json({ message: 'OPD tidak ditemukan' });
    }

    const renstra = await RenstraOPD.create({
      ...req.body,
      nama_opd: opd.nama_opd,
    });

    // pastikan hanya satu aktif
    await RenstraOPD.update({ is_aktif: false }, { where: { id: { [Op.ne]: renstra.id } } });
    await RenstraOPD.update({ is_aktif: true }, { where: { id: renstra.id } });

    res.status(201).json({ message: 'success', data: renstra });
  } catch (err) {
    res.status(400).json({ message: 'Gagal membuat data', error: err.message });
  }
};

// ✅ SET AKTIF
exports.setAktif = async (req, res) => {
  try {
    const id = req.params.id;
    const renstra = await RenstraOPD.findByPk(id);
    if (!renstra) {
      return res.status(404).json({ message: 'Renstra tidak ditemukan' });
    }

    // S6-01/S6-05: target harus milik OPD pemanggil (kecuali SUPER_ADMIN,
    // tenant-wide by design).
    const boundarySetAktif = await assertRenstraOpdBoundary(req, renstra);
    if (!boundarySetAktif.ok) {
      return res.status(boundarySetAktif.status).json(boundarySetAktif.body);
    }

    // S6-01: deaktivasi massal HARUS di-scope ke OPD pemanggil untuk
    // ADMINISTRATOR (OPD-scoped) — sebelumnya { where: {} } mendeaktivasi
    // SELURUH RenstraOPD tenant-wide walau pemanggil bukan SUPER_ADMIN.
    // SUPER_ADMIN tetap mempertahankan perilaku tenant-wide existing.
    const deactivateWhere = boundarySetAktif.superAdmin
      ? {}
      : { opd_id: boundarySetAktif.callerOpdId };

    await RenstraOPD.update({ is_aktif: false }, { where: deactivateWhere });
    await RenstraOPD.update({ is_aktif: true }, { where: { id } });

    res.json({ message: 'success', data: { id, is_aktif: true } });
  } catch (err) {
    res.status(500).json({ message: 'Gagal set aktif', error: err.message });
  }
};

// ✅ FIND ALL
exports.findAll = async (req, res) => {
  try {
    const { is_aktif } = req.query;
    const where = {};

    if (typeof is_aktif !== 'undefined') {
      where.is_aktif = is_aktif === 'true' ? 1 : 0;
    }

    // Batasi data berdasarkan OPD user yang login.
    // SUPER_ADMIN dan ADMINISTRATOR bisa melihat semua OPD.
    const userRole = (req.user?.role || '').toUpperCase().replace(/\s+/g, '_');
    const isAdmin = ADMIN_ROLES.includes(userRole);

    // Filter include OPD berdasarkan nama_opd user (jika bukan admin)
    const opdInclude = {
      model: OpdPenanggungJawab,
      as: 'opd',
      attributes: ['id', 'nama_opd', 'nama_bidang_opd'],
    };
    if (!isAdmin && req.user?.opd) {
      // req.user.opd = nama OPD dari token (decoded.opd_penanggung_jawab)
      opdInclude.where = { nama_opd: req.user.opd };
      opdInclude.required = true; // INNER JOIN — hanya record yang cocok
    }

    const data = await RenstraOPD.findAll({
      where,
      attributes: { include: ['tahun_mulai', 'tahun_akhir'] },
      include: [opdInclude],
      order: [['created_at', 'DESC']],
    });

    res.json({ message: 'success', data });
  } catch (err) {
    res.status(500).json({ message: 'Error mengambil data', error: err.message });
  }
};

// ✅ FIND ONE
exports.findOne = async (req, res) => {
  try {
    const data = await RenstraOPD.findByPk(req.params.id, {
      attributes: { include: ['tahun_mulai', 'tahun_akhir'] },
      include: [
        {
          model: OpdPenanggungJawab,
          as: 'opd',
          attributes: ['id', 'nama_opd', 'nama_bidang_opd'],
        },
      ],
    });

    if (!data) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    res.json({ message: 'success', data });
  } catch (err) {
    res.status(500).json({ message: 'Error mengambil data', error: err.message });
  }
};

// ✅ UPDATE
exports.update = async (req, res) => {
  try {
    if (!req.body.opd_id) {
      return res.status(400).json({ message: 'opd_id wajib diisi' });
    }

    // S6-01: resolusi kepemilikan HARUS berdasarkan row existing (opd_id
    // yang SUDAH tersimpan), bukan opd_id baru dari req.body — mencegah
    // bypass otorisasi via reassignment (lihat guard reassignment di bawah).
    const existingRenstra = await RenstraOPD.findByPk(req.params.id);
    if (!existingRenstra) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const boundaryUpdate = await assertRenstraOpdBoundary(req, existingRenstra);
    if (!boundaryUpdate.ok) {
      return res.status(boundaryUpdate.status).json(boundaryUpdate.body);
    }

    // S6-01: cegah OPD-scoped ADMINISTRATOR memindahkan (reassign) Renstra
    // ke opd_id OPD lain lewat req.body.opd_id — ownership reassignment
    // tidak boleh menjadi bypass otorisasi pasca-load. SUPER_ADMIN tetap
    // boleh melakukan reassignment (perilaku existing, tenant-wide).
    if (!boundaryUpdate.superAdmin) {
      const requestedOpdId = Number.parseInt(String(req.body.opd_id), 10);
      if (Number.isInteger(requestedOpdId) && requestedOpdId !== existingRenstra.opd_id) {
        return res.status(403).json({
          message: 'Anda tidak berwenang memindahkan Renstra OPD ini ke OPD lain.',
          code: 'RENSTRA_OPD_REASSIGN_FORBIDDEN',
        });
      }
    }

    // Safe validation untuk data existing:
    // - Enforce jika client mengirim rpjmd_id (artinya user mengubah/mengisi relasi).
    // - Tidak memaksa jika field tidak dikirim (hindari blok update legacy payload yang tidak menyertakan rpjmd_id).
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'rpjmd_id')) {
      const rpjmdCheck = await assertActiveRpjmd(req.body.rpjmd_id);
      if (!rpjmdCheck.ok) {
        return res.status(400).json({ message: rpjmdCheck.message });
      }
    }

    const opd = await OpdPenanggungJawab.findByPk(req.body.opd_id);
    if (!opd) {
      return res.status(400).json({ message: 'OPD tidak ditemukan' });
    }

    const [updated] = await RenstraOPD.update(
      { ...req.body, nama_opd: opd.nama_opd },
      { where: { id: req.params.id } },
    );

    if (!updated) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    // pastikan hanya satu aktif
    await RenstraOPD.update({ is_aktif: false }, { where: { id: { [Op.ne]: req.params.id } } });
    await RenstraOPD.update({ is_aktif: true }, { where: { id: req.params.id } });

    const data = await RenstraOPD.findByPk(req.params.id);
    res.json({ message: 'success', data });
  } catch (err) {
    res.status(400).json({ message: 'Gagal update data', error: err.message });
  }
};

// ✅ GET AKTIF
exports.getAktif = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase().replace(/\s+/g, '_');
    const isAdmin = ADMIN_ROLES.includes(userRole);

    const includeOpd = {
      model: OpdPenanggungJawab,
      as: 'opd',
      attributes: ['id', 'nama_opd', 'nama_bidang_opd'],
    };

    // Batasi berdasarkan OPD user jika bukan admin
    if (!isAdmin && req.user?.opd) {
      includeOpd.where = { nama_opd: req.user.opd };
      includeOpd.required = true;
    }

    const data = await RenstraOPD.findOne({
      where: { is_aktif: true },
      attributes: { include: ['tahun_mulai', 'tahun_akhir'] },
      include: [includeOpd],
    });

    if (!data) {
      return res.status(404).json({ message: 'Renstra aktif tidak ditemukan' });
    }
    res.json({ message: 'success', data });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data aktif', error: err.message });
  }
};

// ✅ RECALL — sinkronkan ulang kode/nama RenstraKegiatan/RenstraSubkegiatan
// dari SubKegiatan/Kegiatan RPJMD sumbernya, lalu lepas penanda needs_recall.
exports.recall = async (req, res) => {
  try {
    // S6-01: resolusi kepemilikan target HARUS terjadi sebelum mutasi
    // recall dijalankan (recallRenstraOpd menulis state RenstraKegiatan/
    // RenstraSubkegiatan turunannya).
    const targetRenstra = await RenstraOPD.findByPk(req.params.id);
    if (!targetRenstra) {
      return res.status(404).json({ message: 'RenstraOPD tidak ditemukan' });
    }
    const boundaryRecall = await assertRenstraOpdBoundary(req, targetRenstra);
    if (!boundaryRecall.ok) {
      return res.status(boundaryRecall.status).json(boundaryRecall.body);
    }

    const uid = req.user?.id ?? req.user?.userId ?? null;
    const laporan = await recallRenstraOpd(db, req.params.id);

    if (ActivityLog) {
      await ActivityLog.create({
        user_id: uid,
        action: 'renstra_opd_recall',
        entity_type: 'renstra_opd',
        entity_id: Number(req.params.id),
        new_data: JSON.stringify(laporan),
      }).catch(() => null);
    }

    res.json({ message: 'success', data: laporan });
  } catch (err) {
    const status = /tidak ditemukan/i.test(err.message) ? 404 : 500;
    res.status(status).json({ message: 'Gagal recall RenstraOPD', error: err.message });
  }
};

// ✅ DELETE
exports.delete = async (req, res) => {
  try {
    const deleted = await RenstraOPD.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }
    res.json({ message: 'success', data: { id: req.params.id } });
  } catch (err) {
    res.status(500).json({ message: 'Gagal menghapus data', error: err.message });
  }
};
