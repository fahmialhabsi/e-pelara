import React, { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import {
  getMrPlanningContextDetail,
  getMrPlanningContexts,
} from "../../services/mrPlanningContextService";

const getLength = (value) => {
  return Array.isArray(value) ? value.length : 0;
};

const ChainSummary = ({ context }) => {
  if (!context) return null;

  const items = [
    { label: "Context Items", value: getLength(context.items), variant: "primary" },
    { label: "Risiko", value: getLength(context.risks), variant: "danger" },
    { label: "Analisis Risiko", value: getLength(context.risk_analyses), variant: "warning" },
    { label: "Akar Penyebab", value: getLength(context.root_causes), variant: "secondary" },
    { label: "Mitigasi", value: getLength(context.mitigations), variant: "success" },
    { label: "Monitoring", value: getLength(context.monitorings), variant: "info" },
    { label: "Deviasi", value: getLength(context.deviations), variant: "dark" },
    { label: "Warning", value: getLength(context.warnings), variant: "danger" },
  ];

  return (
    <Card className="bg-dark text-light border-secondary shadow-sm mb-3">
      <Card.Header className="border-secondary">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Ringkasan Chain MR Planning</h5>
            <small className="text-secondary">
              Context ID: {context.id} • Tahun {context.tahun}
            </small>
          </div>

          <Badge bg={context.status_revisi === "approved" ? "success" : "warning"}>
            {context.status_revisi || "draft"}
          </Badge>
        </div>
      </Card.Header>

      <Card.Body>
        <Row className="g-3">
          {items.map((item) => (
            <Col key={item.label} xs={6} md={3}>
              <div className="border border-secondary rounded p-3 h-100">
                <div className="text-secondary small">{item.label}</div>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <strong className="fs-4">{item.value}</strong>
                  <Badge bg={item.variant}>{item.value}</Badge>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card.Body>
    </Card>
  );
};

const RiskTable = ({ risks = [] }) => {
  if (!Array.isArray(risks) || risks.length === 0) {
    return (
      <Alert variant="secondary" className="mb-0">
        Belum ada risiko pada context ini.
      </Alert>
    );
  }

  return (
    <Table responsive bordered hover variant="dark" className="mb-0">
      <thead>
        <tr>
          <th style={{ width: "80px" }}>ID</th>
          <th>Kode Risiko</th>
          <th>Nama Risiko</th>
          <th>Level</th>
          <th>Status Revisi</th>
        </tr>
      </thead>
      <tbody>
        {risks.map((risk) => (
          <tr key={risk.id}>
            <td>{risk.id}</td>
            <td>{risk.kode_risiko || "-"}</td>
            <td>{risk.nama_risiko || "-"}</td>
            <td>
              <Badge bg="danger">{risk.level_risiko || "-"}</Badge>
            </td>
            <td>
              <Badge bg={risk.status_revisi === "approved" ? "success" : "warning"}>
                {risk.status_revisi || "draft"}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

const WarningTable = ({ warnings = [] }) => {
  if (!Array.isArray(warnings) || warnings.length === 0) {
    return (
      <Alert variant="secondary" className="mb-0">
        Belum ada warning pada context ini.
      </Alert>
    );
  }

  return (
    <Table responsive bordered hover variant="dark" className="mb-0">
      <thead>
        <tr>
          <th style={{ width: "80px" }}>ID</th>
          <th>Kode</th>
          <th>Jenis</th>
          <th>Level</th>
          <th>Status</th>
          <th>Read</th>
          <th>Resolved</th>
        </tr>
      </thead>
      <tbody>
        {warnings.map((warning) => (
          <tr key={warning.id}>
            <td>{warning.id}</td>
            <td>{warning.warning_code || "-"}</td>
            <td>{warning.warning_type || "-"}</td>
            <td>
              <Badge bg={warning.warning_level === "critical" ? "danger" : "warning"}>
                {warning.warning_level || "-"}
              </Badge>
            </td>
            <td>{warning.warning_status || "-"}</td>
            <td>{warning.is_read ? "Ya" : "Belum"}</td>
            <td>{warning.is_resolved ? "Ya" : "Belum"}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

const MrPlanningContextPage = () => {
  const [contexts, setContexts] = useState([]);
  const [selectedContextId, setSelectedContextId] = useState("");
  const [selectedContext, setSelectedContext] = useState(null);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  const loadContexts = async () => {
    try {
      setLoadingList(true);
      setError("");

      const result = await getMrPlanningContexts();

      if (!result?.success) {
        throw new Error(result?.message || "Gagal memuat daftar context MR.");
      }

      const rows = Array.isArray(result.data) ? result.data : [];
      setContexts(rows);

      if (rows.length > 0) {
        setSelectedContextId(String(rows[0].id));
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Gagal memuat daftar context MR."
      );
    } finally {
      setLoadingList(false);
    }
  };

  const loadContextDetail = async (id) => {
    if (!id) {
      setSelectedContext(null);
      return;
    }

    try {
      setLoadingDetail(true);
      setError("");

      const result = await getMrPlanningContextDetail(id);

      if (!result?.success) {
        throw new Error(result?.message || "Gagal memuat detail context MR.");
      }

      setSelectedContext(result.data || null);
    } catch (err) {
      setSelectedContext(null);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Gagal memuat detail context MR."
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadContexts();
  }, []);

  useEffect(() => {
    if (selectedContextId) {
      loadContextDetail(selectedContextId);
    }
  }, [selectedContextId]);

  return (
    <Container fluid className="py-4 bg-dark text-light min-vh-100">
      <Row className="mb-3">
        <Col>
          <h3 className="mb-1">MR Planning Context</h3>
          <p className="text-secondary mb-0">
            Fondasi awal frontend untuk membaca chain Manajemen Risiko Perencanaan.
          </p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="border-0">
          {error}
        </Alert>
      )}

      <Card className="bg-dark text-light border-secondary shadow-sm mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={8}>
              <Form.Group>
                <Form.Label>Pilih Context MR</Form.Label>
                <Form.Select
                  value={selectedContextId}
                  disabled={loadingList}
                  onChange={(event) => setSelectedContextId(event.target.value)}
                >
                  <option value="">Pilih context</option>
                  {contexts.map((context) => (
                    <option key={context.id} value={context.id}>
                      {context.periode_label || `Context ${context.id}`} —{" "}
                      {context.jenis_dokumen || "-"} —{" "}
                      {context.nama_opd || `OPD ${context.opd_id || "-"}`}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Button
                variant="outline-light"
                className="w-100"
                disabled={!selectedContextId || loadingDetail}
                onClick={() => loadContextDetail(selectedContextId)}
              >
                {loadingDetail ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Memuat...
                  </>
                ) : (
                  "Muat Detail Context"
                )}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loadingDetail && (
        <div className="py-3">
          <Spinner animation="border" size="sm" className="me-2" />
          Memuat detail context...
        </div>
      )}

      {selectedContext && (
        <>
          <Card className="bg-dark text-light border-secondary shadow-sm mb-3">
            <Card.Header className="border-secondary">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0">{selectedContext.periode_label}</h5>
                  <small className="text-secondary">
                    {selectedContext.jenis_dokumen} • Tahun {selectedContext.tahun}
                  </small>
                </div>

                <Badge
                  bg={selectedContext.status_revisi === "approved" ? "success" : "warning"}
                >
                  {selectedContext.status_revisi || "draft"}
                </Badge>
              </div>
            </Card.Header>

            <Card.Body>
              <Row className="g-3">
                <Col md={3}>
                  <div className="text-secondary small">Context ID</div>
                  <strong>{selectedContext.id}</strong>
                </Col>

                <Col md={3}>
                  <div className="text-secondary small">Renstra ID</div>
                  <strong>{selectedContext.renstra_id || "-"}</strong>
                </Col>

                <Col md={3}>
                  <div className="text-secondary small">OPD</div>
                  <strong>{selectedContext.nama_opd || selectedContext.opd_id || "-"}</strong>
                </Col>

                <Col md={3}>
                  <div className="text-secondary small">Owner</div>
                  <strong>{selectedContext.owner_user_id || "-"}</strong>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <ChainSummary context={selectedContext} />

          <Card className="bg-dark text-light border-secondary shadow-sm mb-3">
            <Card.Header className="border-secondary">
              <h5 className="mb-0">Risiko pada Context</h5>
            </Card.Header>
            <Card.Body>
              <RiskTable risks={selectedContext.risks} />
            </Card.Body>
          </Card>

          <Card className="bg-dark text-light border-secondary shadow-sm mb-3">
            <Card.Header className="border-secondary">
              <h5 className="mb-0">Warning pada Context</h5>
            </Card.Header>
            <Card.Body>
              <WarningTable warnings={selectedContext.warnings} />
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
};

export default MrPlanningContextPage;