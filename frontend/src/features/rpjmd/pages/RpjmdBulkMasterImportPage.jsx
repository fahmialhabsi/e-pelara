import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Container,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Table,
  Row,
  Col,
  Badge,
  Modal,
} from "react-bootstrap";
import api from "@/services/api";
import {
  MASTER_REFERENSI_DATASET_DEFAULT,
  fetchMasterPrograms,
  fetchMasterKegiatanByProgram,
  fetchMasterSubKegiatanByKegiatan,
  formatMasterProgramLabel,
  formatMasterKegiatanLabel,
  formatMasterSubKegiatanLabel,
} from "@/services/masterService";
import { extractListData } from "@/utils/apiResponse";
import {
  buildBulkMasterImportPayload,
  buildHumanPreviewSummary,
  deriveMasterFilters,
  isCommitReady,
  isSerializablePlainJson,
  parseIdList,
} from "@/features/rpjmd/services/rpjmdBulkMasterImportUi";

/** Dari baris kandidat preview impor — untuk backfill helper (satu per satu). */
function inferBackfillFromCandidate(c) {
  if (c.existing_sub_kegiatan_id) {
    return {
      entity_type: "SUB_KEGIATAN",
      entity_id: c.existing_sub_kegiatan_id,
      suggested_target_master_id: c.master_sub_kegiatan_id,
    };
  }
  if (c.conflicting_kegiatan_id) {
    return {
      entity_type: "KEGIATAN",
      entity_id: c.conflicting_kegiatan_id,
      suggested_target_master_id: c.master_kegiatan_id,
    };
  }
  if (
    c.transaction_program_id &&
    c.classification?.category === "legacy_program_unmapped"
  ) {
    return {
      entity_type: "PROGRAM",
      entity_id: c.transaction_program_id,
      suggested_target_master_id: c.master_program_id,
    };
  }
  return null;
}

export default function RpjmdBulkMasterImportPage() {
  const PREVIEW_FAIL_MESSAGE =
    "Pratinjau impor belum dapat diproses. Data belum dikirim dan tidak ada perubahan pada sistem. Silakan coba kembali. Jika kendala berulang, hubungi admin aplikasi.";

  const [datasetKey, setDatasetKey] = useState(MASTER_REFERENSI_DATASET_DEFAULT);
  const [periodeId, setPeriodeId] = useState("");
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [jenisDokumen, setJenisDokumen] = useState("rpjmd");
  const [filterProgram, setFilterProgram] = useState("");
  const [filterKegiatan, setFilterKegiatan] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [selectedMasterProgramId, setSelectedMasterProgramId] = useState("");
  const [selectedMasterKegiatanId, setSelectedMasterKegiatanId] = useState("");
  const [selectedMasterSubId, setSelectedMasterSubId] = useState("");
  const [anchorProgramId, setAnchorProgramId] = useState("");
  const [createMissingKegiatan, setCreateMissingKegiatan] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [strictParentMapping, setStrictParentMapping] = useState(true);
  const [enforceAnchorContext, setEnforceAnchorContext] = useState(true);
  const [opdPenanggungJawabId, setOpdPenanggungJawabId] = useState("");
  const [defaultNamaOpd, setDefaultNamaOpd] = useState("-");
  const [defaultNamaBidang, setDefaultNamaBidang] = useState("-");
  const [defaultSubBidang, setDefaultSubBidang] = useState("-");

  const [periodeList, setPeriodeList] = useState([]);
  const [programAnchorList, setProgramAnchorList] = useState([]);
  const [opdList, setOpdList] = useState([]);
  const [opdLoading, setOpdLoading] = useState(false);
  const [masterProgramList, setMasterProgramList] = useState([]);
  const [masterKegiatanList, setMasterKegiatanList] = useState([]);
  const [masterSubList, setMasterSubList] = useState([]);
  const [masterProgramLoading, setMasterProgramLoading] = useState(false);
  const [masterKegiatanLoading, setMasterKegiatanLoading] = useState(false);
  const [masterSubLoading, setMasterSubLoading] = useState(false);
  const [masterProgramWarning, setMasterProgramWarning] = useState("");

  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [commitData, setCommitData] = useState(null);
  const [lastPreviewPayload, setLastPreviewPayload] = useState(null);
  const [autoMapProgramIdsInput, setAutoMapProgramIdsInput] = useState("");
  const [autoMapPreviewLoading, setAutoMapPreviewLoading] = useState(false);
  const [autoMapExecuteLoading, setAutoMapExecuteLoading] = useState(false);
  const [autoMapPreviewData, setAutoMapPreviewData] = useState(null);
  const [autoMapExecuteData, setAutoMapExecuteData] = useState(null);
  const [autoMapLastPreviewPayload, setAutoMapLastPreviewPayload] = useState(null);
  const [autoMapConfirm, setAutoMapConfirm] = useState(false);
  const [autoMapMassScanMode, setAutoMapMassScanMode] = useState(false);
  const [autoMapMessage, setAutoMapMessage] = useState("");

  const [backfillModalOpen, setBackfillModalOpen] = useState(false);
  const [backfillPreview, setBackfillPreview] = useState(null);
  const [backfillPreviewLoading, setBackfillPreviewLoading] = useState(false);
  const [backfillExecuteLoading, setBackfillExecuteLoading] = useState(false);
  const [backfillCtx, setBackfillCtx] = useState(null);
  const [backfillTargetInput, setBackfillTargetInput] = useState("");
  const [backfillReason, setBackfillReason] = useState("");
  const [backfillConfirm, setBackfillConfirm] = useState(false);
  const backfillExecuteRef = useRef(null);

  const previewCommitBlocked = Boolean(previewData?.summary?.commit_blocked);
  const previewNeedsFollowUp = (previewData?.summary?.requires_backfill ?? 0) > 0;
  const previewOk = isCommitReady({
    previewData,
    lastPreviewPayload,
    previewLoading,
  });
  const masterFilterState = useMemo(
    () =>
      deriveMasterFilters({
        selectedMasterProgramId,
        selectedMasterKegiatanId,
        selectedMasterSubKegiatanId: selectedMasterSubId,
        manualProgramIdsText: filterProgram,
        manualKegiatanIdsText: filterKegiatan,
        manualSubKegiatanIdsText: filterSub,
      }),
    [
      selectedMasterProgramId,
      selectedMasterKegiatanId,
      selectedMasterSubId,
      filterProgram,
      filterKegiatan,
      filterSub,
    ],
  );

  const buildPayload = useCallback(() => {
    return buildBulkMasterImportPayload({
      datasetKey,
      periodeId,
      tahun,
      jenisDokumen,
      selectedMasterProgramId,
      selectedMasterKegiatanId,
      selectedMasterSubKegiatanId: selectedMasterSubId,
      manualProgramIdsText: filterProgram,
      manualKegiatanIdsText: filterKegiatan,
      manualSubKegiatanIdsText: filterSub,
      createMissingKegiatan,
      skipDuplicates,
      strictParentMapping,
      enforceAnchorContext,
      defaultNamaOpd,
      defaultNamaBidang,
      defaultSubBidang,
      anchorProgramId,
      opdPenanggungJawabId,
    });
  }, [
    datasetKey,
    periodeId,
    tahun,
    jenisDokumen,
    selectedMasterProgramId,
    selectedMasterKegiatanId,
    selectedMasterSubId,
    filterProgram,
    filterKegiatan,
    filterSub,
    createMissingKegiatan,
    skipDuplicates,
    strictParentMapping,
    enforceAnchorContext,
    opdPenanggungJawabId,
    defaultNamaOpd,
    defaultNamaBidang,
    defaultSubBidang,
    anchorProgramId,
  ]);

  useEffect(() => {
    api
      .get("/periode-rpjmd")
      .then((res) => {
        setPeriodeList(extractListData(res.data));
      })
      .catch(() => setPeriodeList([]));
  }, []);

  const selectedPeriode = useMemo(
    () => periodeList.find((x) => String(x.id) === String(periodeId)),
    [periodeList, periodeId],
  );
  const tahunOptions = useMemo(() => {
    if (!selectedPeriode) return [];
    const start = parseInt(String(selectedPeriode.tahun_awal), 10);
    const end = parseInt(String(selectedPeriode.tahun_akhir), 10);
    if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
      return [];
    }
    const rows = [];
    for (let y = start; y <= end; y += 1) rows.push(y);
    return rows;
  }, [selectedPeriode]);

  useEffect(() => {
    if (!tahunOptions.length) return;
    setTahun((cur) => {
      const n = parseInt(String(cur), 10);
      if (tahunOptions.includes(n)) return String(n);
      return String(tahunOptions[0]);
    });
  }, [tahunOptions]);

  useEffect(() => {
    if (!tahun || !jenisDokumen) {
      setProgramAnchorList([]);
      return;
    }
    const tahunInt = parseInt(String(tahun), 10);
    if (!Number.isInteger(tahunInt)) {
      setProgramAnchorList([]);
      return;
    }
    let cancelled = false;
    api
      .get("/programs/all", {
        params: { tahun: tahunInt, jenis_dokumen: jenisDokumen },
      })
      .then((res) => {
        const rows = extractListData(res.data)
          .filter((p) =>
            periodeId ? String(p.periode_id) === String(periodeId) : true,
          )
          .sort((a, b) =>
            String(a.kode_program || "").localeCompare(
              String(b.kode_program || ""),
              "id",
            ),
          );
        if (!cancelled) setProgramAnchorList(rows);
      })
      .catch(() => {
        if (!cancelled) setProgramAnchorList([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tahun, jenisDokumen, periodeId]);

  useEffect(() => {
    const tahunInt = parseInt(String(tahun), 10);
    if (!Number.isInteger(tahunInt) || !jenisDokumen) {
      setOpdList([]);
      return;
    }
    let cancelled = false;
    setOpdLoading(true);
    api
      .get("/opd-penanggung-jawab/dropdown", {
        params: {
          tahun: tahunInt,
          jenis_dokumen: jenisDokumen,
        },
      })
      .then((res) => {
        const rows = extractListData(res.data).sort((a, b) =>
          String(a.nama_opd || a.nama || "").localeCompare(
            String(b.nama_opd || b.nama || ""),
            "id",
          ),
        );
        if (!cancelled) setOpdList(rows);
      })
      .catch(() => {
        if (!cancelled) setOpdList([]);
      })
      .finally(() => {
        if (!cancelled) setOpdLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tahun, jenisDokumen]);

  useEffect(() => {
    let cancelled = false;
    setMasterProgramLoading(true);
    setMasterProgramWarning("");
    fetchMasterPrograms(datasetKey)
      .then(({ data, warning }) => {
        if (cancelled) return;
        const rows = Array.isArray(data)
          ? [...data].sort((a, b) =>
              String(a.kode_program_full || a.kode_program || "").localeCompare(
                String(b.kode_program_full || b.kode_program || ""),
                "id",
              ),
            )
          : [];
        setMasterProgramList(rows);
        setMasterProgramWarning(
          warning?.message
            ? String(warning.message)
            : warning
              ? "Referensi master memakai fallback dataset."
              : "",
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMasterProgramList([]);
          setMasterProgramWarning("");
        }
      })
      .finally(() => {
        if (!cancelled) setMasterProgramLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [datasetKey]);

  useEffect(() => {
    setSelectedMasterKegiatanId("");
    setSelectedMasterSubId("");
    if (!selectedMasterProgramId) {
      setMasterKegiatanList([]);
      setMasterSubList([]);
      return;
    }
    let cancelled = false;
    setMasterKegiatanLoading(true);
    fetchMasterKegiatanByProgram(selectedMasterProgramId, { datasetKey })
      .then(({ data }) => {
        if (!cancelled) {
          const rows = Array.isArray(data)
            ? [...data].sort((a, b) =>
                String(a.kode_kegiatan_full || a.kode_kegiatan || "").localeCompare(
                  String(b.kode_kegiatan_full || b.kode_kegiatan || ""),
                  "id",
                ),
              )
            : [];
          setMasterKegiatanList(rows);
        }
      })
      .catch(() => {
        if (!cancelled) setMasterKegiatanList([]);
      })
      .finally(() => {
        if (!cancelled) setMasterKegiatanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMasterProgramId, datasetKey]);

  useEffect(() => {
    setSelectedMasterSubId("");
    if (!selectedMasterKegiatanId) {
      setMasterSubList([]);
      return;
    }
    let cancelled = false;
    setMasterSubLoading(true);
    fetchMasterSubKegiatanByKegiatan(selectedMasterKegiatanId, { datasetKey })
      .then(({ data }) => {
        if (!cancelled) {
          const rows = Array.isArray(data)
            ? [...data].sort((a, b) =>
                String(
                  a.kode_sub_kegiatan_full || a.kode_sub_kegiatan || "",
                ).localeCompare(
                  String(b.kode_sub_kegiatan_full || b.kode_sub_kegiatan || ""),
                  "id",
                ),
              )
            : [];
          setMasterSubList(rows);
        }
      })
      .catch(() => {
        if (!cancelled) setMasterSubList([]);
      })
      .finally(() => {
        if (!cancelled) setMasterSubLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMasterKegiatanId, datasetKey]);

  const handlePreview = async (maybePayload = null) => {
    if (
      maybePayload &&
      typeof maybePayload === "object" &&
      typeof maybePayload.preventDefault === "function"
    ) {
      maybePayload.preventDefault();
      maybePayload = null;
    }
    setMessage("");
    setLastPreviewPayload(null);
    setPreviewLoading(true);
    try {
      const body = maybePayload != null ? maybePayload : buildPayload();
      if (!isSerializablePlainJson(body)) {
        console.error(
          "[RpjmdBulkMasterImportPage] Preview payload tidak serializable",
          body,
        );
        throw new Error("PAYLOAD_NOT_SERIALIZABLE");
      }
      const res = await api.post("/rpjmd/bulk-from-master/preview", body);
      if (res.data?.success) {
        setPreviewData(res.data.data);
        setCommitData(null);
        setLastPreviewPayload(body);
        setMessage("Preview selesai - tidak ada penulisan ke database.");
      } else {
        console.error("[RpjmdBulkMasterImportPage] Preview gagal", res.data);
        setMessage(PREVIEW_FAIL_MESSAGE);
      }
    } catch (e) {
      console.error("[RpjmdBulkMasterImportPage] Preview error", e);
      setMessage(PREVIEW_FAIL_MESSAGE);
    } finally {
      setPreviewLoading(false);
    }
  };

  const runBackfillPreview = useCallback(
    async (ctx, targetOverride) => {
      setBackfillPreviewLoading(true);
      setBackfillPreview(null);
      try {
        const tidRaw =
          targetOverride != null && String(targetOverride).trim() !== ""
            ? parseInt(String(targetOverride).trim(), 10)
            : null;
        const res = await api.post("/rpjmd/backfill/preview", {
          entity_type: ctx.entity_type,
          entity_id: ctx.entity_id,
          dataset_key: datasetKey.trim() || MASTER_REFERENSI_DATASET_DEFAULT,
          target_master_id:
            Number.isInteger(tidRaw) && tidRaw >= 1 ? tidRaw : undefined,
        });
        if (res.data?.success) {
          setBackfillPreview(res.data.data);
          setMessage("");
        } else {
          setMessage(res.data?.message || "Preview backfill gagal.");
        }
      } catch (e) {
        setMessage(
          e?.response?.data?.message ||
            e?.message ||
            "Preview backfill gagal.",
        );
      } finally {
        setBackfillPreviewLoading(false);
      }
    },
    [datasetKey],
  );

  const openBackfillModal = async (inferred, opts = {}) => {
    if (!inferred) return;
    const ctx = {
      entity_type: inferred.entity_type,
      entity_id: inferred.entity_id,
    };
    const suggested = inferred.suggested_target_master_id;
    const tStr =
      suggested != null && suggested !== "" ? String(suggested) : "";
    setBackfillCtx(ctx);
    setBackfillTargetInput(tStr);
    setBackfillReason("");
    setBackfillConfirm(false);
    setBackfillModalOpen(true);
    await runBackfillPreview(ctx, tStr);
    if (opts.focusExecute) {
      requestAnimationFrame(() =>
        backfillExecuteRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    }
  };

  const handleBackfillExecute = async () => {
    if (!backfillCtx || backfillPreview?.required_target_master_id == null) {
      setMessage("Selesaikan preview backfill sampai ada target master yang valid.");
      return;
    }
    const tid = Number(backfillPreview.required_target_master_id);
    if (!Number.isInteger(tid) || tid < 1) return;
    setBackfillExecuteLoading(true);
    try {
      const res = await api.post("/rpjmd/backfill/execute", {
        entity_type: backfillCtx.entity_type,
        entity_id: backfillCtx.entity_id,
        target_master_id: tid,
        dataset_key: datasetKey.trim() || MASTER_REFERENSI_DATASET_DEFAULT,
        reason: backfillReason.trim(),
        confirm: true,
      });
      if (res.data?.success) {
        setBackfillModalOpen(false);
        setBackfillPreview(null);
        setBackfillCtx(null);
        const cid = res.data.data?.correlation_id;
        setMessage(
          res.data.data?.noop
            ? `Tidak ada perubahan (sudah termapping). correlation_id: ${cid || "—"}`
            : `Backfill berhasil. correlation_id: ${cid || "—"}`,
        );
        if (lastPreviewPayload) {
          await handlePreview(lastPreviewPayload);
        }
      } else {
        setMessage(res.data?.message || "Eksekusi backfill ditolak.");
      }
    } catch (e) {
      setMessage(
        e?.response?.data?.message ||
          e?.message ||
          "Eksekusi backfill gagal.",
      );
    } finally {
      setBackfillExecuteLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!lastPreviewPayload) return;
    setMessage("");
    setCommitLoading(true);
    try {
      const res = await api.post("/rpjmd/bulk-from-master/commit", {
        ...lastPreviewPayload,
        confirm: true,
      });
      if (res.data?.success) {
        setCommitData(res.data.data);
        setMessage("Commit impor selesai.");
      } else {
        setMessage(res.data?.message || "Commit ditolak.");
      }
    } catch (e) {
      const d = e?.response?.data?.data;
      const extra =
        d?.commit_blocked_reasons?.messages?.length
          ? ` Detail: ${d.commit_blocked_reasons.messages.join("; ")}`
          : "";
      const top =
        Array.isArray(d?.commit_blocked_reasons?.top_categories) &&
        d.commit_blocked_reasons.top_categories.length
          ? ` Kategori: ${d.commit_blocked_reasons.top_categories
              .map((x) => `${x.category}=${x.count}`)
              .join(", ")}`
          : "";
      setMessage(
        (e?.response?.data?.message || e?.message || "Commit gagal.") +
          extra +
          top,
      );
    } finally {
      setCommitLoading(false);
    }
  };

  const autoMapScopeProgramIds = useMemo(
    () => parseIdList(autoMapProgramIdsInput),
    [autoMapProgramIdsInput],
  );

  const buildAutoMapPayload = useCallback(() => {
    const body = {
      dataset_key:
        String(datasetKey || "").trim() || MASTER_REFERENSI_DATASET_DEFAULT,
      periode_id: parseInt(String(periodeId), 10),
      tahun: parseInt(String(tahun), 10),
      jenis_dokumen: jenisDokumen || "rpjmd",
    };
    if (autoMapScopeProgramIds.length) {
      body.program_ids = autoMapScopeProgramIds;
    }
    return body;
  }, [datasetKey, periodeId, tahun, jenisDokumen, autoMapScopeProgramIds]);

  const handleAutoMapPreview = async () => {
    setAutoMapMessage("");
    setAutoMapExecuteData(null);
    setAutoMapConfirm(false);
    setAutoMapPreviewLoading(true);
    try {
      const body = buildAutoMapPayload();
      if (!isSerializablePlainJson(body)) {
        console.error(
          "[RpjmdBulkMasterImportPage] Auto-map preview payload tidak serializable",
          body,
        );
        throw new Error("AUTOMAP_PAYLOAD_NOT_SERIALIZABLE");
      }
      const isMassScan = !Array.isArray(body.program_ids) || !body.program_ids.length;
      setAutoMapMassScanMode(isMassScan);

      const res = await api.post("/rpjmd/program-auto-map/preview", body);
      if (res.data?.success) {
        setAutoMapPreviewData(res.data.data);
        setAutoMapLastPreviewPayload(body);
        setAutoMapMessage("Preview auto mapping selesai.");
      } else {
        console.error(
          "[RpjmdBulkMasterImportPage] Auto-map preview gagal",
          res.data,
        );
        setAutoMapMessage(
          res.data?.message || "Preview auto mapping program gagal.",
        );
      }
    } catch (e) {
      console.error("[RpjmdBulkMasterImportPage] Auto-map preview error", e);
      setAutoMapMessage(
        e?.response?.data?.message ||
          e?.message ||
          "Preview auto mapping program gagal.",
      );
    } finally {
      setAutoMapPreviewLoading(false);
    }
  };

  const handleAutoMapExecute = async () => {
    if (!autoMapLastPreviewPayload) return;
    const readyCount = Number(autoMapSummary?.ready_exact_match ?? 0);
    if (!Number.isFinite(readyCount) || readyCount <= 0) return;
    const executeConfirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(
            `Sistem akan memetakan ${readyCount} program berdasarkan kecocokan kode yang identik. Program lain tidak akan diubah.`,
          );
    if (!executeConfirmed) {
      setAutoMapMessage("Eksekusi auto mapping dibatalkan.");
      return;
    }
    setAutoMapExecuteLoading(true);
    try {
      const res = await api.post("/rpjmd/program-auto-map/execute", {
        ...autoMapLastPreviewPayload,
        confirm: true,
      });
      if (res.data?.success) {
        setAutoMapExecuteData(res.data.data);
        setAutoMapMessage("Eksekusi auto mapping program selesai.");
      } else {
        setAutoMapMessage(
          res.data?.message || "Eksekusi auto mapping program ditolak.",
        );
      }
    } catch (e) {
      setAutoMapMessage(
        e?.response?.data?.message ||
          e?.message ||
          "Eksekusi auto mapping program gagal.",
      );
    } finally {
      setAutoMapExecuteLoading(false);
    }
  };

  const summary = previewData?.summary;
  const warnings = previewData?.warnings || [];
  const errors = previewData?.errors || [];
  const sample = previewData?.sample || [];
  const classificationCounts = previewData?.classification_counts || {};
  const backfillCandidates = previewData?.backfill_candidates || [];
  const humanPreviewSummary = useMemo(
    () => buildHumanPreviewSummary(summary, classificationCounts),
    [summary, classificationCounts],
  );
  const manualDisabled = masterFilterState.manualDisabled;

  const categoryLabel = (k) => {
    const m = {
      duplicate_mapped: "Duplikat (sudah termapping)",
      duplicate_by_code: "Duplikat kode",
      duplicate_by_name: "Duplikat nama",
      legacy_parent_conflict: "Konflik kegiatan legacy",
      legacy_child_conflict: "Konflik sub legacy / perlu backfill",
      legacy_program_unmapped: "Program belum termapping master",
      hierarchy_conflict: "Salah cabang hierarki",
      ownership_conflict: "OPD / kepemilikan tidak cocok",
      fatal_validation_error: "Validasi fatal",
      ready: "Siap impor",
      missing_kegiatan_context: "Kegiatan induk belum ada",
    };
    return m[k] || k;
  };

  const commitSummary = commitData?.summary;
  const autoMapSummary = autoMapPreviewData?.summary;
  const autoMapReadyCount = Number(autoMapSummary?.ready_exact_match ?? 0);
  const autoMapAmbiguousCount = Number(autoMapSummary?.ambiguous ?? 0);
  const autoMapNotFoundCount = Number(autoMapSummary?.not_found ?? 0);
  const currentAutoMapPayload = useMemo(
    () => buildAutoMapPayload(),
    [buildAutoMapPayload],
  );
  const autoMapPreviewFresh = useMemo(
    () =>
      Boolean(autoMapLastPreviewPayload) &&
      JSON.stringify(autoMapLastPreviewPayload) ===
        JSON.stringify(currentAutoMapPayload),
    [autoMapLastPreviewPayload, currentAutoMapPayload],
  );
  const autoMapReadyItems = Array.isArray(autoMapPreviewData?.ready_items)
    ? autoMapPreviewData.ready_items
    : [];
  const autoMapExecuteSummary = autoMapExecuteData?.summary;
  const autoMapExecuteDetails = Array.isArray(autoMapExecuteData?.details)
    ? autoMapExecuteData.details
    : [];
  const autoMapExecuteReady = Boolean(
    autoMapLastPreviewPayload &&
      autoMapPreviewFresh &&
      autoMapSummary &&
      autoMapReadyCount > 0 &&
      !autoMapPreviewLoading &&
      !autoMapExecuteLoading,
  );

  const periodeLabel = useMemo(() => {
    if (!selectedPeriode) return "";
    return `${selectedPeriode.tahun_awal}-${selectedPeriode.tahun_akhir}`;
  }, [selectedPeriode]);

  return (
    <Container className="my-4">
      <h4 className="mb-3">Impor massal Sub Kegiatan dari master</h4>
      <p className="text-muted small">
        Alur aman: <strong>Preview</strong> (simulasi, tanpa DB) →{" "}
        <strong>Commit</strong> (transaksi DB, setelah{" "}
        <code>confirm: true</code>). Hanya{" "}
        <Badge bg="secondary">SUPER_ADMIN</Badge> /{" "}
        <Badge bg="secondary">ADMINISTRATOR</Badge>.
      </p>

      {message ? (
        <Alert
          variant={/gagal|ditolak|error/i.test(message) ? "danger" : "info"}
          className="mb-3"
          dismissible
          onClose={() => setMessage("")}
        >
          {message}
        </Alert>
      ) : null}

      <Row>
        <Col lg={6}>
          <Card className="mb-3 border-info shadow-sm">
            <Card.Body>
              <Card.Title className="h6 mb-2">Cara Pakai Singkat</Card.Title>
              <ol className="small mb-0 ps-3">
                <li>Pilih Program RPJMD tujuan import.</li>
                <li>Pilih sumber Master Program / Kegiatan / Sub Kegiatan.</li>
                <li>Gunakan Filter OPD jika perlu.</li>
                <li>Klik Preview.</li>
                <li>Tinjau hasil klasifikasi.</li>
                <li>Klik Commit jika aman.</li>
              </ol>
            </Card.Body>
          </Card>

          <Card className="mb-3 shadow-sm">
            <Card.Body>
              <Card.Title className="h6">Pengaturan Dasar</Card.Title>
              <Form.Group className="mb-2">
                <Form.Label>dataset_key</Form.Label>
                <Form.Control
                  value={datasetKey}
                  readOnly
                />
                <Form.Text className="text-muted">
                  Nilai default dipakai untuk operasi normal. Ubah hanya jika
                  diperlukan di Mode Lanjutan.
                </Form.Text>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Periode RPJMD</Form.Label>
                <Form.Select
                  value={periodeId}
                  onChange={(e) => setPeriodeId(e.target.value)}
                >
                  <option value="">- pilih periode -</option>
                  {periodeList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tahun_awal}-{p.tahun_akhir} (id {p.id})
                    </option>
                  ))}
                </Form.Select>
                {periodeLabel ? (
                  <Form.Text>Periode terpilih: {periodeLabel}</Form.Text>
                ) : null}
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Tahun anggaran</Form.Label>
                {tahunOptions.length ? (
                  <Form.Select
                    value={String(tahun)}
                    onChange={(e) => setTahun(e.target.value)}
                    disabled={!periodeId}
                  >
                    {tahunOptions.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  <Form.Control
                    type="number"
                    value={tahun}
                    onChange={(e) => setTahun(e.target.value)}
                    placeholder="Masukkan tahun anggaran"
                  />
                )}
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>jenis_dokumen</Form.Label>
                <Form.Select
                  value={jenisDokumen}
                  onChange={(e) => setJenisDokumen(e.target.value)}
                >
                  <option value="rpjmd">rpjmd</option>
                </Form.Select>
              </Form.Group>
              <Alert variant="light" className="small py-2 mt-3 mb-2">
                Preview = simulasi tanpa menulis DB. Commit aktif setelah preview
                aman (tidak <code>commit_blocked</code>).
              </Alert>

              <hr />
              <Card.Title className="h6">Program RPJMD Tujuan Import</Card.Title>
              <Form.Group className="mb-2">
                <Form.Label>Program RPJMD Tujuan Import</Form.Label>
                <Form.Select
                  value={anchorProgramId}
                  onChange={(e) => setAnchorProgramId(e.target.value)}
                  disabled={!tahun || !jenisDokumen}
                >
                  <option value="">- pilih program RPJMD -</option>
                  {programAnchorList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.kode_program} - {p.nama_program}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="d-block text-muted">
                  Pilih program RPJMD tempat hasil impor akan dimasukkan.
                </Form.Text>
                <Form.Text
                  className={`d-block ${createMissingKegiatan ? "text-warning" : "text-muted"}`}
                >
                  Wajib jika kegiatan transaksi boleh dibuat otomatis.
                </Form.Text>
              </Form.Group>

              <hr />
              <Card.Title className="h6">Sumber Data Master</Card.Title>
              <Form.Group className="mb-2">
                <Form.Label>Master Program</Form.Label>
                <Form.Select
                  value={selectedMasterProgramId}
                  onChange={(e) => setSelectedMasterProgramId(e.target.value)}
                  disabled={masterProgramLoading}
                >
                  <option value="">
                    {masterProgramLoading
                      ? "Memuat master program..."
                      : masterProgramList.length
                        ? "Pilih master program"
                        : "Tidak ada master program"}
                  </option>
                  {masterProgramList.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {formatMasterProgramLabel(p)}
                    </option>
                  ))}
                </Form.Select>
                {masterProgramWarning ? (
                  <Alert variant="warning" className="small py-2 mt-2 mb-0">
                    {masterProgramWarning}
                  </Alert>
                ) : null}
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Master Kegiatan (Opsional)</Form.Label>
                <Form.Select
                  value={selectedMasterKegiatanId}
                  onChange={(e) => setSelectedMasterKegiatanId(e.target.value)}
                  disabled={!selectedMasterProgramId || masterKegiatanLoading}
                >
                  <option value="">
                    {!selectedMasterProgramId
                      ? "Pilih master program terlebih dahulu"
                      : masterKegiatanLoading
                        ? "Memuat master kegiatan..."
                        : masterKegiatanList.length
                          ? "Pilih master kegiatan (opsional)"
                          : "Tidak ada master kegiatan untuk program ini"}
                  </option>
                  {masterKegiatanList.map((k) => (
                    <option key={k.id} value={String(k.id)}>
                      {formatMasterKegiatanLabel(k)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Master Sub Kegiatan (Opsional)</Form.Label>
                <Form.Select
                  value={selectedMasterSubId}
                  onChange={(e) => setSelectedMasterSubId(e.target.value)}
                  disabled={!selectedMasterKegiatanId || masterSubLoading}
                >
                  <option value="">
                    {!selectedMasterKegiatanId
                      ? "Pilih master kegiatan terlebih dahulu"
                      : masterSubLoading
                        ? "Memuat master sub kegiatan..."
                        : masterSubList.length
                          ? "Pilih master sub kegiatan (opsional)"
                          : "Tidak ada master sub kegiatan untuk kegiatan ini"}
                  </option>
                  {masterSubList.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {formatMasterSubKegiatanLabel(s)}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Pilih salah satu level saja sudah valid. Jika level bawah dipilih,
                  backend tetap menerima ID filter seperti kontrak lama.
                </Form.Text>
              </Form.Group>

              <hr />
              <Card.Title className="h6">Filter OPD (Opsional)</Card.Title>
              <Form.Group className="mb-2">
                <Form.Label>Filter OPD (Opsional)</Form.Label>
                <Form.Select
                  value={opdPenanggungJawabId}
                  onChange={(e) => setOpdPenanggungJawabId(e.target.value)}
                  disabled={opdLoading}
                >
                  <option value="">
                    {opdLoading
                      ? "Memuat daftar OPD..."
                      : "- tidak difilter berdasarkan OPD -"}
                  </option>
                  {opdList.map((o) => (
                    <option key={String(o.id)} value={String(o.id)}>
                      {o.nama_opd || o.nama || "OPD"} (id {o.id})
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="d-block text-muted">
                  Gunakan jika ingin membatasi impor ke konteks OPD tertentu.
                </Form.Text>
                <Form.Text className="d-block text-muted">
                  Jika tidak dipilih, impor tidak difilter berdasarkan OPD.
                </Form.Text>
              </Form.Group>

              <hr />
              <details className="mb-3">
                <summary className="fw-semibold">Pengaturan Lanjutan</summary>
                <div className="border rounded p-3 mt-2 bg-light">
                  <Form.Check
                    type="checkbox"
                    id="createKeg"
                    className="mb-2"
                    label="Buat kegiatan transaksi jika belum ada"
                    checked={createMissingKegiatan}
                    onChange={(e) => setCreateMissingKegiatan(e.target.checked)}
                  />
                  <Form.Text className="d-block mb-2 text-muted">
                    Aktifkan jika impor boleh membuat kegiatan transaksi baru sesuai
                    struktur master.
                  </Form.Text>

                  <Form.Check
                    type="checkbox"
                    id="skipDup"
                    className="mb-2"
                    label="Lewati baris duplikat (skip_duplicates)"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                  />

                  <Form.Check
                    type="checkbox"
                    id="strictParent"
                    className="mb-2"
                    label="Hanya gunakan struktur yang sesuai dengan master"
                    checked={strictParentMapping}
                    onChange={(e) => setStrictParentMapping(e.target.checked)}
                  />
                  <Form.Text className="d-block mb-2 text-muted">
                    Default aman aktif. Membatasi impor agar parent mapping tetap
                    konsisten.
                  </Form.Text>

                  <Form.Check
                    type="checkbox"
                    id="enforceAnchor"
                    className="mb-2"
                    label="Pastikan program tujuan sesuai tahun dan jenis dokumen"
                    checked={enforceAnchorContext}
                    onChange={(e) => setEnforceAnchorContext(e.target.checked)}
                  />
                  <Form.Text className="d-block mb-2 text-muted">
                    Default aman aktif. Validasi konteks program tujuan sebelum
                    commit.
                  </Form.Text>

                  <Form.Group className="mb-2">
                    <Form.Label>default_nama_opd</Form.Label>
                    <Form.Control
                      value={defaultNamaOpd}
                      onChange={(e) => setDefaultNamaOpd(e.target.value)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>default_nama_bidang_opd</Form.Label>
                    <Form.Control
                      value={defaultNamaBidang}
                      onChange={(e) => setDefaultNamaBidang(e.target.value)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-0">
                    <Form.Label>default_sub_bidang_opd</Form.Label>
                    <Form.Control
                      value={defaultSubBidang}
                      onChange={(e) => setDefaultSubBidang(e.target.value)}
                    />
                  </Form.Group>
                </div>
              </details>

              <details className="mb-3">
                <summary className="fw-semibold">
                  Mode Lanjutan: Input ID Manual
                </summary>
                <div className="border rounded p-3 mt-2 bg-light">
                  <Alert variant="warning" className="small py-2">
                    Gunakan hanya jika Anda memahami ID referensi yang dimasukkan.
                  </Alert>
                  <Form.Group className="mb-2">
                    <Form.Label>dataset_key</Form.Label>
                    <Form.Control
                      value={datasetKey}
                      onChange={(e) => setDatasetKey(e.target.value)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>master_program_ids</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={filterProgram}
                      onChange={(e) => setFilterProgram(e.target.value)}
                      placeholder="contoh: 1, 2, 5"
                      disabled={manualDisabled.master_program_ids}
                    />
                    {manualDisabled.master_program_ids ? (
                      <Form.Text className="text-muted">
                        Dinonaktifkan karena Master Program dipilih dari dropdown.
                      </Form.Text>
                    ) : null}
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>master_kegiatan_ids</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={filterKegiatan}
                      onChange={(e) => setFilterKegiatan(e.target.value)}
                      disabled={manualDisabled.master_kegiatan_ids}
                    />
                    {manualDisabled.master_kegiatan_ids ? (
                      <Form.Text className="text-muted">
                        Dinonaktifkan karena Master Kegiatan dipilih dari dropdown.
                      </Form.Text>
                    ) : null}
                  </Form.Group>
                  <Form.Group className="mb-0">
                    <Form.Label>master_sub_kegiatan_ids</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={filterSub}
                      onChange={(e) => setFilterSub(e.target.value)}
                      disabled={manualDisabled.master_sub_kegiatan_ids}
                    />
                    {manualDisabled.master_sub_kegiatan_ids ? (
                      <Form.Text className="text-muted">
                        Dinonaktifkan karena Master Sub Kegiatan dipilih dari
                        dropdown.
                      </Form.Text>
                    ) : null}
                  </Form.Group>
                </div>
              </details>

              <Button
                variant="primary"
                className="me-2"
                onClick={() => handlePreview()}
                disabled={previewLoading || !periodeId}
              >
                {previewLoading ? (
                  <>
                    <Spinner size="sm" className="me-2" /> Preview...
                  </>
                ) : (
                  "Preview (dry-run)"
                )}
              </Button>
              <Button
                variant="danger"
                onClick={handleCommit}
                disabled={!previewOk || commitLoading}
              >
                {commitLoading ? (
                  <>
                    <Spinner size="sm" className="me-2" /> Commit...
                  </>
                ) : (
                  "Commit import"
                )}
              </Button>
              <Form.Text className="d-block mt-2 text-muted">
                Commit dinonaktifkan jika preview memuat baris fatal/error (
                <code>commit_blocked</code>). Peringatan/backfill tidak
                memblokir commit. Payload terakhir + <code>confirm: true</code>.
              </Form.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="mb-3 border-primary shadow-sm">
            <Card.Body>
              <Card.Title className="h6">
                Auto Mapping Program RPJMD ke Master
              </Card.Title>
              <p className="small text-muted mb-1">
                Program yang cocok tepat berdasarkan kode siap dipetakan.
              </p>
              <p className="small text-muted mb-2">
                Program yang ambigu atau tidak ditemukan tidak akan diproses
                otomatis.
              </p>

              <Form.Group className="mb-2">
                <Form.Label className="small mb-0">
                  ID Program RPJMD (opsional, pisahkan koma/spasi)
                </Form.Label>
                <Form.Control
                  size="sm"
                  value={autoMapProgramIdsInput}
                  onChange={(e) => setAutoMapProgramIdsInput(e.target.value)}
                  placeholder="Contoh: 13, 14, 29"
                />
                <Form.Text className="text-muted">
                  Kosongkan untuk memeriksa semua program RPJMD yang belum
                  termapping pada konteks periode/tahun/dokumen terpilih.
                </Form.Text>
              </Form.Group>

              {autoMapMessage ? (
                <Alert
                  variant={
                    /gagal|ditolak|error/i.test(autoMapMessage)
                      ? "danger"
                      : "info"
                  }
                  className="small py-2 mb-2"
                >
                  {autoMapMessage}
                </Alert>
              ) : null}

              <div className="d-flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => handleAutoMapPreview()}
                  disabled={autoMapPreviewLoading || !periodeId || !tahun}
                >
                  {autoMapPreviewLoading ? (
                    <>
                      <Spinner size="sm" className="me-2" /> Preview Auto Mapping...
                    </>
                  ) : (
                    "Preview Auto Mapping Program"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAutoMapExecute}
                  disabled={
                    !autoMapExecuteReady || !autoMapConfirm || autoMapExecuteLoading
                  }
                >
                  {autoMapExecuteLoading ? (
                    <>
                      <Spinner size="sm" className="me-2" /> Menjalankan...
                    </>
                  ) : (
                    "Terapkan Auto Mapping"
                  )}
                </Button>
              </div>
              <Form.Text className="d-block text-muted mt-2">
                Sistem akan memetakan <strong>{autoMapReadyCount || 0}</strong>{" "}
                program berdasarkan kecocokan kode yang identik. Program lain
                tidak akan diubah.
              </Form.Text>

              <Form.Check
                type="checkbox"
                id="autoMapConfirm"
                className="mt-2 mb-0 small"
                checked={autoMapConfirm}
                onChange={(e) => setAutoMapConfirm(e.target.checked)}
                disabled={!autoMapExecuteReady || autoMapExecuteLoading}
                label="Saya mengonfirmasi eksekusi auto mapping sesuai hasil preview."
              />
              {!autoMapPreviewFresh && autoMapLastPreviewPayload ? (
                <Form.Text className="text-muted d-block">
                  Parameter berubah setelah preview. Jalankan preview ulang
                  sebelum eksekusi.
                </Form.Text>
              ) : null}

              {autoMapPreviewData ? (
                <>
                  {autoMapMassScanMode ? (
                    <Alert variant="warning" className="small py-2 mt-3 mb-2">
                      Pratinjau ini memeriksa semua program RPJMD yang belum
                      termapping pada konteks terpilih.
                    </Alert>
                  ) : null}

                  {autoMapPreviewData.correlation_id ? (
                    <p className="small text-muted mb-2 mt-2">
                      correlation_id: <code>{autoMapPreviewData.correlation_id}</code>
                    </p>
                  ) : null}
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    <Badge bg="success">
                      Exact match (100%): {autoMapReadyCount || 0}
                    </Badge>
                    <Badge
                      bg={autoMapAmbiguousCount > 0 ? "warning" : "secondary"}
                      text={autoMapAmbiguousCount > 0 ? "dark" : undefined}
                    >
                      Ambiguous: {autoMapAmbiguousCount || 0}
                    </Badge>
                    <Badge bg={autoMapNotFoundCount > 0 ? "danger" : "secondary"}>
                      Tidak ditemukan: {autoMapNotFoundCount || 0}
                    </Badge>
                  </div>

                  <Table size="sm" bordered responsive className="small mt-2">
                    <tbody>
                      <tr>
                        <td>Total program discan</td>
                        <td>{autoMapSummary?.total_programs_scanned ?? 0}</td>
                      </tr>
                      <tr>
                        <td>Siap dipetakan (exact code)</td>
                        <td>{autoMapSummary?.ready_exact_match ?? 0}</td>
                      </tr>
                      <tr>
                        <td>Ambigu</td>
                        <td>{autoMapSummary?.ambiguous ?? 0}</td>
                      </tr>
                      <tr>
                        <td>Tidak ditemukan</td>
                        <td>{autoMapSummary?.not_found ?? 0}</td>
                      </tr>
                      <tr>
                        <td>Sudah termapping</td>
                        <td>{autoMapSummary?.already_mapped ?? 0}</td>
                      </tr>
                    </tbody>
                  </Table>

                  {autoMapReadyItems.length ? (
                    <>
                      <div className="small fw-bold mb-1">
                        Sample kandidat siap dipetakan
                      </div>
                      <Table size="sm" striped bordered responsive className="small">
                        <thead>
                          <tr>
                            <th>program_id</th>
                            <th>kode_program</th>
                            <th>nama_program</th>
                            <th>candidate_master_program_id</th>
                            <th>candidate_kode_program_full</th>
                            <th>candidate_nama_program</th>
                            <th>match_type</th>
                            <th>confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {autoMapReadyItems.slice(0, 20).map((r) => (
                            <tr key={r.program_id}>
                              <td>{r.program_id}</td>
                              <td>{r.kode_program}</td>
                              <td>{r.nama_program || "-"}</td>
                              <td>{r.candidate_master_program_id}</td>
                              <td>{r.candidate_kode_program_full || "-"}</td>
                              <td>{r.candidate_nama_program || "-"}</td>
                              <td>
                                {r.match_type === "exact_code" &&
                                Number(r.confidence) >= 1 ? (
                                  <Badge bg="success">Exact match (100%)</Badge>
                                ) : (
                                  r.match_type || "-"
                                )}
                              </td>
                              <td>
                                {Number(r.confidence) >= 1
                                  ? "100%"
                                  : (r.confidence ?? "-")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </>
                  ) : (
                    <p className="small text-muted mb-0">
                      Tidak ada kandidat exact match yang siap dieksekusi.
                    </p>
                  )}
                </>
              ) : null}

              {autoMapExecuteData ? (
                <>
                  {autoMapExecuteData.correlation_id ? (
                    <p className="small text-muted mt-3 mb-2">
                      correlation_id execute:{" "}
                      <code>{autoMapExecuteData.correlation_id}</code>
                    </p>
                  ) : null}
                  <Table size="sm" bordered responsive className="small">
                    <tbody>
                      <tr>
                        <td>Berhasil dipetakan</td>
                        <td>{autoMapExecuteSummary?.mapped ?? 0}</td>
                      </tr>
                      <tr>
                        <td>Dilewati karena sudah termapping</td>
                        <td>
                          {autoMapExecuteSummary?.already_mapped_count ??
                            autoMapExecuteSummary?.noop_count ??
                            autoMapExecuteSummary?.skipped ??
                            0}
                        </td>
                      </tr>
                      <tr>
                        <td>Gagal</td>
                        <td>{autoMapExecuteSummary?.failed ?? 0}</td>
                      </tr>
                    </tbody>
                  </Table>

                  {autoMapExecuteDetails.length ? (
                    <>
                      <div className="small fw-bold mb-1">
                        Detail hasil eksekusi (sample)
                      </div>
                      <Table size="sm" bordered responsive className="small mb-0">
                        <thead>
                          <tr>
                            <th>program_id</th>
                            <th>kode_program</th>
                            <th>nama_program</th>
                            <th>status</th>
                            <th>candidate_master_program_id</th>
                            <th>reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {autoMapExecuteDetails.slice(0, 20).map((r, i) => (
                            <tr key={`${r.program_id || "x"}-${i}`}>
                              <td>{r.program_id}</td>
                              <td>{r.kode_program || "-"}</td>
                              <td>{r.nama_program || "-"}</td>
                              <td>{r.status || "-"}</td>
                              <td>{r.candidate_master_program_id || "-"}</td>
                              <td>{r.reason || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </>
                  ) : null}
                </>
              ) : null}
            </Card.Body>
          </Card>

          {previewData ? (
            <Card className="mb-3 shadow-sm">
              <Card.Body>
                <Card.Title className="h6">Hasil preview</Card.Title>
                {previewData.admin_message ? (
                  <Alert
                    variant={
                      previewCommitBlocked
                        ? "danger"
                        : previewNeedsFollowUp
                          ? "warning"
                          : "success"
                    }
                    className="py-2 small"
                  >
                    {previewData.admin_message}
                  </Alert>
                ) : null}
                {previewCommitBlocked ? (
                  <Alert variant="danger" className="small">
                    <div className="fw-semibold mb-1">
                      Commit diblokir di backend dan frontend
                    </div>
                    <div>
                      Ada baris fatal/error — commit akan ditolak server (preflight)
                      meskipun tombol ditekan. Perbaiki filter/opsi lalu preview
                      ulang.
                    </div>
                    {summary?.commit_blocked_detail?.messages?.length ? (
                      <ul className="mb-0 mt-2 ps-3">
                        {summary.commit_blocked_detail.messages.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    ) : null}
                    {summary?.commit_blocked_detail?.top_categories?.length ? (
                      <div className="mt-2 small">
                        <strong>Kategori terbanyak:</strong>{" "}
                        {summary.commit_blocked_detail.top_categories
                          .map((x) => `${categoryLabel(x.category)} (${x.count})`)
                          .join(", ")}
                      </div>
                    ) : null}
                  </Alert>
                ) : null}
                {previewNeedsFollowUp && !previewCommitBlocked ? (
                  <Alert variant="warning" className="small">
                    Ada baris yang membutuhkan tindak lanjut manual (backfill /
                    mapping) — tinjau panel kandidat di bawah sebelum commit.
                  </Alert>
                ) : null}
                {previewData.correlation_id ? (
                  <p className="small text-muted">
                    correlation_id:{" "}
                    <code>{previewData.correlation_id}</code>
                  </p>
                ) : null}
                <Alert variant="secondary" className="small py-2">
                  <div className="fw-semibold mb-1">Ringkasan cepat</div>
                  <ul className="mb-0 ps-3">
                    {humanPreviewSummary.map((item) => (
                      <li key={item.key}>
                        {item.label}: {item.value}
                      </li>
                    ))}
                  </ul>
                </Alert>
                <Table size="sm" bordered responsive>
                  <tbody>
                    <tr>
                      <td>total sumber (master sub)</td>
                      <td>{summary?.total_source_rows ?? "—"}</td>
                    </tr>
                    <tr>
                      <td>akan buat sub_kegiatan</td>
                      <td>{summary?.would_create_sub_kegiatans ?? 0}</td>
                    </tr>
                    <tr>
                      <td>akan buat kegiatan (baru)</td>
                      <td>{summary?.would_create_kegiatans ?? 0}</td>
                    </tr>
                    <tr>
                      <td>skipped</td>
                      <td>{summary?.skipped ?? 0}</td>
                    </tr>
                    <tr>
                      <td>duplikat (skip)</td>
                      <td>{summary?.duplicates ?? 0}</td>
                    </tr>
                    <tr>
                      <td>error simulasi</td>
                      <td>{summary?.errors ?? 0}</td>
                    </tr>
                    <tr>
                      <td>butuh backfill (estimasi baris)</td>
                      <td>
                        {(summary?.requires_backfill ?? 0) > 0 ? (
                          <>
                            {summary?.requires_backfill ?? 0}{" "}
                            <Badge bg="warning" text="dark" className="ms-1">
                              requires_backfill
                            </Badge>
                          </>
                        ) : (
                          summary?.requires_backfill ?? 0
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>baris fatal</td>
                      <td>{summary?.fatal_row_count ?? 0}</td>
                    </tr>
                    <tr>
                      <td>baris error</td>
                      <td>{summary?.error_row_count ?? 0}</td>
                    </tr>
                    <tr>
                      <td>commit_blocked</td>
                      <td>{previewCommitBlocked ? "ya" : "tidak"}</td>
                    </tr>
                  </tbody>
                </Table>

                {Object.keys(classificationCounts).length ? (
                  <>
                    <div className="small fw-bold mb-1">
                      Ringkasan kategori konflik
                    </div>
                    <Table size="sm" bordered responsive className="small">
                      <tbody>
                        {Object.entries(classificationCounts)
                          .filter(([, v]) => v > 0)
                          .map(([k, v]) => (
                            <tr key={k}>
                              <td>{categoryLabel(k)}</td>
                              <td>{v}</td>
                            </tr>
                          ))}
                      </tbody>
                    </Table>
                  </>
                ) : null}

                {backfillCandidates.length ? (
                  <>
                    <div className="small fw-bold mb-1 text-warning">
                      Kandidat backfill / mapping manual (sample)
                    </div>
                    <Table size="sm" bordered responsive className="small">
                      <thead>
                        <tr>
                          <th>Master sub</th>
                          <th>Kategori</th>
                          <th>Ringkas</th>
                          <th style={{ minWidth: 220 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backfillCandidates.slice(0, 20).map((c, i) => {
                          const inf = inferBackfillFromCandidate(c);
                          const rb = Boolean(c.classification?.requires_backfill);
                          return (
                            <tr key={i}>
                              <td>{c.master_sub_kegiatan_id ?? "—"}</td>
                              <td>
                                <Badge bg="secondary" className="me-1">
                                  {c.classification?.category || "—"}
                                </Badge>
                                {rb ? (
                                  <Badge bg="warning" text="dark">
                                    requires_backfill
                                  </Badge>
                                ) : null}
                              </td>
                              <td className="text-truncate" style={{ maxWidth: 240 }}>
                                {c.reason}
                                {c.backfill_hint ? (
                                  <span className="text-muted d-block">
                                    hint:{" "}
                                    {c.backfill_hint.safe
                                      ? "relatif aman setelah verifikasi"
                                      : "tidak aman otomatis"}
                                  </span>
                                ) : null}
                              </td>
                              <td>
                                {inf ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline-primary"
                                      className="me-1 mb-1"
                                      onClick={() => openBackfillModal(inf, {})}
                                    >
                                      Lihat kandidat
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline-dark"
                                      className="mb-1"
                                      onClick={() =>
                                        openBackfillModal(inf, { focusExecute: true })
                                      }
                                    >
                                      Tandai sebagai master
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-muted">
                                    Butuh ID transaksi (program/anchor) — gunakan
                                    alur manual di DB atau perluas baris preview.
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </>
                ) : null}

                {warnings.length ? (
                  <Alert variant="warning" className="small">
                    <strong>Peringatan / skip ({warnings.length})</strong>
                    <ul className="mb-0 mt-1">
                      {warnings.slice(0, 8).map((w, i) => (
                        <li key={i}>
                          sub master {w.master_sub_kegiatan_id}:{" "}
                          <Badge bg="secondary" className="me-1">
                            {w.classification?.category || "skipped"}
                          </Badge>
                          {w.reason}
                        </li>
                      ))}
                    </ul>
                  </Alert>
                ) : null}

                {errors.length ? (
                  <Alert variant="danger" className="small">
                    <strong>Error ({errors.length})</strong>
                    <ul className="mb-0 mt-1">
                      {errors.slice(0, 8).map((w, i) => (
                        <li key={i}>
                          sub master {w.master_sub_kegiatan_id}:{" "}
                          <Badge bg="danger" className="me-1">
                            {w.classification?.category || "error"}
                          </Badge>
                          {w.reason}
                        </li>
                      ))}
                    </ul>
                  </Alert>
                ) : null}

                {sample.length ? (
                  <>
                    <div className="small fw-bold mb-1">Sample baris impor</div>
                    <Table size="sm" striped responsive>
                      <thead>
                        <tr>
                          <th>master_sub</th>
                          <th>kode sub</th>
                          <th>nama sub</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sample.map((r, i) => (
                          <tr key={i}>
                            <td>{r.master_sub_kegiatan_id}</td>
                            <td>{r.kode_sub_kegiatan}</td>
                            <td className="text-truncate" style={{ maxWidth: 200 }}>
                              {r.nama_sub_kegiatan}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                ) : null}
              </Card.Body>
            </Card>
          ) : null}

          {commitData ? (
            <Card className="mb-3 border-success shadow-sm">
              <Card.Body>
                <Card.Title className="h6 text-success">Hasil commit</Card.Title>
                {commitData.admin_message ? (
                  <Alert variant="success" className="py-2 small">
                    {commitData.admin_message}
                  </Alert>
                ) : null}
                {commitData.correlation_id ? (
                  <p className="small text-muted">
                    correlation_id: <code>{commitData.correlation_id}</code>
                  </p>
                ) : null}
                <Table size="sm" bordered>
                  <tbody>
                    <tr>
                      <td>sub_kegiatan masuk</td>
                      <td>{commitSummary?.inserted_sub_kegiatans ?? 0}</td>
                    </tr>
                    <tr>
                      <td>kegiatan baru</td>
                      <td>{commitSummary?.inserted_kegiatans ?? 0}</td>
                    </tr>
                    <tr>
                      <td>skipped</td>
                      <td>{commitSummary?.skipped ?? 0}</td>
                    </tr>
                    <tr>
                      <td>gagal (baris)</td>
                      <td>{commitSummary?.failed ?? 0}</td>
                    </tr>
                    <tr>
                      <td>duplikat</td>
                      <td>{commitSummary?.duplicates ?? 0}</td>
                    </tr>
                    <tr>
                      <td>ID sub baru (jumlah)</td>
                      <td>
                        {(commitData.inserted_ids?.sub_kegiatan_ids || []).length}
                      </td>
                    </tr>
                  </tbody>
                </Table>
                {commitData.classification_counts ? (
                  <div className="small text-muted">
                    Lihat audit tenant untuk detail klasifikasi & sample.
                  </div>
                ) : null}
              </Card.Body>
            </Card>
          ) : null}
        </Col>
      </Row>

      <Modal
        show={backfillModalOpen}
        onHide={() => {
          setBackfillModalOpen(false);
          setBackfillPreview(null);
          setBackfillCtx(null);
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Backfill mapping (satu baris)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {backfillCtx ? (
            <p className="small text-muted mb-2">
              {backfillCtx.entity_type} id <code>{backfillCtx.entity_id}</code> ·
              dataset_key{" "}
              <code>
                {datasetKey.trim() || MASTER_REFERENSI_DATASET_DEFAULT}
              </code>
            </p>
          ) : null}

          <Form.Group className="mb-2">
            <Form.Label className="small mb-0">target_master_id (opsional / perbaiki ambigu)</Form.Label>
            <Form.Control
              size="sm"
              value={backfillTargetInput}
              onChange={(e) => setBackfillTargetInput(e.target.value)}
              placeholder="ID master target — isi jika preview meminta"
            />
            <Button
              variant="outline-secondary"
              size="sm"
              className="mt-1"
              disabled={!backfillCtx || backfillPreviewLoading}
              onClick={() =>
                backfillCtx && runBackfillPreview(backfillCtx, backfillTargetInput)
              }
            >
              Preview ulang
            </Button>
          </Form.Group>

          {backfillPreviewLoading ? (
            <div className="py-3 text-center">
              <Spinner size="sm" className="me-2" /> Memuat preview…
            </div>
          ) : null}

          {backfillPreview && !backfillPreviewLoading ? (
            <>
              {backfillPreview.correlation_id ? (
                <p className="small text-muted">
                  correlation_id:{" "}
                  <code>{backfillPreview.correlation_id}</code>
                </p>
              ) : null}

              {backfillPreview.ambiguous ? (
                <Alert variant="warning" className="small py-2">
                  <strong>Ambigu</strong> — pilih{" "}
                  <code>target_master_id</code> yang benar, lalu Preview ulang.
                  {Array.isArray(backfillPreview.candidates) &&
                  backfillPreview.candidates.length ? (
                    <pre className="small mb-0 mt-2 bg-light p-2 rounded">
                      {JSON.stringify(backfillPreview.candidates, null, 2)}
                    </pre>
                  ) : null}
                </Alert>
              ) : null}

              {backfillPreview.blocked ? (
                <Alert variant="danger" className="small py-2">
                  Diblokir:{" "}
                  {(backfillPreview.risks && backfillPreview.risks[0]) ||
                    "tidak dapat melanjutkan."}
                </Alert>
              ) : null}

              {backfillPreview.noop ? (
                <Alert variant="info" className="small py-2">
                  Sudah termapping ke master ini — tidak ada perubahan yang
                  diperlukan.
                </Alert>
              ) : null}

              <div className="small fw-bold mb-1">Data saat ini</div>
              <pre className="small bg-light p-2 rounded mb-2">
                {JSON.stringify(backfillPreview.current?.row ?? null, null, 2)}
              </pre>

              <div className="small fw-bold mb-1">Kandidat master</div>
              <pre className="small bg-light p-2 rounded mb-2">
                {JSON.stringify(
                  backfillPreview.candidate_master ?? null,
                  null,
                  2,
                )}
              </pre>

              {backfillPreview.match_reasons?.length ? (
                <div className="small mb-2">
                  <span className="fw-bold">Alasan cocok:</span>
                  <ul className="mb-0 ps-3">
                    {backfillPreview.match_reasons.map((x, j) => (
                      <li key={j}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {backfillPreview.risks?.length ? (
                <Alert variant={backfillPreview.safe_to_execute ? "secondary" : "warning"} className="small py-2">
                  <strong>Risiko / catatan:</strong>
                  <ul className="mb-0 ps-3 mt-1">
                    {backfillPreview.risks.map((x, j) => (
                      <li key={j}>{x}</li>
                    ))}
                  </ul>
                </Alert>
              ) : null}

              {(() => {
                const cl =
                  backfillPreview.evaluation?.checklist ||
                  backfillPreview.evaluation?.kegiatan_hint?.checklist;
                if (!Array.isArray(cl) || !cl.length) return null;
                return (
                  <div className="small mb-2">
                    <span className="fw-bold">Checklist evaluasi:</span>
                    <ul className="mb-0 ps-3">
                      {cl.map((x, j) => (
                        <li key={j}>
                          {x.ok ? "✓" : "✗"} {x.item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              <div ref={backfillExecuteRef}>
                <hr />
                <div className="small fw-bold mb-2">Konfirmasi eksekusi</div>
                <Form.Group className="mb-2">
                  <Form.Label className="small mb-0">
                    Alasan (audit, min. 15 karakter)
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={backfillReason}
                    onChange={(e) => setBackfillReason(e.target.value)}
                    placeholder="Contoh: Verifikasi kode dan nama sama dengan PDF rankhir; setujui mapping."
                  />
                </Form.Group>
                <Form.Check
                  type="checkbox"
                  id="backfillConfirm"
                  className="mb-2"
                  checked={backfillConfirm}
                  onChange={(e) => setBackfillConfirm(e.target.checked)}
                  label="Saya mengonfirmasi satu baris ini akan di-update (bukan bulk otomatis)."
                />
                <Button
                  variant="danger"
                  size="sm"
                  disabled={
                    backfillExecuteLoading ||
                    !backfillPreview.safe_to_execute ||
                    backfillPreview.ambiguous ||
                    backfillPreview.blocked ||
                    backfillPreview.noop ||
                    !backfillConfirm ||
                    String(backfillReason).trim().length < 15
                  }
                  onClick={handleBackfillExecute}
                >
                  {backfillExecuteLoading ? (
                    <>
                      <Spinner size="sm" className="me-2" /> Menulis…
                    </>
                  ) : (
                    "Tandai sebagai master (eksekusi)"
                  )}
                </Button>
                {!backfillPreview.safe_to_execute &&
                !backfillPreview.ambiguous &&
                !backfillPreview.blocked &&
                !backfillPreview.noop ? (
                  <p className="small text-muted mt-2 mb-0">
                    Eksekusi dinonaktifkan sampai checklist preview menyatakan aman (
                    <code>safe_to_execute</code>).
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => {
              setBackfillModalOpen(false);
              setBackfillPreview(null);
              setBackfillCtx(null);
            }}
          >
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

