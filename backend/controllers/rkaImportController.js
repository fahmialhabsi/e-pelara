'use strict';

const fs = require('fs');
const { Rka, PeriodeRpjmd, OpdPenanggungJawab } = require('../models');
const { parseSipdRkaPdf } = require('../services/rkaSipdPdfImportService');
const rkaCalculationHelper = require('../helpers/rkaCalculationHelper');
const rkaValidationService = require('../services/rkaValidationService');
const { saveRka } = require('../helpers/rkaSaveHelper');
const {
  writePlanningAudit,
  auditValuesFromRows,
} = require('../services/planningDocumentAuditService');

async function resolvePeriodeId(tahun) {
  const periode = await PeriodeRpjmd.findOne({
    where: {},
    order: [['id', 'DESC']],
  });
  const rows = await PeriodeRpjmd.findAll();
  const match = rows.find(
    (p) => Number(p.tahun_awal) <= Number(tahun) && Number(tahun) <= Number(p.tahun_akhir),
  );
  return (match || periode)?.id || null;
}

async function resolveOpdId(unitOrganisasiNama) {
  const nama = String(unitOrganisasiNama || '').trim();
  if (nama) {
    const exact = await OpdPenanggungJawab.findOne({ where: { nama_opd: nama } });
    if (exact) return exact.id;
  }
  const fallback = await OpdPenanggungJawab.findOne({ where: { nama_opd: 'Dinas Pangan' } });
  return fallback?.id || null;
}

async function importPdf(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Berkas PDF wajib diunggah.' });
  }

  try {
    const buffer = fs.readFileSync(req.file.path);
    const parsed = await parseSipdRkaPdf(buffer);

    const periode_id = await resolvePeriodeId(parsed.tahun);
    if (!periode_id) {
      throw Object.assign(
        new Error(`Tidak ditemukan Periode RPJMD yang mencakup tahun ${parsed.tahun}.`),
        { status: 400 },
      );
    }

    const opd_id = await resolveOpdId(req.body?.unit_organisasi);
    if (!opd_id) {
      throw Object.assign(new Error('OPD Penanggung Jawab tidak ditemukan/terdaftar.'), {
        status: 400,
      });
    }

    const { rincian_belanja, _meta, ...rkaFields } = parsed;

    const payload = {
      ...rkaFields,
      periode_id,
      opd_id,
      tahapan: req.body?.tahapan || 'APBD_INDUK',
      rincian_belanja,
    };

    const validatedValue = rkaValidationService.validatePayload(payload, false);
    const { rincian_belanja: rincianValid = [], ...rkaPayload } = validatedValue;

    const { processedRincian, totalAnggaranSubKegiatan } =
      rkaCalculationHelper.processRincianBelanja(rincianValid);

    rkaPayload.anggaran = totalAnggaranSubKegiatan;
    rkaPayload.rpjmd_id = null;
    rkaPayload.kode_unik_sub_kegiatan = `${rkaPayload.tahun}-${rkaPayload.opd_id}-${rkaPayload.sub_kegiatan}-${rkaPayload.tahapan || 'APBD_INDUK'}`;

    const created = await saveRka(
      {
        ...rkaPayload,
        version: 1,
        is_active_version: true,
        approval_status: 'DRAFT',
        change_reason_text: `Import otomatis dari PDF SIPD: ${req.file.originalname}`,
        change_reason_file: req.file.filename,
      },
      processedRincian,
    );

    const uid = req.user?.id ?? req.user?.userId ?? null;
    const { old_value, new_value } = auditValuesFromRows(null, created);
    await writePlanningAudit({
      module_name: 'rka',
      table_name: 'rka',
      record_id: created.id,
      action_type: 'CREATE',
      old_value,
      new_value,
      change_reason_text: `Import otomatis dari PDF SIPD: ${req.file.originalname}`,
      change_reason_file: req.file.filename,
      changed_by: uid,
      version_before: null,
      version_after: 1,
    });

    return res.status(201).json({
      success: true,
      message: `RKA berhasil diimpor dari PDF (${parsed.sub_kegiatan}).`,
      id: created.id,
      data: {
        id: created.id,
        program: rkaPayload.program,
        kegiatan: rkaPayload.kegiatan,
        sub_kegiatan: rkaPayload.sub_kegiatan,
        anggaran: totalAnggaranSubKegiatan,
        jumlah_baris_rincian: _meta.jumlah_baris_rincian,
        selisih_vs_alokasi_pdf: _meta.selisih_vs_alokasi_pdf,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      error: error.message,
      details: error.details || undefined,
    });
  }
}

module.exports = { importPdf };
