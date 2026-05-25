const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const safeText = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const normalizeDedupeText = (value) => safeText(value).toLowerCase().replace(/\s+/g, ' ').trim();

const normalizeSourceCode = (value) =>
  safeText(value)
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

const mapSourceLabel = (code, fallback = '-') => {
  const normalized = normalizeSourceCode(code);
  if (normalized === 'TINDAK_LANJUT_BPKP') return 'Tindak Lanjut BPK-P';
  if (normalized === 'TINDAK_LANJUT_BPK') return 'Tindak Lanjut BPK';
  if (normalized === 'TINDAK_LANJUT_INSPEKTORAT') return 'Tindak Lanjut Inspektorat';
  return fallback;
};

const isBpkpSourceCode = (value) => normalizeSourceCode(value) === 'TINDAK_LANJUT_BPKP';

const isBpkpSourceRow = (row = {}) => {
  const metadata = safeObject(row.metadata_json);
  return (
    isBpkpSourceCode(metadata.proposal_source_code) ||
    safeText(metadata.proposal_source_type).toLowerCase() === 'tindak_lanjut_bpkp' ||
    safeText(row.jenis_dokumen).toLowerCase() === 'tindak_lanjut_bpkp' ||
    safeText(row.stage).toLowerCase() === 'temuan_bpkp'
  );
};

const toPlainObject = (value) => {
  if (!value) return {};

  if (typeof value.get === 'function') {
    try {
      return value.get({ plain: true }) || {};
    } catch (error) {
      return safeObject(value);
    }
  }

  if (value.dataValues && typeof value.dataValues === 'object') {
    return value.dataValues;
  }

  return safeObject(value);
};

const parseJsonObject = (value) => {
  if (!value) return {};

  if (typeof value === 'string') {
    try {
      return safeObject(JSON.parse(value));
    } catch (error) {
      return {};
    }
  }

  return safeObject(value);
};

const isBpkpScopeValue = (value) => {
  const normalized = normalizeSourceCode(value);
  const lower = safeText(value).toLowerCase();

  return (
    normalized === 'TINDAK_LANJUT_BPKP' || lower === 'tindak_lanjut_bpkp' || lower === 'temuan_bpkp'
  );
};

const isExplicitNonBpkpDocument = (value) => {
  const lower = safeText(value).toLowerCase();

  return [
    'renstra',
    'rpjmd',
    'lakip',
    'laporan_keuangan',
    'spip',
    'manual',
    'lainnya',
    'tindak_lanjut_bpk',
    'tindak_lanjut_inspektorat',
  ].includes(lower);
};

const isBpkpReportScope = (report = {}) => {
  const context = toPlainObject(report.context);
  const reportScope = toPlainObject(report.report_scope);
  const contextMetadata = parseJsonObject(context.metadata_json);
  const scopeMetadata = parseJsonObject(reportScope.metadata_json);

  const contextJenis = context.jenis_dokumen || context.jenis_konteks || context.document_type;

  if (isBpkpScopeValue(contextJenis)) return true;
  if (isExplicitNonBpkpDocument(contextJenis)) return false;

  const reportScopeJenis =
    reportScope.jenis_dokumen ||
    reportScope.jenis_konteks ||
    reportScope.document_type ||
    reportScope.source_type;

  if (isBpkpScopeValue(reportScopeJenis)) return true;
  if (isExplicitNonBpkpDocument(reportScopeJenis)) return false;

  const candidates = [
    context.stage,
    context.source_code,
    context.source_type,
    context.proposal_source_code,
    context.proposal_source_type,
    contextMetadata.proposal_source_code,
    contextMetadata.proposal_source_type,
    contextMetadata.source_code,
    contextMetadata.source_type,
    reportScope.stage,
    reportScope.source_code,
    reportScope.source_type,
    reportScope.proposal_source_code,
    reportScope.proposal_source_type,
    scopeMetadata.proposal_source_code,
    scopeMetadata.proposal_source_type,
    scopeMetadata.source_code,
    scopeMetadata.source_type,
  ];

  if (candidates.some(isBpkpScopeValue)) return true;

  const contextId = safeText(context.id || report.context_id);
  const risks = safeArray(report.lampiran?.daftar_risiko);

  if (contextId) {
    const hasBpkpRiskInSameContext = risks.some((risk) => {
      const riskContextId = safeText(risk.context_id || risk.mr_planning_context_id);
      return riskContextId === contextId && isBpkpScopeValue(risk.stage || risk.jenis_dokumen);
    });

    if (hasBpkpRiskInSameContext) return true;
  }

  return false;
};

const toBool = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  return String(value).trim().length > 0;
};

const collectBpkpEvidenceBasis = (report = {}) => {
  if (!isBpkpReportScope(report)) return [];
  const contextItems = safeArray(report.context_items);
  const risks = safeArray(report.lampiran?.daftar_risiko);
  const rows = [];

  contextItems.forEach((item) => {
    if (!isBpkpSourceRow(item)) return;
    const metadata = safeObject(item.metadata_json);
    const linkedRisk =
      risks.find((risk) => {
        return (
          safeText(risk.stage).toLowerCase() === 'temuan_bpkp' &&
          String(risk.context_id || '') ===
            String(item.context_id || item.mr_planning_context_id || '')
        );
      }) || {};

    rows.push({
      proposal_source_code: metadata.proposal_source_code || null,
      proposal_source_ref_id: metadata.proposal_source_ref_id || null,
      jenis_dokumen: item.jenis_dokumen || null,
      stage: item.stage || null,
      nomor_temuan: metadata.nomor_temuan || null,
      judul_temuan: metadata.judul_temuan || null,
      ringkasan_temuan: metadata.ringkasan_temuan || null,
      rekomendasi: metadata.rekomendasi || linkedRisk.rekomendasi || null,
      status_tindak_lanjut: metadata.status_tindak_lanjut || null,
      rencana_tindak_lanjut_awal:
        metadata.rencana_tindak_lanjut_awal || linkedRisk.metode_pencapaian_tujuan_spip || null,
      pic: metadata.pic || item.penanggung_jawab || null,
      target_waktu: metadata.target_waktu || linkedRisk.target_waktu || null,
      kode_konteks: item.kode_konteks || null,
      kode_risiko: linkedRisk.kode_risiko || null,
      context_id: item.context_id || item.mr_planning_context_id || null,
      context_item_id: item.id || null,
      risk_id: linkedRisk.id || null,
    });
  });

  return rows;
};

const buildBpkpEvidenceReadinessGate = (report = {}) => {
  if (!isBpkpReportScope(report)) return null;
  const basisRows = collectBpkpEvidenceBasis(report);
  if (!basisRows.length) {
    return {
      status: 'blocking',
      readiness_status: 'blocked',
      source_code: 'TINDAK_LANJUT_BPKP',
      source_label: 'Tindak Lanjut BPK-P',
      total_bpkp_items: 0,
      critical_missing_fields: ['source_bpkp_not_found'],
      warning_fields: [],
      basis_fields: {},
      notes: ['Source BPKP tidak ditemukan pada scope laporan ini.'],
    };
  }

  const first = basisRows[0];
  const basisFields = {
    nomor_temuan: toBool(first.nomor_temuan),
    judul_temuan: toBool(first.judul_temuan),
    rekomendasi: toBool(first.rekomendasi),
    status_tindak_lanjut: toBool(first.status_tindak_lanjut),
    rencana_tindak_lanjut_awal: toBool(first.rencana_tindak_lanjut_awal),
    pic: toBool(first.pic),
    target_waktu: toBool(first.target_waktu),
    lineage_minimal: toBool(first.context_id) && toBool(first.context_item_id),
  };

  const criticalMissing = Object.entries(basisFields)
    .filter(([field, ok]) => !ok && field !== 'target_waktu')
    .map(([field]) => field);
  const warningFields = basisFields.target_waktu ? [] : ['target_waktu'];

  const statusTindak = safeText(first.status_tindak_lanjut).toLowerCase();
  const isDalamProses = statusTindak.includes('dalam proses');

  let status = 'hijau';
  let readinessStatus = 'ready';
  const notes = [];

  if (criticalMissing.length) {
    status = 'blocking';
    readinessStatus = 'blocked';
    notes.push('Field kritikal BPKP belum lengkap.');
  } else if (warningFields.length || isDalamProses) {
    status = 'kuning';
    readinessStatus = 'review';
    if (warningFields.length) notes.push('Target waktu belum tersedia.');
    if (isDalamProses) notes.push('Status tindak lanjut masih dalam proses.');
  }

  return {
    status,
    readiness_status: readinessStatus,
    source_code: 'TINDAK_LANJUT_BPKP',
    source_label: 'Tindak Lanjut BPK-P',
    total_bpkp_items: basisRows.length,
    critical_missing_fields: criticalMissing,
    warning_fields: warningFields,
    basis_fields: basisFields,
    notes,
  };
};

const getMonitoringRiskId = (row = {}) =>
  safeText(
    row.mr_planning_risk_id ||
      row.planning_risk_id ||
      row.risk_id ||
      row.mrPlanningRiskId ||
      safeObject(row.mr_planning_risk).id ||
      safeObject(row.risk).id ||
      safeObject(row.monitoring).mr_planning_risk_id ||
      row.risiko_id ||
      row.mr_risk_id ||
      row.id_risiko,
  );

const getMonitoringContextId = (row = {}) =>
  safeText(
    row.context_id ||
      row.mr_planning_context_id ||
      safeObject(row.context).id ||
      safeObject(row.monitoring).context_id,
  );

const getMonitoringId = (row = {}) =>
  safeText(row.id || row.monitoring_id || row.mr_planning_monitoring_id);

const normalizeEvidenceStatus = (row = {}) => {
  if (Number(row.active_evidence_count || 0) > 0 || Number(row.evidence_count || 0) > 0) {
    return 'partial';
  }

  const raw = normalizeDedupeText(
    row.evidence_status ||
      row.status_evidence ||
      row.status_bukti ||
      row.evidenceStatus ||
      row.status_dokumen_bukti,
  );

  if (!raw) return 'missing';

  if (
    raw.includes('verified') ||
    raw.includes('terverifikasi') ||
    raw.includes('valid') ||
    raw.includes('sah')
  ) {
    return 'verified';
  }

  if (
    raw.includes('adequate') ||
    raw.includes('memadai') ||
    raw.includes('lengkap') ||
    raw.includes('cukup')
  ) {
    return 'adequate';
  }

  if (
    raw.includes('partial') ||
    raw.includes('parsial') ||
    raw.includes('sebagian') ||
    raw.includes('draft')
  ) {
    return 'partial';
  }

  return 'missing';
};

const hasEvidenceLink = (row = {}) =>
  [
    Number(row.evidence_count || 0) > 0 ? 1 : null,
    Number(row.active_evidence_count || 0) > 0 ? 1 : null,
    row.latest_evidence_uploaded_at,
    row.evidence_id,
    row.evidence_url,
    row.evidence_file_id,
    row.evidence_path,
    row.bukti_dukung,
    row.file_bukti,
    row.path_bukti,
    row.url_bukti,
    row.link_bukti,
    row.link_evidence,
    row.dokumen_bukti,
    row.nama_file_bukti,
  ].some(toBool);

const hasVerifiedActorTime = (row = {}) => {
  const status = normalizeEvidenceStatus(row);
  if (status !== 'verified') return false;

  const actorExists = [
    row.verified_by,
    row.diverifikasi_oleh,
    row.evidence_verified_by,
    row.validasi_oleh,
  ].some(toBool);

  const timeExists = [
    row.verified_at,
    row.diverifikasi_pada,
    row.evidence_verified_at,
    row.validasi_pada,
  ].some(toBool);

  return actorExists && timeExists;
};

const hasUnrealizedControlSignal = (row = {}) => {
  const text = normalizeDedupeText(
    [
      row.status_realisasi,
      row.status_monitoring,
      row.status_pengendalian,
      row.catatan,
      row.keterangan,
      row.tindak_lanjut_status,
      row.progress_note,
    ]
      .filter(Boolean)
      .join(' '),
  );

  return (
    text.includes('belum terealisasi') ||
    text.includes('belum dilaksanakan') ||
    text.includes('tertunda') ||
    text.includes('terhambat') ||
    text.includes('belum selesai')
  );
};

const hasEffectivenessReviewSignal = (row = {}) =>
  [
    row.efektivitas_pengendalian,
    row.control_effectiveness,
    row.hasil_evaluasi,
    row.hasil_review,
    row.outcome,
    row.outcome_pengendalian,
  ].some(toBool);

const collectBpkpMonitoringEvidenceBasis = (report = {}) => {
  if (!isBpkpReportScope(report)) {
    return {
      monitoring_rows: [],
      monitoring_rows_count: 0,
      raw_monitoring_rows_count: 0,
      risk_linked_monitoring_rows_count: 0,
      context_linked_monitoring_rows_count: 0,
      scope_fallback_monitoring_rows_count: 0,
      bpkp_risk_ids_count: 0,
      monitoring_match_mode: 'not_in_scope',
      has_monitoring_rows: false,
      has_evidence_linked: false,
      has_adequate_evidence: false,
      has_verified_evidence: false,
      has_verified_actor_time: false,
      has_unrealized_control_signal: false,
      has_effectiveness_review: false,
      evidence_status_counts: {
        missing: 0,
        partial: 0,
        adequate: 0,
        verified: 0,
      },
    };
  }

  const bpkpBasisRows = collectBpkpEvidenceBasis(report);
  const bpkpRiskIds = new Set(bpkpBasisRows.map((row) => safeText(row.risk_id)).filter(Boolean));
  const bpkpContextIds = new Set(
    bpkpBasisRows.map((row) => safeText(row.context_id)).filter(Boolean),
  );

  const monitoringRows = safeArray(report.lampiran?.realisasi_pengendalian);
  const riskLinkedRows = monitoringRows.filter((row) => {
    if (!bpkpRiskIds.size) return false;
    return bpkpRiskIds.has(getMonitoringRiskId(row));
  });

  const contextLinkedRows = monitoringRows.filter((row) => {
    if (!bpkpContextIds.size) return false;
    const rowContextId = getMonitoringContextId(row);
    return !!rowContextId && bpkpContextIds.has(rowContextId);
  });

  let matchedRows = [];
  let monitoringMatchMode = 'none';

  if (riskLinkedRows.length > 0) {
    matchedRows = riskLinkedRows;
    monitoringMatchMode = 'bpkp_risk_linked';
  } else if (contextLinkedRows.length > 0) {
    matchedRows = contextLinkedRows;
    monitoringMatchMode = 'bpkp_context_linked';
  } else if (monitoringRows.length > 0 && isBpkpReportScope(report)) {
    matchedRows = monitoringRows;
    monitoringMatchMode = 'bpkp_report_scope_fallback';
  }

  const evidenceStatusCounts = matchedRows.reduce(
    (acc, row) => {
      const status = normalizeEvidenceStatus(row);
      acc[status] = Number(acc[status] || 0) + 1;
      return acc;
    },
    {
      missing: 0,
      partial: 0,
      adequate: 0,
      verified: 0,
    },
  );

  return {
    monitoring_rows: matchedRows,
    monitoring_ids: matchedRows.map((row) => getMonitoringId(row)).filter(Boolean),
    monitoring_rows_count: matchedRows.length,
    raw_monitoring_rows_count: monitoringRows.length,
    risk_linked_monitoring_rows_count: riskLinkedRows.length,
    context_linked_monitoring_rows_count: contextLinkedRows.length,
    scope_fallback_monitoring_rows_count:
      monitoringMatchMode === 'bpkp_report_scope_fallback' ? matchedRows.length : 0,
    bpkp_risk_ids_count: bpkpRiskIds.size,
    monitoring_match_mode: monitoringMatchMode,
    has_monitoring_rows: matchedRows.length > 0,
    has_evidence_linked: matchedRows.some(hasEvidenceLink),
    has_adequate_evidence: matchedRows.some((row) =>
      ['adequate', 'verified'].includes(normalizeEvidenceStatus(row)),
    ),
    has_verified_evidence: matchedRows.some((row) => normalizeEvidenceStatus(row) === 'verified'),
    has_verified_actor_time: matchedRows.some(hasVerifiedActorTime),
    has_unrealized_control_signal: matchedRows.some(hasUnrealizedControlSignal),
    has_effectiveness_review: matchedRows.some(hasEffectivenessReviewSignal),
    evidence_status_counts: evidenceStatusCounts,
  };
};

const buildSourceSummaryRows = (report = {}) => {
  const contextItems = safeArray(report.context_items);
  const grouped = new Map();

  contextItems.forEach((row) => {
    const metadata = safeObject(row.metadata_json);
    const sourceCode = normalizeSourceCode(
      metadata.proposal_source_code ||
        metadata.proposal_source_type ||
        row.jenis_dokumen ||
        row.stage,
    );
    if (!sourceCode) return;
    const key = sourceCode;
    const bucket = grouped.get(key) || [];
    bucket.push({ row, metadata, sourceCode });
    grouped.set(key, bucket);
  });

  return Array.from(grouped.entries()).map(([sourceCode, items]) => {
    const first = items[0] || {};
    return {
      source_code: sourceCode,
      source_label: mapSourceLabel(
        sourceCode,
        safeText(first.row?.jenis_konteks || first.row?.jenis_dokumen, '-'),
      ),
      jenis_dokumen: safeText(
        first.row?.jenis_dokumen || first.metadata?.proposal_source_type,
        '-',
      ),
      stage: safeText(first.row?.stage, '-'),
      total_rows: items.length,
    };
  });
};

const buildDedupeRows = (rows = [], keyBuilder = () => '', options = {}) => {
  const source = safeArray(rows);
  const grouped = new Map();

  source.forEach((item, index) => {
    const key = safeText(keyBuilder(item, index), `__row_${index}`);
    const bucket = grouped.get(key) || [];
    bucket.push(item);
    grouped.set(key, bucket);
  });

  const raw_rows = source;
  const display_rows = [];
  const detail_rows = [];
  const duplicate_audit = [];

  grouped.forEach((items, key) => {
    const primary = items[0] || {};
    const stages = [...new Set(items.map((x) => safeText(x.stage)).filter(Boolean))];
    const refs = [...new Set(items.map((x) => safeText(x.ref_id)).filter(Boolean))];
    const riskCodes = [...new Set(items.map((x) => safeText(x.kode_risiko)).filter(Boolean))];
    const rowIds = items.map((x) => x.id).filter((x) => x !== undefined && x !== null);

    const merged = {
      ...primary,
      used_count: items.length,
      used_stages: stages,
      used_ref_ids: refs,
      used_risk_codes: riskCodes,
      source_row_ids: rowIds,
      dedupe_key: key,
      dedupe_note: items.length > 1 ? 'deduped_for_display' : 'unique',
      raw_items: items,
    };

    display_rows.push(merged);
    detail_rows.push(merged);

    if (items.length > 1) {
      duplicate_audit.push({
        dedupe_key: key,
        duplicate_count: items.length - 1,
        source_row_ids: rowIds,
        source: safeText(options.source, 'unknown'),
      });
    }
  });

  return { raw_rows, display_rows, detail_rows, duplicate_audit };
};

const buildFieldKey = (row = {}, fields = []) =>
  fields.map((field) => normalizeDedupeText(row[field])).join('|');

const dedupeContextItems = (contextItems = []) => {
  const rows = safeArray(contextItems);
  return {
    ringkasan_41a: buildDedupeRows(
      rows,
      (row) =>
        [
          row.source_label || row.jenis_konteks,
          row.referensi_sumber || row.ref_id,
          row.indikator_atau_objek_risiko || row.nama_indikator,
        ]
          .map(normalizeDedupeText)
          .join('|'),
      { source: 'context_items_4_1A' },
    ),
    detail_41b: buildDedupeRows(
      rows,
      (row) =>
        [row.context_id, row.stage, row.ref_id, row.indikator_id, row.kode_indikator]
          .map(normalizeDedupeText)
          .join('|'),
      { source: 'context_items_4_1B' },
    ),
  };
};

const dedupeDaftarRisiko = (rows = []) =>
  buildDedupeRows(
    rows,
    (row) => {
      const kode = normalizeDedupeText(row.kode_risiko);
      if (kode) return kode;
      return [row.context_id, row.context_item_id, row.nama_risiko, row.stage, row.ref_id]
        .map(normalizeDedupeText)
        .join('|');
    },
    { source: 'daftar_risiko' },
  );


const dedupeRisikoPrioritas = (rows = []) =>
  buildDedupeRows(
    rows,
    (row) => {
      const riskId = normalizeDedupeText(row.risk_id || row.mr_planning_risk_id || row.id);
      if (riskId) return `risk:${riskId}`;

      const kode = normalizeDedupeText(row.kode_risiko);
      if (kode) {
        const contextId = normalizeDedupeText(row.context_id || row.mr_planning_context_id);
        const stage = normalizeDedupeText(row.stage);
        return `kode:${kode}|ctx:${contextId}|stage:${stage}`;
      }

      return buildFieldKey(row, ['nama_risiko', 'uraian_risiko', 'kategori_risiko']);
    },
    { source: 'risiko_prioritas' },
  );

const dedupeRencanaPengendalian = (rows = []) =>
  buildDedupeRows(rows, (row) => buildFieldKey(row, ['kode_risiko', 'kegiatan_pengendalian']), { source: 'rencana_pengendalian' });

const dedupeRealisasiPengendalian = (rows = []) =>
  buildDedupeRows(
    rows,
    (row) => {
      const monitoringId = normalizeDedupeText(
        row.monitoring_id || row.mr_planning_monitoring_id || row.id,
      );
      if (monitoringId) return `mon:${monitoringId}`;

      const riskId = normalizeDedupeText(row.risk_id || row.mr_planning_risk_id);
      const mitigationId = normalizeDedupeText(row.mitigation_id || row.mr_planning_mitigation_id);
      const period = normalizeDedupeText(row.periode_label || row.periode_id);
      const monitorDate = normalizeDedupeText(row.monitoring_date || row.tanggal_monitoring);

      if (riskId || mitigationId || period || monitorDate) {
        return `risk:${riskId}|mit:${mitigationId}|per:${period}|dt:${monitorDate}`;
      }

      return buildFieldKey(row, [
        'kode_risiko',
        'kegiatan_pengendalian',
        'periode_label',
        'monitoring_date',
        'hasil_monitoring',
      ]);
    },
    { source: 'realisasi_pengendalian' },
  );

const dedupeKejadianRisiko = (rows = []) =>
  buildDedupeRows(
    rows,
    (row) =>
      [
        row.kode_risiko,
        row.tanggal_kejadian || row.monitoring_date,
        row.tempat_kejadian,
        row.uraian_kejadian,
      ]
        .map(normalizeDedupeText)
        .join('|'),
    { source: 'kejadian_risiko' },
  );

const dedupeGenericRows = (rows = [], keyFields = []) =>
  buildDedupeRows(rows, (row) => buildFieldKey(row, keyFields), { source: 'generic' });

const resolveFinalReportRecords = (report = {}) => {
  const context = safeObject(report.context);
  const status = normalizeDedupeText(context.status_revisi || context.status || 'draft');
  const approved = ['approved', 'disetujui'].includes(status);
  const activeVersion = safeText(context.versi || context.active_version, '-');
  const latestApprovedVersion = safeText(context.versi_final || context.latest_approved_version, '-');

  if (approved) {
    return {
      official_data_source: 'active_approved',
      active_version: activeVersion,
      latest_approved_version: latestApprovedVersion,
      final_status: 'approved',
      use_snapshot: false,
      note: 'Data diambil dari versi aktif yang sudah disetujui.',
    };
  }

  return {
    official_data_source: 'latest_approved_snapshot_if_exists',
    active_version: activeVersion,
    latest_approved_version: latestApprovedVersion,
    final_status: status || 'draft',
    use_snapshot: true,
    note: latestApprovedVersion !== '-' ? 'Data menggunakan versi terakhir yang disetujui.' : 'Belum ada versi disetujui; data dari versi aktif (draft).',
  };
};

const buildHistoryVisibilityContract = (report = {}) => {
  const summary = safeObject(report.summary);
  return {
    official_history_summary: {
      jumlah_draft: Number(summary.jumlah_draft || 0),
      jumlah_verifikasi: Number(summary.jumlah_verifikasi || 0),
      jumlah_disetujui: Number(summary.jumlah_disetujui || summary.jumlah_approved || 0),
      jumlah_ditolak: Number(summary.jumlah_ditolak || 0),
      jumlah_rebuild: Number(summary.jumlah_rebuild || 0),
      jumlah_repair_placeholder: Number(summary.jumlah_repair_placeholder || 0),
      versi_final: safeText(summary.versi_final, '-'),
      status_akhir: safeText(summary.status_akhir || summary.status_laporan, '-'),
      official_data_source: safeText(summary.official_data_source, 'active_or_snapshot'),
    },
    suppressed_fields: [
      'before_json',
      'after_json',
      'detail_history_per_versi',
      'log_rebuild_teknis',
      'repair_placeholder_per_field',
      'log_rollback_commit',
      'audit_runtime',
    ],
  };
};

const buildEvidenceAdequacyGate = (report = {}) => {
  const monitoring = safeArray(report.lampiran?.realisasi_pengendalian);
  const missing = monitoring.filter((row) => {
    const status = normalizeDedupeText(row.evidence_status || row.status_evidence || 'missing');
    return !['not_required', 'adequate', 'verified'].includes(status);
  });

  const hasIssue = missing.length > 0;
  const bpkpReadiness = isBpkpReportScope(report) ? buildBpkpEvidenceReadinessGate(report) : null;
  const baseStatus = hasIssue ? 'kuning' : 'hijau';
  let finalStatus = baseStatus;
  if (bpkpReadiness?.status === 'blocking') {
    finalStatus = 'blocking';
  } else if (bpkpReadiness?.status === 'kuning' && baseStatus === 'hijau') {
    finalStatus = 'kuning';
  }

  const result = {
    status: finalStatus,
    readiness_impact:
      finalStatus === 'blocking' ? 'blocked' : finalStatus === 'kuning' ? 'review' : 'ready',
    evidence_status_supported: ['not_required', 'missing', 'partial', 'adequate', 'verified'],
    missing_count: missing.length,
  };

  if (bpkpReadiness) {
    result.bpkp_readiness_gate = bpkpReadiness;
  }

  return result;
};

const buildReportReadinessGate = (report = {}) => {
  const finalInfo = resolveFinalReportRecords(report);
  if (finalInfo.final_status === 'approved')
    return { status: 'ready', reason: 'approved_active_record' };
  return { status: 'draft', reason: 'approved_record_not_active' };
};

const buildReportLineage = (report = {}) => ({
  context_id: report.context?.id || null,
  report_scope: report.report_scope || null,
  generated_at: new Date().toISOString(),
  source_layers: ['context', 'context_items', 'lampiran', 'generated_sections', 'summary'],
});

const buildExceptionRegister = (report = {}) => {
  const list = [];
  const evidenceGate = buildEvidenceAdequacyGate(report);
  const readiness = buildReportReadinessGate(report);

  if (evidenceGate.missing_count > 0) list.push(EXCEPTIONS.EXCEPTION_EVIDENCE_MISSING);
  if (readiness.status !== 'ready') list.push(EXCEPTIONS.EXCEPTION_REPORT_CORRECTION_REQUIRED);
  if (safeArray(report.data_quality_gate?.issues).length > 0)
    list.push(EXCEPTIONS.EXCEPTION_DATA_INCOMPLETE);

  return [...new Set(list)];
};

const buildBpkpPedomanComplianceRows = (report = {}) => {
  if (!isBpkpReportScope(report)) return [];

  const evidenceGate = safeObject(
    report.report_governance_gate?.evidence_gate || buildEvidenceAdequacyGate(report),
  );
  const bpkpGate = safeObject(evidenceGate.bpkp_readiness_gate);
  const hasBpkpReadiness = !!bpkpGate.source_code || !!bpkpGate.total_bpkp_items;
  const monitoringBasis = collectBpkpMonitoringEvidenceBasis(report);

  const rows = [
    {
      pedoman_no: 1,
      title: 'Penetapan Konteks',
      status: 'available',
      source_section: 'context/context_items/source_summary',
      reason_code: 'BPKP_CONTEXT_AVAILABLE',
    },
    {
      pedoman_no: 2,
      title: 'Kriteria Kemungkinan dan Dampak',
      status: 'available',
      source_section: 'risk_matrix_reference',
      reason_code: 'BPKP_LIKELIHOOD_IMPACT_AVAILABLE',
    },
    {
      pedoman_no: 3,
      title: 'Matriks Analisis Risiko',
      status: 'available',
      source_section: 'risk_matrix_output',
      reason_code: 'BPKP_MATRIX_AVAILABLE',
    },
    {
      pedoman_no: 4,
      title: 'Identifikasi Risiko',
      status: 'available',
      source_section: 'risk_identification',
      reason_code: 'BPKP_RISK_IDENTIFICATION_AVAILABLE',
    },
    {
      pedoman_no: 5,
      title: 'Analisis Risiko',
      status: 'partial',
      source_section: 'risk_analysis',
      reason_code: 'BPKP_ANALYSIS_PARTIAL',
    },
    {
      pedoman_no: 6,
      title: 'Evaluasi/Prioritas Risiko',
      status: 'partial',
      source_section: 'risk_priority',
      reason_code: 'BPKP_PRIORITY_PARTIAL',
    },
    {
      pedoman_no: 7,
      title: 'Peta Risiko',
      status: 'partial',
      source_section: 'risk_map',
      reason_code: 'BPKP_RISK_MAP_PARTIAL',
    },
    {
      pedoman_no: 8,
      title: 'Root Cause / Penyebab Risiko',
      status: 'available',
      source_section: 'risk_causes',
      reason_code: 'BPKP_CAUSE_AVAILABLE',
    },
    {
      pedoman_no: 9,
      title: 'Rencana Pengendalian/RTP',
      status: 'partial',
      source_section: 'initial_action_plan',
      reason_code: 'BPKP_RTP_PARTIAL_INITIAL_PLAN_ONLY',
    },
    {
      pedoman_no: 10,
      title: 'Jadwal/PIC/Target Tindak Lanjut',
      status: 'partial',
      source_section: 'pic_target_schedule',
      reason_code: 'BPKP_TARGET_SCHEDULE_PARTIAL',
    },
    {
      pedoman_no: 11,
      title: 'Evidence/Bukti Dukung',
      status: 'blocking',
      source_section: 'evidence_linkage',
      reason_code: 'BPKP_EVIDENCE_NOT_LINKED',
    },
    {
      pedoman_no: 12,
      title: 'Monitoring',
      status: 'blocking',
      source_section: 'monitoring_progress',
      reason_code: 'BPKP_MONITORING_NOT_AVAILABLE',
    },
    {
      pedoman_no: 13,
      title: 'Reviu Usulan Risiko Baru',
      status: 'available',
      source_section: 'proposal_intake_duplicate_lineage_readiness',
      reason_code: 'BPKP_PROPOSAL_REVIEW_AVAILABLE',
    },
    {
      pedoman_no: 14,
      title: 'Pengendalian Belum Terealisasi',
      status: 'not_implemented',
      source_section: 'unrealized_control_monitoring',
      reason_code: 'BPKP_UNREALIZED_CONTROL_NOT_IMPLEMENTED',
    },
    {
      pedoman_no: 15,
      title: 'Efektivitas Pengendalian',
      status: 'not_implemented',
      source_section: 'control_effectiveness',
      reason_code: 'BPKP_EFFECTIVENESS_NOT_IMPLEMENTED',
    },
  ];

  return rows.map((row) => {
    let status = row.status;
    let reasonCode = row.reason_code;

    if (row.pedoman_no === 11) {
      if (monitoringBasis.has_adequate_evidence && monitoringBasis.has_verified_actor_time) {
        status = 'available';
        reasonCode = 'BPKP_EVIDENCE_AVAILABLE_WITH_VERIFICATION_BASIS';
      } else if (monitoringBasis.has_evidence_linked) {
        status = 'partial';
        reasonCode = 'BPKP_EVIDENCE_LINKED_VERIFICATION_PENDING';
      }
    }

    if (row.pedoman_no === 12 && monitoringBasis.has_monitoring_rows) {
      status = 'partial';
      reasonCode = 'BPKP_MONITORING_ROWS_AVAILABLE_EVIDENCE_PENDING';
    }

    if (row.pedoman_no === 14 && monitoringBasis.has_unrealized_control_signal) {
      status = 'partial';
      reasonCode = 'BPKP_UNREALIZED_CONTROL_SIGNAL_AVAILABLE';
    }

    if (
      row.pedoman_no === 15 &&
      monitoringBasis.has_effectiveness_review &&
      (monitoringBasis.has_adequate_evidence || monitoringBasis.has_verified_evidence)
    ) {
      status = 'partial';
      reasonCode = 'BPKP_EFFECTIVENESS_REVIEW_PARTIAL';
    }

    return {
      ...row,
      status,
      reason_code: reasonCode,
      source_code: 'TINDAK_LANJUT_BPKP',
      official_safe: true,
      evidence_basis: {
        has_bpkp_readiness_gate: hasBpkpReadiness,
        bpkp_gate_status: safeText(bpkpGate.status, '-'),
        has_monitoring_rows: monitoringBasis.has_monitoring_rows,
        monitoring_rows_count: monitoringBasis.monitoring_rows_count,
        raw_monitoring_rows_count: monitoringBasis.raw_monitoring_rows_count,
        bpkp_risk_ids_count: monitoringBasis.bpkp_risk_ids_count,
        monitoring_match_mode: monitoringBasis.monitoring_match_mode,
        has_evidence_linked: monitoringBasis.has_evidence_linked,
        has_adequate_evidence: monitoringBasis.has_adequate_evidence,
        has_verified_evidence: monitoringBasis.has_verified_evidence,
        has_verified_actor_time: monitoringBasis.has_verified_actor_time,
        has_unrealized_control_signal: monitoringBasis.has_unrealized_control_signal,
        has_effectiveness_review: monitoringBasis.has_effectiveness_review,
        evidence_status_counts: monitoringBasis.evidence_status_counts,
      },
    };
  });
};

const buildBpkpComplianceSummary = (rows = []) => {
  const all = safeArray(rows);
  const countBy = (status) => all.filter((row) => row.status === status).length;
  const blockingCount = countBy('blocking');
  const summaryStatus = blockingCount > 0 ? 'kuning' : 'hijau';

  return {
    source_code: 'TINDAK_LANJUT_BPKP',
    total_pedoman: all.length,
    available_count: countBy('available'),
    partial_count: countBy('partial'),
    blocking_count: blockingCount,
    not_implemented_count: countBy('not_implemented'),
    complete_count: 0,
    overall_status: summaryStatus,
    readiness_status: summaryStatus === 'kuning' ? 'review' : 'ready',
    no_fake_complete: true,
    blocking_pedoman: all.filter((row) => row.status === 'blocking').map((row) => row.pedoman_no),
    not_implemented_pedoman: all
      .filter((row) => row.status === 'not_implemented')
      .map((row) => row.pedoman_no),
    notes: [
      'BPKP compliance mapping menggunakan status jujur dan belum mengklaim complete.',
      'Pedoman evidence dan monitoring tetap blocking sampai evidence/monitoring formal tersedia.',
    ],
  };
};

const buildRegulationComplianceMatrix = (report = {}) => {
  const hasBpkpScope = isBpkpReportScope(report);
  const bpkpRows = hasBpkpScope ? buildBpkpPedomanComplianceRows(report) : [];

  const base = {
    bpkp_alignment: hasBpkpScope,
    audit_trail_present: !!report.report_quality_gate,
    approval_field_guard: {
      uses_mr_fields: true,
      forbidden_generic_approved_by: true,
    },
    no_fake_complete: true,
  };

  if (!hasBpkpScope) return base;

  const bpkpSummary = buildBpkpComplianceSummary(bpkpRows);

  return {
    ...base,
    bpkp_summary: bpkpSummary,
    pedoman_rows: bpkpRows.map((row) => ({
      pedoman_no: row.pedoman_no,
      title: row.title,
      status: row.status,
      reason_code: row.reason_code,
      source_section: row.source_section,
      source_code: row.source_code,
      official_safe: row.official_safe,
    })),
  };
};

const buildOperationalIntegrityGuard = (report = {}) => ({
  no_db_write: true,
  no_raw_delete: true,
  no_export_logic_split: true,
  report_scope_locked: !!report.report_scope,
});

const buildReportDedupeContract = (report = {}) => {
  const contextItems = safeArray(report.context_items);
  const lampiran = safeObject(report.lampiran);

  const contextDedupe = dedupeContextItems(contextItems);
  const risikoDedupe = dedupeDaftarRisiko(safeArray(lampiran.daftar_risiko));
  const analisisDedupe = buildDedupeRows(
    safeArray(lampiran.analisis_risiko),
    (row) => {
      const primary = [row.risk_id, row.analysis_type].map(normalizeDedupeText).join('|');
      if (primary.replace(/\|/g, '')) return primary;
      return [row.kode_risiko, row.inherent_score, row.residual_score, row.actual_score]
        .map(normalizeDedupeText)
        .join('|');
    },
    { source: 'analisis_risiko' },
  );

  return {
    context_items: contextDedupe,
    daftar_risiko: risikoDedupe,
    analisis_risiko: analisisDedupe,
  };
};

const buildOfficialReportPayload = (report = {}) => {
  const dedupe = buildReportDedupeContract(report);
  return {
    context: safeObject(report.context),
    context_items: dedupe.context_items.ringkasan_41a.display_rows,
    lampiran: {
      ...safeObject(report.lampiran),
      daftar_risiko: dedupe.daftar_risiko.display_rows,
    },
    summary: safeObject(report.summary),
  };
};

const buildAuditTrailPayload = (report = {}) => {
  const dedupe = buildReportDedupeContract(report);
  return {
    duplicate_audit: [
      ...safeArray(dedupe.context_items.ringkasan_41a.duplicate_audit),
      ...safeArray(dedupe.context_items.detail_41b.duplicate_audit),
      ...safeArray(dedupe.daftar_risiko.duplicate_audit),
      ...safeArray(dedupe.analisis_risiko.duplicate_audit),
    ],
    export_history_rows: safeArray(report.export_history_rows),
    lineage_rows: [buildReportLineage(report)],
  };
};

const buildReportGovernanceContract = (report = {}) => {
  const dedupe = buildReportDedupeContract(report);
  const historyContract = buildHistoryVisibilityContract(report);
  const readiness = buildReportReadinessGate(report);
  const evidence = buildEvidenceAdequacyGate(report);
  const lineage = buildReportLineage(report);
  const exceptions = buildExceptionRegister(report);
  const compliance = buildRegulationComplianceMatrix(report);
  const operational = buildOperationalIntegrityGuard(report);

  const sourceSummaryRows = buildSourceSummaryRows(report);
  const fullBpkpRows = buildBpkpPedomanComplianceRows(report);
  const complianceAuditRows = safeArray(compliance.pedoman_rows).map((row) => {
    const full = safeArray(fullBpkpRows).find((x) => x.pedoman_no === row.pedoman_no) || {};
    return {
      source_code: 'TINDAK_LANJUT_BPKP',
      pedoman_no: row.pedoman_no,
      title: row.title,
      status: row.status,
      reason_code: row.reason_code,
      source_section: row.source_section,
      evidence_basis: safeObject(full.evidence_basis),
      official_safe: true,
    };
  });
  const regulationComplianceGate = {
    ...compliance,
  };
  if (compliance.bpkp_summary) {
    regulationComplianceGate.bpkp_compliance_gate = {
      status: safeText(compliance.bpkp_summary?.overall_status, 'kuning'),
      readiness_status: safeText(compliance.bpkp_summary?.readiness_status, 'review'),
      total_pedoman: Number(compliance.bpkp_summary?.total_pedoman || 0),
      available_count: Number(compliance.bpkp_summary?.available_count || 0),
      partial_count: Number(compliance.bpkp_summary?.partial_count || 0),
      blocking_count: Number(compliance.bpkp_summary?.blocking_count || 0),
      not_implemented_count: Number(compliance.bpkp_summary?.not_implemented_count || 0),
      complete_count: 0,
      blocking_pedoman: safeArray(compliance.bpkp_summary?.blocking_pedoman),
      not_implemented_pedoman: safeArray(compliance.bpkp_summary?.not_implemented_pedoman),
      no_fake_complete: true,
    };
  }

  const status = readiness.status === 'ready' && evidence.status === 'hijau' ? 'hijau' : 'kuning';

  return {
    official_report_contract: {
      source_summary: {
        ...safeObject(report.summary),
        display_rows: sourceSummaryRows,
      },
      context_items: dedupe.context_items,
      lampiran: safeObject(report.lampiran),
      generated_sections: safeObject(report.lampiran?.generated_sections),
      history_summary: historyContract.official_history_summary,
      final_record_summary: resolveFinalReportRecords(report),
      evidence_summary: evidence,
      lineage_summary: lineage,
      exception_summary: { codes: exceptions },
      regulation_compliance_matrix: compliance,
      export_integrity_summary: { pdf_from_docx: true, backend_export_audit: true },
      operational_integrity_summary: operational,
    },
    audit_report_contract: {
      duplicate_audit: buildAuditTrailPayload(report).duplicate_audit,
      history_rows: [],
      rebuild_rows: [],
      repair_placeholder_rows: [],
      approval_timeline_rows: [],
      before_after_rows: [],
      export_history_rows: safeArray(report.export_history_rows),
      lineage_rows: [lineage],
      compliance_audit_rows: complianceAuditRows,
      correction_addendum_rows: [],
    },
    report_governance_gate: {
      overall_status: status,
      readiness_status: readiness.status,
      duplicate_gate: { duplicate_count: buildAuditTrailPayload(report).duplicate_audit.length },
      data_quality_gate: safeObject(report.data_quality_gate),
      evidence_gate: evidence,
      history_visibility_gate: historyContract,
      export_integrity_gate: { backend_only: true, exporter_variants_recorded: true },
      regulation_compliance_gate: regulationComplianceGate,
      operational_integrity_gate: operational,
      exception_register: exceptions,
    },
  };
};

module.exports = {
  buildReportGovernanceContract,
  buildReportDedupeContract,
  buildHistoryVisibilityContract,
  resolveFinalReportRecords,
  buildReportReadinessGate,
  buildEvidenceAdequacyGate,
  buildReportLineage,
  buildExceptionRegister,
  buildRegulationComplianceMatrix,
  buildOperationalIntegrityGuard,
  buildOfficialReportPayload,
  buildAuditTrailPayload,
  normalizeDedupeText,
  buildDedupeRows,
  dedupeContextItems,
  dedupeDaftarRisiko,
  dedupeGenericRows,
  dedupeRisikoPrioritas,
  dedupeRencanaPengendalian,
  dedupeRealisasiPengendalian,
  dedupeKejadianRisiko,
};
const { EXCEPTIONS } = require('../../services/mr/mrPolicyEngineService');

module.exports.EXCEPTIONS = EXCEPTIONS;
