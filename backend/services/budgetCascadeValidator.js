'use strict';

const db = require('../models');
const { QueryTypes } = require('sequelize');

const {
  Rka,
  RkaRincianBelanja,
  Renja,
  RenstraProgram,
  RenstraKegiatan,
  RenstraSubkegiatan,
  RkaVersion,
  ActivityLog,
} = db;

const Op = db.Sequelize.Op;

const AUDIT_EVENTS = {
  CASCADE_VALIDATION_FAILED: 'CASCADE_VALIDATION_FAILED',
  BUDGET_LOCKED: 'BUDGET_LOCKED',
  BUDGET_UNLOCKED: 'BUDGET_UNLOCKED',
  RKA_VERSION_CREATED: 'RKA_VERSION_CREATED',
};

const LOCKED_STATUSES = new Set(['SUBMITTED', 'APPROVED', 'FINALIZED', 'LOCKED']);

const normalizeString = (value) => String(value || '').trim();
const normalizeKode = (value) => String(value || '').trim();

const getParentKode = (kode) => {
  const parts = normalizeKode(kode).split('.').filter(Boolean);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
};

const getKodeLevel = (kode) => normalizeKode(kode).split('.').filter(Boolean).length;

const createValidationError = (
  message,
  code = AUDIT_EVENTS.CASCADE_VALIDATION_FAILED,
  details = {},
) => {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  error.status = 400;
  return error;
};

const loadMasterRekening = async (codes = []) => {
  const normalizedCodes = [...new Set((codes || []).map(normalizeKode).filter(Boolean))];
  const parentCodes = new Set(normalizedCodes);
  normalizedCodes.forEach((kode) => {
    let parent = getParentKode(kode);
    while (parent) {
      parentCodes.add(parent);
      parent = getParentKode(parent);
    }
  });

  if (!parentCodes.size) return {};

  const rows = await db.sequelize.query(
    `SELECT kode_rekening, uraian, level, is_leaf FROM master_kode_rekening_belanja WHERE kode_rekening IN (:codes)`,
    {
      replacements: { codes: [...parentCodes] },
      type: QueryTypes.SELECT,
    },
  );

  return rows.reduce((acc, row) => {
    acc[row.kode_rekening] = row;
    return acc;
  }, {});
};

const validateRekeningConsistency = async ({ rka_id, rows }) => {
  let detailRows = rows;
  if (!Array.isArray(detailRows)) {
    detailRows = await RkaRincianBelanja.findAll({ where: { rka_id } });
  }

  if (!detailRows || detailRows.length === 0) {
    return { ok: true };
  }

  const masterMap = await loadMasterRekening(detailRows.map((row) => row.kode_rekening));
  const invalidItems = [];

  detailRows.forEach((row) => {
    const kode = normalizeKode(row.kode_rekening);
    if (!kode) {
      invalidItems.push({ row, reason: 'Kode rekening tidak boleh kosong' });
      return;
    }

    const master = masterMap[kode];
    if (!master) {
      invalidItems.push({
        kode,
        reason: 'Kode rekening tidak ditemukan di master kode rekening belanja',
      });
      return;
    }

    const parentKode = getParentKode(kode);
    if (parentKode && !masterMap[parentKode]) {
      invalidItems.push({
        kode,
        parent: parentKode,
        reason: 'Parent kode rekening tidak ditemukan di master kode rekening belanja',
      });
    }

    if (master.level && Number(master.level) !== getKodeLevel(kode)) {
      invalidItems.push({
        kode,
        reason: 'Level kode rekening tidak sesuai dengan master kode rekening belanja',
        expected_level: Number(master.level),
        actual_level: getKodeLevel(kode),
      });
    }
  });

  if (invalidItems.length) {
    throw createValidationError(
      'Validasi struktur kode rekening gagal',
      AUDIT_EVENTS.CASCADE_VALIDATION_FAILED,
      {
        invalid_items: invalidItems,
      },
    );
  }

  return { ok: true };
};

const validateFullChain = async ({ rka_id, payload = {} }) => {
  let source = null;
  if (rka_id) {
    source = await Rka.findByPk(rka_id, {
      include: [
        {
          model: db.Renja,
          as: 'renja',
          include: [
            {
              model: db.Renstra,
              as: 'renstra',
            },
          ],
        },
      ],
    });
    if (!source) {
      throw createValidationError(
        'RKA tidak ditemukan untuk validasi rantai',
        AUDIT_EVENTS.CASCADE_VALIDATION_FAILED,
        { rka_id },
      );
    }
    source = source.toJSON();
  }

  const merged = {
    ...(source || {}),
    ...payload,
  };

  if (!merged.renja_id) {
    return { ok: true };
  }

  const renja = await Renja.findByPk(merged.renja_id, {
    include: [
      {
        model: db.Renstra,
        as: 'renstra',
      },
    ],
  });

  if (!renja) {
    throw createValidationError(
      'Renja terkait tidak ditemukan',
      AUDIT_EVENTS.CASCADE_VALIDATION_FAILED,
      {
        renja_id: merged.renja_id,
      },
    );
  }

  if (!renja.renstra_id || !renja.renstra) {
    throw createValidationError(
      'Renstra terkait Renja tidak ditemukan',
      AUDIT_EVENTS.CASCADE_VALIDATION_FAILED,
      {
        renja_id: merged.renja_id,
      },
    );
  }

  if (merged.rpjmd_id && Number(renja.renstra.rpjmd_id) !== Number(merged.rpjmd_id)) {
    throw createValidationError(
      'RPJMD yang dipilih tidak sesuai dengan Renstra dari Renja',
      AUDIT_EVENTS.CASCADE_VALIDATION_FAILED,
      {
        renja_id: merged.renja_id,
        rpjmd_id: merged.rpjmd_id,
        renstra_rpjmd_id: renja.renstra.rpjmd_id,
      },
    );
  }

  const programValue = normalizeString(merged.program);
  const kegiatanValue = normalizeString(merged.kegiatan);
  const subKegiatanValue = normalizeString(merged.sub_kegiatan);

  let renstraProgram = null;
  if (programValue) {
    renstraProgram = await RenstraProgram.findOne({
      where: {
        renstra_id: renja.renstra_id,
        [Op.or]: [{ kode_program: merged.program }, { nama_program: merged.program }],
      },
      include: [
        {
          model: db.Program,
          as: 'program_rpjmd',
        },
      ],
    });

    if (!renstraProgram) {
      throw createValidationError(
        'Program RKA tidak ditemukan dalam Renstra terkait',
        AUDIT_EVENTS.CASCADE_VALIDATION_FAILED,
        {
          program: merged.program,
          renstra_id: renja.renstra_id,
        },
      );
    }

    if (
      merged.rpjmd_id &&
      renstraProgram.program_rpjmd &&
      Number(renstraProgram.program_rpjmd.rpjmd_id) !== Number(merged.rpjmd_id)
    ) {
      throw createValidationError(
        'Program RKA tidak sesuai dengan RPJMD yang dipilih',
        AUDIT_EVENTS.CASCADE_VALIDATION_FAILED,
        {
          program: merged.program,
          rpjmd_id: merged.rpjmd_id,
        },
      );
    }
  }

  let kegiatan = null;
  if (kegiatanValue) {
    if (!renstraProgram) {
      throw createValidationError(
        'Validasi kegiatan tidak bisa dijalankan tanpa program yang valid',
        AUDIT_EVENTS.CASCADE_VALIDATION_FAILED,
        {
          kegiatan: merged.kegiatan,
        },
      );
    }

    kegiatan = await RenstraKegiatan.findOne({
      where: {
        program_id: renstraProgram.id,
        [Op.or]: [{ kode_kegiatan: merged.kegiatan }, { nama_kegiatan: merged.kegiatan }],
      },
    });

    if (!kegiatan) {
      throw createValidationError(
        'Kegiatan RKA tidak ditemukan dalam Renstra terkait',
        AUDIT_EVENTS.CASCADE_VALIDATION_FAILED,
        {
          kegiatan: merged.kegiatan,
          program: merged.program,
        },
      );
    }
  }

  if (subKegiatanValue) {
    if (!kegiatan) {
      throw createValidationError(
        'Validasi sub-kegiatan tidak bisa dijalankan tanpa kegiatan yang valid',
        AUDIT_EVENTS.CASCADE_VALIDATION_FAILED,
        {
          sub_kegiatan: merged.sub_kegiatan,
        },
      );
    }

    const subKegiatan = await RenstraSubkegiatan.findOne({
      where: {
        kegiatan_id: kegiatan.id,
        [Op.or]: [
          { kode_sub_kegiatan: merged.sub_kegiatan },
          { nama_sub_kegiatan: merged.sub_kegiatan },
        ],
      },
    });

    if (!subKegiatan) {
      throw createValidationError(
        'Sub-kegiatan RKA tidak ditemukan dalam Renstra terkait',
        AUDIT_EVENTS.CASCADE_VALIDATION_FAILED,
        {
          sub_kegiatan: merged.sub_kegiatan,
          kegiatan: merged.kegiatan,
        },
      );
    }
  }

  return { ok: true };
};

const enforceBudgetLocking = async (rka_id, req = null) => {
  const rka = await Rka.findByPk(rka_id);
  if (!rka) {
    throw createValidationError(
      'RKA tidak ditemukan untuk pengecekan kunci anggaran',
      AUDIT_EVENTS.BUDGET_LOCKED,
      {
        rka_id,
      },
    );
  }

  const status = String(rka.approval_status || '').toUpperCase();
  if (LOCKED_STATUSES.has(status)) {
    if (req) {
      ActivityLog.create({
        user_id: req.user?.id || null,
        action: AUDIT_EVENTS.BUDGET_LOCKED,
        entity_type: 'RKA',
        entity_id: rka.id,
        old_data: { approval_status: status },
        new_data: null,
        ip_address: req.ip || req.headers?.['x-forwarded-for'] || null,
        user_agent: req.headers?.['user-agent'] || null,
      }).catch(() => {});
    }
    throw createValidationError(
      'RKA sudah terkunci dan hanya dapat diubah melalui revisi',
      AUDIT_EVENTS.BUDGET_LOCKED,
      {
        approval_status: status,
      },
    );
  }

  return { ok: true };
};

const createRkaVersion = async ({ rka, rincianRows = [], createdBy = null, req = null }) => {
  if (!rka || !rka.id) {
    throw createValidationError(
      'RKA tidak valid untuk menyimpan versi',
      AUDIT_EVENTS.CASCADE_VALIDATION_FAILED,
      {
        rka_id: rka?.id,
      },
    );
  }

  const currentVersion =
    (await RkaVersion.max('version_number', { where: { rka_id: rka.id } })) || 0;
  const versionNumber = currentVersion + 1;

  await RkaVersion.create({
    rka_id: rka.id,
    version_number: versionNumber,
    snapshot_json: {
      rka: rka.toJSON ? rka.toJSON() : rka,
      rincian_belanja: (rincianRows || []).map((item) => ({
        ...item.dataValues,
        kode_rekening: item.kode_rekening,
        nama_rekening: item.nama_rekening,
        uraian: item.uraian,
        volume: item.volume,
        satuan: item.satuan,
        harga_satuan: item.harga_satuan,
        jumlah: item.jumlah,
        sumber_dana: item.sumber_dana,
        lokasi: item.lokasi,
        keterangan: item.keterangan,
      })),
    },
    created_by: createdBy,
    created_at: new Date(),
  });

  if (req) {
    ActivityLog.create({
      user_id: req.user?.id || null,
      action: AUDIT_EVENTS.RKA_VERSION_CREATED,
      entity_type: 'RKA',
      entity_id: rka.id,
      old_data: null,
      new_data: { version_number: versionNumber },
      ip_address: req.ip || req.headers?.['x-forwarded-for'] || null,
      user_agent: req.headers?.['user-agent'] || null,
    }).catch(() => {});
  }

  return { ok: true, version_number: versionNumber };
};

module.exports = {
  validateFullChain,
  validateRekeningConsistency,
  enforceBudgetLocking,
  createRkaVersion,
  AUDIT_EVENTS,
};
