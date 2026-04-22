"use strict";

const EDITABLE_WORKFLOW = new Set(["draft", "submitted", "reviewed", "rejected"]);
const REQUIRED_SECTION_KEYS = [
  "pendahuluan",
  "evaluasi",
  "tujuan_sasaran",
  "rencana_kerja",
  "penutup",
];

const RENJA_DOCUMENT_RULES = [
  { code: "DOKUMEN_PD_REQUIRED", severity: "error", blocking: true, description: "Perangkat daerah wajib ada." },
  { code: "DOKUMEN_RENSTRA_MATCH_PD", severity: "error", blocking: true, description: "Renstra harus milik PD yang sama." },
  { code: "DOKUMEN_RKPD_MATCH_YEAR", severity: "error", blocking: true, description: "RKPD harus tahun yang sama." },
  { code: "DOKUMEN_SINGLE_ACTIVE_AWAL", severity: "error", blocking: true, description: "Satu dokumen awal published aktif per PD/tahun." },
  { code: "DOKUMEN_SINGLE_ACTIVE_PERUBAHAN", severity: "error", blocking: true, description: "Satu dokumen perubahan published aktif per urutan perubahan." },
  { code: "DOKUMEN_PARENT_BASE_CONSISTENT", severity: "error", blocking: true, description: "parent/base harus konsisten." },
];

const RENJA_WORKFLOW_RULES = [
  { code: "WORKFLOW_READONLY_PUBLISHED", severity: "error", blocking: true, description: "Dokumen published/archived tidak editable." },
  { code: "WORKFLOW_REVISION_SOURCE", severity: "error", blocking: true, description: "Revision hanya dari approved/published." },
  { code: "PUBLISH_PHASE_MUST_BE_FINAL", severity: "error", blocking: true, description: "Publish hanya boleh jika document_phase final." },
];

function push(results, { code, severity = "error", blocking = true, message, scope = "document", sourceType = "INTERNAL", extra = {} }) {
  results.push({
    severity,
    mismatch_scope: scope,
    source_type: sourceType,
    mismatch_code: code,
    mismatch_label: code,
    message,
    recommendation: "Perbaiki data dokumen sebelum lanjut workflow.",
    is_blocking: blocking,
    ...extra,
  });
}

async function validateRenjaDocumentBusiness(db, dokumen, opts = {}) {
  const {
    RenstraPdDokumen,
    RkpdDokumen,
    RenjaDokumen,
    RenjaDokumenVersion,
    RenjaDokumenSection,
    RenjaItem,
  } = db;

  const { action = "save", payload = {}, isRevision = false } = opts;
  const results = [];

  if (!dokumen?.perangkat_daerah_id) {
    push(results, {
      code: "DOKUMEN_PD_REQUIRED",
      message: "perangkat_daerah_id wajib ada.",
    });
  }

  if (dokumen?.renstra_pd_dokumen_id) {
    const renstra = await RenstraPdDokumen.findByPk(dokumen.renstra_pd_dokumen_id);
    if (!renstra) {
      push(results, {
        code: "DOKUMEN_RENSTRA_NOT_FOUND",
        message: "renstra_pd_dokumen_id tidak ditemukan.",
      });
    } else if (Number(renstra.perangkat_daerah_id) !== Number(dokumen.perangkat_daerah_id)) {
      push(results, {
        code: "DOKUMEN_RENSTRA_MATCH_PD",
        message: "renstra_pd_dokumen_id harus milik perangkat daerah yang sama.",
      });
    }
  }

  if (dokumen?.rkpd_dokumen_id) {
    const rkpd = await RkpdDokumen.findByPk(dokumen.rkpd_dokumen_id);
    if (!rkpd) {
      push(results, {
        code: "DOKUMEN_RKPD_NOT_FOUND",
        message: "rkpd_dokumen_id tidak ditemukan.",
      });
    } else {
      if (Number(rkpd.tahun) !== Number(dokumen.tahun)) {
        push(results, {
          code: "DOKUMEN_RKPD_MATCH_YEAR",
          message: "rkpd_dokumen_id harus pada tahun yang sama dengan dokumen RENJA.",
        });
      }
      if (dokumen.periode_id && rkpd.periode_id && Number(rkpd.periode_id) !== Number(dokumen.periode_id)) {
        push(results, {
          code: "DOKUMEN_RKPD_MATCH_PERIODE",
          message: "rkpd_dokumen_id harus pada periode yang sama.",
        });
      }
    }
  }

  const kind = String(dokumen.document_kind || "renja_awal");
  if (kind === "renja_perubahan") {
    if (!dokumen.parent_dokumen_id || !dokumen.base_dokumen_id) {
      push(results, {
        code: "DOKUMEN_PARENT_BASE_REQUIRED",
        message: "renja_perubahan wajib memiliki parent_dokumen_id dan base_dokumen_id.",
      });
    }
    if (isRevision && !["approved", "published"].includes(String(dokumen.workflow_status || ""))) {
      push(results, {
        code: "WORKFLOW_REVISION_SOURCE",
        message: "create revision hanya boleh dari approved/published.",
      });
    }
  }

  if (dokumen.current_version_id) {
    const v = await RenjaDokumenVersion.findByPk(dokumen.current_version_id);
    if (!v || Number(v.renja_dokumen_id) !== Number(dokumen.id)) {
      push(results, {
        code: "CURRENT_VERSION_INVALID",
        message: "current_version_id harus milik dokumen RENJA yang sama.",
      });
    }
  }

  if (["save", "update"].includes(action)) {
    if (!EDITABLE_WORKFLOW.has(String(dokumen.workflow_status || "draft"))) {
      push(results, {
        code: "WORKFLOW_READONLY_PUBLISHED",
        message: "Dokumen published/archived tidak boleh diedit langsung.",
      });
    }
  }

  // Enforce single active final/published awal per PD/tahun
  if (["approve", "publish"].includes(action)) {
    if (kind === "renja_awal") {
      const exists = await RenjaDokumen.findOne({
        where: {
          id: { [db.Sequelize.Op.ne]: dokumen.id },
          tahun: dokumen.tahun,
          perangkat_daerah_id: dokumen.perangkat_daerah_id,
          document_kind: "renja_awal",
          workflow_status: "published",
          deleted_at: null,
        },
      });
      if (exists) {
        push(results, {
          code: "DOKUMEN_SINGLE_ACTIVE_AWAL",
          message: "Sudah ada RENJA awal published aktif untuk PD dan tahun tersebut.",
        });
      }
    }

    if (kind === "renja_perubahan") {
      const exists = await RenjaDokumen.findOne({
        where: {
          id: { [db.Sequelize.Op.ne]: dokumen.id },
          tahun: dokumen.tahun,
          perangkat_daerah_id: dokumen.perangkat_daerah_id,
          document_kind: "renja_perubahan",
          perubahan_ke: dokumen.perubahan_ke || null,
          workflow_status: "published",
          deleted_at: null,
        },
      });
      if (exists) {
        push(results, {
          code: "DOKUMEN_SINGLE_ACTIVE_PERUBAHAN",
          message: "Sudah ada RENJA perubahan published aktif pada urutan perubahan yang sama.",
        });
      }
    }
  }

  if (action === "publish" || action === "submit") {
    const sections = await RenjaDokumenSection.findAll({ where: { renja_dokumen_id: dokumen.id } });
    const sectionMap = new Map(sections.map((s) => [s.section_key, s]));
    for (const key of REQUIRED_SECTION_KEYS) {
      const sec = sectionMap.get(key);
      if (!sec || !String(sec.content || "").trim()) {
        push(results, {
          code: "MISSING_REQUIRED_SECTION",
          message: `Section wajib ${key} belum terisi.`,
          scope: "section",
        });
      }
    }

    const itemCount = await RenjaItem.count({ where: { renja_dokumen_id: dokumen.id } });
    if (itemCount <= 0) {
      push(results, {
        code: "BAB4_ITEM_EMPTY",
        message: "BAB IV belum memiliki item RENJA.",
        scope: "section",
      });
    }
  }

  if (action === "publish" && String(dokumen.document_phase || "") !== "final") {
    push(results, {
      code: "PUBLISH_PHASE_MUST_BE_FINAL",
      message: "Publish hanya diperbolehkan saat document_phase = final.",
      scope: "document",
    });
  }

  return {
    rule_sets: {
      RENJA_DOCUMENT_RULES,
      RENJA_WORKFLOW_RULES,
    },
    results,
  };
}

module.exports = {
  RENJA_DOCUMENT_RULES,
  RENJA_WORKFLOW_RULES,
  REQUIRED_SECTION_KEYS,
  validateRenjaDocumentBusiness,
};
