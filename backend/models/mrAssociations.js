"use strict";

/**
 * Enterprise MR Associations
 *
 * Guard:
 * - Semua relasi MR dipusatkan di file ini.
 * - Jangan pasang association MR di masing-masing model agar tidak duplicate alias.
 * - Association utama mengikuti FK final database.
 * - Association ke legacy/planning/user/division yang belum selalu punya FK database
 *   memakai constraints: false.
 * - Cross-system code backend wajib memakai e_pelara, bukan e-Pelara.
 */

const hasAssociation = (source, alias) => {
  return Boolean(source && alias && source.associations && source.associations[alias]);
};

const associate = (source, method, target, options = {}) => {
  if (!source || !target || typeof source[method] !== "function") return;

  const alias = options.as;
  if (alias && hasAssociation(source, alias)) {
    return;
  }

  source[method](target, options);
};

const belongsTo = (source, target, options = {}) => {
  associate(source, "belongsTo", target, options);
};

const hasMany = (source, target, options = {}) => {
  associate(source, "hasMany", target, options);
};

const hasOne = (source, target, options = {}) => {
  associate(source, "hasOne", target, options);
};

const applyMrAssociations = (models = {}) => {
  const {
    // =====================================================
    // MR FOUNDATION MASTER
    // =====================================================
    MrReferenceGroup,
    MrReferenceItem,
    MrRiskMatrix,

    // =====================================================
    // MR CONTEXT
    // =====================================================
    MrPlanningContext,
    MrPlanningContextItem,
    MrPlanningContextStakeholder,

    // =====================================================
    // MR TRANSACTION
    // =====================================================
    MrPlanningRisk,
    MrPlanningRiskHistory,
    MrPlanningRiskAnalysis,
    MrPlanningRootCause,
    MrPlanningMitigation,
    MrPlanningMitigationHistory,
    MrPlanningMitigationDocument,
    MrPlanningMonitoring,
    MrPlanningMonitoringHistory,
    MrPlanningMonitoringEvidence,
    MrPlanningDeviation,
    MrPlanningApprovalMonitoring,
    MrPlanningWarning,

    // =====================================================
    // GENERATED / OUTPUT / LINKAGE
    // =====================================================
    MrPlanningSnapshot,
    MrPlanningDashboardSummary,
    MrPlanningReportExport,
    MrCrossSystemLink,

    // =====================================================
    // MODUL TLHP (Tindak Lanjut Temuan Inspektorat/BPK/BPKP)
    // =====================================================
    MrPlanningLhp,
    MrPlanningTemuan,
    MrPlanningTemuanHistory,
    MrPlanningTemuanRekomendasi,
    MrPlanningTindakLanjut,
    MrPlanningTindakLanjutHistory,
    MrPlanningTindakLanjutDocument,

    // =====================================================
    // SUPPORTING MODELS
    // =====================================================
    User,
    Division,
    RenstraOPD,
    PeriodeRpjmd,
    IndikatorRenstra,
  } = models;

  // =====================================================
  // 1. REFERENCE FOUNDATION
  // =====================================================

  hasMany(MrReferenceGroup, MrReferenceItem, {
    foreignKey: "group_id",
    as: "items",
  });

  belongsTo(MrReferenceItem, MrReferenceGroup, {
    foreignKey: "group_id",
    as: "group",
  });

  hasMany(MrReferenceItem, MrReferenceItem, {
    foreignKey: "parent_item_id",
    as: "children",
  });

  belongsTo(MrReferenceItem, MrReferenceItem, {
    foreignKey: "parent_item_id",
    as: "parent",
  });

  // Risk matrix references
  belongsTo(MrRiskMatrix, MrReferenceItem, {
    foreignKey: "likelihood_ref_id",
    as: "likelihood_ref",
  });

  belongsTo(MrRiskMatrix, MrReferenceItem, {
    foreignKey: "impact_ref_id",
    as: "impact_ref",
  });

  belongsTo(MrRiskMatrix, MrReferenceItem, {
    foreignKey: "level_risiko_ref_id",
    as: "level_risiko_ref",
  });

  hasMany(MrReferenceItem, MrRiskMatrix, {
    foreignKey: "likelihood_ref_id",
    as: "risk_matrix_likelihoods",
  });

  hasMany(MrReferenceItem, MrRiskMatrix, {
    foreignKey: "impact_ref_id",
    as: "risk_matrix_impacts",
  });

  hasMany(MrReferenceItem, MrRiskMatrix, {
    foreignKey: "level_risiko_ref_id",
    as: "risk_matrix_levels",
  });

  // =====================================================
  // 2. PLANNING CONTEXT
  // =====================================================

  hasMany(MrPlanningContext, MrPlanningContextItem, {
    foreignKey: "mr_planning_context_id",
    as: "items",
  });

  belongsTo(MrPlanningContextItem, MrPlanningContext, {
    foreignKey: "mr_planning_context_id",
    as: "context",
  });

  hasMany(MrPlanningContext, MrPlanningContextStakeholder, {
    foreignKey: "mr_planning_context_id",
    as: "stakeholders",
  });

  belongsTo(MrPlanningContextStakeholder, MrPlanningContext, {
    foreignKey: "mr_planning_context_id",
    as: "context",
  });

  belongsTo(MrPlanningContext, MrReferenceItem, {
    foreignKey: "selera_risiko_ref_id",
    as: "selera_risiko_ref",
  });

  belongsTo(MrPlanningContextItem, MrReferenceItem, {
    foreignKey: "jenis_konteks_ref_id",
    as: "jenis_konteks_ref",
  });

  belongsTo(MrPlanningContextStakeholder, MrReferenceItem, {
    foreignKey: "jenis_pemangku_kepentingan_ref_id",
    as: "jenis_pemangku_kepentingan_ref",
  });

  // Legacy/supporting references for context. Constraints false because not all
  // legacy technical ids are FK-locked in DB.
  belongsTo(MrPlanningContext, PeriodeRpjmd, {
    foreignKey: "periode_id",
    as: "periode",
    constraints: false,
  });

  belongsTo(MrPlanningContext, RenstraOPD, {
    foreignKey: "renstra_id",
    as: "renstra",
    constraints: false,
  });

  belongsTo(MrPlanningContext, User, {
    foreignKey: "owner_user_id",
    as: "owner_user",
    constraints: false,
  });

  belongsTo(MrPlanningContext, Division, {
    foreignKey: "owner_division_id",
    as: "owner_division",
    constraints: false,
  });

  belongsTo(MrPlanningContext, User, {
    foreignKey: "pemilik_risiko_user_id",
    as: "pemilik_risiko_user",
    constraints: false,
  });

  belongsTo(MrPlanningContext, User, {
    foreignKey: "koordinator_user_id",
    as: "koordinator_user",
    constraints: false,
  });

  belongsTo(MrPlanningContextItem, IndikatorRenstra, {
    foreignKey: "indikator_id",
    as: "indikator_detail",
    constraints: false,
  });

  belongsTo(MrPlanningContextItem, RenstraOPD, {
    foreignKey: "renstra_id",
    as: "renstra",
    constraints: false,
  });

  // =====================================================
  // 3. RISK REGISTER
  // =====================================================

  hasMany(MrPlanningContext, MrPlanningRisk, {
    foreignKey: "context_id",
    as: "risks",
  });

  belongsTo(MrPlanningRisk, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  hasMany(MrPlanningRisk, MrPlanningRiskHistory, {
    foreignKey: "mr_planning_risk_id",
    as: "histories",
  });

  belongsTo(MrPlanningRiskHistory, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
  });

  belongsTo(MrPlanningRiskHistory, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  belongsTo(MrPlanningRisk, MrReferenceItem, {
    foreignKey: "kategori_risiko_ref_id",
    as: "kategori_risiko_ref",
  });

  belongsTo(MrPlanningRisk, MrReferenceItem, {
    foreignKey: "sumber_risiko_ref_id",
    as: "sumber_risiko_ref",
  });

  belongsTo(MrPlanningRisk, MrReferenceItem, {
    foreignKey: "kemungkinan_ref_id",
    as: "kemungkinan_ref",
  });

  belongsTo(MrPlanningRisk, MrReferenceItem, {
    foreignKey: "dampak_ref_id",
    as: "dampak_ref",
  });

  belongsTo(MrPlanningRisk, MrReferenceItem, {
    foreignKey: "level_risiko_ref_id",
    as: "level_risiko_ref",
  });

  belongsTo(MrPlanningRisk, MrReferenceItem, {
    foreignKey: "selera_risiko_ref_id",
    as: "selera_risiko_ref",
  });

  belongsTo(MrPlanningRisk, MrReferenceItem, {
    foreignKey: "status_risiko_ref_id",
    as: "status_risiko_ref",
  });

  belongsTo(MrPlanningRisk, MrRiskMatrix, {
    foreignKey: "matrix_id",
    as: "risk_matrix",
  });

  // Legacy/supporting references
  belongsTo(MrPlanningRisk, IndikatorRenstra, {
    foreignKey: "indikator_id",
    as: "indikator_detail",
    constraints: false,
  });

  belongsTo(MrPlanningRisk, RenstraOPD, {
    foreignKey: "renstra_id",
    as: "renstra",
    constraints: false,
  });

  belongsTo(MrPlanningRisk, PeriodeRpjmd, {
    foreignKey: "periode_id",
    as: "periode",
    constraints: false,
  });

  belongsTo(MrPlanningRisk, User, {
    foreignKey: "owner_user_id",
    as: "owner_user",
    constraints: false,
  });

  belongsTo(MrPlanningRisk, Division, {
    foreignKey: "owner_division_id",
    as: "owner_division",
    constraints: false,
  });

  // =====================================================
  // 4. RISK ANALYSIS
  // =====================================================

  hasMany(MrPlanningRisk, MrPlanningRiskAnalysis, {
    foreignKey: "mr_planning_risk_id",
    as: "analyses",
  });

  belongsTo(MrPlanningRiskAnalysis, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
  });

  hasMany(MrPlanningContext, MrPlanningRiskAnalysis, {
    foreignKey: "mr_planning_context_id",
    as: "risk_analyses",
  });

  belongsTo(MrPlanningRiskAnalysis, MrPlanningContext, {
    foreignKey: "mr_planning_context_id",
    as: "context",
  });

  belongsTo(MrPlanningRiskAnalysis, MrReferenceItem, {
    foreignKey: "existing_control_status_ref_id",
    as: "existing_control_status_ref",
  });

  belongsTo(MrPlanningRiskAnalysis, MrReferenceItem, {
    foreignKey: "control_adequacy_ref_id",
    as: "control_adequacy_ref",
  });

  belongsTo(MrPlanningRiskAnalysis, MrReferenceItem, {
    foreignKey: "inherent_likelihood_ref_id",
    as: "inherent_likelihood_ref",
  });

  belongsTo(MrPlanningRiskAnalysis, MrReferenceItem, {
    foreignKey: "inherent_impact_ref_id",
    as: "inherent_impact_ref",
  });

  belongsTo(MrPlanningRiskAnalysis, MrReferenceItem, {
    foreignKey: "inherent_level_ref_id",
    as: "inherent_level_ref",
  });

  belongsTo(MrPlanningRiskAnalysis, MrReferenceItem, {
    foreignKey: "residual_likelihood_ref_id",
    as: "residual_likelihood_ref",
  });

  belongsTo(MrPlanningRiskAnalysis, MrReferenceItem, {
    foreignKey: "residual_impact_ref_id",
    as: "residual_impact_ref",
  });

  belongsTo(MrPlanningRiskAnalysis, MrReferenceItem, {
    foreignKey: "residual_level_ref_id",
    as: "residual_level_ref",
  });

  belongsTo(MrPlanningRiskAnalysis, MrReferenceItem, {
    foreignKey: "selera_risiko_ref_id",
    as: "selera_risiko_ref",
  });

  belongsTo(MrPlanningRiskAnalysis, User, {
    foreignKey: "owner_user_id",
    as: "owner_user",
    constraints: false,
  });

  belongsTo(MrPlanningRiskAnalysis, Division, {
    foreignKey: "owner_division_id",
    as: "owner_division",
    constraints: false,
  });

  // =====================================================
  // 5. ROOT CAUSE
  // =====================================================

  hasMany(MrPlanningRisk, MrPlanningRootCause, {
    foreignKey: "mr_planning_risk_id",
    as: "root_causes",
  });

  belongsTo(MrPlanningRootCause, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
  });

  hasMany(MrPlanningRiskAnalysis, MrPlanningRootCause, {
    foreignKey: "mr_planning_risk_analysis_id",
    as: "root_causes",
  });

  belongsTo(MrPlanningRootCause, MrPlanningRiskAnalysis, {
    foreignKey: "mr_planning_risk_analysis_id",
    as: "analysis",
  });

  hasMany(MrPlanningContext, MrPlanningRootCause, {
    foreignKey: "mr_planning_context_id",
    as: "root_causes",
  });

  belongsTo(MrPlanningRootCause, MrPlanningContext, {
    foreignKey: "mr_planning_context_id",
    as: "context",
  });

  belongsTo(MrPlanningRootCause, MrReferenceItem, {
    foreignKey: "jenis_penyebab_ref_id",
    as: "jenis_penyebab_ref",
  });

  belongsTo(MrPlanningRootCause, MrReferenceItem, {
    foreignKey: "kategori_penyebab_ref_id",
    as: "kategori_penyebab_ref",
  });

  belongsTo(MrPlanningRootCause, User, {
    foreignKey: "owner_user_id",
    as: "owner_user",
    constraints: false,
  });

  belongsTo(MrPlanningRootCause, Division, {
    foreignKey: "owner_division_id",
    as: "owner_division",
    constraints: false,
  });

  // =====================================================
  // 6. MITIGATION
  // =====================================================

  hasMany(MrPlanningRisk, MrPlanningMitigation, {
    foreignKey: "mr_planning_risk_id",
    as: "mitigations",
  });

  belongsTo(MrPlanningMitigation, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
  });

  hasMany(MrPlanningContext, MrPlanningMitigation, {
    foreignKey: "context_id",
    as: "mitigations",
  });

  belongsTo(MrPlanningMitigation, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  hasMany(MrPlanningRiskAnalysis, MrPlanningMitigation, {
    foreignKey: "risk_analysis_id",
    as: "mitigations",
  });

  belongsTo(MrPlanningMitigation, MrPlanningRiskAnalysis, {
    foreignKey: "risk_analysis_id",
    as: "analysis",
  });

  hasMany(MrPlanningRootCause, MrPlanningMitigation, {
    foreignKey: "root_cause_id",
    as: "mitigations",
  });

  belongsTo(MrPlanningMitigation, MrPlanningRootCause, {
    foreignKey: "root_cause_id",
    as: "root_cause",
  });

  hasMany(MrPlanningMitigation, MrPlanningMitigationHistory, {
    foreignKey: "mr_planning_mitigation_id",
    as: "histories",
  });

  belongsTo(MrPlanningMitigationHistory, MrPlanningMitigation, {
    foreignKey: "mr_planning_mitigation_id",
    as: "mitigation",
  });

  belongsTo(MrPlanningMitigationHistory, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  belongsTo(MrPlanningMitigationHistory, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
  });

  belongsTo(MrPlanningMitigationHistory, MrPlanningRootCause, {
    foreignKey: "root_cause_id",
    as: "root_cause",
  });

  // Dokumen Rencana Tindak Pengendalian
  // Guard:
  // - Dokumen RTP berbeda dari bukti realisasi monitoring.
  // - Dokumen ini mencakup SK Tim, Surat Tugas, Dokumen Rencana Aksi,
  //   dan Dokumen Pendukung Rencana Pengendalian.
  // - Bukti realisasi aktual tetap masuk modul Monitoring/Realisasi.
  hasMany(MrPlanningMitigation, MrPlanningMitigationDocument, {
    foreignKey: "mr_planning_mitigation_id",
    as: "documents",
  });

  belongsTo(MrPlanningMitigationDocument, MrPlanningMitigation, {
    foreignKey: "mr_planning_mitigation_id",
    as: "mitigation",
  });

  hasMany(MrPlanningRisk, MrPlanningMitigationDocument, {
    foreignKey: "mr_planning_risk_id",
    as: "mitigation_documents",
  });

  belongsTo(MrPlanningMitigationDocument, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
  });

  hasMany(MrPlanningContext, MrPlanningMitigationDocument, {
    foreignKey: "context_id",
    as: "mitigation_documents",
  });

  belongsTo(MrPlanningMitigationDocument, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  belongsTo(MrPlanningMitigation, MrReferenceItem, {
    foreignKey: "respon_risiko_ref_id",
    as: "respon_risiko_ref",
  });

  belongsTo(MrPlanningMitigation, MrReferenceItem, {
    foreignKey: "unsur_spip_ref_id",
    as: "unsur_spip_ref",
  });

  belongsTo(MrPlanningMitigation, MrReferenceItem, {
    foreignKey: "sub_unsur_spip_ref_id",
    as: "sub_unsur_spip_ref",
  });

  belongsTo(MrPlanningMitigation, MrReferenceItem, {
    foreignKey: "output_rtp_ref_id",
    as: "output_rtp_ref",
  });

  belongsTo(MrPlanningMitigation, MrReferenceItem, {
    foreignKey: "risk_after_mitigation_likelihood_ref_id",
    as: "risk_after_likelihood_ref",
  });

  belongsTo(MrPlanningMitigation, MrReferenceItem, {
    foreignKey: "risk_after_mitigation_impact_ref_id",
    as: "risk_after_impact_ref",
  });

  belongsTo(MrPlanningMitigation, MrReferenceItem, {
    foreignKey: "risk_after_mitigation_level_ref_id",
    as: "risk_after_level_ref",
  });

  belongsTo(MrPlanningMitigation, MrCrossSystemLink, {
    foreignKey: "cross_system_link_id",
    as: "cross_system_link",
  });

  belongsTo(MrPlanningMitigation, User, {
    foreignKey: "owner_user_id",
    as: "owner_user",
    constraints: false,
  });

  belongsTo(MrPlanningMitigation, Division, {
    foreignKey: "owner_division_id",
    as: "owner_division",
    constraints: false,
  });

  // =====================================================
  // 7. MONITORING / EVENT / EFFECTIVENESS
  // =====================================================

  hasMany(MrPlanningRisk, MrPlanningMonitoring, {
    foreignKey: "mr_planning_risk_id",
    as: "monitorings",
  });

  belongsTo(MrPlanningMonitoring, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
  });

  hasMany(MrPlanningMitigation, MrPlanningMonitoring, {
    foreignKey: "mr_planning_mitigation_id",
    as: "monitorings",
  });

  belongsTo(MrPlanningMonitoring, MrPlanningMitigation, {
    foreignKey: "mr_planning_mitigation_id",
    as: "mitigation",
  });

  hasMany(MrPlanningContext, MrPlanningMonitoring, {
    foreignKey: "context_id",
    as: "monitorings",
  });

  belongsTo(MrPlanningMonitoring, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  hasMany(MrPlanningMonitoring, MrPlanningMonitoringHistory, {
    foreignKey: "mr_planning_monitoring_id",
    as: "histories",
  });

  belongsTo(MrPlanningMonitoringHistory, MrPlanningMonitoring, {
    foreignKey: "mr_planning_monitoring_id",
    as: "monitoring",
  });

  belongsTo(MrPlanningMonitoringHistory, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  belongsTo(MrPlanningMonitoringHistory, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
  });

  belongsTo(MrPlanningMonitoringHistory, MrPlanningMitigation, {
    foreignKey: "mr_planning_mitigation_id",
    as: "mitigation",
  });

    // Bukti Realisasi Aktual Monitoring/Realisasi
  // Guard:
  // - Bukti realisasi aktual berbeda dari Dokumen RTP.
  // - Dokumen RTP tetap berada di mr_planning_mitigation_documents.
  // - Bukti realisasi aktual berada di mr_planning_monitoring_evidence.
  // - Bukti wajib melekat ke monitoring/realisasi.
  // - Tidak ada hard delete; pembatalan memakai soft cancel.
  hasMany(MrPlanningMonitoring, MrPlanningMonitoringEvidence, {
    foreignKey: "mr_planning_monitoring_id",
    as: "evidences",
  });

  belongsTo(MrPlanningMonitoringEvidence, MrPlanningMonitoring, {
    foreignKey: "mr_planning_monitoring_id",
    as: "monitoring",
  });

  hasMany(MrPlanningMitigation, MrPlanningMonitoringEvidence, {
    foreignKey: "mr_planning_mitigation_id",
    as: "monitoring_evidences",
  });

  belongsTo(MrPlanningMonitoringEvidence, MrPlanningMitigation, {
    foreignKey: "mr_planning_mitigation_id",
    as: "mitigation",
  });

  hasMany(MrPlanningRisk, MrPlanningMonitoringEvidence, {
    foreignKey: "mr_planning_risk_id",
    as: "monitoring_evidences",
  });

  belongsTo(MrPlanningMonitoringEvidence, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
  });

  hasMany(MrPlanningContext, MrPlanningMonitoringEvidence, {
    foreignKey: "context_id",
    as: "monitoring_evidences",
  });

  belongsTo(MrPlanningMonitoringEvidence, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  belongsTo(MrPlanningMonitoring, MrReferenceItem, {
    foreignKey: "status_realisasi_ref_id",
    as: "status_realisasi_ref",
  });

  belongsTo(MrPlanningMonitoring, MrReferenceItem, {
    foreignKey: "jenis_penyebab_ref_id",
    as: "jenis_penyebab_ref",
  });

  belongsTo(MrPlanningMonitoring, MrReferenceItem, {
    foreignKey: "actual_likelihood_ref_id",
    as: "actual_likelihood_ref",
  });

  belongsTo(MrPlanningMonitoring, MrReferenceItem, {
    foreignKey: "actual_impact_ref_id",
    as: "actual_impact_ref",
  });

  belongsTo(MrPlanningMonitoring, MrReferenceItem, {
    foreignKey: "actual_level_ref_id",
    as: "actual_level_ref",
  });

  belongsTo(MrPlanningMonitoring, MrReferenceItem, {
    foreignKey: "efektivitas_pengendalian_ref_id",
    as: "efektivitas_pengendalian_ref",
  });

  belongsTo(MrPlanningMonitoring, User, {
    foreignKey: "owner_user_id",
    as: "owner_user",
    constraints: false,
  });

  belongsTo(MrPlanningMonitoring, Division, {
    foreignKey: "owner_division_id",
    as: "owner_division",
    constraints: false,
  });

  belongsTo(MrPlanningMonitoring, User, {
    foreignKey: "evaluator_user_id",
    as: "evaluator_user",
    constraints: false,
  });

  // =====================================================
  // 8. DEVIATION
  // =====================================================

  hasMany(MrPlanningContext, MrPlanningDeviation, {
    foreignKey: "context_id",
    as: "deviations",
  });

  belongsTo(MrPlanningDeviation, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  hasMany(MrPlanningRisk, MrPlanningDeviation, {
    foreignKey: "mr_planning_risk_id",
    as: "deviations",
  });

  belongsTo(MrPlanningDeviation, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
  });

  hasMany(MrPlanningMonitoring, MrPlanningDeviation, {
    foreignKey: "mr_planning_monitoring_id",
    as: "deviations",
  });

  belongsTo(MrPlanningDeviation, MrPlanningMonitoring, {
    foreignKey: "mr_planning_monitoring_id",
    as: "monitoring",
  });

  belongsTo(MrPlanningDeviation, MrReferenceItem, {
    foreignKey: "severity_ref_id",
    as: "severity_ref",
  });

  belongsTo(MrPlanningDeviation, User, {
    foreignKey: "owner_user_id",
    as: "owner_user",
    constraints: false,
  });

  belongsTo(MrPlanningDeviation, Division, {
    foreignKey: "owner_division_id",
    as: "owner_division",
    constraints: false,
  });

  // =====================================================
  // 9. APPROVAL TRACKING
  // =====================================================

  hasMany(MrPlanningContext, MrPlanningApprovalMonitoring, {
    foreignKey: "context_id",
    as: "approvals",
  });

  belongsTo(MrPlanningApprovalMonitoring, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  hasMany(MrPlanningRisk, MrPlanningApprovalMonitoring, {
    foreignKey: "mr_planning_risk_id",
    as: "approvals",
  });

  belongsTo(MrPlanningApprovalMonitoring, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
  });

  // Polymorphic/source approval references remain generic by source_table/source_id.
  // Do not force belongsTo for every possible source to avoid invalid FK assumptions.

  // =====================================================
  // 10. WARNING
  // =====================================================

  hasMany(MrPlanningContext, MrPlanningWarning, {
    foreignKey: "context_id",
    as: "warnings",
  });

  belongsTo(MrPlanningWarning, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  hasMany(MrPlanningRisk, MrPlanningWarning, {
    foreignKey: "mr_planning_risk_id",
    as: "warnings",
  });

  belongsTo(MrPlanningWarning, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
  });

  hasMany(MrPlanningMitigation, MrPlanningWarning, {
    foreignKey: "mr_planning_mitigation_id",
    as: "warnings",
  });

  belongsTo(MrPlanningWarning, MrPlanningMitigation, {
    foreignKey: "mr_planning_mitigation_id",
    as: "mitigation",
  });

  hasMany(MrPlanningMonitoring, MrPlanningWarning, {
    foreignKey: "mr_planning_monitoring_id",
    as: "warnings",
  });

  belongsTo(MrPlanningWarning, MrPlanningMonitoring, {
    foreignKey: "mr_planning_monitoring_id",
    as: "monitoring",
  });

  belongsTo(MrPlanningWarning, MrPlanningSnapshot, {
    foreignKey: "related_snapshot_id",
    as: "snapshot",
  });

  hasMany(MrPlanningSnapshot, MrPlanningWarning, {
    foreignKey: "related_snapshot_id",
    as: "warnings",
  });

  belongsTo(MrPlanningWarning, MrReferenceItem, {
    foreignKey: "severity_ref_id",
    as: "severity_ref",
  });

  belongsTo(MrPlanningWarning, User, {
    foreignKey: "owner_user_id",
    as: "owner_user",
    constraints: false,
  });

  belongsTo(MrPlanningWarning, Division, {
    foreignKey: "owner_division_id",
    as: "owner_division",
    constraints: false,
  });

  // =====================================================
  // 11. SNAPSHOT
  // =====================================================

  hasMany(MrPlanningContext, MrPlanningSnapshot, {
    foreignKey: "context_id",
    as: "snapshots",
  });

  belongsTo(MrPlanningSnapshot, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  belongsTo(MrPlanningSnapshot, RenstraOPD, {
    foreignKey: "renstra_id",
    as: "renstra",
    constraints: false,
  });

  // =====================================================
  // 12. DASHBOARD SUMMARY
  // =====================================================

  hasMany(MrPlanningContext, MrPlanningDashboardSummary, {
    foreignKey: "context_id",
    as: "dashboard_summaries",
  });

  belongsTo(MrPlanningDashboardSummary, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  hasMany(MrPlanningSnapshot, MrPlanningDashboardSummary, {
    foreignKey: "last_snapshot_id",
    as: "dashboard_summaries",
  });

  belongsTo(MrPlanningDashboardSummary, MrPlanningSnapshot, {
    foreignKey: "last_snapshot_id",
    as: "last_snapshot",
  });

  belongsTo(MrPlanningDashboardSummary, RenstraOPD, {
    foreignKey: "renstra_id",
    as: "renstra",
    constraints: false,
  });

  // =====================================================
  // 13. CROSS SYSTEM LINK
  // =====================================================

  hasMany(MrPlanningContext, MrCrossSystemLink, {
    foreignKey: "context_id",
    as: "cross_system_links",
  });

  belongsTo(MrCrossSystemLink, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  hasMany(MrPlanningRisk, MrCrossSystemLink, {
    foreignKey: "mr_planning_risk_id",
    as: "cross_system_links",
  });

  belongsTo(MrCrossSystemLink, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
  });

  hasMany(MrPlanningMitigation, MrCrossSystemLink, {
    foreignKey: "mr_planning_mitigation_id",
    as: "cross_system_links",
  });

  belongsTo(MrCrossSystemLink, MrPlanningMitigation, {
    foreignKey: "mr_planning_mitigation_id",
    as: "mitigation",
  });

  hasMany(MrPlanningMonitoring, MrCrossSystemLink, {
    foreignKey: "mr_planning_monitoring_id",
    as: "cross_system_links",
  });

  belongsTo(MrCrossSystemLink, MrPlanningMonitoring, {
    foreignKey: "mr_planning_monitoring_id",
    as: "monitoring",
  });

  // Legacy polymorphic linkage via source_table/source_id.
  // Kept only as compatibility helper. Use direct mr_planning_*_id fields for new service.
  hasMany(MrPlanningRisk, MrCrossSystemLink, {
    foreignKey: "source_id",
    as: "legacy_source_links",
    constraints: false,
    scope: {
      source_system: "e_pelara",
      source_table: "mr_planning_risk",
    },
  });

  // =====================================================
  // 14. REPORT EXPORT
  // =====================================================

  hasMany(MrPlanningContext, MrPlanningReportExport, {
    foreignKey: "context_id",
    as: "report_exports",
  });

  belongsTo(MrPlanningReportExport, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
  });

  hasMany(MrPlanningSnapshot, MrPlanningReportExport, {
    foreignKey: "snapshot_id",
    as: "report_exports",
  });

  belongsTo(MrPlanningReportExport, MrPlanningSnapshot, {
    foreignKey: "snapshot_id",
    as: "snapshot",
  });

  hasMany(MrPlanningDashboardSummary, MrPlanningReportExport, {
    foreignKey: "dashboard_summary_id",
    as: "report_exports",
  });

  belongsTo(MrPlanningReportExport, MrPlanningDashboardSummary, {
    foreignKey: "dashboard_summary_id",
    as: "dashboard_summary",
  });

  hasMany(MrCrossSystemLink, MrPlanningReportExport, {
    foreignKey: "cross_system_link_id",
    as: "report_exports",
  });

  belongsTo(MrPlanningReportExport, MrCrossSystemLink, {
    foreignKey: "cross_system_link_id",
    as: "cross_system_link",
  });

  belongsTo(MrPlanningReportExport, User, {
    foreignKey: "owner_user_id",
    as: "owner_user",
    constraints: false,
  });

  belongsTo(MrPlanningReportExport, Division, {
    foreignKey: "owner_division_id",
    as: "owner_division",
    constraints: false,
  });

  // =====================================================
  // 15. MODUL TLHP — LHP -> Temuan -> Rekomendasi -> Tindak Lanjut
  // =====================================================

  hasMany(MrPlanningContext, MrPlanningLhp, {
    foreignKey: "context_id",
    as: "lhps",
    constraints: false,
  });

  belongsTo(MrPlanningLhp, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
    constraints: false,
  });

  belongsTo(MrPlanningLhp, MrReferenceItem, {
    foreignKey: "entitas_pemeriksa_ref_id",
    as: "entitas_pemeriksa_ref",
  });

  belongsTo(MrPlanningLhp, MrReferenceItem, {
    foreignKey: "jenis_pemeriksaan_ref_id",
    as: "jenis_pemeriksaan_ref",
  });

  // --- Temuan ---
  hasMany(MrPlanningLhp, MrPlanningTemuan, {
    foreignKey: "mr_planning_lhp_id",
    as: "temuans",
  });

  belongsTo(MrPlanningTemuan, MrPlanningLhp, {
    foreignKey: "mr_planning_lhp_id",
    as: "lhp",
  });

  belongsTo(MrPlanningTemuan, MrReferenceItem, {
    foreignKey: "entitas_pemeriksa_ref_id",
    as: "entitas_pemeriksa_ref",
  });

  belongsTo(MrPlanningTemuan, MrReferenceItem, {
    foreignKey: "kategori_temuan_ref_id",
    as: "kategori_temuan_ref",
  });

  belongsTo(MrPlanningTemuan, MrReferenceItem, {
    foreignKey: "unsur_spip_ref_id",
    as: "unsur_spip_ref",
  });

  belongsTo(MrPlanningTemuan, MrPlanningRisk, {
    foreignKey: "mr_planning_risk_id",
    as: "risk",
    constraints: false,
  });

  hasMany(MrPlanningRisk, MrPlanningTemuan, {
    foreignKey: "mr_planning_risk_id",
    as: "temuans",
    constraints: false,
  });

  belongsTo(MrPlanningTemuan, MrCrossSystemLink, {
    foreignKey: "cross_system_link_id",
    as: "escalation_link",
    constraints: false,
  });

  hasMany(MrPlanningTemuan, MrPlanningTemuanHistory, {
    foreignKey: "mr_planning_temuan_id",
    as: "histories",
  });

  belongsTo(MrPlanningTemuanHistory, MrPlanningTemuan, {
    foreignKey: "mr_planning_temuan_id",
    as: "temuan",
  });

  belongsTo(MrPlanningTemuanHistory, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
    constraints: false,
  });

  // --- Rekomendasi ---
  hasMany(MrPlanningTemuan, MrPlanningTemuanRekomendasi, {
    foreignKey: "mr_planning_temuan_id",
    as: "rekomendasis",
  });

  belongsTo(MrPlanningTemuanRekomendasi, MrPlanningTemuan, {
    foreignKey: "mr_planning_temuan_id",
    as: "temuan",
  });

  hasMany(MrPlanningLhp, MrPlanningTemuanRekomendasi, {
    foreignKey: "mr_planning_lhp_id",
    as: "rekomendasis",
  });

  belongsTo(MrPlanningTemuanRekomendasi, MrPlanningLhp, {
    foreignKey: "mr_planning_lhp_id",
    as: "lhp",
  });

  belongsTo(MrPlanningTemuanRekomendasi, MrReferenceItem, {
    foreignKey: "status_tindak_lanjut_ref_id",
    as: "status_tindak_lanjut_ref",
  });

  // --- Tindak Lanjut ---
  hasMany(MrPlanningTemuanRekomendasi, MrPlanningTindakLanjut, {
    foreignKey: "mr_planning_temuan_rekomendasi_id",
    as: "tindak_lanjuts",
  });

  belongsTo(MrPlanningTindakLanjut, MrPlanningTemuanRekomendasi, {
    foreignKey: "mr_planning_temuan_rekomendasi_id",
    as: "rekomendasi",
  });

  belongsTo(MrPlanningTindakLanjut, MrPlanningTemuan, {
    foreignKey: "mr_planning_temuan_id",
    as: "temuan",
  });

  belongsTo(MrPlanningTindakLanjut, MrPlanningLhp, {
    foreignKey: "mr_planning_lhp_id",
    as: "lhp",
  });

  belongsTo(MrPlanningTindakLanjut, MrReferenceItem, {
    foreignKey: "status_tindak_lanjut_ref_id",
    as: "status_tindak_lanjut_ref",
  });

  hasMany(MrPlanningTindakLanjut, MrPlanningTindakLanjutHistory, {
    foreignKey: "mr_planning_tindak_lanjut_id",
    as: "histories",
  });

  belongsTo(MrPlanningTindakLanjutHistory, MrPlanningTindakLanjut, {
    foreignKey: "mr_planning_tindak_lanjut_id",
    as: "tindak_lanjut",
  });

  belongsTo(MrPlanningTindakLanjutHistory, MrPlanningContext, {
    foreignKey: "context_id",
    as: "context",
    constraints: false,
  });

  // --- Tindak Lanjut documents (mirrors mitigation documents wiring) ---
  hasMany(MrPlanningTindakLanjut, MrPlanningTindakLanjutDocument, {
    foreignKey: "mr_planning_tindak_lanjut_id",
    as: "documents",
  });

  belongsTo(MrPlanningTindakLanjutDocument, MrPlanningTindakLanjut, {
    foreignKey: "mr_planning_tindak_lanjut_id",
    as: "tindak_lanjut",
  });

  hasMany(MrPlanningTemuanRekomendasi, MrPlanningTindakLanjutDocument, {
    foreignKey: "mr_planning_temuan_rekomendasi_id",
    as: "tindak_lanjut_documents",
  });

  hasMany(MrPlanningTemuan, MrPlanningTindakLanjutDocument, {
    foreignKey: "mr_planning_temuan_id",
    as: "tindak_lanjut_documents",
  });
};

module.exports = applyMrAssociations;