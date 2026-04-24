import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Alert, Badge, Button, Card, CardBody, Form, Modal, Spinner, Table } from "react-bootstrap";
import RenjaPlanningDashboardLayout from "./RenjaPlanningDashboardLayout";
import RenjaDokumenNavTabs from "../components/RenjaDokumenNavTabs";
import {
  applyRenjaAllHighConfidence,
  applyRenjaDataFixMapping,
  applyRenjaIndicatorSuggestions,
  autofillRenjaTargets,
  generateRenjaDataFixMapping,
  generateRenjaIndicatorSuggestions,
  acquireRenjaDataFixLock,
  getRenjaDataFixBatchDetail,
  getRenjaDataFixBatchHistory,
  getRenjaDataFixLock,
  getRenjaDataFixMappingSuggestions,
  getRenjaDataFixQualityScore,
  getRenjaDataFixSummary,
  getRenjaIndicatorSuggestions,
  getRenjaPolicyConflicts,
  getRenjaReadiness,
  getRenjaTargetSuggestions,
  previewRenjaDataFixImpact,
  releaseRenjaDataFixLock,
  recomputeRenjaMismatch,
  resolveRenjaPolicyConflicts,
  rollbackRenjaMappingApplyBatch,
} from "../services/renjaGovernanceApi";

const StatCard = ({ label, value, variant = "success", formatNumber = true }) => (
  <Card className={`shadow-sm border-start border-4 border-${variant}`}>
    <CardBody className="py-3">
      <div className="small text-muted">{label}</div>
      <div className={`h4 fw-bold mb-0 text-${variant}`}>
        {formatNumber ? Number(value || 0) : (value === null || value === undefined || value === "" ? "—" : value)}
      </div>
    </CardBody>
  </Card>
);

const ConfidenceBadge = ({ value, conflict = false }) => {
  const v = String(value || "LOW").toUpperCase();
  if (conflict) return <Badge bg="danger">CONFLICT</Badge>;
  if (v === "HIGH") return <Badge bg="success">HIGH</Badge>;
  if (v === "MEDIUM") return <Badge bg="warning" text="dark">MEDIUM</Badge>;
  return <Badge bg="secondary">LOW</Badge>;
};

const SuggestionTable = ({ title, rows = [], onApplySingle, onPreviewSingle, itemLabel = "Item" }) => (
  <Card className="shadow-sm mb-3">
    <CardBody>
      <h6 className="fw-bold mb-2">{title}</h6>
      <Table size="sm" striped bordered responsive>
        <thead>
          <tr>
            <th>{itemLabel}</th>
            <th>Match</th>
            <th>Confidence</th>
            <th>Score</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length ? (
            <tr>
              <td colSpan={7} className="text-muted">Belum ada suggestion.</td>
            </tr>
          ) : rows.map((r) => (
            <tr key={r.id}>
              <td>
                #{r.renja_item_id}
                {r.renjaItem?.program ? <div className="small text-muted">{r.renjaItem.program}</div> : null}
              </td>
              <td>{r.suggested_match_type || "-"}</td>
              <td><ConfidenceBadge value={r.suggestion_confidence} conflict={r.is_conflict} /></td>
              <td>{r.suggestion_score ?? "-"}</td>
              <td className="small">{r.suggestion_reason || "-"}</td>
              <td>
                {r.is_auto_applied ? (
                  <Badge bg="success">AUTO_APPLIED</Badge>
                ) : r.is_accepted === true ? (
                  <Badge bg="primary">ACCEPTED</Badge>
                ) : r.is_accepted === false ? (
                  <Badge bg="secondary">REJECTED</Badge>
                ) : (
                  <Badge bg="light" text="dark">PENDING</Badge>
                )}
              </td>
              <td>
                <div className="d-flex flex-wrap gap-1">
                  {onPreviewSingle ? (
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      disabled={!onPreviewSingle || r.is_auto_applied}
                      onClick={() => onPreviewSingle(r)}
                    >
                      Preview
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline-primary"
                    disabled={!onApplySingle || r.is_conflict || r.is_auto_applied}
                    onClick={() => onApplySingle?.(r)}
                  >
                    Apply
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </CardBody>
  </Card>
);

const RenjaDataFixDashboardPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [mappingRows, setMappingRows] = useState([]);
  const [indicatorRows, setIndicatorRows] = useState([]);
  const [targetRows, setTargetRows] = useState([]);
  const [policyRows, setPolicyRows] = useState([]);
  const [error, setError] = useState("");
  const [changeReason, setChangeReason] = useState("Data fixing linkage RENJA ke RENSTRA");
  const [overwriteTarget, setOverwriteTarget] = useState(false);
  const [quality, setQuality] = useState(null);
  const [mappingBatches, setMappingBatches] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPayload, setPreviewPayload] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [lastMappingStamps, setLastMappingStamps] = useState({});
  const [useStampApply, setUseStampApply] = useState(true);
  const [batchDetailOpen, setBatchDetailOpen] = useState(false);
  const [batchDetail, setBatchDetail] = useState(null);
  const [batchFilterType, setBatchFilterType] = useState("");
  const [batchFilterStatus, setBatchFilterStatus] = useState("");
  const [lockInfo, setLockInfo] = useState(null);

  const manualNeeded = useMemo(
    () =>
      [...mappingRows, ...indicatorRows, ...targetRows, ...policyRows].filter(
        (x) => x.is_conflict || String(x.suggestion_confidence || "").toUpperCase() !== "HIGH",
      ).length,
    [mappingRows, indicatorRows, targetRows, policyRows],
  );

  const qualityVariant = useMemo(() => {
    const s = Number(quality?.score ?? 0);
    if (s >= 90) return "success";
    if (s >= 75) return "info";
    if (s >= 50) return "warning";
    return "danger";
  }, [quality]);

  const dataChangedSincePreview = Boolean(error && String(error).includes("DATA_CHANGED_SINCE_PREVIEW"));

  const filteredBatches = useMemo(() => {
    let b = mappingBatches;
    if (batchFilterType) b = b.filter((x) => String(x.change_type || "") === batchFilterType);
    if (batchFilterStatus) {
      b = b.filter((x) => {
        const st = x.rollback_status || (x.rolled_back_at ? "rolled_back" : "pending");
        return st === batchFilterStatus;
      });
    }
    return b;
  }, [mappingBatches, batchFilterType, batchFilterStatus]);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [sum, mapRows, indRows, tgtRows, polRows, ready, qual, batches, lock] = await Promise.all([
        getRenjaDataFixSummary(id),
        getRenjaDataFixMappingSuggestions(id).catch(() => []),
        getRenjaIndicatorSuggestions(id).catch(() => []),
        getRenjaTargetSuggestions(id).catch(() => []),
        getRenjaPolicyConflicts(id).catch(() => []),
        getRenjaReadiness(id, { action: "publish" }).catch(() => null),
        getRenjaDataFixQualityScore(id).catch(() => null),
        getRenjaDataFixBatchHistory(id, { limit: 100 }).catch(() => []),
        getRenjaDataFixLock(id).catch(() => null),
      ]);
      setSummary(sum || {});
      setMappingRows(Array.isArray(mapRows) ? mapRows : []);
      setIndicatorRows(Array.isArray(indRows) ? indRows : []);
      setTargetRows(Array.isArray(tgtRows) ? tgtRows : []);
      setPolicyRows(Array.isArray(polRows) ? polRows : []);
      setReadiness(ready || null);
      setQuality(qual || null);
      setMappingBatches(Array.isArray(batches) ? batches : []);
      setLockInfo(lock || null);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Gagal memuat data fix.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  const withReason = (body = {}) => ({
    change_reason_text: changeReason || "Data fixing linkage RENJA",
    ...body,
  });

  const runAction = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await loadAll();
    } catch (e) {
      const code = e?.response?.data?.code;
      const msg = e?.response?.data?.message || e.message || "Aksi data fix gagal.";
      setError(code ? `${code}: ${msg}` : msg);
    } finally {
      setBusy(false);
    }
  };

  const openPreview = async (body) => {
    setPreviewBusy(true);
    setPreviewOpen(true);
    setPreviewPayload(null);
    setError("");
    try {
      const data = await previewRenjaDataFixImpact(id, {
        suggestion_type: "mapping_program",
        ...body,
      });
      setPreviewPayload(data);
      setLastMappingStamps(data?.item_stamps || {});
    } catch (e) {
      setPreviewOpen(false);
      setError(e?.response?.data?.message || e.message || "Preview gagal.");
    } finally {
      setPreviewBusy(false);
    }
  };

  const openBatchDetail = async (batchId) => {
    setBatchDetailOpen(true);
    setBatchDetail(null);
    try {
      const row = await getRenjaDataFixBatchDetail(id, batchId);
      setBatchDetail(row);
    } catch (e) {
      setBatchDetail({ error: e?.response?.data?.message || e.message });
    }
  };

  if (loading) {
    return (
      <RenjaPlanningDashboardLayout>
        <Spinner animation="border" />
      </RenjaPlanningDashboardLayout>
    );
  }

  return (
    <RenjaPlanningDashboardLayout>
      <Link to="/dashboard-renja" className="small">{"<-"} Dashboard RENJA</Link>
      <h4 className="fw-bold text-success mt-2 mb-2">Data Fix & Mapping</h4>
      <RenjaDokumenNavTabs id={id} />

      {error ? <Alert variant={dataChangedSincePreview ? "danger" : "warning"}>{error}</Alert> : null}
      {dataChangedSincePreview ? (
        <Alert variant="light" className="border border-danger text-danger">
          Data telah berubah sejak preview terakhir. Silakan jalankan preview lagi lalu apply, atau nonaktifkan opsi stamp.
        </Alert>
      ) : null}

      <Card className="shadow-sm mb-3">
        <CardBody>
          <div className="row g-2 align-items-end">
            <div className="col-lg-6">
              <Form.Label className="small">Alasan perubahan untuk aksi apply/autofill</Form.Label>
              <Form.Control
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Wajib untuk endpoint mutasi"
              />
            </div>
            <div className="col-lg-2">
              <Form.Check
                type="checkbox"
                id="overwrite-target"
                label="Overwrite target"
                checked={overwriteTarget}
                onChange={(e) => setOverwriteTarget(e.target.checked)}
              />
              <Form.Check
                className="mt-1"
                type="checkbox"
                id="use-stamp-apply"
                label="Apply mapping pakai stamp preview (optimistic lock)"
                checked={useStampApply}
                onChange={(e) => setUseStampApply(e.target.checked)}
              />
            </div>
            <div className="col-lg-4 d-flex flex-wrap gap-2 align-items-center">
              <span className="small text-muted me-1">
                Lock:{" "}
                {!lockInfo?.user_id
                  ? "bebas"
                  : lockInfo?.expired
                    ? `kadaluarsa (user #${lockInfo.user_id})`
                    : `user #${lockInfo.user_id} s.d. ${lockInfo.lock_expires_at ? new Date(lockInfo.lock_expires_at).toLocaleString() : "-"}`}
              </span>
              <Button size="sm" variant="outline-dark" disabled={busy} onClick={() => runAction(() => acquireRenjaDataFixLock(id, {}))}>
                Ambil lock
              </Button>
              <Button size="sm" variant="outline-secondary" disabled={busy} onClick={() => runAction(() => releaseRenjaDataFixLock(id))}>
                Lepas lock
              </Button>
              <Button size="sm" variant="outline-success" disabled={busy} onClick={() => runAction(() => generateRenjaDataFixMapping(id))}>
                Generate Mapping Suggestions
              </Button>
              <Button size="sm" variant="outline-primary" disabled={busy} onClick={() => runAction(() => generateRenjaIndicatorSuggestions(id))}>
                Generate Indicator Suggestions
              </Button>
              <Button
                size="sm"
                variant="outline-warning"
                disabled={busy}
                onClick={() => runAction(() => autofillRenjaTargets(id, withReason({ auto_apply: false, overwrite_target: overwriteTarget })))}
              >
                Generate Target Suggestions
              </Button>
              <Button size="sm" variant="outline-danger" disabled={busy} onClick={() => runAction(() => resolveRenjaPolicyConflicts(id, withReason({ auto_apply: false })))}>
                Resolve Policy Conflicts
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="row g-3 mb-3">
        <div className="col-md-2"><StatCard label="Unmapped Program Items" value={summary?.unmapped_program_items} variant="danger" /></div>
        <div className="col-md-2"><StatCard label="Unmapped Indicators" value={summary?.unmapped_indicators} variant="warning" /></div>
        <div className="col-md-2"><StatCard label="Empty Targets" value={summary?.empty_targets} variant="secondary" /></div>
        <div className="col-md-2"><StatCard label="Policy Conflicts" value={summary?.policy_conflicts} variant="danger" /></div>
        <div className="col-md-2"><StatCard label="High Confidence" value={summary?.high_confidence_suggestions} variant="success" /></div>
        <div className="col-md-2"><StatCard label="Manual Review Needed" value={summary?.manual_review_needed ?? manualNeeded} variant="info" /></div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <StatCard
            label="Data Quality Score (0-100)"
            value={quality?.score}
            variant={quality ? qualityVariant : "secondary"}
            formatNumber={false}
          />
        </div>
        <div className="col-md-9">
          <Card className="shadow-sm h-100">
            <CardBody className="py-2">
              <div className="small text-muted mb-1">
                Kategori: <b>{quality?.category || "—"}</b>
                {" | "}dimensi mapping/indikator/target/policy:{" "}
                {quality?.dimension_scores
                  ? `${quality.dimension_scores.mapping}/${quality.dimension_scores.indicator}/${quality.dimension_scores.target}/${quality.dimension_scores.policy_chain}`
                  : "—"}
              </div>
              <div className="small">
                {quality
                  ? `unmapped_program: ${quality.summary_inputs?.unmapped_program_items}, unmapped_indikator: ${quality.summary_inputs?.unmapped_indicators}, empty_targets: ${quality.summary_inputs?.empty_targets}, policy_conflicts: ${quality.summary_inputs?.policy_conflicts}, manual_review: ${quality.summary_inputs?.manual_review_needed}`
                  : "Skor tidak tersedia."}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm mb-3">
        <CardBody>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Button
              size="sm"
              variant="success"
              disabled={busy}
              onClick={() =>
                runAction(() =>
                  applyRenjaAllHighConfidence(
                    id,
                    withReason({
                      overwrite_target: overwriteTarget,
                      ...(useStampApply && Object.keys(lastMappingStamps).length
                        ? { expect_item_stamps: lastMappingStamps }
                        : {}),
                    }),
                  ),
                )
              }
            >
              Apply All High Confidence
            </Button>
            <Button
              size="sm"
              variant="warning"
              disabled={busy}
              onClick={() =>
                runAction(() => autofillRenjaTargets(id, withReason({ auto_apply: true, overwrite_target: overwriteTarget })))
              }
            >
              Autofill Targets (High)
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              disabled={busy}
              onClick={() => runAction(() => recomputeRenjaMismatch(id))}
            >
              Recompute Mismatch
            </Button>
            <span className="small text-muted">
              Readiness publish: <b>{readiness?.readiness?.ready_for_publish ? "READY" : "BLOCKED"}</b>
              {" | "}blocker <b>{readiness?.summary?.blocker_count ?? readiness?.summary?.blocking_count ?? 0}</b>
              {" | "}warning <b>{readiness?.summary?.warning_count ?? 0}</b>
            </span>
          </div>
        </CardBody>
      </Card>

      <Card className="shadow-sm mb-3">
        <CardBody>
          <h6 className="fw-bold mb-2">Riwayat batch Data Fix (audit / undo)</h6>
          <p className="small text-muted mb-2">
            Semua jenis perubahan (mapping, indikator, target, policy) tercatat. Undo hanya jika item belum diubah manual setelah apply.
          </p>
          <div className="row g-2 mb-2 align-items-end">
            <div className="col-md-3">
              <Form.Label className="small mb-0">change_type</Form.Label>
              <Form.Select size="sm" value={batchFilterType} onChange={(e) => setBatchFilterType(e.target.value)}>
                <option value="">(semua)</option>
                <option value="mapping_program">mapping_program</option>
                <option value="indikator">indikator</option>
                <option value="target">target</option>
                <option value="policy">policy</option>
              </Form.Select>
            </div>
            <div className="col-md-3">
              <Form.Label className="small mb-0">rollback_status</Form.Label>
              <Form.Select size="sm" value={batchFilterStatus} onChange={(e) => setBatchFilterStatus(e.target.value)}>
                <option value="">(semua)</option>
                <option value="pending">pending</option>
                <option value="rolled_back">rolled_back</option>
                <option value="partial">partial</option>
              </Form.Select>
            </div>
          </div>
          <Table size="sm" striped bordered responsive>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Type</th>
                <th>Status</th>
                <th>#Item</th>
                <th>Waktu apply</th>
                <th>Alasan apply</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {!filteredBatches.length ? (
                <tr>
                  <td colSpan={7} className="text-muted">Tidak ada batch (sesuai filter).</td>
                </tr>
              ) : (
                filteredBatches.map((b) => (
                  <tr key={b.id}>
                    <td>#{b.id}</td>
                    <td className="small">{b.change_type || b.suggestion_type || "-"}</td>
                    <td>
                      <Badge bg={b.rolled_back_at ? "secondary" : "success"}>
                        {b.rollback_status || (b.rolled_back_at ? "rolled_back" : "pending")}
                      </Badge>
                    </td>
                    <td>{b.items_count}</td>
                    <td className="small">{b.applied_at ? new Date(b.applied_at).toLocaleString() : "-"}</td>
                    <td className="small text-truncate" style={{ maxWidth: 180 }} title={b.change_reason_text || ""}>
                      {b.change_reason_text || "-"}
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        <Button size="sm" variant="outline-secondary" disabled={busy} onClick={() => openBatchDetail(b.id)}>
                          Detail
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          disabled={busy || Boolean(b.rolled_back_at)}
                          onClick={() => {
                            if (!window.confirm(`Undo batch #${b.id}?`)) return;
                            runAction(() => rollbackRenjaMappingApplyBatch(id, withReason({ batch_id: b.id })));
                          }}
                        >
                          Undo
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <div className="d-flex flex-wrap gap-2 mb-2">
        <Button
          size="sm"
          variant="outline-info"
          disabled={busy}
          onClick={() => openPreview({ apply_high_confidence_only: true })}
        >
          Preview mapping (HIGH saja)
        </Button>
        <Button
          size="sm"
          variant="outline-info"
          disabled={busy}
          onClick={() => openPreview({ apply_high_confidence_only: false })}
        >
          Preview semua pending mapping
        </Button>
      </div>

      <SuggestionTable
        title="Mapping RENJA -> RENSTRA"
        rows={mappingRows}
        onPreviewSingle={(row) => openPreview({ suggestion_ids: [row.id], apply_high_confidence_only: false })}
        onApplySingle={(row) =>
          runAction(() =>
            applyRenjaDataFixMapping(
              id,
              withReason({
                suggestion_ids: [row.id],
                apply_high_confidence_only: false,
                ...(useStampApply && Object.keys(lastMappingStamps).length
                  ? { expect_item_stamps: lastMappingStamps }
                  : {}),
              }),
            ),
          )
        }
      />

      <SuggestionTable
        title="Indicator Mapping Suggestions"
        rows={indicatorRows}
        onApplySingle={(row) =>
          runAction(() =>
            applyRenjaIndicatorSuggestions(id, withReason({ suggestion_ids: [row.id], apply_high_confidence_only: false })),
          )
        }
      />

      <SuggestionTable
        title="Target Autofill Suggestions"
        rows={targetRows}
      />

      <SuggestionTable title="Policy Conflict Resolver" rows={policyRows} itemLabel="Policy Item" />

      <Card className="shadow-sm">
        <CardBody>
          <h6 className="fw-bold">Urutan Penggunaan Operator</h6>
          <ol className="small mb-0">
            <li>Buka halaman Data Fix & Mapping.</li>
            <li>Generate Mapping Suggestions.</li>
            <li>Review confidence HIGH/MEDIUM/LOW dan konflik; gunakan Preview sebelum Apply.</li>
            <li>Apply mapping (single) atau Apply All High Confidence; undo lewat batch bila perlu.</li>
            <li>Jalankan Autofill Targets.</li>
            <li>Resolve Policy Conflicts untuk kasus ambigu.</li>
            <li>Recompute mismatch.</li>
            <li>Cek readiness publish di panel readiness.</li>
          </ol>
        </CardBody>
      </Card>

      <Modal show={previewOpen} onHide={() => setPreviewOpen(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Preview dampak mapping</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {previewBusy ? <Spinner animation="border" size="sm" className="me-2" /> : null}
          {previewPayload ? (
            <>
              <div className="small mb-2 text-muted">
                would_change: <b>{previewPayload.would_change_count}</b>
                {" / "}preview: <b>{previewPayload.preview_count}</b>
                {previewPayload.skipped_count ? (
                  <>
                    {" | "}skipped: <b>{previewPayload.skipped_count}</b>
                  </>
                ) : null}
              </div>
              {previewPayload.impact ? (
                <Card className="mb-3 border-primary">
                  <CardBody className="py-2">
                    <div className="small fw-bold text-primary mb-1">Analisis dampak (simulasi)</div>
                    <div className="small row g-1">
                      <div className="col-md-6">
                        blocker hilang: <b>{previewPayload.impact.blocker_reduction ?? 0}</b>
                        {" | "}warning hilang: <b>{previewPayload.impact.warning_reduction ?? 0}</b>
                      </div>
                      <div className="col-md-6">
                        policy chain diperbaiki: <b>{previewPayload.impact.policy_chain_fixed ?? 0}</b>
                        {" | "}readiness: <b>{previewPayload.impact.readiness_change || "—"}</b>
                      </div>
                      <div className="col-12">
                        skor kualitas: <b>{previewPayload.impact.quality_score_before ?? "—"}</b>
                        {" → "}
                        <b>{previewPayload.impact.quality_score_after ?? "—"}</b>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ) : null}
              <Table size="sm" striped bordered responsive>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Suggestion</th>
                    <th>Ubah?</th>
                    <th>Before</th>
                    <th>After</th>
                  </tr>
                </thead>
                <tbody>
                  {previewPayload.previews
                    .filter((p) => !p.skipped)
                    .map((p) => (
                      <tr key={`${p.suggestion_result_id}-${p.renja_item_id}`}>
                        <td>#{p.renja_item_id}</td>
                        <td>#{p.suggestion_result_id}</td>
                        <td>
                          {p.would_change ? (
                            <Badge bg="warning" text="dark">YA</Badge>
                          ) : (
                            <Badge bg="secondary">TIDAK</Badge>
                          )}
                        </td>
                        <td><pre className="small mb-0 text-wrap">{JSON.stringify(p.before)}</pre></td>
                        <td><pre className="small mb-0 text-wrap">{JSON.stringify(p.after)}</pre></td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(false)}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={batchDetailOpen} onHide={() => setBatchDetailOpen(false)} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Detail batch #{batchDetail?.id ?? "—"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!batchDetail ? <Spinner animation="border" size="sm" /> : null}
          {batchDetail?.error ? <Alert variant="danger">{batchDetail.error}</Alert> : null}
          {batchDetail && !batchDetail.error ? (
            <>
              <Table size="sm" bordered responsive className="mb-3">
                <tbody>
                  <tr><th className="w-25">change_type</th><td>{batchDetail.change_type || batchDetail.suggestion_type || "—"}</td></tr>
                  <tr><th>rollback_status</th><td>{batchDetail.rollback_status || (batchDetail.rolled_back_at ? "rolled_back" : "pending")}</td></tr>
                  <tr><th>apply_scope</th><td>{batchDetail.apply_scope || "—"}</td></tr>
                  <tr><th>applied_by</th><td>{batchDetail.applied_by ?? "—"}</td></tr>
                  <tr><th>applied_at</th><td>{batchDetail.applied_at ? new Date(batchDetail.applied_at).toLocaleString() : "—"}</td></tr>
                  <tr><th>rolled_back_by</th><td>{batchDetail.rolled_back_by ?? "—"}</td></tr>
                  <tr><th>rolled_back_at</th><td>{batchDetail.rolled_back_at ? new Date(batchDetail.rolled_back_at).toLocaleString() : "—"}</td></tr>
                  <tr><th>Alasan apply</th><td className="small">{batchDetail.change_reason_text || "—"}</td></tr>
                  <tr><th>Alasan rollback</th><td className="small">{batchDetail.rollback_reason_text || "—"}</td></tr>
                  <tr><th>version_before → after</th><td>{batchDetail.version_before ?? "—"} → {batchDetail.version_after ?? "—"}</td></tr>
                  <tr><th>affected_fields</th><td><pre className="small mb-0">{JSON.stringify(batchDetail.affected_fields_json || [], null, 0)}</pre></td></tr>
                </tbody>
              </Table>
              <h6 className="small fw-bold">items_before_json</h6>
              <pre className="small bg-light p-2 rounded" style={{ maxHeight: 220, overflow: "auto" }}>
                {JSON.stringify(batchDetail.items_before_json ?? batchDetail.items_json ?? [], null, 2)}
              </pre>
              <h6 className="small fw-bold mt-2">items_after_json</h6>
              <pre className="small bg-light p-2 rounded" style={{ maxHeight: 220, overflow: "auto" }}>
                {JSON.stringify(batchDetail.items_after_json ?? [], null, 2)}
              </pre>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setBatchDetailOpen(false)}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </RenjaPlanningDashboardLayout>
  );
};

export default RenjaDataFixDashboardPage;

