import { MASTER_REFERENSI_DATASET_DEFAULT } from "@/services/masterService";

export function parseIdList(text) {
  if (!text || !String(text).trim()) return [];
  return [
    ...new Set(
      String(text)
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((x) => parseInt(x, 10))
        .filter((n) => Number.isInteger(n) && n >= 1),
    ),
  ];
}

export function firstPositiveInt(value) {
  const n = parseIdList(value)[0];
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export function deriveMasterFilters({
  selectedMasterProgramId,
  selectedMasterKegiatanId,
  selectedMasterSubKegiatanId,
  manualProgramIdsText,
  manualKegiatanIdsText,
  manualSubKegiatanIdsText,
}) {
  const selectedProgramId = firstPositiveInt(selectedMasterProgramId);
  const selectedKegiatanId = firstPositiveInt(selectedMasterKegiatanId);
  const selectedSubId = firstPositiveInt(selectedMasterSubKegiatanId);

  return {
    filters: {
      master_program_ids: selectedProgramId
        ? [selectedProgramId]
        : parseIdList(manualProgramIdsText),
      master_kegiatan_ids: selectedKegiatanId
        ? [selectedKegiatanId]
        : parseIdList(manualKegiatanIdsText),
      master_sub_kegiatan_ids: selectedSubId
        ? [selectedSubId]
        : parseIdList(manualSubKegiatanIdsText),
    },
    manualDisabled: {
      master_program_ids: Boolean(selectedProgramId),
      master_kegiatan_ids: Boolean(selectedKegiatanId),
      master_sub_kegiatan_ids: Boolean(selectedSubId),
    },
  };
}

export function buildBulkMasterImportPayload(input) {
  const {
    datasetKey,
    periodeId,
    tahun,
    jenisDokumen,
    selectedMasterProgramId,
    selectedMasterKegiatanId,
    selectedMasterSubKegiatanId,
    manualProgramIdsText,
    manualKegiatanIdsText,
    manualSubKegiatanIdsText,
    createMissingKegiatan,
    skipDuplicates,
    strictParentMapping,
    enforceAnchorContext,
    defaultNamaOpd,
    defaultNamaBidang,
    defaultSubBidang,
    anchorProgramId,
    opdPenanggungJawabId,
  } = input;

  const { filters } = deriveMasterFilters({
    selectedMasterProgramId,
    selectedMasterKegiatanId,
    selectedMasterSubKegiatanId,
    manualProgramIdsText,
    manualKegiatanIdsText,
    manualSubKegiatanIdsText,
  });

  const body = {
    dataset_key: String(datasetKey || "").trim() || MASTER_REFERENSI_DATASET_DEFAULT,
    periode_id: parseInt(String(periodeId), 10),
    tahun: parseInt(String(tahun), 10),
    jenis_dokumen: jenisDokumen || "rpjmd",
    filters,
    options: {
      create_missing_kegiatans: Boolean(createMissingKegiatan),
      skip_duplicates: Boolean(skipDuplicates),
      strict_parent_mapping: Boolean(strictParentMapping),
      enforce_anchor_context: Boolean(enforceAnchorContext),
    },
    default_nama_opd: defaultNamaOpd,
    default_nama_bidang_opd: defaultNamaBidang,
    default_sub_bidang_opd: defaultSubBidang,
  };

  const anchorId = firstPositiveInt(anchorProgramId);
  if (anchorId) body.anchor_program_id = anchorId;

  const opdId = firstPositiveInt(opdPenanggungJawabId);
  if (opdId) body.opd_penanggung_jawab_id = opdId;

  return body;
}

export function isCommitReady({ previewData, lastPreviewPayload, previewLoading }) {
  const blocked = Boolean(previewData?.summary?.commit_blocked);
  return Boolean(
    previewData?.summary &&
      lastPreviewPayload &&
      !previewLoading &&
      !blocked,
  );
}

export function isSerializablePlainJson(value, seen = new WeakSet()) {
  if (value == null) return true;
  const t = typeof value;
  if (t === "string" || t === "boolean") return true;
  if (t === "number") return Number.isFinite(value);
  if (t === "undefined" || t === "function" || t === "symbol" || t === "bigint") {
    return false;
  }
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.every((item) => isSerializablePlainJson(item, seen));
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(value).every((item) => isSerializablePlainJson(item, seen));
}

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function buildHumanPreviewSummary(summary, classificationCounts = {}) {
  const readyToCreate = toCount(summary?.would_create_sub_kegiatans);
  const skipped = toCount(summary?.skipped);
  const duplicates = toCount(summary?.duplicates);
  const needsBackfill = toCount(summary?.requires_backfill);
  const legacyConflict =
    toCount(classificationCounts?.legacy_parent_conflict) +
    toCount(classificationCounts?.legacy_child_conflict) +
    toCount(classificationCounts?.legacy_program_unmapped);

  return [
    {
      key: "ready",
      label: "Siap dibuat",
      value: `${readyToCreate} sub kegiatan`,
    },
    {
      key: "skipped",
      label: "Dilewati",
      value:
        duplicates > 0
          ? `${skipped} baris (${duplicates} duplikat)`
          : `${skipped} baris`,
    },
    {
      key: "needs_action",
      label: "Perlu tindakan",
      value: `${Math.max(needsBackfill, legacyConflict)} konflik legacy/backfill`,
    },
    {
      key: "commit",
      label: "Commit diblokir",
      value: summary?.commit_blocked ? "ya" : "tidak",
    },
  ];
}
