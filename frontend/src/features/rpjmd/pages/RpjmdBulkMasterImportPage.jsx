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
import { MASTER_REFERENSI_DATASET_DEFAULT } from "@/services/masterService";

function parseIdList(text) {
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
  const [datasetKey, setDatasetKey] = useState(MASTER_REFERENSI_DATASET_DEFAULT);
  const [periodeId, setPeriodeId] = useState("");
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [jenisDokumen, setJenisDokumen] = useState("rpjmd");
  const [filterProgram, setFilterProgram] = useState("");
  const [filterKegiatan, setFilterKegiatan] = useState("");
  const [filterSub, setFilterSub] = useState("");
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

  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [commitData, setCommitData] = useState(null);
  const [lastPreviewPayload, setLastPreviewPayload] = useState(null);

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
  const previewOk = Boolean(
    previewData?.summary &&
      lastPreviewPayload &&
      !previewLoading &&
      !previewCommitBlocked,
  );

  const buildPayload = useCallback(() => {
    const filters = {
      master_program_ids: parseIdList(filterProgram),
      master_kegiatan_ids: parseIdList(filterKegiatan),
      master_sub_kegiatan_ids: parseIdList(filterSub),
    };
    const body = {
      dataset_key: datasetKey.trim() || MASTER_REFERENSI_DATASET_DEFAULT,
      periode_id: parseInt(periodeId, 10),
      tahun: parseInt(tahun, 10),
      jenis_dokumen: jenisDokumen,
      filters,
      options: {
        create_missing_kegiatans: createMissingKegiatan,
        skip_duplicates: skipDuplicates,
        strict_parent_mapping: strictParentMapping,
        enforce_anchor_context: enforceAnchorContext,
      },
      default_nama_opd: defaultNamaOpd,
      default_nama_bidang_opd: defaultNamaBidang,
      default_sub_bidang_opd: defaultSubBidang,
    };
    const ap = parseIdList(anchorProgramId)[0];
    if (ap) body.anchor_program_id = ap;
    const opdId = parseIdList(opdPenanggungJawabId)[0];
    if (opdId) body.opd_penanggung_jawab_id = opdId;
    return body;
  }, [
    datasetKey,
    periodeId,
    tahun,
    jenisDokumen,
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
        const raw = res.data?.data ?? res.data;
        setPeriodeList(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setPeriodeList([]));
  }, []);

  useEffect(() => {
    if (!tahun || !jenisDokumen) {
      setProgramAnchorList([]);
      return;
    }
    api
      .get("/programs/all", {
        params: { tahun, jenis_dokumen: jenisDokumen },
      })
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        setProgramAnchorList(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setProgramAnchorList([]));
  }, [tahun, jenisDokumen]);

  const handlePreview = async (reusePayload = null) => {
    setMessage("");
    setPreviewData(null);
    setCommitData(null);
    if (reusePayload == null) setLastPreviewPayload(null);
    setPreviewLoading(true);
    try {
      const body = reusePayload != null ? reusePayload : buildPayload();
      const res = await api.post("/rpjmd/bulk-from-master/preview", body);
      if (res.data?.success) {
        setPreviewData(res.data.data);
        setLastPreviewPayload(body);
        setMessage("Preview selesai — tidak ada penulisan ke database.");
      } else {
        setMessage(res.data?.message || "Preview gagal.");
      }
    } catch (e) {
      setMessage(
        e?.response?.data?.message ||
          e?.message ||
          "Preview gagal (cek filter dan periode).",
      );
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

  const summary = previewData?.summary;
  const warnings = previewData?.warnings || [];
  const errors = previewData?.errors || [];
  const sample = previewData?.sample || [];
  const classificationCounts = previewData?.classification_counts || {};
  const backfillCandidates = previewData?.backfill_candidates || [];

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

  const periodeLabel = useMemo(() => {
    const p = periodeList.find((x) => String(x.id) === String(periodeId));
    if (!p) return "";
    return `${p.tahun_awal}–${p.tahun_akhir}`;
  }, [periodeList, periodeId]);

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
          <Card className="mb-3 shadow-sm">
            <Card.Body>
              <Card.Title className="h6">Parameter</Card.Title>
              <Form.Group className="mb-2">
                <Form.Label>dataset_key</Form.Label>
                <Form.Control
                  value={datasetKey}
                  onChange={(e) => setDatasetKey(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Periode RPJMD</Form.Label>
                <Form.Select
                  value={periodeId}
                  onChange={(e) => setPeriodeId(e.target.value)}
                >
                  <option value="">— pilih —</option>
                  {periodeList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tahun_awal}–{p.tahun_akhir} (id {p.id})
                    </option>
                  ))}
                </Form.Select>
                {periodeLabel ? (
                  <Form.Text>Periode terpilih: {periodeLabel}</Form.Text>
                ) : null}
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Tahun anggaran</Form.Label>
                <Form.Control
                  type="number"
                  value={tahun}
                  onChange={(e) => setTahun(e.target.value)}
                />
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

              <hr />
              <Card.Title className="h6">Filter master (ID, pisah koma)</Card.Title>
              <Form.Group className="mb-2">
                <Form.Label>master_program_ids</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={filterProgram}
                  onChange={(e) => setFilterProgram(e.target.value)}
                  placeholder="contoh: 1, 2, 5"
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>master_kegiatan_ids</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={filterKegiatan}
                  onChange={(e) => setFilterKegiatan(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>master_sub_kegiatan_ids</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={filterSub}
                  onChange={(e) => setFilterSub(e.target.value)}
                />
              </Form.Group>

              <hr />
              <Form.Check
                type="checkbox"
                id="createKeg"
                label="create_missing_kegiatans (butuh program induk transaksi)"
                checked={createMissingKegiatan}
                onChange={(e) => setCreateMissingKegiatan(e.target.checked)}
              />
              <Form.Group className="mb-2 mt-2">
                <Form.Label>anchor_program_id (program transaksi)</Form.Label>
                <Form.Select
                  value={anchorProgramId}
                  onChange={(e) => setAnchorProgramId(e.target.value)}
                  disabled={!createMissingKegiatan}
                >
                  <option value="">— pilih program RPJMD —</option>
                  {programAnchorList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.kode_program} — {p.nama_program}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Check
                type="checkbox"
                id="skipDup"
                label="skip_duplicates"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
              />
              <Form.Check
                type="checkbox"
                id="strictParent"
                className="mt-2"
                label="strict_parent_mapping (program transaksi harus punya master_program_id yang cocok)"
                checked={strictParentMapping}
                onChange={(e) => setStrictParentMapping(e.target.checked)}
              />
              <Form.Check
                type="checkbox"
                id="enforceAnchor"
                label="enforce_anchor_context (tahun & jenis dokumen program = konteks impor)"
                checked={enforceAnchorContext}
                onChange={(e) => setEnforceAnchorContext(e.target.checked)}
              />
              <Form.Group className="mb-2 mt-2">
                <Form.Label>
                  opd_penanggung_jawab_id (opsional — validasi ke program anchor / rantai)
                </Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  placeholder="ID OPD penanggung jawab"
                  value={opdPenanggungJawabId}
                  onChange={(e) => setOpdPenanggungJawabId(e.target.value)}
                />
              </Form.Group>

              <hr />
              <Form.Group className="mb-2">
                <Form.Label>default nama OPD (wajib di sub)</Form.Label>
                <Form.Control
                  value={defaultNamaOpd}
                  onChange={(e) => setDefaultNamaOpd(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>default nama bidang OPD</Form.Label>
                <Form.Control
                  value={defaultNamaBidang}
                  onChange={(e) => setDefaultNamaBidang(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>default sub bidang</Form.Label>
                <Form.Control
                  value={defaultSubBidang}
                  onChange={(e) => setDefaultSubBidang(e.target.value)}
                />
              </Form.Group>

              <Button
                variant="primary"
                className="me-2"
                onClick={handlePreview}
                disabled={previewLoading || !periodeId}
              >
                {previewLoading ? (
                  <>
                    <Spinner size="sm" className="me-2" /> Preview…
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
                    <Spinner size="sm" className="me-2" /> Commit…
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
