"use strict";

/**
 * MR Planning Tindak Lanjut Service — Modul TLHP
 * ---------------------------------------------------------------------------
 * Realisasi pemantauan periodik atas satu Rekomendasi. Satu Rekomendasi bisa
 * menerima banyak entri Tindak Lanjut seiring waktu (is_latest menandai entri
 * terkini). Approval (draft/verifikasi/approved/ditolak) memakai mesin
 * generik mrApprovalService — sama seperti Temuan.
 *
 * Guard:
 * - Frontend hanya boleh mengirim field bisnis. Field teknis (label
 *   denormalisasi, rollup, workflow, audit) wajib diisi backend.
 */

const {
  sequelize,
  MrPlanningTemuanRekomendasi,
  MrPlanningTindakLanjut,
  MrPlanningTindakLanjutHistory,
  MrReferenceItem,
  MrReferenceGroup,
} = require("../../models");

const mrApprovalService = require("./mrApprovalService");
const mrHistoryService = require("./mrHistoryService");
const { buildHistoryPayload, createHistory, getPlainJson } = require("../../helpers/mr/mrHistoryHelper");
const mrPlanningTemuanService = require("./mrPlanningTemuanService");
// Sprint 9 -- S9: reuse the already-accepted Sprint 8 LHP/Temuan OPD boundary
// decision (RenstraOPD.id namespace) for TindakLanjut, whose opd_id is
// inherited transitively via Temuan.opd_id. Do NOT modify these Sprint 8
// helpers -- reuse unchanged, per CEA Sprint 9 mandate S9-05.
const {
  resolveMrPlanningLhpOpdBoundary,
  throwMrPlanningLhpOpdBoundaryError,
} = require("./mrPlanningLhpService");

const ALLOWED_CREATE_UPDATE_FIELDS = new Set([
  "periode_pemantauan_type",
  "periode_pemantauan_label",
  "tanggal_pemantauan",
  "status_tindak_lanjut_ref_id",
  "uraian_tindak_lanjut",
  "persentase_penyelesaian",
  "nilai_setoran_rupiah",
  "nomor_bukti_setoran",
  "tanggal_setoran",
  "kendala",
  "alasan_tidak_dapat_ditindaklanjuti",
  "rencana_tindak_lanjut_berikutnya",
  "target_waktu_berikutnya",
  "pic_user_id",
  "pic_nama",
  "status_matriks",
  "status_spj",
  "daftar_dokumen_pendukung",
  "keterangan",
  "alasan_revisi",
]);

const STATUS_TIDAK_DAPAT_DITINDAKLANJUTI = "TIDAK_DAPAT_DITINDAKLANJUTI";

class MrPlanningTindakLanjutServiceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "MrPlanningTindakLanjutServiceError";
    this.status = options.status || 400;
    this.statusCode = options.status || 400;
    this.code = options.code || "MR_TINDAK_LANJUT_VALIDATION_ERROR";
    this.blocked = options.blocked !== undefined ? options.blocked : true;
    this.details = options.details || {};
  }
}

const throwValidation = (message, details = {}, code = "MR_TINDAK_LANJUT_VALIDATION_ERROR") => {
  throw new MrPlanningTindakLanjutServiceError(message, { status: 400, code, details });
};

const getActorId = (user) => user?.id || user?.user_id || user?.userId || null;

// Sprint 9 -- S9-05: minimum-necessary target-OPD resolver for TindakLanjut.
// Authoritative ownership is Temuan.opd_id (itself inherited from LHP.opd_id,
// see mrPlanningTemuanService.js createTemuanFromLhp). TindakLanjut carries
// mr_planning_temuan_id directly (no need to traverse Rekomendasi/LHP again).
// This function performs NO authorization decision itself -- it only resolves
// the authoritative targetOpdId input consumed by the unmodified Sprint 8
// resolveMrPlanningLhpOpdBoundary() helper.
async function resolveTindakLanjutTargetOpdId(mrPlanningTemuanId, { transaction } = {}) {
  if (mrPlanningTemuanId === null || mrPlanningTemuanId === undefined) {
    return null;
  }
  const temuan = await mrPlanningTemuanService.findTemuanOrFail(mrPlanningTemuanId, { transaction });
  return temuan?.opd_id ?? null;
}

const pickAllowedFields = (body = {}) => {
  const payload = {};
  const blocked = [];

  Object.keys(body || {}).forEach((key) => {
    if (ALLOWED_CREATE_UPDATE_FIELDS.has(key)) {
      payload[key] = body[key];
      return;
    }
    blocked.push(key);
  });

  if (blocked.length > 0) {
    throwValidation("Field tidak diperbolehkan.", { fields: blocked }, "MR_TINDAK_LANJUT_BLOCKED_FIELDS");
  }

  return payload;
};

const resolveStatusRef = async (id, options = {}) => {
  if (!id) return null;

  const item = await MrReferenceItem.findByPk(id, {
    include: [{ model: MrReferenceGroup, as: "group", required: false }],
    ...options,
  });

  if (!item) {
    throwValidation("Reference status tindak lanjut tidak ditemukan.", { reference_id: id }, "MR_REFERENCE_NOT_FOUND");
  }

  if (item.group?.kode_group !== "MR_TLHP_STATUS_TINDAK_LANJUT") {
    throwValidation(
      "Reference item bukan status tindak lanjut yang valid.",
      { reference_id: id, kode_group: item.group?.kode_group },
      "MR_REFERENCE_GROUP_MISMATCH",
    );
  }

  if (!item.is_active) {
    throwValidation("Status tindak lanjut ini tidak aktif.", { reference_id: id }, "MR_REFERENCE_INACTIVE");
  }

  return {
    id: item.id,
    kode_item: item.kode_item,
    label: item.nama_item,
    nilai_numeric: item.nilai_numeric,
  };
};

const findRekomendasiOrFail = async (rekomendasiId, options = {}) => {
  const rekomendasi = await MrPlanningTemuanRekomendasi.findByPk(rekomendasiId, options);

  if (!rekomendasi) {
    throw new MrPlanningTindakLanjutServiceError("Rekomendasi tidak ditemukan.", {
      status: 404,
      code: "MR_TEMUAN_REKOMENDASI_NOT_FOUND",
    });
  }

  return rekomendasi;
};

const findTindakLanjutOrFail = async (tindakLanjutId, options = {}) => {
  const tindakLanjut = await MrPlanningTindakLanjut.findByPk(tindakLanjutId, options);

  if (!tindakLanjut) {
    throw new MrPlanningTindakLanjutServiceError("Tindak Lanjut tidak ditemukan.", {
      status: 404,
      code: "MR_TINDAK_LANJUT_NOT_FOUND",
    });
  }

  return tindakLanjut;
};

const syncRekomendasiRollup = async ({ rekomendasi, tindakLanjut, transaction }) => {
  await rekomendasi.update(
    {
      status_tindak_lanjut_ref_id: tindakLanjut.status_tindak_lanjut_ref_id,
      status_tindak_lanjut: tindakLanjut.status_tindak_lanjut,
      persentase_penyelesaian: tindakLanjut.persentase_penyelesaian,
      tindak_lanjut_terakhir_id: tindakLanjut.id,
      tanggal_tindak_lanjut_terakhir: tindakLanjut.tanggal_pemantauan,
    },
    { transaction },
  );
};

const createTindakLanjutFromRekomendasi = async ({ rekomendasiId, body = {}, user } = {}) => {
  const userId = getActorId(user);
  const allowedPayload = pickAllowedFields(body);

  if (!allowedPayload.status_tindak_lanjut_ref_id || !allowedPayload.uraian_tindak_lanjut || !allowedPayload.tanggal_pemantauan) {
    throwValidation(
      "Status, uraian, dan tanggal pemantauan tindak lanjut wajib diisi.",
      {
        missing_fields: [
          "status_tindak_lanjut_ref_id",
          "uraian_tindak_lanjut",
          "tanggal_pemantauan",
        ].filter((f) => !allowedPayload[f]),
      },
    );
  }

  return sequelize.transaction(async (transaction) => {
    const rekomendasi = await findRekomendasiOrFail(rekomendasiId, { transaction });

    // Sprint 9 -- S9-06: authorize BEFORE any mutation. Authoritative target
    // OPD is resolved from the parent Rekomendasi's mr_planning_temuan_id ->
    // Temuan.opd_id (never from caller-supplied input -- Rekomendasi/TindakLanjut
    // do not accept an opd_id from the request body at all).
    const createTargetOpdId = await resolveTindakLanjutTargetOpdId(rekomendasi.mr_planning_temuan_id, { transaction });
    const createBoundary = await resolveMrPlanningLhpOpdBoundary({ user, targetOpdId: createTargetOpdId });
    if (!createBoundary.ok) {
      throwMrPlanningLhpOpdBoundaryError(createBoundary);
    }

    if (!rekomendasi.is_active) {
      throwValidation("Rekomendasi ini sudah dibatalkan.", {}, "MR_TEMUAN_REKOMENDASI_CANCELLED");
    }

    const statusRef = await resolveStatusRef(allowedPayload.status_tindak_lanjut_ref_id, { transaction });

    if (
      statusRef?.kode_item === STATUS_TIDAK_DAPAT_DITINDAKLANJUTI &&
      !allowedPayload.alasan_tidak_dapat_ditindaklanjuti
    ) {
      throwValidation(
        "Alasan wajib diisi ketika status Tidak Dapat Ditindaklanjuti.",
        {},
        "MR_TINDAK_LANJUT_REASON_REQUIRED",
      );
    }

    await MrPlanningTindakLanjut.update(
      { is_latest: false },
      { where: { mr_planning_temuan_rekomendasi_id: rekomendasi.id }, transaction },
    );

    const tindakLanjut = await MrPlanningTindakLanjut.create(
      {
        ...allowedPayload,
        status_tindak_lanjut: statusRef?.label || null,
        mr_planning_temuan_rekomendasi_id: rekomendasi.id,
        mr_planning_temuan_id: rekomendasi.mr_planning_temuan_id,
        mr_planning_lhp_id: rekomendasi.mr_planning_lhp_id,
        context_id: rekomendasi.context_id,
        status_revisi: "draft",
        versi: 1,
        is_active: true,
        is_latest: true,
        dibuat_oleh: userId,
        dibuat_pada: new Date(),
        created_by: userId,
        updated_by: userId,
      },
      { transaction },
    );

    const historyPayload = buildHistoryPayload({
      activeRecord: tindakLanjut,
      historyForeignKey: "mr_planning_tindak_lanjut_id",
      afterJson: getPlainJson(tindakLanjut),
      action: "create",
      statusRevisi: "draft",
      userId,
      nextVersi: 1,
      incrementVersi: false,
      extra: { context_id: rekomendasi.context_id },
    });

    await createHistory({ HistoryModel: MrPlanningTindakLanjutHistory, payload: historyPayload, transaction });

    await syncRekomendasiRollup({ rekomendasi, tindakLanjut, transaction });
    await mrPlanningTemuanService.recomputeTemuanRollup(rekomendasi.mr_planning_temuan_id, { transaction });

    return tindakLanjut;
  });
};

const ensureDraftOrRejected = (tindakLanjut) => {
  if (!["draft", "ditolak"].includes(tindakLanjut.status_revisi)) {
    throw new MrPlanningTindakLanjutServiceError(
      "Tindak Lanjut hanya bisa diubah selagi berstatus Draft atau Ditolak.",
      { status: 400, code: "MR_TINDAK_LANJUT_NOT_EDITABLE" },
    );
  }
};

const updateDraftTindakLanjut = async ({ tindakLanjutId, body = {}, user } = {}) => {
  const userId = getActorId(user);
  const allowedPayload = pickAllowedFields(body);

  return sequelize.transaction(async (transaction) => {
    const tindakLanjut = await findTindakLanjutOrFail(tindakLanjutId, { transaction });

    // Sprint 9 -- S9-06: stored TindakLanjut.mr_planning_temuan_id is
    // authoritative -- never trust any replacement/request-supplied ownership.
    // Authorize BEFORE any mutation.
    const updateTargetOpdId = await resolveTindakLanjutTargetOpdId(tindakLanjut.mr_planning_temuan_id, { transaction });
    const updateBoundary = await resolveMrPlanningLhpOpdBoundary({ user, targetOpdId: updateTargetOpdId });
    if (!updateBoundary.ok) {
      throwMrPlanningLhpOpdBoundaryError(updateBoundary);
    }

    ensureDraftOrRejected(tindakLanjut);

    let statusLabel = tindakLanjut.status_tindak_lanjut;

    if (allowedPayload.status_tindak_lanjut_ref_id) {
      const statusRef = await resolveStatusRef(allowedPayload.status_tindak_lanjut_ref_id, { transaction });
      statusLabel = statusRef?.label || statusLabel;

      if (
        statusRef?.kode_item === STATUS_TIDAK_DAPAT_DITINDAKLANJUTI &&
        !(allowedPayload.alasan_tidak_dapat_ditindaklanjuti || tindakLanjut.alasan_tidak_dapat_ditindaklanjuti)
      ) {
        throwValidation(
          "Alasan wajib diisi ketika status Tidak Dapat Ditindaklanjuti.",
          {},
          "MR_TINDAK_LANJUT_REASON_REQUIRED",
        );
      }
    }

    const beforeJson = getPlainJson(tindakLanjut);

    await tindakLanjut.update(
      {
        ...allowedPayload,
        status_tindak_lanjut: statusLabel,
        last_revised_at: new Date(),
        last_revised_by: userId,
        updated_by: userId,
      },
      { transaction },
    );

    const historyPayload = buildHistoryPayload({
      activeRecord: tindakLanjut,
      historyForeignKey: "mr_planning_tindak_lanjut_id",
      beforeJson,
      afterJson: getPlainJson(tindakLanjut),
      action: "update",
      statusRevisi: tindakLanjut.status_revisi,
      userId,
      incrementVersi: false,
      extra: { context_id: tindakLanjut.context_id },
    });

    await createHistory({ HistoryModel: MrPlanningTindakLanjutHistory, payload: historyPayload, transaction });

    if (tindakLanjut.is_latest) {
      const rekomendasi = await findRekomendasiOrFail(tindakLanjut.mr_planning_temuan_rekomendasi_id, { transaction });
      await syncRekomendasiRollup({ rekomendasi, tindakLanjut, transaction });
      await mrPlanningTemuanService.recomputeTemuanRollup(tindakLanjut.mr_planning_temuan_id, { transaction });
    }

    return tindakLanjut;
  });
};

const submitTindakLanjutForVerification = async ({ tindakLanjutId, user, note } = {}) => {
  const userId = getActorId(user);

  return sequelize.transaction(async (transaction) => {
    const tindakLanjut = await findTindakLanjutOrFail(tindakLanjutId, { transaction });

    // Sprint 9 -- S9-06: authorize BEFORE any mutation/transition.
    const submitTargetOpdId = await resolveTindakLanjutTargetOpdId(tindakLanjut.mr_planning_temuan_id, { transaction });
    const submitBoundary = await resolveMrPlanningLhpOpdBoundary({ user, targetOpdId: submitTargetOpdId });
    if (!submitBoundary.ok) {
      throwMrPlanningLhpOpdBoundaryError(submitBoundary);
    }

    ensureDraftOrRejected(tindakLanjut);

    const beforeJson = getPlainJson(tindakLanjut);

    await tindakLanjut.update(
      {
        status_revisi: "verifikasi",
        last_revised_at: new Date(),
        last_revised_by: userId,
        updated_by: userId,
      },
      { transaction },
    );

    const historyPayload = buildHistoryPayload({
      activeRecord: tindakLanjut,
      historyForeignKey: "mr_planning_tindak_lanjut_id",
      beforeJson,
      afterJson: getPlainJson(tindakLanjut),
      action: "verifikasi",
      statusRevisi: "draft",
      alasanRevisi: note,
      userId,
      incrementVersi: false,
      extra: { context_id: tindakLanjut.context_id },
    });

    return createHistory({ HistoryModel: MrPlanningTindakLanjutHistory, payload: historyPayload, transaction });
  });
};

// Sprint 9 -- S9-07: mrApprovalService's shared boundary check reads
// activeRecord.opd_id, a field MrPlanningTindakLanjut does not have --
// making that check silently ineffective for this model (it always resolves
// targetOpdId to null and short-circuits to ok:true). Per CEA decision, do
// NOT modify mrApprovalService.js. Instead resolve the active TindakLanjut
// and authorize HERE, in isolation, BEFORE delegating to the unmodified
// shared approval engine. On DENY, mrApprovalService.verifikasiHistory is
// never invoked -- zero mutation.
const verifikasiHistory = async ({ historyId, userId, note, request }) => {
  const history = await mrApprovalService.findHistoryById({
    HistoryModel: MrPlanningTindakLanjutHistory,
    historyId,
  });
  const activeTindakLanjut = await mrApprovalService.findActiveByHistory({
    ActiveModel: MrPlanningTindakLanjut,
    history,
    historyForeignKey: "mr_planning_tindak_lanjut_id",
  });

  const verifikasiTargetOpdId = await resolveTindakLanjutTargetOpdId(activeTindakLanjut?.mr_planning_temuan_id ?? null);
  const verifikasiBoundary = await resolveMrPlanningLhpOpdBoundary({
    user: request?.user ?? null,
    targetOpdId: verifikasiTargetOpdId,
  });
  if (!verifikasiBoundary.ok) {
    throwMrPlanningLhpOpdBoundaryError(verifikasiBoundary);
  }

  return mrApprovalService.verifikasiHistory({
    sequelize,
    ActiveModel: MrPlanningTindakLanjut,
    HistoryModel: MrPlanningTindakLanjutHistory,
    historyId,
    userId,
    note,
    historyForeignKey: "mr_planning_tindak_lanjut_id",
    request,
  });
};

const approveHistory = ({ historyId, userId, note, request }) =>
  mrApprovalService.approveHistory({
    sequelize,
    ActiveModel: MrPlanningTindakLanjut,
    HistoryModel: MrPlanningTindakLanjutHistory,
    historyId,
    userId,
    note,
    historyForeignKey: "mr_planning_tindak_lanjut_id",
    request,
  });

const tolakHistory = ({ historyId, userId, note, request }) =>
  mrApprovalService.tolakHistory({
    sequelize,
    ActiveModel: MrPlanningTindakLanjut,
    HistoryModel: MrPlanningTindakLanjutHistory,
    historyId,
    userId,
    note,
    historyForeignKey: "mr_planning_tindak_lanjut_id",
    request,
  });

const getHistoryByTindakLanjut = ({ tindakLanjutId, status_revisi }) =>
  mrHistoryService.getHistoryByActiveId({
    HistoryModel: MrPlanningTindakLanjutHistory,
    activeId: tindakLanjutId,
    historyForeignKey: "mr_planning_tindak_lanjut_id",
    status_revisi,
  });

const getHistoryDetail = (historyId) =>
  mrHistoryService.getHistoryDetail({ HistoryModel: MrPlanningTindakLanjutHistory, historyId });

const listTindakLanjutByRekomendasi = async (rekomendasiId) => {
  return MrPlanningTindakLanjut.findAll({
    where: { mr_planning_temuan_rekomendasi_id: rekomendasiId, is_active: true },
    include: [{ model: MrReferenceItem, as: "status_tindak_lanjut_ref", required: false }],
    order: [["tanggal_pemantauan", "DESC"], ["id", "DESC"]],
  });
};

const getTindakLanjutDetail = async (tindakLanjutId) => {
  return findTindakLanjutOrFail(tindakLanjutId, {
    include: [{ model: MrReferenceItem, as: "status_tindak_lanjut_ref", required: false }],
  });
};

module.exports = {
  MrPlanningTindakLanjutServiceError,
  ALLOWED_CREATE_UPDATE_FIELDS,
  resolveTindakLanjutTargetOpdId,
  createTindakLanjutFromRekomendasi,
  updateDraftTindakLanjut,
  submitTindakLanjutForVerification,
  verifikasiHistory,
  approveHistory,
  tolakHistory,
  getHistoryByTindakLanjut,
  getHistoryDetail,
  listTindakLanjutByRekomendasi,
  getTindakLanjutDetail,
  findTindakLanjutOrFail,
};
