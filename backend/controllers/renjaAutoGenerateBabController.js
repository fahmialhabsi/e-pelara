'use strict';

async function upsertSections(dokumenId, babMap) {
  const entries = [
    { section_key: 'pendahuluan', content: babMap.bab1 },
    { section_key: 'evaluasi', content: babMap.bab2 },
    { section_key: 'tujuan_sasaran', content: babMap.bab3 },
    { section_key: 'rencana_kerja', content: babMap.bab4 },
    { section_key: 'penutup', content: babMap.bab5 },
  ];
  for (const e of entries) {
    if (!e.content) continue;
    const sectionTitles = {
      pendahuluan: 'BAB I Pendahuluan',
      evaluasi: 'BAB II Evaluasi Pelaksanaan Renja',
      tujuan_sasaran: 'BAB III Tujuan dan Sasaran',
      rencana_kerja: 'BAB IV Rencana Kerja dan Pendanaan',
      penutup: 'BAB V Penutup',
    };
    await db.RenjaDokumenSection.upsert({
      renja_dokumen_id: dokumenId,
      section_key: e.section_key,
      section_title: sectionTitles[e.section_key] || e.section_key,
      content: e.content,
    });
  }
}

const db = require('../models');
const { generateBab } = require('../services/renjaAutoGenerateBabService');
const { bridgeIndikatorRenstraKeLakip } = require('../services/lakipBridgeService');

async function autoGenerateBab(req, res) {
  try {
    const dokumenId = Number(req.params.id);
    if (!dokumenId) return res.status(400).json({ success: false, message: 'ID tidak valid.' });

    const { bab1, bab2, bab3, bab4, bab5 } = await generateBab(db, dokumenId);

    const dok = await db.RenjaDokumen.findByPk(dokumenId);
    if (!dok) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });

    await dok.update({
      text_bab1: bab1,
      text_bab2: bab2,
      text_bab3: bab3,
      text_bab4: bab4,
      text_bab5: bab5,
      change_reason_text: 'Auto-generate narasi BAB I, II, III, V oleh sistem',
    });

    await upsertSections(dok.id, { bab1, bab2, bab3, bab4, bab5 });
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

async function bridgeLakip(req, res) {
  try {
    const dokumenId = Number(req.params.id);
    if (!dokumenId) return res.status(400).json({ success: false, message: 'ID tidak valid.' });
    const hasil = await bridgeIndikatorRenstraKeLakip(db, dokumenId);
    return res.json({ success: true, data: hasil });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { autoGenerateBab, bridgeLakip };
