'use strict';

const db = require('../models');
const { recallRenja, tandaiPerluRecall } = require('../services/permendagri14/renjaRecallService');

const SCOPE_SAH = ['all', 'realisasi', 'nomenklatur', 'prioritas', 'narasi'];

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

async function jalankanRecall(req, res) {
  try {
    const dokumenId = toInt(req.params.id);
    if (!dokumenId) return res.status(400).json({ success: false, message: 'ID tidak valid.' });

    const scope = req.body?.scope || 'all';
    if (!SCOPE_SAH.includes(scope)) {
      return res
        .status(400)
        .json({ success: false, message: `scope harus salah satu dari: ${SCOPE_SAH.join(', ')}` });
    }

    const data = await recallRenja(db, dokumenId, {
      scope,
      userId: req.user?.id ?? null,
      alasan: req.body?.alasan ?? null,
      paksa: req.body?.paksa === true,
    });
    return res.json({ success: true, message: 'Recall selesai.', data });
  } catch (e) {
    console.error('[renjaRecall]', e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

/** Status recall satu dokumen — memasok badge peringatan di layar detail. */
async function statusRecall(req, res) {
  try {
    const dokumenId = toInt(req.params.id);
    if (!dokumenId) return res.status(400).json({ success: false, message: 'ID tidak valid.' });

    const dok = await db.RenjaDokumen.findByPk(dokumenId, {
      attributes: [
        'id',
        'tahun',
        'regulasi_acuan',
        'status',
        'needs_recall',
        'recall_reason',
        'last_recall_at',
      ],
    });
    if (!dok) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
    return res.json({ success: true, data: dok });
  } catch (e) {
    console.error('[renjaRecall]', e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function tandai(req, res) {
  try {
    const data = await tandaiPerluRecall(db, {
      perangkatDaerahId: toInt(req.body?.perangkat_daerah_id),
      tahun: req.body?.tahun ?? null,
      alasan: req.body?.alasan ?? null,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

module.exports = { jalankanRecall, statusRecall, tandai };
