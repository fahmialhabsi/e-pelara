'use strict';

const { Op } = require('sequelize');
const {
  sequelize,
  RenstraAuditLogGlobal,
  IndikatorRenstra,
  IndikatorTujuan,
  IndikatorSasaran,
  IndikatorStrategi,
  IndikatorArahKebijakan,
  IndikatorProgram,
  IndikatorKegiatan,
  IndikatorSubKegiatan,
} = require('../../models');
const { resolveTargetRefId } = require('./rpjmdSourceMapService');

const VALID_TARGET_MODULE = 'RENSTRA';
const VALID_SOURCE_STAGES = new Set([
  'tujuan',
  'sasaran',
  'strategi',
  'kebijakan',
  'program',
  'kegiatan',
  'sub_kegiatan',
]);

const SOURCE_STAGE_CONFIG = {
  tujuan: { model: IndikatorTujuan, refField: 'tujuan_id' },
  sasaran: { model: IndikatorSasaran, refField: 'sasaran_id' },
  strategi: { model: IndikatorStrategi, refField: 'strategi_id' },
  kebijakan: { model: IndikatorArahKebijakan, refField: 'arah_kebijakan_id' },
  program: { model: IndikatorProgram, refField: 'program_id' },
  kegiatan: { model: IndikatorKegiatan, refField: 'kegiatan_id' },
  sub_kegiatan: { model: IndikatorSubKegiatan, refField: 'sub_kegiatan_id' },
};

function safeNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : null;
}

function getSafeErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return fallbackMessage;
}

function normalizeComparableValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeComparablePayload(payload) {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return value;
    }
  }

  return null;
}

function normalizeAuthRoleValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object') {
    return normalizeAuthRoleValue(
      firstDefined(
        value.name,
        value.nama_role,
        value.role_name,
        value.roleName,
        value.role_code,
        value.roleCode,
        value.label,
      ),
    );
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const normalized = text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (normalized === 'SUPERADMIN') {
    return 'SUPER_ADMIN';
  }

  return normalized || null;
}

function extractActorRole(source = {}) {
  const actorUser = source && typeof source.actor_user === 'object' ? source.actor_user : null;
  const candidates = [
    source.actor_role,
    source.actor_role_name,
    source.actor_roleName,
    source.actor_role_code,
    source.actor_roleCode,
    source.role,
    source.role_name,
    source.roleName,
    source.role_code,
    source.roleCode,
    source?.Role?.nama_role,
    source?.Role?.namaRole,
    source?.Role?.name,
    source?.user?.role,
    source?.user?.role_name,
    source?.user?.roleName,
    source?.user?.role_code,
    source?.user?.roleCode,
    actorUser?.role,
    actorUser?.role_name,
    actorUser?.roleName,
    actorUser?.role_code,
    actorUser?.roleCode,
    actorUser?.role_label,
    actorUser?.roleLabel,
    actorUser?.Role?.nama_role,
    actorUser?.Role?.namaRole,
    actorUser?.Role?.name,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeAuthRoleValue(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function getSourceIndicatorQuery(stageConfig, sourceRefId) {
  const where = {
    [stageConfig.refField]: sourceRefId,
    jenis_dokumen: {
      [Op.like]: '%RPJMD%',
    },
  };

  return where;
}

function mapTipeIndikatorToRenstra(tipe) {
  if (tipe == null || tipe === '') return null;

  const value = String(tipe).trim();
  if (value === 'Process') return 'Proses';
  if (['Impact', 'Outcome', 'Output', 'Proses'].includes(value)) return value;
  if (value === 'Input') return 'Output';
  return 'Output';
}

function buildIndicatorPayload({ sourceRow, stage, renstraId, targetRefId }) {
  return {
    renstra_id: renstraId,
    ref_id: targetRefId,
    stage,
    source_indikator_id: sourceRow.id,
    kode_indikator: sourceRow.kode_indikator,
    nama_indikator: sourceRow.nama_indikator,
    satuan: sourceRow.satuan ?? null,
    definisi_operasional: sourceRow.definisi_operasional ?? null,
    metode_penghitungan: sourceRow.metode_penghitungan ?? null,
    baseline: sourceRow.baseline ?? sourceRow.target_awal ?? sourceRow.capaian_tahun_1 ?? null,
    target_tahun_1: sourceRow.target_tahun_1 ?? null,
    target_tahun_2: sourceRow.target_tahun_2 ?? null,
    target_tahun_3: sourceRow.target_tahun_3 ?? null,
    target_tahun_4: sourceRow.target_tahun_4 ?? null,
    target_tahun_5: sourceRow.target_tahun_5 ?? null,
    target_tahun_6: sourceRow.target_tahun_6 ?? null,
    lokasi: normalizeText(sourceRow.lokasi ?? sourceRow.sumber_data ?? sourceRow.keterangan),
    pagu_tahun_1: sourceRow.pagu_tahun_1 ?? null,
    pagu_tahun_2: sourceRow.pagu_tahun_2 ?? null,
    pagu_tahun_3: sourceRow.pagu_tahun_3 ?? null,
    pagu_tahun_4: sourceRow.pagu_tahun_4 ?? null,
    pagu_tahun_5: sourceRow.pagu_tahun_5 ?? null,
    pagu_tahun_6: sourceRow.pagu_tahun_6 ?? null,
    jenis_indikator: sourceRow.jenis_indikator ?? null,
    tipe_indikator: mapTipeIndikatorToRenstra(sourceRow.tipe_indikator),
    kriteria_kuantitatif: sourceRow.kriteria_kuantitatif ?? null,
    kriteria_kualitatif: sourceRow.kriteria_kualitatif ?? null,
    sumber_data: sourceRow.sumber_data ?? null,
    penanggung_jawab: sourceRow.penanggung_jawab ?? null,
    keterangan: sourceRow.keterangan ?? null,
    tahun: sourceRow.tahun,
    jenis_dokumen: 'renstra',
    pagu_cached: Number(sourceRow.pagu_cached || 0),
    pagu_cached_at: sourceRow.pagu_cached_at ?? null,
  };
}

function buildComparableSnapshot(payload) {
  return {
    renstra_id: normalizeComparableValue(payload.renstra_id),
    ref_id: normalizeComparableValue(payload.ref_id),
    stage: normalizeComparableValue(payload.stage),
    source_indikator_id: normalizeComparableValue(payload.source_indikator_id),
    kode_indikator: normalizeComparableValue(payload.kode_indikator),
    nama_indikator: normalizeComparableValue(payload.nama_indikator),
    satuan: normalizeComparableValue(payload.satuan),
    definisi_operasional: normalizeComparableValue(payload.definisi_operasional),
    metode_penghitungan: normalizeComparableValue(payload.metode_penghitungan),
    baseline: normalizeComparableValue(payload.baseline),
    target_tahun_1: normalizeComparableValue(payload.target_tahun_1),
    target_tahun_2: normalizeComparableValue(payload.target_tahun_2),
    target_tahun_3: normalizeComparableValue(payload.target_tahun_3),
    target_tahun_4: normalizeComparableValue(payload.target_tahun_4),
    target_tahun_5: normalizeComparableValue(payload.target_tahun_5),
    target_tahun_6: normalizeComparableValue(payload.target_tahun_6),
    lokasi: normalizeComparableValue(payload.lokasi),
    pagu_tahun_1: normalizeComparableValue(payload.pagu_tahun_1),
    pagu_tahun_2: normalizeComparableValue(payload.pagu_tahun_2),
    pagu_tahun_3: normalizeComparableValue(payload.pagu_tahun_3),
    pagu_tahun_4: normalizeComparableValue(payload.pagu_tahun_4),
    pagu_tahun_5: normalizeComparableValue(payload.pagu_tahun_5),
    pagu_tahun_6: normalizeComparableValue(payload.pagu_tahun_6),
    jenis_indikator: normalizeComparableValue(payload.jenis_indikator),
    tipe_indikator: normalizeComparableValue(payload.tipe_indikator),
    kriteria_kuantitatif: normalizeComparableValue(payload.kriteria_kuantitatif),
    kriteria_kualitatif: normalizeComparableValue(payload.kriteria_kualitatif),
    sumber_data: normalizeComparableValue(payload.sumber_data),
    penanggung_jawab: normalizeComparableValue(payload.penanggung_jawab),
    keterangan: normalizeComparableValue(payload.keterangan),
    tahun: normalizeComparableValue(payload.tahun),
    jenis_dokumen: normalizeComparableValue(payload.jenis_dokumen),
    pagu_cached: normalizeComparableValue(payload.pagu_cached),
    pagu_cached_at: normalizeComparableValue(payload.pagu_cached_at),
  };
}

function validateInput(params = {}) {
  const source = params && typeof params === 'object' ? params : {};
  const rpjmd_id = safeNumber(source.rpjmd_id);
  const renstra_id = safeNumber(source.renstra_id);
  const target_module = normalizeText(source.target_module)?.toUpperCase() || null;
  const source_stage = normalizeText(source.source_stage)?.toLowerCase() || null;
  const source_ref_id = safeNumber(source.source_ref_id);
  const target_ref_id = safeNumber(source.target_ref_id);
  const actor_user_id = safeNumber(source.actor_user_id);
  const actor_role = extractActorRole(source);
  const errors = [];

  if (!rpjmd_id || rpjmd_id <= 0) {
    errors.push({ field: 'rpjmd_id', message: 'rpjmd_id wajib diisi dan harus angka positif.' });
  }

  if (!renstra_id || renstra_id <= 0) {
    errors.push({
      field: 'renstra_id',
      message: 'renstra_id wajib diisi dan harus angka positif.',
    });
  }

  if (target_module !== VALID_TARGET_MODULE) {
    errors.push({
      field: 'target_module',
      message: 'target_module wajib RENSTRA untuk sinkronisasi indikator.',
    });
  }

  if (!source_stage || !VALID_SOURCE_STAGES.has(source_stage)) {
    errors.push({
      field: 'source_stage',
      message: `source_stage tidak valid: ${source_stage || '-'}.`,
    });
  }

  if (!source_ref_id || source_ref_id <= 0) {
    errors.push({
      field: 'source_ref_id',
      message: 'source_ref_id wajib diisi dan harus angka positif.',
    });
  }

  if (target_ref_id !== null && target_ref_id <= 0) {
    errors.push({
      field: 'target_ref_id',
      message: 'target_ref_id harus angka positif jika disediakan.',
    });
  }

  if (!actor_user_id || actor_user_id <= 0) {
    errors.push({
      field: 'actor_user_id',
      message: 'actor_user_id wajib tersedia dari user login.',
    });
  }

  if (!actor_role) {
    errors.push({
      field: 'actor_role',
      message: 'actor_role wajib tersedia dari user login.',
    });
  } else if (actor_role !== 'SUPER_ADMIN') {
    errors.push({
      field: 'actor_role',
      message: 'Sinkronisasi indikator hanya dapat dijalankan oleh SUPER_ADMIN.',
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      status: 400,
      code: 'RPJMD_INDICATOR_SYNC_VALIDATION_ERROR',
      message: 'Validasi sinkronisasi indikator gagal.',
      errors,
    };
  }

  return {
    success: true,
    data: {
      rpjmd_id,
      renstra_id,
      target_module,
      source_stage,
      source_ref_id,
      target_ref_id,
      actor_user_id,
      actor_role,
    },
  };
}

async function writeAuditLog({ targetRefId, sourceMap, summary, actor_user_id, transaction }) {
  await RenstraAuditLogGlobal.create(
    {
      module: 'rpjmd_governance_indicator_sync',
      entity_id: targetRefId,
      action: 'rebuild',
      before_json: null,
      after_json: {
        target_ref_id: targetRefId,
        source_stage: sourceMap?.source_stage || null,
        source_ref_id: sourceMap?.source_ref_id || null,
        summary,
      },
      user_id: actor_user_id,
      created_at: new Date(),
    },
    { transaction },
  );
}

async function syncRpjmdIndicatorsToRenstra(params = {}) {
  const validation = validateInput(params);
  if (!validation.success) {
    return validation;
  }

  const {
    rpjmd_id,
    renstra_id,
    target_module,
    source_stage,
    source_ref_id,
    target_ref_id,
    actor_user_id,
  } = validation.data;

  const externalTransaction = params.transaction || null;
  const ownsTransaction = !externalTransaction;
  const transaction = externalTransaction || (await sequelize.transaction());

  let sourceMapResult;
  try {
    sourceMapResult = await resolveTargetRefId({
      rpjmd_id,
      renstra_id,
      target_module,
      source_stage,
      source_ref_id,
      target_ref_id,
      include_parent: true,
      include_chain: true,
      transaction,
    });
  } catch (error) {
    if (ownsTransaction) {
      await transaction.rollback();
    }

    return {
      success: false,
      status: 500,
      code: "RPJMD_INDICATOR_SYNC_FAILED",
      message: getSafeErrorMessage(
        error,
        "Sinkronisasi indikator diblokir saat resolver source-map dibaca.",
      ),
      errors: [],
    };
  }

  if (!sourceMapResult.success) {
    if (ownsTransaction) {
      await transaction.rollback();
    }

    return {
      success: false,
      status: sourceMapResult.code === 'RPJMD_SOURCE_MAP_RESOLVER_CONFLICT' ? 409 : 400,
      code: sourceMapResult.code || 'RPJMD_INDICATOR_SYNC_BLOCKED',
      message:
        sourceMapResult.message || 'Sinkronisasi indikator diblokir oleh resolver Governance Hub.',
      data: sourceMapResult.data || null,
      errors: sourceMapResult.errors || [],
    };
  }

  const targetRefId = safeNumber(sourceMapResult.data?.target_ref_id);
  if (!targetRefId || targetRefId <= 0) {
    if (ownsTransaction) {
      await transaction.rollback();
    }

    return {
      success: false,
      status: 400,
      code: 'RPJMD_INDICATOR_SYNC_BLOCKED',
      message: 'Target Renstra belum valid untuk sinkronisasi indikator.',
      data: sourceMapResult.data || null,
      errors: [],
    };
  }

  const stageConfig = SOURCE_STAGE_CONFIG[source_stage];
  if (!stageConfig) {
    return {
      success: false,
      status: 400,
      code: 'RPJMD_INDICATOR_SYNC_VALIDATION_ERROR',
      message: 'source_stage tidak didukung untuk sinkronisasi indikator.',
      errors: [
        {
          field: 'source_stage',
          message: 'source_stage tidak didukung untuk sinkronisasi indikator.',
        },
      ],
    };
  }

  try {
    const sourceRows = await stageConfig.model.findAll({
      where: getSourceIndicatorQuery(stageConfig, source_ref_id),
      raw: true,
      transaction,
    });

    if (!sourceRows.length) {
      const summary = { created: 0, updated: 0, skipped: 0, blocked: 0 };

      await writeAuditLog({
        targetRefId,
        sourceMap: sourceMapResult.data,
        summary,
        actor_user_id,
        transaction,
      });

      if (ownsTransaction) {
        await transaction.commit();
      }
      return {
        success: true,
        status: 200,
        code: 'RPJMD_INDICATOR_SYNC_NO_SOURCE',
        message: 'Tidak ada indikator RPJMD yang tersedia untuk disinkronkan.',
        data: {
          ...summary,
          rpjmd_id,
          renstra_id,
          target_module,
          source_stage,
          source_ref_id,
          target_ref_id: targetRefId,
          source_count: 0,
          source_map: sourceMapResult.data,
        },
      };
    }

    const existingRows = await IndikatorRenstra.findAll({
      where: {
        renstra_id,
        stage: source_stage,
        ref_id: targetRefId,
        source_indikator_id: {
          [Op.in]: sourceRows.map((row) => row.id),
        },
      },
      order: [
        ['updated_at', 'DESC'],
        ['id', 'DESC'],
      ],
      raw: true,
      transaction,
    });

    const existingBySourceId = new Map();
    const duplicateSourceIds = new Set();

    for (const row of existingRows) {
      const sourceId = Number(row.source_indikator_id);
      if (existingBySourceId.has(sourceId)) {
        duplicateSourceIds.add(sourceId);
        continue;
      }

      existingBySourceId.set(sourceId, row);
    }

    if (duplicateSourceIds.size > 0) {
      await transaction.rollback();
      return {
        success: false,
        status: 409,
        code: 'RPJMD_INDICATOR_SYNC_DUPLICATE',
        message: 'Ditemukan duplikasi indikator Renstra untuk source yang sama.',
        data: {
          source_stage,
          source_ref_id,
          target_ref_id: targetRefId,
          duplicate_source_ids: [...duplicateSourceIds],
        },
        errors: [
          {
            field: 'source_indikator_id',
            message: 'Duplikasi indikator Renstra terdeteksi.',
          },
        ],
      };
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const sourceRow of sourceRows) {
      const payload = buildIndicatorPayload({
        sourceRow,
        stage: source_stage,
        renstraId: renstra_id,
        targetRefId,
      });
      const current = existingBySourceId.get(Number(sourceRow.id)) || null;

      if (!current) {
        await IndikatorRenstra.create(payload, { transaction });
        created += 1;
        continue;
      }

      const comparableCurrent = normalizeComparablePayload(buildComparableSnapshot(current));
      const comparableNext = normalizeComparablePayload(buildComparableSnapshot(payload));

      if (comparableCurrent === comparableNext) {
        skipped += 1;
        continue;
      }

      await IndikatorRenstra.update(payload, {
        where: { id: current.id },
        transaction,
      });
      updated += 1;
    }

    const summary = {
      created,
      updated,
      skipped,
      blocked: 0,
    };

    await writeAuditLog({
      targetRefId,
      sourceMap: sourceMapResult.data,
      summary,
      actor_user_id,
      transaction,
    });

    if (ownsTransaction) {
      await transaction.commit();
    }

    return {
      success: true,
      status: created > 0 ? 201 : 200,
      code: created > 0 ? 'RPJMD_INDICATOR_SYNC_CREATED' : 'RPJMD_INDICATOR_SYNC_UPDATED',
      message:
        created > 0
          ? 'Indikator RPJMD berhasil diturunkan ke Renstra.'
          : 'Indikator RPJMD berhasil disinkronkan ke Renstra.',
      data: {
        ...summary,
        rpjmd_id,
        renstra_id,
        target_module,
        source_stage,
        source_ref_id,
        target_ref_id: targetRefId,
        source_count: sourceRows.length,
        source_map: sourceMapResult.data,
      },
    };
  } catch (error) {
    if (ownsTransaction) {
      await transaction.rollback();
    }
    return {
      success: false,
      status: 500,
      code: 'RPJMD_INDICATOR_SYNC_FAILED',
      message: getSafeErrorMessage(error, 'Sinkronisasi indikator gagal.'),
      errors: [],
    };
  }
}

module.exports = {
  syncRpjmdIndicatorsToRenstra,
};
