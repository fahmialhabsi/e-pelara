'use strict';

const { QueryTypes } = require('sequelize');
const db = require('../models');

/**
 * GET /api/master-rekening-belanja
 * Query params:
 *   - parent_kode (opsional) — jika kosong, kembalikan level 1 (akun)
 *   - search (opsional) — cari berdasarkan kode atau uraian
 */
exports.getByParent = async (req, res) => {
  try {
    const { parent_kode, search } = req.query;

    let rows;

    if (search) {
      // Mode pencarian bebas
      rows = await db.sequelize.query(
        `SELECT id, kode_rekening, uraian, level, is_leaf,
                akun, kelompok, jenis, objek, rincian, sub_rincian
         FROM master_kode_rekening_belanja
         WHERE kode_rekening LIKE :search OR uraian LIKE :search
         ORDER BY kode_rekening
         LIMIT 100`,
        {
          replacements: { search: `%${search}%` },
          type: QueryTypes.SELECT,
        },
      );
    } else if (!parent_kode) {
      // Kembalikan level 1 (akun) — hanya kode tanpa titik di akhir yang berarti level 1
      rows = await db.sequelize.query(
        `SELECT id, kode_rekening, uraian, level, is_leaf,
                akun, kelompok, jenis, objek, rincian, sub_rincian
         FROM master_kode_rekening_belanja
         WHERE level = 1
         ORDER BY kode_rekening`,
        { type: QueryTypes.SELECT },
      );
    } else {
      // Hitung level parent untuk menentukan level anak
      const parentClean = String(parent_kode).replace(/\.$/, '').trim();
      const parentLevel = parentClean.split('.').length;
      const childLevel = parentLevel + 1;

      rows = await db.sequelize.query(
        `SELECT id, kode_rekening, uraian, level, is_leaf,
                akun, kelompok, jenis, objek, rincian, sub_rincian
         FROM master_kode_rekening_belanja
         WHERE level = :childLevel
           AND kode_rekening LIKE :prefix
         ORDER BY kode_rekening`,
        {
          replacements: {
            childLevel,
            prefix: `${parentClean}.%`,
          },
          type: QueryTypes.SELECT,
        },
      );
    }

    res.json({ success: true, total: rows.length, data: rows });
  } catch (err) {
    console.error('[masterKodeRekeningBelanja] getByParent error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/master-rekening-belanja/detail/:kode
 * Ambil detail satu kode rekening
 */
exports.getByKode = async (req, res) => {
  try {
    const { kode } = req.params;
    const rows = await db.sequelize.query(
      `SELECT * FROM master_kode_rekening_belanja WHERE kode_rekening = :kode LIMIT 1`,
      { replacements: { kode }, type: QueryTypes.SELECT },
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Kode rekening tidak ditemukan' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[masterKodeRekeningBelanja] getByKode error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
