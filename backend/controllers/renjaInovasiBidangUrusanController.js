'use strict';

/**
 * Inovasi bidang urusan — data pendukung subbab Bab II Renja
 * (Permendagri 14/2026, Lampiran angka II.A.3 poin 5).
 *
 * Sama seperti Pokir DPRD, data ini tahunan per perangkat daerah dan tidak
 * terikat dokumen Renja tertentu. Inovasi yang masih berjalan diturunkan ke
 * tahun berikutnya lewat endpoint recall, sehingga tidak diketik ulang.
 */

const db = require('../models');
const layanan = require('../services/renjaDataPendukungService');

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const URUTAN_BAKU = [
  ['urutan', 'ASC'],
  ['id', 'ASC'],
];

const susunWhere = (query, forcedPdScope) => {
  const where = {};
  if (query.tahun) where.tahun = String(query.tahun);
  const pdId = toInt(query.perangkat_daerah_id);
  if (pdId) {
    where.perangkat_daerah_id = pdId;
  } else if (Array.isArray(forcedPdScope)) {
    const { Op } = db.Sequelize;
    where.perangkat_daerah_id = { [Op.in]: forcedPdScope };
  }
  if (query.bentuk_inovasi) where.bentuk_inovasi = query.bentuk_inovasi;
  if (query.q) {
    const { Op } = db.Sequelize;
    where[Op.or] = [
      { nama_inovasi: { [Op.like]: `%${query.q}%` } },
      { deskripsi: { [Op.like]: `%${query.q}%` } },
      { manfaat: { [Op.like]: `%${query.q}%` } },
    ];
  }
  return where;
};

const bersihkanPayload = (body) => {
  const p = { ...body };
  delete p.id;
  delete p.created_at;
  delete p.updated_at;
  if (p.tahun !== null && p.tahun !== undefined) p.tahun = String(p.tahun);
  if (p.tahun_mulai !== null && p.tahun_mulai !== undefined) {
    p.tahun_mulai = p.tahun_mulai ? String(p.tahun_mulai) : null;
  }
  if ('jumlah' in p) p.jumlah = toInt(p.jumlah);
  return p;
};

const gagal = (res, e, status = 500) => {
  console.error('[renjaInovasiBidangUrusan]', e);
  return res.status(status).json({ success: false, message: e.message || 'Terjadi kesalahan.' });
};

// Sprint 19 — C4 OPD authorization boundary. Bounded to this controller's
// existing perangkat_daerah_id-scoped model; see renjaDataPendukungService.js
// resolveRenjaDataPendukungOpdBoundary for the shared, narrowly-scoped
// resolution logic (mirrors resolveMrPlanningRiskOpdBoundary from
// mrPlanningRiskService.js, Sprint 17). Shared with renjaPokirDprdController.js
// (C3) — both operate on the identical ownership contract (see Sprint 19
// pairing evidence: same authoritative namespace, mapping, caller namespace,
// role policy, SUPER_ADMIN policy, failure semantics).
const tolakOpd = (res, boundary) =>
  res.status(boundary.status).json({
    success: false,
    message: boundary.error.message,
    code: boundary.error.code,
  });

// Sprint 21 — Candidate A (S19-DEFER-01). Resolves the caller's own
// perangkat_daerah_id scope for use as a forced default on findAll/rekap
// when the client omits an explicit perangkat_daerah_id filter, instead of
// returning/aggregating unscoped cross-OPD data. Plural by design: one
// OpdPenanggungJawab can own multiple PerangkatDaerah mappings
// (perangkat_daerah_id is unique in PerangkatDaerahOpdMapping,
// opd_penanggung_jawab_id is not — confirmed via
// models/perangkatDaerahOpdMappingModel.js and the existing reverse-lookup
// precedent in services/prosnp/prosnpDpaSourceService.js). Returns an
// array (possibly empty) of positive integer perangkat_daerah_id values,
// or null if the caller's own OPD cannot be resolved at all. Identical
// helper to renjaPokirDprdController.js's (C3) — duplicated locally rather
// than shared, since services/renjaDataPendukungService.js is out of
// scope for modification in this mandate.
async function resolveCallerPerangkatDaerahIds(user) {
  const opdName = user?.opd;
  if (!opdName) return null;
  const callerRow = await db.OpdPenanggungJawab.findOne({ where: { nama_opd: opdName } });
  const callerOpdId = callerRow?.id ?? null;
  if (!callerOpdId) return null;
  const mappings = await db.PerangkatDaerahOpdMapping.findAll({
    where: { opd_penanggung_jawab_id: callerOpdId },
  });
  return mappings
    .map((m) => m.perangkat_daerah_id)
    .filter((id) => Number.isInteger(id) && id > 0);
}

// Sprint 21 — Candidate A. Replicates layanan.rekapInovasi's exact
// aggregate math (services/renjaDataPendukungService.js, out of scope for
// modification) for a forced multi-PD scope (Op.in), used only for the new
// omitted-filter + non-SUPER_ADMIN default-scoping case in rekap() below.
// All pre-existing call paths (explicit filter, SUPER_ADMIN) continue to
// call layanan.rekapInovasi() directly, unchanged.
async function hitungRekapInovasiUntukPdIds(pdIds, tahun) {
  const { Op } = db.Sequelize;
  const where = {};
  if (tahun) where.tahun = String(tahun);
  where.perangkat_daerah_id = { [Op.in]: pdIds };
  const rows = await db.RenjaInovasiBidangUrusan.findAll({ where });
  const perBentuk = {};
  for (const r of rows) {
    const k = r.bentuk_inovasi || '(belum dikategorikan)';
    perBentuk[k] = (perBentuk[k] || 0) + 1;
  }
  return {
    jumlah_inovasi: rows.length,
    per_bentuk: perBentuk,
    inovasi_baru: rows.filter((r) => String(r.tahun_mulai || '') === String(tahun)).length,
    inovasi_berlanjut: rows.filter((r) => r.tahun_mulai && String(r.tahun_mulai) !== String(tahun))
      .length,
  };
}

async function findAll(req, res) {
  try {
    const pdId = toInt(req.query.perangkat_daerah_id);
    let forcedPdScope;
    if (pdId) {
      const boundary = await layanan.resolveRenjaDataPendukungOpdBoundary(db, {
        user: req.user,
        perangkatDaerahId: pdId,
      });
      if (!boundary.ok) return tolakOpd(res, boundary);
    } else if (req.user?.role !== 'SUPER_ADMIN') {
      // Sprint 21 — Candidate A: filter omitted, caller is not
      // SUPER_ADMIN. Default to the caller's own OPD scope instead of
      // returning unscoped cross-OPD rows.
      forcedPdScope = await resolveCallerPerangkatDaerahIds(req.user);
      if (!Array.isArray(forcedPdScope)) forcedPdScope = [];
    }
    const rows = await db.RenjaInovasiBidangUrusan.findAll({
      where: susunWhere(req.query, forcedPdScope),
      order: URUTAN_BAKU,
      include: [{ model: db.PerangkatDaerah, as: 'perangkatDaerah', required: false }],
    });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return gagal(res, e);
  }
}

async function findOne(req, res) {
  try {
    // Authorization-before-disclosure: muat baris dulu untuk mendapatkan
    // perangkat_daerah_id-nya, tapi JANGAN kembalikan isinya sebelum lolos
    // boundary check.
    const row = await db.RenjaInovasiBidangUrusan.findByPk(toInt(req.params.id));
    if (!row) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });

    const boundary = await layanan.resolveRenjaDataPendukungOpdBoundary(db, {
      user: req.user,
      perangkatDaerahId: row.perangkat_daerah_id,
    });
    if (!boundary.ok) return tolakOpd(res, boundary);

    return res.json({ success: true, data: row });
  } catch (e) {
    return gagal(res, e);
  }
}

async function create(req, res) {
  try {
    const payload = bersihkanPayload(req.body);
    if (!payload.tahun || !toInt(payload.perangkat_daerah_id)) {
      return res
        .status(400)
        .json({ success: false, message: 'tahun dan perangkat_daerah_id wajib diisi.' });
    }
    if (!String(payload.nama_inovasi ?? '').trim()) {
      return res.status(400).json({ success: false, message: 'Nama inovasi wajib diisi.' });
    }

    // Create ownership guard — jangan percaya perangkat_daerah_id dari
    // body begitu saja; non-SUPER_ADMIN tidak boleh membuat data atas
    // nama OPD lain.
    const boundary = await layanan.resolveRenjaDataPendukungOpdBoundary(db, {
      user: req.user,
      perangkatDaerahId: payload.perangkat_daerah_id,
    });
    if (!boundary.ok) return tolakOpd(res, boundary);

    if (payload.urutan === null || payload.urutan === undefined) {
      const terakhir = await db.RenjaInovasiBidangUrusan.max('urutan', {
        where: {
          tahun: payload.tahun,
          perangkat_daerah_id: toInt(payload.perangkat_daerah_id),
        },
      });
      payload.urutan = (Number(terakhir) || 0) + 1;
    }
    const row = await db.RenjaInovasiBidangUrusan.create(payload);
    return res.status(201).json({ success: true, data: row });
  } catch (e) {
    return gagal(res, e);
  }
}

async function update(req, res) {
  try {
    const row = await db.RenjaInovasiBidangUrusan.findByPk(toInt(req.params.id));
    if (!row) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });

    // Update ownership guard — otorisasi pemilik saat ini dulu.
    const boundaryCurrent = await layanan.resolveRenjaDataPendukungOpdBoundary(db, {
      user: req.user,
      perangkatDaerahId: row.perangkat_daerah_id,
    });
    if (!boundaryCurrent.ok) return tolakOpd(res, boundaryCurrent);

    const payload = bersihkanPayload(req.body);

    // Jika perangkat_daerah_id ikut diubah, otorisasi juga kepemilikan
    // baru yang diminta — non-SUPER_ADMIN tidak boleh memindahkan data
    // ke OPD lain.
    if (
      Object.prototype.hasOwnProperty.call(payload, 'perangkat_daerah_id') &&
      toInt(payload.perangkat_daerah_id) !== Number(row.perangkat_daerah_id)
    ) {
      const boundaryRequested = await layanan.resolveRenjaDataPendukungOpdBoundary(db, {
        user: req.user,
        perangkatDaerahId: payload.perangkat_daerah_id,
      });
      if (!boundaryRequested.ok) return tolakOpd(res, boundaryRequested);
    }

    await row.update(payload);
    return res.json({ success: true, data: row });
  } catch (e) {
    return gagal(res, e);
  }
}

async function destroy(req, res) {
  try {
    const row = await db.RenjaInovasiBidangUrusan.findByPk(toInt(req.params.id));
    if (!row) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });

    const boundary = await layanan.resolveRenjaDataPendukungOpdBoundary(db, {
      user: req.user,
      perangkatDaerahId: row.perangkat_daerah_id,
    });
    if (!boundary.ok) return tolakOpd(res, boundary);

    await row.destroy();
    return res.json({ success: true, message: 'Data dihapus.' });
  } catch (e) {
    return gagal(res, e);
  }
}

/** Lihat inovasi tahun sebelumnya yang belum ada di tahun berkenaan. */
async function previewRecall(req, res) {
  try {
    const boundary = await layanan.resolveRenjaDataPendukungOpdBoundary(db, {
      user: req.user,
      perangkatDaerahId: req.query.perangkat_daerah_id,
    });
    if (!boundary.ok) return tolakOpd(res, boundary);

    const data = await layanan.previewRecallInovasi(db, {
      tahun: req.query.tahun,
      perangkat_daerah_id: req.query.perangkat_daerah_id,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return gagal(res, e, 400);
  }
}

/** Turunkan inovasi tahun sebelumnya ke tahun berkenaan. */
async function terapkanRecall(req, res) {
  try {
    // Sumber recall (tahun-1) dan tujuan berada pada perangkat_daerah_id
    // yang sama (lihat previewRecallInovasi/terapkanRecallInovasi) —
    // satu boundary check pada perangkat_daerah_id body mencakup
    // keduanya.
    const boundary = await layanan.resolveRenjaDataPendukungOpdBoundary(db, {
      user: req.user,
      perangkatDaerahId: req.body?.perangkat_daerah_id,
    });
    if (!boundary.ok) return tolakOpd(res, boundary);

    const data = await layanan.terapkanRecallInovasi(db, {
      tahun: req.body?.tahun,
      perangkat_daerah_id: req.body?.perangkat_daerah_id,
      kandidat: req.body?.kandidat,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return gagal(res, e, 400);
  }
}

async function rekap(req, res) {
  try {
    const pdId = toInt(req.query.perangkat_daerah_id);
    if (pdId) {
      const boundary = await layanan.resolveRenjaDataPendukungOpdBoundary(db, {
        user: req.user,
        perangkatDaerahId: pdId,
      });
      if (!boundary.ok) return tolakOpd(res, boundary);
      const data = await layanan.rekapInovasi(db, {
        tahun: req.query.tahun,
        perangkat_daerah_id: req.query.perangkat_daerah_id,
      });
      return res.json({ success: true, data });
    }
    if (req.user?.role === 'SUPER_ADMIN') {
      const data = await layanan.rekapInovasi(db, {
        tahun: req.query.tahun,
        perangkat_daerah_id: req.query.perangkat_daerah_id,
      });
      return res.json({ success: true, data });
    }
    // Sprint 21 — Candidate A: filter omitted, caller is not SUPER_ADMIN.
    // Default to the caller's own OPD scope instead of an unscoped
    // aggregate spanning all OPDs' innovation records.
    let forcedPdScope = await resolveCallerPerangkatDaerahIds(req.user);
    if (!Array.isArray(forcedPdScope)) forcedPdScope = [];
    const data = await hitungRekapInovasiUntukPdIds(forcedPdScope, req.query.tahun);
    return res.json({ success: true, data });
  } catch (e) {
    return gagal(res, e);
  }
}

module.exports = {
  findAll,
  findOne,
  create,
  update,
  delete: destroy,
  previewRecall,
  terapkanRecall,
  rekap,
};
