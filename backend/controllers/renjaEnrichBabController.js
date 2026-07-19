'use strict';

async function upsertSections(dokumenId, babMap) {
  const entries = [
    { section_key: 'pendahuluan',    content: babMap.bab1 },
    { section_key: 'evaluasi',       content: babMap.bab2 },
    { section_key: 'tujuan_sasaran', content: babMap.bab3 },
    { section_key: 'rencana_kerja',  content: babMap.bab4 },
    { section_key: 'penutup',        content: babMap.bab5 },
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


const { getAllBpsData } = require('../services/bpsScraperService');
const { enrichAllBab } = require('../services/renjaEnrichBabService');

async function enrichBabWithAI(req, res) {
  const { id } = req.params;
  

  try {
    // 1. Ambil dokumen Renja
    const dokumen = await db.RenjaDokumen.findByPk(id);
    if (!dokumen)
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });

    // 2. Ambil items Renja (program/kegiatan)
    const renjaItems = await db.RenjaItem.findAll({
      where: { renja_dokumen_id: id },
      raw: true,
    });

    // 3. Ambil data BPS live
    const bpsData = await getAllBpsData();

    // 4. Ambil nama OPD
    const opd = dokumen.perangkat_daerah_id
      ? await db.PerangkatDaerah.findByPk(dokumen.perangkat_daerah_id, { raw: true })
      : null;
    const namaOpd = opd?.nama_opd ?? 'Dinas Pangan Provinsi Maluku Utara';
    const tahun = dokumen.tahun;

    // 5. Enrich semua BAB
    const enriched = await enrichAllBab({
      namaOpd,
      tahun,
      bpsData,
      dokumen: dokumen.toJSON(),
      renjaItems,
    });

    // 6. Simpan hasil ke database
    const updateData = {};
    if (enriched.bab1) updateData.text_bab1 = enriched.bab1;
    if (enriched.bab2) updateData.text_bab2 = enriched.bab2;
    if (enriched.bab3) updateData.text_bab3 = enriched.bab3;
    if (enriched.bab4) updateData.text_bab4 = enriched.bab4;
    if (enriched.bab5) updateData.text_bab5 = enriched.bab5;

    await dokumen.update(updateData);
    await upsertSections(dokumen.id, enriched);

    return res.json({
      success: true,
      message: 'Narasi BAB berhasil di-enrich dengan AI dan data BPS',
      data: {
        bpsData,
        enriched,
        updated_fields: Object.keys(updateData),
      },
    });
  } catch (err) {
    console.error('[enrichBabWithAI]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { enrichBabWithAI };
