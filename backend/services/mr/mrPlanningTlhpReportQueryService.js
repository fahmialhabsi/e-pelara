// backend/services/mr/mrPlanningTlhpReportQueryService.js

"use strict";

/**
 * Query service untuk "Laporan Pemantauan TLHP".
 *
 * Berbeda dari Laporan MR (mrPlanningReportQueryService.js) yang selalu
 * di-scope oleh satu context_id, TLHP tidak selalu 1:1 dengan satu
 * MrPlanningContext (LHP.context_id nullable — baru terisi per Temuan begitu
 * Temuan itu dieskalasi jadi Risk). Laporan ini karena itu di-scope oleh
 * FILTER (tahun wajib, opd_id/entitas_pemeriksa_ref_id/lhp_id opsional),
 * bukan oleh satu context id.
 */

const { Op } = require("sequelize");
const {
  sequelize,
  MrPlanningLhp,
  MrPlanningTemuan,
  MrPlanningTemuanRekomendasi,
  MrPlanningTindakLanjut,
  MrPlanningTindakLanjutDocument,
  MrReferenceItem,
} = require("../../models");

class MrPlanningTlhpReportError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "MrPlanningTlhpReportError";
    this.status = options.status || 400;
    this.statusCode = options.status || 400;
    this.code = options.code || "MR_TLHP_REPORT_ERROR";
  }
}

const resolveScope = ({ tahun, opd_id, entitas_pemeriksa_ref_id, lhp_id } = {}) => {
  if (!tahun) {
    throw new MrPlanningTlhpReportError("Parameter tahun wajib diisi.", {
      status: 400,
      code: "MR_TLHP_REPORT_TAHUN_REQUIRED",
    });
  }

  return {
    tahun: Number(tahun),
    opd_id: opd_id ? Number(opd_id) : null,
    entitas_pemeriksa_ref_id: entitas_pemeriksa_ref_id ? Number(entitas_pemeriksa_ref_id) : null,
    lhp_id: lhp_id ? Number(lhp_id) : null,
  };
};

const buildLhpWhere = (scope) => {
  const where = { tahun: scope.tahun, is_active: true };

  if (scope.opd_id) where.opd_id = scope.opd_id;
  if (scope.entitas_pemeriksa_ref_id) where.entitas_pemeriksa_ref_id = scope.entitas_pemeriksa_ref_id;
  if (scope.lhp_id) where.id = scope.lhp_id;

  return where;
};

const getLhpListForScope = async (scope) => {
  return MrPlanningLhp.findAll({
    where: buildLhpWhere(scope),
    order: [["tanggal_lhp", "DESC"], ["id", "DESC"]],
  });
};

const getTemuanRekomendasiDetail = async (lhpIds) => {
  if (!lhpIds.length) return [];

  const temuans = await MrPlanningTemuan.findAll({
    where: { mr_planning_lhp_id: { [Op.in]: lhpIds } },
    include: [
      {
        model: MrPlanningTemuanRekomendasi,
        as: "rekomendasis",
        required: false,
        where: { is_active: true },
        include: [
          { model: MrReferenceItem, as: "status_tindak_lanjut_ref", required: false },
        ],
      },
    ],
    order: [["id", "ASC"]],
  });

  const rows = [];

  temuans.forEach((temuan) => {
    const rekomendasis = temuan.rekomendasis || [];

    if (!rekomendasis.length) {
      rows.push({
        temuan,
        rekomendasi: null,
      });
      return;
    }

    rekomendasis.forEach((rekomendasi) => {
      rows.push({ temuan, rekomendasi });
    });
  });

  return rows;
};

const getEvidenceCountsByRekomendasi = async (rekomendasiIds) => {
  if (!rekomendasiIds.length) return {};

  const counts = await MrPlanningTindakLanjutDocument.findAll({
    where: {
      mr_planning_temuan_rekomendasi_id: { [Op.in]: rekomendasiIds },
      is_active: true,
    },
    attributes: [
      "mr_planning_temuan_rekomendasi_id",
      [sequelize.fn("COUNT", sequelize.col("id")), "total"],
    ],
    group: ["mr_planning_temuan_rekomendasi_id"],
    raw: true,
  });

  return counts.reduce((acc, row) => {
    acc[row.mr_planning_temuan_rekomendasi_id] = Number(row.total) || 0;
    return acc;
  }, {});
};

const getSummary = async (scope) => {
  const lhpList = await getLhpListForScope(scope);
  const lhpIds = lhpList.map((l) => l.id);
  const detail = await getTemuanRekomendasiDetail(lhpIds);

  const rekomendasiRows = detail.filter((r) => r.rekomendasi).map((r) => r.rekomendasi);

  const byStatus = rekomendasiRows.reduce((acc, r) => {
    const key = r.status_tindak_lanjut || "Belum Ditindaklanjuti";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const byEntitas = detail.reduce((acc, r) => {
    const key = r.temuan.entitas_pemeriksa || "Lainnya";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalRekomendasi = rekomendasiRows.length;
  const selesai = rekomendasiRows.filter((r) => r.status_tindak_lanjut === "Sesuai/Selesai").length;
  const capaianPersen = totalRekomendasi > 0 ? Math.round((selesai / totalRekomendasi) * 10000) / 100 : 0;

  return {
    tahun: scope.tahun,
    total_lhp: lhpList.length,
    total_temuan: new Set(detail.map((r) => r.temuan.id)).size,
    total_rekomendasi: totalRekomendasi,
    rekomendasi_selesai: selesai,
    capaian_persen: capaianPersen,
    breakdown_status: byStatus,
    breakdown_entitas: byEntitas,
  };
};

const buildTlhpApprovalGate = (detail) => {
  const temuanMap = new Map();
  detail.forEach((row) => temuanMap.set(row.temuan.id, row.temuan));

  const temuans = [...temuanMap.values()];
  const approved = temuans.filter((t) => t.status_revisi === "approved").length;
  const total = temuans.length;

  return {
    ready_to_sign: total > 0 && approved === total,
    document_status_label:
      total > 0 && approved === total
        ? "FINAL — SELURUH TEMUAN SUDAH DISETUJUI"
        : "DRAFT — SEBAGIAN TEMUAN BELUM DISETUJUI",
    total_temuan: total,
    approved_count: approved,
    not_approved_count: total - approved,
    closing_note:
      total > 0 && approved === total
        ? "Seluruh temuan dalam cakupan laporan ini sudah berstatus Disetujui."
        : "Laporan ini masih memuat temuan yang belum berstatus Disetujui — gunakan sebagai dokumen pemantauan/draft, bukan laporan final.",
  };
};

const buildTlhpDataQualityGate = (detail) => {
  const issues = [];

  detail.forEach(({ temuan, rekomendasi }) => {
    if (!temuan.uraian_temuan) {
      issues.push(`Temuan ${temuan.kode_temuan || temuan.id}: uraian temuan belum diisi.`);
    }
    if (!temuan.akibat) {
      issues.push(`Temuan ${temuan.kode_temuan || temuan.id}: akibat belum diisi.`);
    }
    if (rekomendasi && !rekomendasi.uraian_rekomendasi) {
      issues.push(`Rekomendasi ${rekomendasi.kode_rekomendasi || rekomendasi.id}: uraian rekomendasi belum diisi.`);
    }
  });

  // Karena assertReportExportPolicy (mrPolicyEngineService.js) hanya boleh
  // dipanggil apa adanya — readiness laporan pemantauan TLHP ditentukan oleh
  // KELENGKAPAN DATA (final_report_status), bukan status approval per temuan
  // (itu sudah tercermin di report_approval_gate). Laporan pemantauan memang
  // wajar dicetak rutin walau belum semua temuan selesai/disetujui.
  return {
    final_report_status: issues.length === 0 ? "ready_for_pdf" : "draft",
    pdf_ready: issues.length === 0,
    issues,
  };
};

const getReportOfficials = async ({ tahun, opd_id, nama_opd } = {}) => {
  if (!nama_opd) {
    return {
      pemilik_risiko: null,
      koordinator_risiko: null,
      penandatangan_laporan: null,
      source: "opd_penanggung_jawab",
      warning: "nama_opd belum tersedia untuk cakupan laporan ini.",
    };
  }

  const rows = await sequelize.query(
    `
    SELECT id, nama_opd, nama_bidang_opd, nama, nip, jabatan, tahun, jenis_dokumen
    FROM opd_penanggung_jawab
    WHERE nama_opd = :namaOpd
      AND (tahun = :tahun OR tahun IS NULL)
      AND (
        LOWER(COALESCE(jenis_dokumen, '')) = 'tlhp_monitoring'
        OR jenis_dokumen IS NULL
        OR jenis_dokumen = ''
      )
    ORDER BY
      CASE WHEN tahun = :tahun THEN 1 WHEN tahun IS NULL THEN 2 ELSE 3 END,
      CASE
        WHEN LOWER(jabatan) LIKE '%kepala dinas%' THEN 1
        WHEN LOWER(jabatan) LIKE '%sekretaris%' THEN 2
        ELSE 3
      END,
      id DESC
    `,
    {
      type: sequelize.QueryTypes.SELECT,
      replacements: { namaOpd: nama_opd, tahun: Number(tahun) },
    },
  );

  const kepalaDinas = rows.find((r) => String(r.jabatan || "").toLowerCase().includes("kepala dinas")) || rows[0] || null;
  const sekretaris = rows.find((r) => String(r.jabatan || "").toLowerCase().includes("sekretaris")) || null;

  return {
    pemilik_risiko: kepalaDinas,
    koordinator_risiko: sekretaris,
    penandatangan_laporan: kepalaDinas,
    source: "opd_penanggung_jawab",
    total_officials_found: rows.length,
  };
};

const getFullReport = async (scopeParams) => {
  const scope = resolveScope(scopeParams);
  const lhpList = await getLhpListForScope(scope);
  const lhpIds = lhpList.map((l) => l.id);
  const detail = await getTemuanRekomendasiDetail(lhpIds);
  const rekomendasiIds = detail.filter((r) => r.rekomendasi).map((r) => r.rekomendasi.id);
  const evidenceCounts = await getEvidenceCountsByRekomendasi(rekomendasiIds);
  const summary = await getSummary(scope);

  const namaOpdCandidates = [...new Set(lhpList.map((l) => l.nama_opd).filter(Boolean))];
  const namaOpd = namaOpdCandidates.length === 1 ? namaOpdCandidates[0] : null;

  const officials = await getReportOfficials({ tahun: scope.tahun, opd_id: scope.opd_id, nama_opd: namaOpd });

  return {
    report_scope: { ...scope, nama_opd: namaOpd, is_multi_opd: namaOpdCandidates.length > 1 },
    lhp_list: lhpList,
    temuan_rekomendasi_detail: detail,
    evidence_counts_by_rekomendasi: evidenceCounts,
    summary,
    report_quality_gate: buildTlhpDataQualityGate(detail),
    report_approval_gate: buildTlhpApprovalGate(detail),
    officials,
    context: { nama_opd: namaOpd || "OPD", tahun: scope.tahun },
  };
};

module.exports = {
  MrPlanningTlhpReportError,
  resolveScope,
  getLhpListForScope,
  getTemuanRekomendasiDetail,
  getEvidenceCountsByRekomendasi,
  getSummary,
  buildTlhpApprovalGate,
  buildTlhpDataQualityGate,
  getReportOfficials,
  getFullReport,
};
