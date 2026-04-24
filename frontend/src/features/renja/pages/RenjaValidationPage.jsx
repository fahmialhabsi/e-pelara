import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardBody, Form, Spinner, Table } from "react-bootstrap";
import RenjaPlanningDashboardLayout from "./RenjaPlanningDashboardLayout";
import RenjaDokumenNavTabs from "../components/RenjaDokumenNavTabs";
import { getRenjaMismatchValidation, recomputeRenjaMismatch } from "../services/renjaGovernanceApi";

function traceText(trace = {}) {
  return [
    trace.misi || "-",
    trace.tujuan || "-",
    trace.sasaran || "-",
    trace.strategi || "-",
    trace.arah_kebijakan || "-",
    trace.program || "-",
    trace.kegiatan || "-",
    trace.sub_kegiatan || "-",
  ].join(" -> ");
}

function thresholdText(ctx) {
  if (!ctx) return "-";
  if (ctx.method === "percentage_deviation") {
    return `${ctx.metric || "-"} dev ${ctx.deviation_pct ?? "-"}%`;
  }
  if (ctx.method === "dice_similarity") {
    return `${ctx.metric || "-"} sim ${ctx.similarity ?? "-"}`;
  }
  return JSON.stringify(ctx);
}

const GroupMiniTable = ({ title, rows = [], keyLabel }) => (
  <Card className="shadow-sm h-100">
    <CardBody>
      <h6 className="fw-bold mb-2">{title}</h6>
      <Table size="sm" bordered>
        <thead>
          <tr>
            <th>{keyLabel}</th>
            <th className="text-end">Total</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length ? (
            <tr>
              <td colSpan={2} className="text-muted">Tidak ada data</td>
            </tr>
          ) : rows.map((r) => (
            <tr key={`${r.name}-${r.total}`}>
              <td>{r.name}</td>
              <td className="text-end">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </CardBody>
  </Card>
);

const RenjaValidationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getRenjaMismatchValidation(id);
      if (Array.isArray(data)) {
        setRows(data);
        setMeta({});
      } else {
        setRows(Array.isArray(data?.results) ? data.results : []);
        setMeta(data || {});
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const recompute = async () => {
    setBusy(true);
    try {
      await recomputeRenjaMismatch(id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const filteredRows = useMemo(() => {
    const normFilter = String(severityFilter || "").toUpperCase();
    return rows.filter((x) => !normFilter || String(x.severity_final || "").toUpperCase() === normFilter);
  }, [rows, severityFilter]);

  const counts = useMemo(
    () => ({
      blocking: filteredRows.filter((x) => x.severity_final === "BLOCKER").length,
      warning: filteredRows.filter((x) => x.severity_final === "WARNING").length,
      info: filteredRows.filter((x) => x.severity_final === "INFO").length,
    }),
    [filteredRows],
  );

  return (
    <RenjaPlanningDashboardLayout>
      <Link to="/dashboard-renja" className="small">← Dashboard RENJA</Link>
      <h4 className="fw-bold text-success mt-2 mb-2">Validasi & Mismatch Engine</h4>
      <RenjaDokumenNavTabs id={id} />
      <div className="d-flex flex-wrap gap-2 mb-2">
        <Button size="sm" variant="outline-success" disabled={busy} onClick={recompute}>
          {busy ? "Recompute..." : "Recompute Mismatch"}
        </Button>
        <Form.Select
          size="sm"
          style={{ maxWidth: 220 }}
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="">Semua severity</option>
          <option value="BLOCKER">BLOCKER</option>
          <option value="WARNING">WARNING</option>
          <option value="INFO">INFO</option>
        </Form.Select>
      </div>
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <>
          <Card className="shadow-sm mb-3">
            <CardBody>
              <div className="small mb-1">
                Blocking: <b>{counts.blocking}</b> - Warning: <b>{counts.warning}</b> - Info: <b>{counts.info}</b>
              </div>
              <div className="small text-muted">
                Run: {meta?.run?.id || "-"} - computed_at: {meta?.run?.computed_at || "-"}
              </div>
            </CardBody>
          </Card>

          <div className="row g-3 mb-3">
            <div className="col-lg-4">
              <GroupMiniTable title="Grouped by Source" rows={meta?.grouped_by_source || []} keyLabel="Source" />
            </div>
            <div className="col-lg-4">
              <GroupMiniTable
                title="Grouped by Hierarchy"
                rows={meta?.grouped_by_hierarchy_level || []}
                keyLabel="Level"
              />
            </div>
            <div className="col-lg-4">
              <GroupMiniTable
                title="Grouped by Document Pair"
                rows={meta?.grouped_by_document_pair || []}
                keyLabel="Pair"
              />
            </div>
          </div>

          <Card className="shadow-sm mb-3">
            <CardBody>
              <Table striped bordered size="sm" responsive>
                <thead>
                  <tr>
                    <th>Scope</th>
                    <th>Governance</th>
                    <th>Source</th>
                    <th>Pair</th>
                    <th>Code</th>
                    <th>Message</th>
                    <th>Expected vs Actual</th>
                    <th>Threshold</th>
                    <th>Hierarchy Trace</th>
                    <th>Navigasi</th>
                  </tr>
                </thead>
                <tbody>
                  {!filteredRows.length ? (
                    <tr>
                      <td colSpan={10} className="text-success">Tidak ada mismatch.</td>
                    </tr>
                  ) : filteredRows.map((r, idx) => (
                    <tr key={r.id || `${r.mismatch_code}-${r.related_item_id || "doc"}-${idx}`}>
                      <td>{r.mismatch_scope}</td>
                      <td>
                        <Badge
                          bg={
                            r.severity_final === "BLOCKER"
                              ? "danger"
                              : r.severity_final === "INFO"
                                ? "secondary"
                                : "warning"
                          }
                          text={r.severity_final === "WARNING" ? "dark" : "light"}
                        >
                          {r.severity_final || "-"}
                        </Badge>
                        <div className="small text-muted">{r.governance_level || "-"}</div>
                      </td>
                      <td>{r.source_type || "-"}</td>
                      <td>{r.document_pair || "-"}</td>
                      <td>{r.mismatch_code}</td>
                      <td>
                        <div>{r.message}</div>
                        <div className="small text-muted">{r.recommendation || "-"}</div>
                      </td>
                      <td className="small">
                        <div><b>Field:</b> {r.field_name || "-"}</div>
                        <div><b>Expected:</b> {r.expected_value ?? "-"}</div>
                        <div><b>Actual:</b> {r.actual_value ?? "-"}</div>
                      </td>
                      <td className="small">{thresholdText(r.threshold_context)}</td>
                      <td className="small">
                        <div><b>Actual:</b> {traceText(r.hierarchy_trace || {})}</div>
                        <div><b>Expected:</b> {traceText(r.expected_source_trace || {})}</div>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() =>
                            navigate(
                              r.suggested_route ||
                                (r.mismatch_scope === "item"
                                  ? `/dashboard-renja/v2/dokumen/${id}/rencana-kerja`
                                  : `/dashboard-renja/v2/dokumen/${id}`),
                            )
                          }
                        >
                          {r.editor_target === "item_row" ? "Buka item" : "Buka"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </>
      )}
    </RenjaPlanningDashboardLayout>
  );
};

export default RenjaValidationPage;
