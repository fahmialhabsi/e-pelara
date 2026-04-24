import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import {
  fetchPlanningAuditDetail,
  fetchPlanningAuditList,
  fetchPlanningAuditSummary,
} from "../planningAuditDashboardApi";
import {
  complianceStatusLabel,
  complianceStatusVariant,
} from "../planningAuditDashboard.utils";

const CHANGE_ORIGIN_OPTIONS = [
  { value: "", label: "Semua asal perubahan" },
  { value: "api:rpjmd:bulk-from-master", label: "Bulk master → RPJMD" },
  { value: "api:rpjmd:backfill", label: "Backfill mapping" },
  { value: "api:rpjmd-rkpd:sync", label: "Sync RPJMD → RKPD" },
];

const SOURCE_OPTIONS = [
  { value: "all", label: "Semua (compliance + planning)" },
  { value: "compliance", label: "Compliance (bulk / backfill / sync)" },
  { value: "planning", label: "Planning (dokumen / mutasi tabel)" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Semua status" },
  { value: "success", label: "Sukses commit / mutasi" },
  { value: "preview", label: "Pratinjau" },
  { value: "rejected", label: "Ditolak" },
  { value: "failure", label: "Gagal" },
];

function JsonPreview({ value, title }) {
  const [open, setOpen] = useState(false);
  if (value == null) return null;
  const str =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const long = str.length > 280;
  const display = !long || open ? str : `${str.slice(0, 280)}…`;
  return (
    <div className="border rounded p-2 bg-light small mb-2">
      <div className="d-flex justify-content-between align-items-center">
        <strong>{title}</strong>
        {long ? (
          <Button variant="link" size="sm" className="py-0" onClick={() => setOpen(!open)}>
            {open ? "Ringkas" : "Selengkapnya"}
          </Button>
        ) : null}
      </div>
      <pre className="mb-0 mt-1 small" style={{ whiteSpace: "pre-wrap" }}>
        {display}
      </pre>
    </div>
  );
}

export default function PlanningAuditDashboardPage() {
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    source: "all",
    action: "",
    change_origin: "",
    user_id: "",
    correlation_id: "",
    entity_scope: "",
    entity_type: "",
    status: "all",
  });
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [list, setList] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const queryParams = useMemo(() => {
    const p = { limit, offset, source: filters.source };
    if (filters.date_from) p.date_from = filters.date_from;
    if (filters.date_to) p.date_to = filters.date_to;
    if (filters.action.trim()) p.action = filters.action.trim();
    if (filters.change_origin) p.change_origin = filters.change_origin;
    if (filters.user_id.trim()) p.user_id = filters.user_id.trim();
    if (filters.correlation_id.trim()) p.correlation_id = filters.correlation_id.trim();
    if (filters.entity_scope.trim()) p.entity_scope = filters.entity_scope.trim();
    if (filters.entity_type.trim()) p.entity_type = filters.entity_type.trim();
    if (filters.status && filters.status !== "all") p.status = filters.status;
    return p;
  }, [filters, limit, offset]);

  const loadSummary = useCallback(async () => {
    try {
      const sp = {};
      if (filters.date_from) sp.date_from = filters.date_from;
      if (filters.date_to) sp.date_to = filters.date_to;
      const res = await fetchPlanningAuditSummary(sp);
      if (res.success) setSummary(res.data);
    } catch {
      setSummary(null);
    }
  }, [filters.date_from, filters.date_to]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPlanningAuditList(queryParams);
      if (res.success) {
        setList(res.data || []);
        setMeta(res.meta || { total: 0 });
      } else {
        setList([]);
      }
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const onFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setOffset(0);
  };

  const openDetail = async (recordKey) => {
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await fetchPlanningAuditDetail(recordKey);
      if (res.success) setDetail(res.data);
      else setDetailError(res.message || "Gagal memuat detail.");
    } catch (e) {
      setDetailError(e?.response?.data?.message || e.message || "Gagal memuat detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  const canPrev = offset > 0;
  const canNext = offset + limit < (meta.total || 0);

  return (
    <div className="container-fluid py-4">
      <h4 className="mb-1">Dashboard audit &amp; compliance</h4>
      <p className="text-muted small mb-4">
        Jejak operasi bulk import, backfill, sync RPJMD→RKPD, dan mutasi perencanaan. Hanya
        baca — tidak mengubah data.
      </p>

      {summary ? (
        <Row className="g-3 mb-4">
          <Col md={6} lg={3}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <div className="text-muted small">Aktivitas compliance (periode filter)</div>
                <div className="h4 mb-0">{summary.compliance?.total_rows ?? 0}</div>
                <div className="small text-muted mt-1">
                  Pratinjau: {summary.compliance?.previews ?? 0} · Ditolak:{" "}
                  {summary.compliance?.rejected ?? 0}
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <div className="text-muted small">Commit sukses (bulk/backfill)</div>
                <div className="h4 mb-0 text-success">{summary.compliance?.commits_ok ?? 0}</div>
                <div className="small text-muted mt-1">
                  Gagal: {summary.compliance?.failed ?? 0}
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <div className="text-muted small">Sync RKPD · Backfill jalan</div>
                <div className="small">
                  Sync commit OK:{" "}
                  <strong>{summary.compliance?.sync_commits_ok ?? 0}</strong>
                </div>
                <div className="small">
                  Backfill execute OK:{" "}
                  <strong>{summary.compliance?.backfill_execute_ok ?? 0}</strong>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <div className="text-muted small">Planning events · Top pengguna</div>
                <div className="small mb-1">
                  Events: <strong>{summary.planning?.events ?? 0}</strong>
                </div>
                <ul className="small mb-0 ps-3">
                  {(summary.top_users_compliance || []).slice(0, 4).map((u) => (
                    <li key={u.user_id}>
                      {u.username || `user #${u.user_id}`}: {u.count}
                    </li>
                  ))}
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : null}

      <Card className="shadow-sm mb-4">
        <Card.Header className="fw-semibold">Filter</Card.Header>
        <Card.Body>
          <Row className="g-2">
            <Col md={6} lg={3}>
              <Form.Label className="small">Dari tanggal</Form.Label>
              <Form.Control
                type="date"
                value={filters.date_from}
                onChange={(e) => onFilterChange("date_from", e.target.value)}
              />
            </Col>
            <Col md={6} lg={3}>
              <Form.Label className="small">Sampai tanggal</Form.Label>
              <Form.Control
                type="date"
                value={filters.date_to}
                onChange={(e) => onFilterChange("date_to", e.target.value)}
              />
            </Col>
            <Col md={6} lg={3}>
              <Form.Label className="small">Sumber rekaman</Form.Label>
              <Form.Select
                value={filters.source}
                onChange={(e) => onFilterChange("source", e.target.value)}
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={6} lg={3}>
              <Form.Label className="small">Status</Form.Label>
              <Form.Select
                value={filters.status}
                onChange={(e) => onFilterChange("status", e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={6} lg={4}>
              <Form.Label className="small">Aksi / kata kunci modul</Form.Label>
              <Form.Control
                placeholder="contoh: BULK_MASTER atau renja_dokumen"
                value={filters.action}
                onChange={(e) => onFilterChange("action", e.target.value)}
              />
            </Col>
            <Col md={6} lg={4}>
              <Form.Label className="small">Asal perubahan (compliance)</Form.Label>
              <Form.Select
                value={filters.change_origin}
                onChange={(e) => onFilterChange("change_origin", e.target.value)}
              >
                {CHANGE_ORIGIN_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={6} lg={4}>
              <Form.Label className="small">Correlation ID</Form.Label>
              <Form.Control
                placeholder="UUID dari pratinjau / commit"
                value={filters.correlation_id}
                onChange={(e) => onFilterChange("correlation_id", e.target.value)}
              />
            </Col>
            <Col md={4} lg={3}>
              <Form.Label className="small">User ID</Form.Label>
              <Form.Control
                value={filters.user_id}
                onChange={(e) => onFilterChange("user_id", e.target.value)}
              />
            </Col>
            <Col md={4} lg={3}>
              <Form.Label className="small">Cakupan entitas</Form.Label>
              <Form.Control
                placeholder="contoh: BULK: atau renja"
                value={filters.entity_scope}
                onChange={(e) => onFilterChange("entity_scope", e.target.value)}
              />
            </Col>
            <Col md={4} lg={3}>
              <Form.Label className="small">Jenis entitas (payload)</Form.Label>
              <Form.Control
                placeholder="PROGRAM, SUB_KEGIATAN, …"
                value={filters.entity_type}
                onChange={(e) => onFilterChange("entity_type", e.target.value)}
              />
            </Col>
            <Col md={12} className="d-flex gap-2 align-items-end flex-wrap mt-2">
              <Button
                variant="primary"
                onClick={() => {
                  setOffset(0);
                  loadList();
                  loadSummary();
                }}
              >
                Terapkan &amp; muat ulang
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setFilters({
                    date_from: "",
                    date_to: "",
                    source: "all",
                    action: "",
                    change_origin: "",
                    user_id: "",
                    correlation_id: "",
                    entity_scope: "",
                    entity_type: "",
                    status: "all",
                  });
                  setOffset(0);
                }}
              >
                Reset filter
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Daftar aktivitas</span>
              {loading ? <Spinner size="sm" animation="border" /> : null}
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Waktu</th>
                    <th>Status</th>
                    <th>Sumber</th>
                    <th>Ringkasan</th>
                    <th>Pengguna</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr
                      key={row.record_key}
                      role="button"
                      className={detail?.record_key === row.record_key ? "table-active" : ""}
                      onClick={() => openDetail(row.record_key)}
                    >
                      <td className="text-nowrap small">
                        {row.event_at
                          ? new Date(row.event_at).toLocaleString("id-ID")
                          : "—"}
                      </td>
                      <td>
                        <Badge bg={complianceStatusVariant(row.ui_status)}>
                          {complianceStatusLabel(row.ui_status)}
                        </Badge>
                      </td>
                      <td className="small">
                        {row.source === "compliance" ? "Compliance" : "Planning"}
                        <div className="text-muted text-truncate" style={{ maxWidth: 140 }} title={row.action}>
                          {row.action}
                        </div>
                      </td>
                      <td className="small">
                        <div className="text-truncate" style={{ maxWidth: 220 }} title={row.headline}>
                          {row.headline}
                        </div>
                        {row.correlation_id ? (
                          <div className="text-muted text-truncate" style={{ maxWidth: 220 }} title={row.correlation_id}>
                            {row.correlation_id}
                          </div>
                        ) : null}
                      </td>
                      <td className="small">
                        {row.actor?.username || (row.actor?.id ? `#${row.actor.id}` : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {!list.length && !loading ? (
                <div className="p-4 text-center text-muted small">Tidak ada data untuk filter ini.</div>
              ) : null}
            </Card.Body>
            <Card.Footer className="d-flex justify-content-between align-items-center small">
              <span>
                Menampilkan {offset + 1}–{Math.min(offset + limit, meta.total)} dari {meta.total}
              </span>
              <div className="d-flex gap-2">
                <Button
                  size="sm"
                  variant="outline-secondary"
                  disabled={!canPrev}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Sebelumnya
                </Button>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  disabled={!canNext}
                  onClick={() => setOffset(offset + limit)}
                >
                  Berikutnya
                </Button>
              </div>
            </Card.Footer>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="shadow-sm">
            <Card.Header className="fw-semibold">Detail rekaman</Card.Header>
            <Card.Body>
              {detailLoading ? <Spinner animation="border" size="sm" /> : null}
              {detailError ? <div className="text-danger small">{detailError}</div> : null}
              {!detail && !detailLoading ? (
                <p className="text-muted small mb-0">Pilih baris di tabel untuk melihat detail.</p>
              ) : null}
              {detail ? (
                <>
                  <p className="small mb-2">
                    <Badge bg={complianceStatusVariant(detail.ui_status)} className="me-2">
                      {complianceStatusLabel(detail.ui_status)}
                    </Badge>
                    <span className="text-muted">{detail.record_key}</span>
                  </p>
                  <dl className="row small mb-0">
                    <dt className="col-sm-4">Waktu</dt>
                    <dd className="col-sm-8">
                      {detail.event_at ? new Date(detail.event_at).toLocaleString("id-ID") : "—"}
                    </dd>
                    <dt className="col-sm-4">Pengguna</dt>
                    <dd className="col-sm-8">
                      {detail.actor?.username || "—"}{" "}
                      {detail.actor?.id ? `(#${detail.actor.id})` : ""}
                    </dd>
                    <dt className="col-sm-4">Aksi</dt>
                    <dd className="col-sm-8">{detail.action}</dd>
                    <dt className="col-sm-4">Asal perubahan</dt>
                    <dd className="col-sm-8">{detail.change_origin || "—"}</dd>
                    <dt className="col-sm-4">Cakupan</dt>
                    <dd className="col-sm-8">{detail.entity_scope || "—"}</dd>
                    <dt className="col-sm-4">Correlation ID</dt>
                    <dd className="col-sm-8 text-break">{detail.correlation_id || "—"}</dd>
                    <dt className="col-sm-4">Alasan</dt>
                    <dd className="col-sm-8">{detail.reason || "—"}</dd>
                    <dt className="col-sm-4">Pesan admin</dt>
                    <dd className="col-sm-8">{detail.admin_message || "—"}</dd>
                    <dt className="col-sm-4">Sukses?</dt>
                    <dd className="col-sm-8">
                      {detail.success === undefined || detail.success === null
                        ? "—"
                        : detail.success
                          ? "Ya"
                          : "Tidak"}
                    </dd>
                  </dl>
                  {detail.source === "compliance" ? (
                    <>
                      <JsonPreview title="Ringkasan state lama" value={detail.old_state_summary} />
                      <JsonPreview title="Ringkasan state baru" value={detail.new_state_summary} />
                      <JsonPreview title="Ringkasan permintaan (digest)" value={detail.request_digest} />
                      <JsonPreview title="Hasil ringkas" value={detail.result_compact} />
                      <JsonPreview title="Payload lengkap (audit)" value={detail.payload_full} />
                    </>
                  ) : (
                    <>
                      <JsonPreview title="Snapshot perubahan" value={detail.snapshot} />
                      <JsonPreview title="Nilai lama (ringkas)" value={detail.old_value_compact} />
                      <JsonPreview title="Nilai baru (ringkas)" value={detail.new_value_compact} />
                    </>
                  )}
                </>
              ) : null}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
