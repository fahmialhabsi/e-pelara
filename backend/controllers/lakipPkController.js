'use strict';
const lakipPkService = require('../services/lakipPkService');

exports.getDetail = async (req, res) => {
  try {
    const { renstraId, tahun } = req.query;
    if (!renstraId || !tahun) {
      return res.status(400).json({ success: false, message: 'renstraId dan tahun wajib diisi.' });
    }
    const data = await lakipPkService.getPkDetail(renstraId, tahun);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[lakipPk] getDetail:', err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.save = async (req, res) => {
  try {
    const { renstraId, tahun } = req.query;
    if (!renstraId || !tahun) {
      return res.status(400).json({ success: false, message: 'renstraId dan tahun wajib diisi.' });
    }
    const data = await lakipPkService.savePk(renstraId, tahun, req.body);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[lakipPk] save:', err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.getSasaranOptions = async (req, res) => {
  try {
    const { renstraId } = req.query;
    if (!renstraId) {
      return res.status(400).json({ success: false, message: 'renstraId wajib diisi.' });
    }
    const data = await lakipPkService.getSasaranOptions(renstraId);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[lakipPk] getSasaranOptions:', err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.setIsIkuPk = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_iku_pk } = req.body;
    const row = await lakipPkService.setIsIkuPk(id, is_iku_pk);
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('[lakipPk] setIsIkuPk:', err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.getProgramAnggaranLive = async (req, res) => {
  try {
    const { renstraId, tahun } = req.query;
    if (!renstraId || !tahun) {
      return res.status(400).json({ success: false, message: 'renstraId dan tahun wajib diisi.' });
    }
    const data = await lakipPkService.getProgramAnggaranLive(renstraId, tahun);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[lakipPk] getProgramAnggaranLive:', err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.getKegiatanOutputUntukSasaran = async (req, res) => {
  try {
    const { renstraId, sasaranId, tahun } = req.query;
    if (!renstraId || !sasaranId || !tahun) {
      return res
        .status(400)
        .json({ success: false, message: 'renstraId, sasaranId, dan tahun wajib diisi.' });
    }
    const data = await lakipPkService.getKegiatanOutputUntukSasaran(renstraId, sasaranId, tahun);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[lakipPk] getKegiatanOutputUntukSasaran:', err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

exports.saveIkm = async (req, res) => {
  try {
    const { renstraId, tahun } = req.query;
    if (!renstraId || !tahun) {
      return res.status(400).json({ success: false, message: 'renstraId dan tahun wajib diisi.' });
    }
    const row = await lakipPkService.upsertIkm(renstraId, tahun, req.body);
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('[lakipPk] saveIkm:', err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};
