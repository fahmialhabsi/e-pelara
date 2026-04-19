// controllers/rpjmdImportController.js
// Pipeline: Excel Upload → rpjmd_import_raw → sp_process_rpjmd_batch → Final DB
const XLSX = require('xlsx');
const { sequelize } = require('../models');
const { getPeriodeFromTahun, getPeriodeAktif } = require('../utils/periodeHelper');

// ── Constants ────────────────────────────────────────────────────────────────

const APPROVED_FIELDS = [
  'nama_indikator', 'indikator_kinerja', 'tolok_ukur_kinerja', 'target_kinerja',
  'definisi_operasional', 'metode_penghitungan', 'kriteria_kuantitatif', 'kriteria_kualitatif',
  'target_tahun_1', 'target_tahun_2', 'target_tahun_3', 'target_tahun_4', 'target_tahun_5',
  'sumber_data',
  'capaian_tahun_1', 'capaian_tahun_2', 'capaian_tahun_3', 'capaian_tahun_4', 'capaian_tahun_5',
  'satuan',
];

const TIPE_DEFAULT = {
  tujuan:         'Impact',
  sasaran:        'Outcome',
  strategi:       'Outcome',
  arah_kebijakan: 'Outcome',
  program:        'Output',
  kegiatan:       'Proses',
  sub_kegiatan:   'Output',
};

const ENTITY_PREFIX = {
  tujuan: 'T', sasaran: 'S', strategi: 'STR',
  arah_kebijakan: 'AK', program: 'P', kegiatan: 'K', sub_kegiatan: 'SK',
};

const VALID_ENTITY_TYPES = Object.keys(TIPE_DEFAULT);

// ── Helpers ──────────────────────────────────────────────────────────────────

function genBatchId() {
  return `BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function genKodeIndikator(entityType, batchSuffix, idx) {
  const prefix = ENTITY_PREFIX[entityType] || entityType.toUpperCase();
  return `${prefix}-IMP-${batchSuffix}-${String(idx + 1).padStart(3, '0')}`;
}

function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function validateHeaders(rows) {
  if (!rows.length) return { valid: false, missing: [...APPROVED_FIELDS], extra: [] };
  const headers = Object.keys(rows[0]);
  const missing = APPROVED_FIELDS.filter(f => !headers.includes(f));
  const extra   = headers.filter(f => !APPROVED_FIELDS.includes(f));
  return { valid: missing.length === 0, missing, extra };
}

// ── Controller: GET /api/rpjmd-import/template ───────────────────────────────

async function downloadTemplate(req, res) {
  try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([APPROVED_FIELDS]);
    ws['!cols'] = APPROVED_FIELDS.map(f => ({ wch: Math.max(f.length + 4, 18) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Template Indikator RPJMD');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="template_indikator_rpjmd.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── Controller: POST /api/rpjmd-import/preview ───────────────────────────────
// Parses Excel, validates headers, returns preview rows (no DB write)

async function previewExcel(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'File Excel wajib diupload' });
    const rows = parseExcel(req.file.buffer);
    const validation = validateHeaders(rows);
    const preview = rows.slice(0, 30).map(row => {
      const r = {};
      APPROVED_FIELDS.forEach(f => { r[f] = row[f] ?? ''; });
      return r;
    });
    res.json({
      valid: validation.valid,
      missing_columns: validation.missing,
      extra_columns: validation.extra,
      total_rows: rows.length,
      preview,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── Controller: POST /api/rpjmd-import/upload ────────────────────────────────
// Saves parsed Excel rows to rpjmd_import_raw, returns batch_id

async function uploadBatch(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'File Excel wajib diupload' });

    const {
      entity_type, tahun,
      sasaran_id, strategi_id, arah_kebijakan_id,
      program_id, kegiatan_id, tujuan_id, misi_id,
    } = req.body;

    if (!entity_type || !VALID_ENTITY_TYPES.includes(entity_type)) {
      return res.status(400).json({ message: `entity_type tidak valid. Pilih: ${VALID_ENTITY_TYPES.join(', ')}` });
    }

    const tahunVal = String(tahun || new Date().getFullYear());

    // Resolve periode_id from tahun
    let periode = await getPeriodeFromTahun(tahunVal);
    if (!periode) periode = await getPeriodeAktif();
    const periode_id = periode?.id ?? null;

    const rows = parseExcel(req.file.buffer);
    const validation = validateHeaders(rows);

    if (!validation.valid) {
      return res.status(422).json({
        message: 'Header Excel tidak sesuai template. Gunakan tombol Download Template.',
        missing_columns: validation.missing,
      });
    }

    if (!rows.length) return res.status(400).json({ message: 'File Excel tidak memiliki data' });

    const batchId     = genBatchId();
    const batchSuffix = batchId.slice(-8);
    const tipe        = TIPE_DEFAULT[entity_type];

    const INSERT_SQL = `
      INSERT INTO rpjmd_import_raw (
        batch_id, entity_type, status,
        kode_indikator, nama_indikator, indikator_kinerja,
        tipe_indikator, jenis_indikator, jenis_dokumen, tahun,
        periode_id, sasaran_id, strategi_id, arah_kebijakan_id,
        program_id, kegiatan_id, tujuan_id, misi_id,
        tolok_ukur_kinerja, target_kinerja,
        definisi_operasional, metode_penghitungan,
        kriteria_kuantitatif, kriteria_kualitatif,
        target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
        capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
        sumber_data, satuan
      ) VALUES (
        :batch_id, :entity_type, 'pending',
        :kode_indikator, :nama_indikator, :indikator_kinerja,
        :tipe_indikator, 'Kuantitatif', 'RPJMD', :tahun,
        :periode_id, :sasaran_id, :strategi_id, :arah_kebijakan_id,
        :program_id, :kegiatan_id, :tujuan_id, :misi_id,
        :tolok_ukur_kinerja, :target_kinerja,
        :definisi_operasional, :metode_penghitungan,
        :kriteria_kuantitatif, :kriteria_kualitatif,
        :target_tahun_1, :target_tahun_2, :target_tahun_3, :target_tahun_4, :target_tahun_5,
        :capaian_tahun_1, :capaian_tahun_2, :capaian_tahun_3, :capaian_tahun_4, :capaian_tahun_5,
        :sumber_data, :satuan
      )
    `;

    await sequelize.transaction(async (t) => {
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        await sequelize.query(INSERT_SQL, {
          replacements: {
            batch_id:            batchId,
            entity_type,
            kode_indikator:      genKodeIndikator(entity_type, batchSuffix, idx),
            nama_indikator:      row.nama_indikator      || null,
            indikator_kinerja:   row.indikator_kinerja   || null,
            tipe_indikator:      tipe,
            tahun:               tahunVal,
            periode_id:          periode_id,
            sasaran_id:          sasaran_id              || null,
            strategi_id:         strategi_id             || null,
            arah_kebijakan_id:   arah_kebijakan_id       || null,
            program_id:          program_id              || null,
            kegiatan_id:         kegiatan_id             || null,
            tujuan_id:           tujuan_id               || null,
            misi_id:             misi_id                 || null,
            tolok_ukur_kinerja:  row.tolok_ukur_kinerja  || null,
            target_kinerja:      row.target_kinerja      || null,
            definisi_operasional:row.definisi_operasional|| null,
            metode_penghitungan: row.metode_penghitungan || null,
            kriteria_kuantitatif:row.kriteria_kuantitatif|| null,
            kriteria_kualitatif: row.kriteria_kualitatif || null,
            target_tahun_1:      String(row.target_tahun_1   ?? ''),
            target_tahun_2:      String(row.target_tahun_2   ?? ''),
            target_tahun_3:      String(row.target_tahun_3   ?? ''),
            target_tahun_4:      String(row.target_tahun_4   ?? ''),
            target_tahun_5:      String(row.target_tahun_5   ?? ''),
            capaian_tahun_1:     String(row.capaian_tahun_1  ?? ''),
            capaian_tahun_2:     String(row.capaian_tahun_2  ?? ''),
            capaian_tahun_3:     String(row.capaian_tahun_3  ?? ''),
            capaian_tahun_4:     String(row.capaian_tahun_4  ?? ''),
            capaian_tahun_5:     String(row.capaian_tahun_5  ?? ''),
            sumber_data:         row.sumber_data         || null,
            satuan:              row.satuan               || null,
          },
          transaction: t,
        });
      }
    });

    res.json({
      message:    'Upload berhasil. Siap diproses.',
      batch_id:   batchId,
      entity_type,
      tahun:      tahunVal,
      periode_id,
      total_rows: rows.length,
    });
  } catch (err) {
    console.error('[rpjmdImport] uploadBatch error:', err);
    res.status(500).json({ message: err.message });
  }
}

// ── Controller: POST /api/rpjmd-import/process ───────────────────────────────
// Calls stored procedure sp_process_rpjmd_batch

async function processBatch(req, res) {
  try {
    const { batch_id } = req.body;
    if (!batch_id) return res.status(400).json({ message: 'batch_id wajib diisi' });

    // Verify batch exists
    const [[{ cnt }]] = await sequelize.query(
      'SELECT COUNT(*) as cnt FROM rpjmd_import_raw WHERE batch_id = :batch_id',
      { replacements: { batch_id } }
    );
    if (Number(cnt) === 0) return res.status(404).json({ message: 'batch_id tidak ditemukan' });

    // Call stored procedure
    await sequelize.query('CALL sp_process_rpjmd_batch(:batch_id)', {
      replacements: { batch_id },
    });

    // Fetch result summary
    const [summary] = await sequelize.query(
      'SELECT status, COUNT(*) as count FROM rpjmd_import_raw WHERE batch_id = :batch_id GROUP BY status',
      { replacements: { batch_id } }
    );

    const [logs] = await sequelize.query(
      `SELECT entity_type, target_table, status, message, created_at
       FROM rpjmd_import_processor_log
       WHERE batch_id = :batch_id
       ORDER BY id DESC LIMIT 50`,
      { replacements: { batch_id } }
    );

    res.json({ message: 'Proses selesai', batch_id, summary, logs });
  } catch (err) {
    console.error('[rpjmdImport] processBatch error:', err);
    res.status(500).json({ message: err.message });
  }
}

// ── Controller: GET /api/rpjmd-import/status/:batch_id ───────────────────────

async function getBatchStatus(req, res) {
  try {
    const { batch_id } = req.params;
    const [summary] = await sequelize.query(
      'SELECT status, COUNT(*) as count FROM rpjmd_import_raw WHERE batch_id = :batch_id GROUP BY status',
      { replacements: { batch_id } }
    );
    const [logs] = await sequelize.query(
      `SELECT raw_id, entity_type, target_table, status, message, created_at
       FROM rpjmd_import_processor_log
       WHERE batch_id = :batch_id
       ORDER BY id DESC LIMIT 100`,
      { replacements: { batch_id } }
    );
    res.json({ batch_id, summary, logs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── Constants: final table mapping (validated, never interpolated from user input) ──

const FINAL_TABLE_MAP = {
  tujuan:         'indikatortujuans',
  sasaran:        'indikatorsasarans',
  strategi:       'indikatorstrategis',
  arah_kebijakan: 'indikatorarahkebijakans',
  program:        'indikatorprograms',
  kegiatan:       'indikatorkegiatans',
  sub_kegiatan:   'indikatorsubkegiatans',
};

// ── Controller: GET /api/rpjmd-import/final-list ─────────────────────────────
// Always reads from the correct final DB table — never from raw/preview/cache.

async function listFinal(req, res) {
  const { entity_type, tahun, jenis_dokumen, page = 1, limit = 50 } = req.query;

  const tableName = FINAL_TABLE_MAP[entity_type];
  if (!tableName) {
    return res.status(400).json({ message: 'entity_type tidak valid' });
  }

  const safeLimit = Math.min(Number(limit) || 50, 200);
  const offset = (Math.max(Number(page), 1) - 1) * safeLimit;

  const where = [];
  const replacements = { limit: safeLimit, offset };

  if (tahun) { where.push('tahun = :tahun'); replacements.tahun = String(tahun); }
  if (jenis_dokumen) {
    where.push('UPPER(jenis_dokumen) = :jenis_dokumen');
    replacements.jenis_dokumen = jenis_dokumen.toUpperCase();
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    // Attempt with indikator_kinerja column (post-migration)
    const [rows] = await sequelize.query(
      `SELECT id, kode_indikator, nama_indikator,
              COALESCE(indikator_kinerja, jenis) AS indikator_kinerja,
              tipe_indikator, tahun, jenis_dokumen, created_at
       FROM \`${tableName}\` ${whereClause}
       ORDER BY created_at DESC
       LIMIT :limit OFFSET :offset`,
      { replacements, type: sequelize.QueryTypes.SELECT }
    );

    const [[{ total }]] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM \`${tableName}\` ${whereClause}`,
      { replacements }
    );

    return res.json({ data: rows, meta: { total: Number(total), page: Number(page), limit: safeLimit } });
  } catch (err) {
    // Fallback: table exists but indikator_kinerja column not yet added (pre-migration)
    if (err.message && err.message.includes('indikator_kinerja')) {
      try {
        const [rows] = await sequelize.query(
          `SELECT id, kode_indikator, nama_indikator,
                  jenis AS indikator_kinerja,
                  tipe_indikator, tahun, jenis_dokumen, created_at
           FROM \`${tableName}\` ${whereClause}
           ORDER BY created_at DESC
           LIMIT :limit OFFSET :offset`,
          { replacements, type: sequelize.QueryTypes.SELECT }
        );
        const [[{ total }]] = await sequelize.query(
          `SELECT COUNT(*) AS total FROM \`${tableName}\` ${whereClause}`,
          { replacements }
        );
        return res.json({ data: rows, meta: { total: Number(total), page: Number(page), limit: safeLimit } });
      } catch (fallbackErr) {
        return res.status(500).json({ message: fallbackErr.message });
      }
    }
    console.error('[rpjmdImport] listFinal error:', err);
    return res.status(500).json({ message: err.message });
  }
}

module.exports = { downloadTemplate, previewExcel, uploadBatch, processBatch, getBatchStatus, listFinal };
