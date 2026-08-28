'use strict';

/**
 * Pokok-pokok pikiran DPRD — data pendukung subbab Bab II Renja
 * (Permendagri 14/2026, Lampiran angka II.A.3 poin 4).
 *
 * Data bersifat tahunan per perangkat daerah, tidak terikat ke satu dokumen
 * Renja, sehingga dapat di-recall berulang oleh revisi Renja mana pun tanpa
 * penginputan ulang.
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
  if (query.q) {
    const { Op } = db.Sequelize;
    where[Op.or] = [
      { usulan: { [Op.like]: `%${query.q}%` } },
      { nama_anggota_dprd: { [Op.like]: `%${query.q}%` } },
      { dapil: { [Op.like]: `%${query.q}%` } },
      { lokasi: { [Op.like]: `%${query.q}%` } },
    ];
  }
  return where;
};

const bersihkanPayload = (body) => {
  const p = { ...body };
  delete p.id;
  delete p.created_at;
  delete p.updated_at;
  if ('nilai_usulan_anggaran' in p) {
    p.nilai_usulan_anggaran = layanan.parseRupiah(p.nilai_usulan_anggaran);
  }
  if (p.tahun !== null && p.tahun !== undefined) p.tahun = String(p.tahun);
  return p;
};

const gagal = (res, e, status = 500) => {
  console.error('[renjaPokirDprd]', e);
  return res.status(status).json({ success: false, message: e.message || 'Terjadi kesalahan.' });
};

// Sprint 19 — C3 OPD authorization boundary. Bounded to this controller's
// existing perangkat_daerah_id-scoped model; see renjaDataPendukungService.js
// resolveRenjaDataPendukungOpdBoundary for the shared, narrowly-scoped
// resolution logic (mirrors resolveMrPlanningRiskOpdBoundary from
// mrPlanningRiskService.js, Sprint 17).
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
// or null if the caller's own OPD cannot be resolved at all.
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

// Sprint 21 — Candidate A. Replicates layanan.rekapPokir's exact aggregate
// math (services/renjaDataPendukungService.js, out of scope for
// modification) for a forced multi-PD scope (Op.in), used only for the new
// omitted-filter + non-SUPER_ADMIN default-scoping case in rekap() below.
// All pre-existing call paths (explicit filter, SUPER_ADMIN) continue to
// call layanan.rekapPokir() directly, unchanged.
async function hitungRekapUntukPdIds(pdIds, tahun) {
  const { Op } = db.Sequelize;
  const where = {};
  if (tahun) where.tahun = String(tahun);
  where.perangkat_daerah_id = { [Op.in]: pdIds };
  const rows = await db.RenjaPokirDprd.findAll({ where });
  const totalNilai = rows.reduce((s, r) => s + (Number(r.nilai_usulan_anggaran) || 0), 0);
  const terakomodasi = rows.filter(
    (r) => r.program_kegiatan_terkait && String(r.program_kegiatan_terkait).trim(),
  ).length;
  const dapil = [...new Set(rows.map((r) => r.dapil).filter(Boolean))];
  const anggota = [...new Set(rows.map((r) => r.nama_anggota_dprd).filter(Boolean))];
  return {
    jumlah_usulan: rows.length,
    total_nilai_usulan: totalNilai,
    terakomodasi,
    belum_terakomodasi: rows.length - terakomodasi,
    jumlah_dapil: dapil.length,
    jumlah_anggota: anggota.length,
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
    const rows = await db.RenjaPokirDprd.findAll({
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
    const row = await db.RenjaPokirDprd.findByPk(toInt(req.params.id));
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
    if (!String(payload.usulan ?? '').trim()) {
      return res.status(400).json({ success: false, message: 'Kolom usulan wajib diisi.' });
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
      const terakhir = await db.RenjaPokirDprd.max('urutan', {
        where: {
          tahun: payload.tahun,
          perangkat_daerah_id: toInt(payload.perangkat_daerah_id),
        },
      });
      payload.urutan = (Number(terakhir) || 0) + 1;
    }
    const row = await db.RenjaPokirDprd.create(payload);
    return res.status(201).json({ success: true, data: row });
  } catch (e) {
    return gagal(res, e);
  }
}

async function update(req, res) {
  try {
    const row = await db.RenjaPokirDprd.findByPk(toInt(req.params.id));
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
    const row = await db.RenjaPokirDprd.findByPk(toInt(req.params.id));
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

/** Impor massal — hasil reses DPRD biasanya diterima sebagai daftar, bukan satuan. */
async function importMassal(req, res) {
  try {
    const boundary = await layanan.resolveRenjaDataPendukungOpdBoundary(db, {
      user: req.user,
      perangkatDaerahId: req.body?.perangkat_daerah_id,
    });
    if (!boundary.ok) return tolakOpd(res, boundary);

    const hasil = await layanan.importPokir(db, {
      tahun: req.body?.tahun,
      perangkat_daerah_id: req.body?.perangkat_daerah_id,
      rows: req.body?.rows,
    });
    return res.json({ success: true, data: hasil });
  } catch (e) {
    return gagal(res, e, 400);
  }
}

async function previewAutofill(req, res) {
  try {
    const boundary = await layanan.resolveRenjaDataPendukungOpdBoundary(db, {
      user: req.user,
      perangkatDaerahId: req.query.perangkat_daerah_id,
    });
    if (!boundary.ok) return tolakOpd(res, boundary);

    const data = await layanan.previewAutofillPokir(db, {
      tahun: req.query.tahun,
      perangkat_daerah_id: req.query.perangkat_daerah_id,
      ambang: req.query.ambang ? Number(req.query.ambang) : undefined,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return gagal(res, e);
  }
}

async function terapkanAutofill(req, res) {
  try {
    // perubahan[].id adalah row RenjaPokirDprd yang sudah ada dan
    // attacker-controlled — muat baris-baris itu dan otorisasi tiap
    // perangkat_daerah_id unik yang terlibat SEBELUM menerapkan mutasi.
    const perubahan = Array.isArray(req.body?.perubahan) ? req.body.perubahan : [];
    const ids = [...new Set(perubahan.map((p) => toInt(p?.id)).filter(Boolean))];

    if (ids.length) {
      const rows = await db.RenjaPokirDprd.findAll({
        where: { id: ids },
        attributes: ['id', 'perangkat_daerah_id'],
      });
      const pdIdsUnik = [...new Set(rows.map((r) => r.perangkat_daerah_id))];
      for (const pdId of pdIdsUnik) {
        const boundary = await layanan.resolveRenjaDataPendukungOpdBoundary(db, {
          user: req.user,
          perangkatDaerahId: pdId,
        });
        if (!boundary.ok) return tolakOpd(res, boundary);
      }
    }

    const data = await layanan.terapkanAutofillPokir(db, req.body?.perubahan);
    return res.json({ success: true, data });
  } catch (e) {
    return gagal(res, e);
  }
}

/** Saran nomenklatur untuk satu teks usulan — dipakai form saat mengetik. */
async function sugesti(req, res) {
  try {
    const bidangUrusan =
      req.query.bidang_urusan ||
      (await layanan.resolveBidangUrusan(db, req.query.perangkat_daerah_id));
    const data = await layanan.sugestiNomenklatur(db, {
      teks: req.query.teks || '',
      bidangUrusan,
      batas: req.query.batas ? Number(req.query.batas) : 5,
    });
    return res.json({ success: true, data: { bidang_urusan: bidangUrusan, saran: data } });
  } catch (e) {
    return gagal(res, e);
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
      const data = await layanan.rekapPokir(db, {
        tahun: req.query.tahun,
        perangkat_daerah_id: req.query.perangkat_daerah_id,
      });
      return res.json({ success: true, data });
    }
    if (req.user?.role === 'SUPER_ADMIN') {
      const data = await layanan.rekapPokir(db, {
        tahun: req.query.tahun,
        perangkat_daerah_id: req.query.perangkat_daerah_id,
      });
      return res.json({ success: true, data });
    }
    // Sprint 21 — Candidate A: filter omitted, caller is not SUPER_ADMIN.
    // Default to the caller's own OPD scope instead of an unscoped
    // aggregate that discloses cross-OPD DPRD-member/dapil identifiers.
    let forcedPdScope = await resolveCallerPerangkatDaerahIds(req.user);
    if (!Array.isArray(forcedPdScope)) forcedPdScope = [];
    const data = await hitungRekapUntukPdIds(forcedPdScope, req.query.tahun);
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
  importMassal,
  previewAutofill,
  terapkanAutofill,
  sugesti,
  rekap,
};
