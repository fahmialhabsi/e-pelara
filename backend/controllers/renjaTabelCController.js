'use strict';

/**
 * Endpoint read-only untuk Tabel C-1/C-2/C-3/C-6 Permendagri 14/2026.
 *
 * Tabel C adalah lampiran referensi nasional (Kesepakatan Rakortekbang 2026),
 * bukan data yang diinput OPD — lihat services/seedPermendagri14TabelC.js.
 * Endpoint ini murni untuk menampilkan baris yang relevan bagi bidang urusan
 * OPD aktif, sebagai alat telaah/keselarasan sebelum dokumen difinalkan.
 */

const db = require('../models');

async function ringkasan(req, res) {
  try {
    const bidangUrusan = req.query.bidang_urusan || null;
    const whereBu = bidangUrusan ? { kode_bidang_urusan: bidangUrusan } : {};

    const [master, proSn, tematik, astaCita] = await Promise.all([
      db.RenjaProSnMaster.findAll({ order: [['urutan', 'ASC']] }),
      db.RenjaDukunganProsnTematik.findAll({
        where: { ...whereBu, jenis: 'pro_sn', sumber: 'rakortekbang_2026' },
        order: [['urutan', 'ASC']],
      }),
      db.RenjaDukunganProsnTematik.findAll({
        where: { ...whereBu, jenis: 'tematik', sumber: 'rakortekbang_2026' },
        order: [['urutan', 'ASC']],
      }),
      db.RenjaOutcomeAstaCita.findAll({
        where: { ...whereBu, sumber: 'rakortekbang_2026' },
        order: [['urutan', 'ASC']],
      }),
    ]);

    return res.json({
      success: true,
      data: {
        bidang_urusan: bidangUrusan,
        c1_pro_sn_master: master,
        c2_dukungan_pro_sn: proSn,
        c3_dukungan_tematik: tematik,
        c6_outcome_asta_cita: astaCita,
        total: master.length + proSn.length + tematik.length + astaCita.length,
      },
    });
  } catch (e) {
    console.error('[renjaTabelC]', e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

/**
 * Keselarasan (setara FORM 4/5 Daftar Isian Fasilitasi Permendagri 14/2026):
 * bandingkan kode subkegiatan Tabel C untuk satu bidang urusan dengan kode
 * yang sudah diakomodasi pada satu dokumen Renja.
 */
async function keselarasan(req, res) {
  try {
    const dokumenId = Number(req.query.dokumen_id);
    if (!dokumenId) {
      return res.status(400).json({ success: false, message: 'dokumen_id wajib diisi.' });
    }

    const dok = await db.RenjaDokumen.findByPk(dokumenId, {
      include: [{ model: db.RenjaItem, as: 'items', required: false }],
    });
    if (!dok) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });

    const kodeRenja = new Set(
      (dok.items || []).map((i) => i.kode_sub_kegiatan).filter(Boolean),
    );
    const bidangUrusan =
      [...kodeRenja].map((k) => k.slice(0, 4))[0] ||
      req.query.bidang_urusan ||
      null;

    const [proSn, tematik, astaCita] = await Promise.all([
      db.RenjaDukunganProsnTematik.findAll({
        where: { kode_bidang_urusan: bidangUrusan, jenis: 'pro_sn', sumber: 'rakortekbang_2026' },
        order: [['urutan', 'ASC']],
      }),
      db.RenjaDukunganProsnTematik.findAll({
        where: { kode_bidang_urusan: bidangUrusan, jenis: 'tematik', sumber: 'rakortekbang_2026' },
        order: [['urutan', 'ASC']],
      }),
      db.RenjaOutcomeAstaCita.findAll({
        where: { kode_bidang_urusan: bidangUrusan, sumber: 'rakortekbang_2026' },
        order: [['urutan', 'ASC']],
      }),
    ]);

    const petakan = (rows, kolomKode) =>
      rows.map((r) => ({
        kode: r[kolomKode],
        keterangan: r.sub_kegiatan || r.subkegiatan || null,
        pro_sn: r.pro_sn || null,
        tematik: r.tematik_pembangunan || null,
        outcome_prioritas: r.outcome_prioritas || null,
        terakomodasi: r[kolomKode] ? kodeRenja.has(r[kolomKode]) : false,
      }));

    const daftar = [
      ...petakan(proSn, 'kode'),
      ...petakan(tematik, 'kode'),
      ...petakan(astaCita, 'kode_subkegiatan'),
    ].filter((r) => r.kode);

    const terakomodasi = daftar.filter((r) => r.terakomodasi).length;

    return res.json({
      success: true,
      data: {
        dokumen_id: dokumenId,
        bidang_urusan: bidangUrusan,
        total: daftar.length,
        terakomodasi,
        belum_terakomodasi: daftar.length - terakomodasi,
        daftar,
      },
    });
  } catch (e) {
    console.error('[renjaTabelC]', e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { ringkasan, keselarasan };
