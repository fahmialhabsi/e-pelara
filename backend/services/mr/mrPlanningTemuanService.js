"use strict";

/**
 * MR Planning Temuan Service — Modul TLHP
 * ---------------------------------------------------------------------------
 * Temuan (audit finding) di bawah satu LHP, dengan Rekomendasi bertingkat di
 * bawahnya. Approval Temuan (draft/verifikasi/approved/ditolak) memakai mesin
 * generik mrApprovalService (history-based) — TIDAK membuat approval engine
 * baru. Rekomendasi tidak punya approval sendiri, mengikuti status Temuan
 * induknya.
 *
 * Guard:
 * - Frontend hanya boleh mengirim field bisnis. Field teknis (label
 *   denormalisasi, counter rollup, workflow, audit) wajib diisi backend.
 */

const {
  sequelize,
  MrPlanningLhp,
  MrPlanningTemuan,
  MrPlanningTemuanHistory,
  MrPlanningTemuanRekomendasi,
  MrPlanningTindakLanjut,
  MrReferenceItem,
  MrReferenceGroup,
  MrCrossSystemLink,
} = require("../../models");

const mrApprovalService = require("./mrApprovalService");
const mrHistoryService = require("./mrHistoryService");
const { buildHistoryPayload, createHistory, getPlainJson } = require("../../helpers/mr/mrHistoryHelper");
const mrPlanningRiskService = require("./mrPlanningRiskService");

const ALLOWED_CREATE_UPDATE_FIELDS = new Set([
  "nomor_temuan",
  "judul_temuan",
  "uraian_temuan",
  "kondisi",
  "kriteria",
  "sebab",
  "akibat",
  "nilai_temuan_rupiah",
  "kategori_temuan_ref_id",
  "unsur_spip_ref_id",
  "alasan_revisi",
]);

const REKOMENDASI_ALLOWED_FIELDS = new Set([
  "nomor_rekomendasi",
  "uraian_rekomendasi",
  "pihak_bertanggung_jawab",
  "target_waktu_penyelesaian",
  "nilai_rekomendasi_rupiah",
  "urutan",
]);

class MrPlanningTemuanServiceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "MrPlanningTemuanServiceError";
    this.status = options.status || 400;
    this.statusCode = options.status || 400;
    this.code = options.code || "MR_TEMUAN_VALIDATION_ERROR";
    this.blocked = options.blocked !== undefined ? options.blocked : true;
    this.details = options.details || {};
  }
}

const throwValidation = (message, details = {}, code = "MR_TEMUAN_VALIDATION_ERROR") => {
  throw new MrPlanningTemuanServiceError(message, { status: 400, code, details });
};

const getActorId = (user) => user?.id || user?.user_id || user?.userId || null;

const pickFields = (allowedSet, body = {}, errorCode) => {
  const payload = {};
  const blocked = [];

  Object.keys(body || {}).forEach((key) => {
    if (allowedSet.has(key)) {
      payload[key] = body[key];
      return;
    }
    blocked.push(key);
  });

  if (blocked.length > 0) {
    throwValidation("Field tidak diperbolehkan.", { fields: blocked }, errorCode);
  }

  return payload;
};

const pickAllowedFields = (body) => pickFields(ALLOWED_CREATE_UPDATE_FIELDS, body, "MR_TEMUAN_BLOCKED_FIELDS");
const pickRekomendasiFields = (body) =>
  pickFields(REKOMENDASI_ALLOWED_FIELDS, body, "MR_TEMUAN_REKOMENDASI_BLOCKED_FIELDS");

const resolveReferenceLabel = async (id, options = {}) => {
  if (!id) return null;

  const item = await MrReferenceItem.findByPk(id, {
    include: [{ model: MrReferenceGroup, as: "group", required: false }],
    ...options,
  });

  if (!item) {
    throwValidation("Reference item tidak ditemukan.", { reference_id: id }, "MR_REFERENCE_NOT_FOUND");
  }

  return {
    id: item.id,
    kode_group: item.group?.kode_group || null,
    kode_item: item.kode_item,
    label: item.nama_item || item.nilai_text || item.kode_item,
    is_active: Boolean(item.is_active),
  };
};

const ensureReferenceGroup = (ref, expectedGroup, fieldName) => {
  if (!ref) return;

  if (!ref.is_active) {
    throwValidation("Reference item tidak aktif.", { field: fieldName, reference_id: ref.id });
  }

  if (ref.kode_group !== expectedGroup) {
    throwValidation("Reference item tidak sesuai group yang diizinkan.", {
      field: fieldName,
      reference_id: ref.id,
      kode_group: ref.kode_group,
      expected_group: expectedGroup,
    });
  }
};

const resolveLabelsForPayload = async (payload = {}, options = {}) => {
  const resolved = { ...payload };

  if (payload.kategori_temuan_ref_id) {
    const ref = await resolveReferenceLabel(payload.kategori_temuan_ref_id, options);
    ensureReferenceGroup(ref, "MR_TLHP_KATEGORI_TEMUAN", "kategori_temuan_ref_id");
    resolved.kategori_temuan = ref?.label || null;
  }

  if (payload.unsur_spip_ref_id) {
    const ref = await resolveReferenceLabel(payload.unsur_spip_ref_id, options);
    ensureReferenceGroup(ref, "SPIP_ELEMENT", "unsur_spip_ref_id");
    resolved.unsur_spip = ref?.label || null;
  }

  return resolved;
};

const findLhpOrFail = async (lhpId, options = {}) => {
  const lhp = await MrPlanningLhp.findByPk(lhpId, options);

  if (!lhp) {
    throw new MrPlanningTemuanServiceError("LHP tidak ditemukan.", {
      status: 404,
      code: "MR_LHP_NOT_FOUND",
    });
  }

  return lhp;
};

const findTemuanOrFail = async (temuanId, options = {}) => {
  const temuan = await MrPlanningTemuan.findByPk(temuanId, options);

  if (!temuan) {
    throw new MrPlanningTemuanServiceError("Temuan tidak ditemukan.", {
      status: 404,
      code: "MR_TEMUAN_NOT_FOUND",
    });
  }

  return temuan;
};

const findRekomendasiOrFail = async (rekomendasiId, options = {}) => {
  const rekomendasi = await MrPlanningTemuanRekomendasi.findByPk(rekomendasiId, options);

  if (!rekomendasi) {
    throw new MrPlanningTemuanServiceError("Rekomendasi tidak ditemukan.", {
      status: 404,
      code: "MR_TEMUAN_REKOMENDASI_NOT_FOUND",
    });
  }

  return rekomendasi;
};

const generateKodeTemuan = async ({ lhp, tahun, transaction }) => {
  const count = await MrPlanningTemuan.count({
    where: { mr_planning_lhp_id: lhp.id },
    transaction,
  });

  const entitasRef = lhp.entitas_pemeriksa_ref_id
    ? await MrReferenceItem.findByPk(lhp.entitas_pemeriksa_ref_id, { transaction })
    : null;

  const entitasSlug = String(entitasRef?.kode_item || lhp.entitas_pemeriksa || "TEMUAN")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 12) || "TEMUAN";

  const seq = String(count + 1).padStart(2, "0");

  return `TEMUAN-${entitasSlug}-${tahun || new Date().getFullYear()}-LHP${lhp.id}-${seq}`;
};

const createTemuanFromLhp = async ({ lhpId, body = {}, user } = {}) => {
  const userId = getActorId(user);
  const allowedPayload = pickAllowedFields(body);

  if (!allowedPayload.nomor_temuan || !allowedPayload.judul_temuan || !allowedPayload.uraian_temuan) {
    throwValidation("Nomor, judul, dan uraian temuan wajib diisi.", {
      missing_fields: ["nomor_temuan", "judul_temuan", "uraian_temuan"].filter(
        (f) => !allowedPayload[f],
      ),
    });
  }

  return sequelize.transaction(async (transaction) => {
    const lhp = await findLhpOrFail(lhpId, { transaction });

    if (lhp.status_dokumen !== "aktif") {
      throwValidation(
        "Temuan hanya bisa dibuat di bawah LHP berstatus Aktif.",
        { status_dokumen: lhp.status_dokumen },
        "MR_LHP_NOT_ACTIVE",
      );
    }

    const labelPayload = await resolveLabelsForPayload(allowedPayload, { transaction });
    const kodeTemuan = await generateKodeTemuan({ lhp, tahun: lhp.tahun_lhp, transaction });

    const temuan = await MrPlanningTemuan.create(
      {
        ...allowedPayload,
        kategori_temuan: labelPayload.kategori_temuan,
        unsur_spip: labelPayload.unsur_spip,
        mr_planning_lhp_id: lhp.id,
        context_id: lhp.context_id,
        opd_id: lhp.opd_id,
        nama_opd: lhp.nama_opd,
        entitas_pemeriksa_ref_id: lhp.entitas_pemeriksa_ref_id,
        entitas_pemeriksa: lhp.entitas_pemeriksa,
        kode_temuan: kodeTemuan,
        status_revisi: "draft",
        versi: 1,
        dibuat_oleh: userId,
        dibuat_pada: new Date(),
        created_by: userId,
        updated_by: userId,
      },
      { transaction },
    );

    const historyPayload = buildHistoryPayload({
      activeRecord: temuan,
      entityType: "temuan",
      historyForeignKey: "mr_planning_temuan_id",
      afterJson: getPlainJson(temuan),
      action: "create",
      statusRevisi: "draft",
      userId,
      nextVersi: 1,
      incrementVersi: false,
      extra: { context_id: lhp.context_id },
    });

    await createHistory({
      HistoryModel: MrPlanningTemuanHistory,
      payload: historyPayload,
      transaction,
    });

    await lhp.update(
      {
        jumlah_temuan: lhp.jumlah_temuan + 1,
        is_locked: true,
      },
      { transaction },
    );

    return temuan;
  });
};

const ensureDraftOrRejected = (temuan) => {
  if (!["draft", "ditolak"].includes(temuan.status_revisi)) {
    throw new MrPlanningTemuanServiceError(
      "Temuan hanya bisa diubah selagi berstatus Draft atau Ditolak.",
      { status: 400, code: "MR_TEMUAN_NOT_EDITABLE" },
    );
  }
};

const updateDraftTemuan = async ({ temuanId, body = {}, user } = {}) => {
  const userId = getActorId(user);
  const allowedPayload = pickAllowedFields(body);

  return sequelize.transaction(async (transaction) => {
    const temuan = await findTemuanOrFail(temuanId, { transaction });

    ensureDraftOrRejected(temuan);

    const merged = { ...temuan.get({ plain: true }), ...allowedPayload };
    const labelPayload = await resolveLabelsForPayload(merged, { transaction });

    const beforeJson = getPlainJson(temuan);

    await temuan.update(
      {
        ...allowedPayload,
        kategori_temuan: labelPayload.kategori_temuan ?? temuan.kategori_temuan,
        unsur_spip: labelPayload.unsur_spip ?? temuan.unsur_spip,
        last_revised_at: new Date(),
        last_revised_by: userId,
        updated_by: userId,
      },
      { transaction },
    );

    const historyPayload = buildHistoryPayload({
      activeRecord: temuan,
      entityType: "temuan",
      historyForeignKey: "mr_planning_temuan_id",
      beforeJson,
      afterJson: getPlainJson(temuan),
      action: "update",
      statusRevisi: temuan.status_revisi,
      userId,
      incrementVersi: false,
      extra: { context_id: temuan.context_id },
    });

    await createHistory({ HistoryModel: MrPlanningTemuanHistory, payload: historyPayload, transaction });

    return temuan;
  });
};

const submitTemuanForVerification = async ({ temuanId, user, note } = {}) => {
  const userId = getActorId(user);

  return sequelize.transaction(async (transaction) => {
    const temuan = await findTemuanOrFail(temuanId, { transaction });

    ensureDraftOrRejected(temuan);

    const beforeJson = getPlainJson(temuan);

    await temuan.update(
      {
        status_revisi: "verifikasi",
        last_revised_at: new Date(),
        last_revised_by: userId,
        updated_by: userId,
      },
      { transaction },
    );

    const historyPayload = buildHistoryPayload({
      activeRecord: temuan,
      entityType: "temuan",
      historyForeignKey: "mr_planning_temuan_id",
      beforeJson,
      afterJson: getPlainJson(temuan),
      action: "verifikasi",
      statusRevisi: "draft",
      alasanRevisi: note,
      userId,
      incrementVersi: false,
      extra: { context_id: temuan.context_id },
    });

    return createHistory({ HistoryModel: MrPlanningTemuanHistory, payload: historyPayload, transaction });
  });
};

const createRevisionFromApprovedTemuan = async ({ temuanId, body = {}, user } = {}) => {
  const userId = getActorId(user);
  const allowedPayload = pickAllowedFields(body);

  return sequelize.transaction(async (transaction) => {
    const temuan = await findTemuanOrFail(temuanId, { transaction });

    if (temuan.status_revisi !== "approved") {
      throwValidation(
        "Revisi hanya bisa dibuat dari Temuan yang sudah Disetujui.",
        { status_revisi: temuan.status_revisi },
        "MR_TEMUAN_NOT_APPROVED",
      );
    }

    const merged = { ...temuan.get({ plain: true }), ...allowedPayload };
    const labelPayload = await resolveLabelsForPayload(merged, { transaction });
    const beforeJson = getPlainJson(temuan);
    const nextVersi = (temuan.versi || 1) + 1;

    await temuan.update(
      {
        ...allowedPayload,
        kategori_temuan: labelPayload.kategori_temuan ?? temuan.kategori_temuan,
        unsur_spip: labelPayload.unsur_spip ?? temuan.unsur_spip,
        status_revisi: "draft",
        versi: nextVersi,
        last_revised_at: new Date(),
        last_revised_by: userId,
        updated_by: userId,
      },
      { transaction },
    );

    const historyPayload = buildHistoryPayload({
      activeRecord: temuan,
      entityType: "temuan",
      historyForeignKey: "mr_planning_temuan_id",
      beforeJson,
      afterJson: getPlainJson(temuan),
      action: "revisi",
      statusRevisi: "draft",
      userId,
      nextVersi,
      extra: { context_id: temuan.context_id },
    });

    await createHistory({ HistoryModel: MrPlanningTemuanHistory, payload: historyPayload, transaction });

    return temuan;
  });
};

const verifikasiHistory = ({ historyId, userId, note, request }) =>
  mrApprovalService.verifikasiHistory({
    sequelize,
    ActiveModel: MrPlanningTemuan,
    HistoryModel: MrPlanningTemuanHistory,
    historyId,
    userId,
    note,
    historyForeignKey: "mr_planning_temuan_id",
    request,
  });

const approveHistory = async ({ historyId, userId, note, request }) => {
  const result = await mrApprovalService.approveHistory({
    sequelize,
    ActiveModel: MrPlanningTemuan,
    HistoryModel: MrPlanningTemuanHistory,
    historyId,
    userId,
    note,
    historyForeignKey: "mr_planning_temuan_id",
    request,
  });

  // Kunci semua Rekomendasi anak begitu Temuan induk disetujui — Rekomendasi
  // tidak punya approval sendiri, ikut status Temuan (lihat Judgment Call #4).
  await MrPlanningTemuanRekomendasi.update(
    { is_locked: true },
    { where: { mr_planning_temuan_id: result.activeRecord.id } },
  );

  return result;
};

const tolakHistory = ({ historyId, userId, note, request }) =>
  mrApprovalService.tolakHistory({
    sequelize,
    ActiveModel: MrPlanningTemuan,
    HistoryModel: MrPlanningTemuanHistory,
    historyId,
    userId,
    note,
    historyForeignKey: "mr_planning_temuan_id",
    request,
  });

const getHistoryByTemuan = ({ temuanId, status_revisi }) =>
  mrHistoryService.getHistoryByActiveId({
    HistoryModel: MrPlanningTemuanHistory,
    activeId: temuanId,
    historyForeignKey: "mr_planning_temuan_id",
    status_revisi,
  });

const getHistoryDetail = (historyId) =>
  mrHistoryService.getHistoryDetail({ HistoryModel: MrPlanningTemuanHistory, historyId });

// =====================================================
// REKOMENDASI (nested, tidak punya approval sendiri)
// =====================================================

const createRekomendasi = async ({ temuanId, body = {}, user } = {}) => {
  const userId = getActorId(user);
  const allowedPayload = pickRekomendasiFields(body);

  if (!allowedPayload.nomor_rekomendasi || !allowedPayload.uraian_rekomendasi) {
    throwValidation(
      "Nomor dan uraian rekomendasi wajib diisi.",
      { missing_fields: ["nomor_rekomendasi", "uraian_rekomendasi"].filter((f) => !allowedPayload[f]) },
      "MR_TEMUAN_REKOMENDASI_VALIDATION_ERROR",
    );
  }

  return sequelize.transaction(async (transaction) => {
    const temuan = await findTemuanOrFail(temuanId, { transaction });

    const rekomendasi = await MrPlanningTemuanRekomendasi.create(
      {
        ...allowedPayload,
        mr_planning_temuan_id: temuan.id,
        mr_planning_lhp_id: temuan.mr_planning_lhp_id,
        context_id: temuan.context_id,
        kode_rekomendasi: `${temuan.kode_temuan}-R${allowedPayload.nomor_rekomendasi}`,
        status_revisi: temuan.status_revisi,
        is_locked: temuan.status_revisi === "approved",
        is_active: true,
        dibuat_oleh: userId,
        dibuat_pada: new Date(),
        created_by: userId,
        updated_by: userId,
      },
      { transaction },
    );

    await recomputeTemuanRollup(temuan.id, { transaction });

    return rekomendasi;
  });
};

const updateDraftRekomendasi = async ({ rekomendasiId, body = {}, user } = {}) => {
  const userId = getActorId(user);
  const allowedPayload = pickRekomendasiFields(body);

  return sequelize.transaction(async (transaction) => {
    const rekomendasi = await findRekomendasiOrFail(rekomendasiId, { transaction });

    if (rekomendasi.is_locked) {
      throwValidation(
        "Rekomendasi terkunci karena Temuan induk sudah Disetujui.",
        {},
        "MR_TEMUAN_REKOMENDASI_LOCKED",
      );
    }

    await rekomendasi.update(
      {
        ...allowedPayload,
        last_revised_at: new Date(),
        last_revised_by: userId,
        updated_by: userId,
      },
      { transaction },
    );

    return rekomendasi;
  });
};

const cancelRekomendasi = async ({ rekomendasiId, body = {}, user } = {}) => {
  const userId = getActorId(user);
  const alasan = body?.alasan_revisi;

  if (!alasan) {
    throwValidation("Alasan pembatalan rekomendasi wajib diisi.", {}, "MR_TEMUAN_REKOMENDASI_REASON_REQUIRED");
  }

  return sequelize.transaction(async (transaction) => {
    const rekomendasi = await findRekomendasiOrFail(rekomendasiId, { transaction });

    if (rekomendasi.is_locked) {
      throwValidation(
        "Rekomendasi terkunci karena Temuan induk sudah Disetujui.",
        {},
        "MR_TEMUAN_REKOMENDASI_LOCKED",
      );
    }

    const activeTindakLanjutCount = await MrPlanningTindakLanjut.count({
      where: { mr_planning_temuan_rekomendasi_id: rekomendasi.id, is_active: true },
      transaction,
    });

    if (activeTindakLanjutCount > 0) {
      throwValidation(
        "Rekomendasi tidak bisa dibatalkan karena sudah memiliki entri Tindak Lanjut.",
        { active_tindak_lanjut: activeTindakLanjutCount },
        "MR_TEMUAN_REKOMENDASI_HAS_TINDAK_LANJUT",
      );
    }

    await rekomendasi.update(
      {
        is_active: false,
        alasan_revisi: alasan,
        last_revised_at: new Date(),
        last_revised_by: userId,
        updated_by: userId,
      },
      { transaction },
    );

    await recomputeTemuanRollup(rekomendasi.mr_planning_temuan_id, { transaction });

    return rekomendasi;
  });
};

const listRekomendasiByTemuan = async (temuanId) => {
  return MrPlanningTemuanRekomendasi.findAll({
    where: { mr_planning_temuan_id: temuanId, is_active: true },
    include: [{ model: MrReferenceItem, as: "status_tindak_lanjut_ref", required: false }],
    order: [["urutan", "ASC"], ["id", "ASC"]],
  });
};

// =====================================================
// ROLLUP
// =====================================================

const recomputeTemuanRollup = async (temuanId, { transaction } = {}) => {
  const rekomendasiList = await MrPlanningTemuanRekomendasi.findAll({
    where: { mr_planning_temuan_id: temuanId, is_active: true },
    transaction,
  });

  const total = rekomendasiList.length;
  const selesai = rekomendasiList.filter((r) => r.status_tindak_lanjut === "Sesuai/Selesai").length;
  const belum = rekomendasiList.filter(
    (r) => !r.status_tindak_lanjut || r.status_tindak_lanjut === "Belum Ditindaklanjuti",
  ).length;

  let statusRollup = "Belum Ditindaklanjuti";

  if (total > 0) {
    if (selesai === total) statusRollup = "Selesai";
    else if (belum === total) statusRollup = "Belum Ditindaklanjuti";
    else statusRollup = "Campuran";
  }

  await MrPlanningTemuan.update(
    {
      jumlah_rekomendasi: total,
      jumlah_rekomendasi_selesai: selesai,
      status_rollup: statusRollup,
    },
    { where: { id: temuanId }, transaction },
  );
};

// =====================================================
// ESKALASI KE RISK REGISTER
// =====================================================

const ENTITAS_TO_PROPOSAL_SOURCE = Object.freeze({
  BPK: "TINDAK_LANJUT_BPK",
  INSPEKTORAT: "TINDAK_LANJUT_INSPEKTORAT",
  BPKP: "TINDAK_LANJUT_BPKP",
});

const escalateToRisk = async ({ temuanId, body = {}, user } = {}) => {
  const userId = getActorId(user);

  const temuan = await findTemuanOrFail(temuanId, {
    include: [{ model: MrReferenceItem, as: "entitas_pemeriksa_ref", required: false }],
  });

  if (temuan.status_revisi !== "approved") {
    throwValidation(
      "Temuan harus berstatus Disetujui sebelum bisa dieskalasi ke Risk Register.",
      { status_revisi: temuan.status_revisi },
      "MR_TEMUAN_NOT_APPROVED",
    );
  }

  if (temuan.risk_escalation_status === "risk_created") {
    throwValidation(
      "Temuan ini sudah pernah dieskalasi menjadi Risk.",
      { mr_planning_risk_id: temuan.mr_planning_risk_id },
      "MR_TEMUAN_ALREADY_ESCALATED",
    );
  }

  const entitasKode = temuan.entitas_pemeriksa_ref?.kode_item || null;
  const proposalSourceType = ENTITAS_TO_PROPOSAL_SOURCE[entitasKode];

  if (!proposalSourceType) {
    throwValidation(
      "Entitas pemeriksa Temuan ini belum dipetakan ke sumber usulan risiko (BPK/BPKP/Inspektorat).",
      { entitas_pemeriksa_ref_kode: entitasKode },
      "MR_TEMUAN_ENTITAS_NOT_MAPPED",
    );
  }

  const rekomendasiList = await MrPlanningTemuanRekomendasi.findAll({
    where: { mr_planning_temuan_id: temuan.id, is_active: true },
    order: [["urutan", "ASC"], ["id", "ASC"]],
  });

  const rekomendasiText = rekomendasiList
    .map((r, i) => `${i + 1}. ${r.uraian_rekomendasi}`)
    .join("\n") || null;

  const proposalPayload = {
    proposal_source_type: proposalSourceType,
    tahun: String(body.tahun || temuan.entitas_pemeriksa_ref?.tahun_berlaku || new Date().getFullYear()),
    periode_type: body.periode_type || "tahunan",
    opd_id: body.opd_id || temuan.opd_id,
    nama_opd: temuan.nama_opd,
    nomor_temuan: temuan.nomor_temuan,
    judul_temuan: temuan.judul_temuan,
    ringkasan_temuan: temuan.uraian_temuan,
    rekomendasi: rekomendasiText,
    nilai_temuan: temuan.nilai_temuan_rupiah,
    objek_risiko: body.objek_risiko || temuan.judul_temuan,
    nama_risiko: body.nama_risiko || temuan.judul_temuan,
    uraian_risiko: body.uraian_risiko || temuan.uraian_temuan,
    penyebab_risiko: body.penyebab_risiko || temuan.sebab,
    dampak_risiko: body.dampak_risiko || temuan.akibat,
    kemungkinan_ref_id: body.kemungkinan_ref_id,
    dampak_ref_id: body.dampak_ref_id,
    kategori_risiko_ref_id: body.kategori_risiko_ref_id,
    sumber_risiko_ref_id: body.sumber_risiko_ref_id,
    selera_risiko_ref_id: body.selera_risiko_ref_id,
    alasan_revisi: `Dieskalasi otomatis dari Temuan ${temuan.kode_temuan} (${temuan.entitas_pemeriksa}).`,
  };

  const result = await mrPlanningRiskService.createProposalIntake({ body: proposalPayload, user });

  const newRiskId = result?.data?.id;

  if (!newRiskId) {
    throwValidation(
      "Gagal membuat Risk dari Temuan — proposal intake tidak mengembalikan id risk.",
      {},
      "MR_TEMUAN_ESCALATION_FAILED",
    );
  }

  // createProposalIntake (di atas) sudah commit dalam transaksinya sendiri —
  // 3 langkah berikut (cross-link, update Temuan, history) digabung dalam satu
  // transaksi lokal agar setidaknya ketiganya konsisten satu sama lain kalau
  // salah satu gagal (guard risk_escalation_status di atas juga mencegah
  // Risk terduplikasi kalau fungsi ini dipanggil ulang setelah gagal parsial).
  const { crossLink, historyRecord } = await sequelize.transaction(async (transaction) => {
    const beforeJson = getPlainJson(temuan);

    const newCrossLink = await MrCrossSystemLink.create(
      {
        source_system: "e_pelara",
        source_module: "mr_planning_temuan",
        source_table: "mr_planning_temuan",
        source_id: temuan.id,
        target_system: "e_pelara",
        target_module: "mr_planning_risk",
        target_table: "mr_planning_risk",
        target_id: newRiskId,
        link_type: "risk_mapping",
        link_status: "active",
        link_note: `Eskalasi Temuan ${temuan.kode_temuan} ke Risk Register.`,
        created_by: userId,
        updated_by: userId,
      },
      { transaction },
    );

    await temuan.update(
      {
        risk_escalation_status: "risk_created",
        mr_planning_risk_id: newRiskId,
        cross_system_link_id: newCrossLink.id,
        context_id: result?.data?.context_id || result?.data?.generated_context?.id || temuan.context_id,
        updated_by: userId,
      },
      { transaction },
    );

    // "sync" adalah action_type yang valid di ENUM history (dipakai untuk
    // perubahan yang dipicu sistem, bukan input pengguna langsung), tapi bukan
    // bagian dari MR_ACTION generik (mrApprovalHelper) sehingga tidak bisa lewat
    // buildHistoryPayload/ensureValidAction — payload disusun manual di sini.
    const newHistoryRecord = await MrPlanningTemuanHistory.create(
      {
        mr_planning_temuan_id: temuan.id,
        context_id: temuan.context_id,
        versi_sebelum: temuan.versi,
        versi_sesudah: temuan.versi,
        before_json: beforeJson,
        after_json: getPlainJson(temuan),
        alasan_revisi: null,
        status_revisi: temuan.status_revisi,
        action_type: "sync",
        source_module: "mr_planning_temuan_escalation",
        dibuat_oleh: userId,
        dibuat_pada: new Date(),
      },
      { transaction },
    );

    return { crossLink: newCrossLink, historyRecord: newHistoryRecord };
  });

  return {
    temuan,
    risk: result.data,
    cross_system_link: crossLink,
  };
};

const getTemuanDetail = async (temuanId) => {
  return MrPlanningTemuan.findByPk(temuanId, {
    include: [
      { model: MrPlanningLhp, as: "lhp", required: false },
      { model: MrReferenceItem, as: "kategori_temuan_ref", required: false },
      { model: MrReferenceItem, as: "unsur_spip_ref", required: false },
      {
        model: MrPlanningTemuanRekomendasi,
        as: "rekomendasis",
        required: false,
        where: { is_active: true },
        include: [{ model: MrReferenceItem, as: "status_tindak_lanjut_ref", required: false }],
      },
    ],
  });
};

const listTemuanByLhp = async (lhpId) => {
  return MrPlanningTemuan.findAll({
    where: { mr_planning_lhp_id: lhpId },
    order: [["id", "ASC"]],
  });
};

module.exports = {
  MrPlanningTemuanServiceError,
  ALLOWED_CREATE_UPDATE_FIELDS,
  REKOMENDASI_ALLOWED_FIELDS,
  createTemuanFromLhp,
  updateDraftTemuan,
  submitTemuanForVerification,
  createRevisionFromApprovedTemuan,
  verifikasiHistory,
  approveHistory,
  tolakHistory,
  getHistoryByTemuan,
  getHistoryDetail,
  createRekomendasi,
  updateDraftRekomendasi,
  cancelRekomendasi,
  listRekomendasiByTemuan,
  recomputeTemuanRollup,
  escalateToRisk,
  getTemuanDetail,
  listTemuanByLhp,
  findTemuanOrFail,
  findRekomendasiOrFail,
};
