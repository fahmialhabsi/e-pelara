'use strict';
const db = require('../models');
const { generateBab } = require('../services/renjaAutoGenerateBabService');

async function autoGenerateBab(req, res) {
  try {
    const dokumenId = Number(req.params.id);
    if (!dokumenId) return res.status(400).json({ success: false, message: 'ID tidak valid.' });

    const { bab1, bab2, bab3, bab5 } = await generateBab(db, dokumenId);

    const dok = await db.RenjaDokumen.findByPk(dokumenId);
    if (!dok) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });

    await dok.update({
      text_bab1: bab1,
      text_bab2: bab2,
      text_bab3: bab3,
      text_bab5: bab5,
      change_reason_text: 'Auto-generate narasi BAB I, II, III, V oleh sistem',
    });

    console.log('DEBUG bab2 length:', bab2.length, '| DB updated');

    return res.json({
      success: true,
      message: 'Narasi BAB berhasil di-generate.',
      data: { bab1, bab2, bab3, bab5 },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { autoGenerateBab };
