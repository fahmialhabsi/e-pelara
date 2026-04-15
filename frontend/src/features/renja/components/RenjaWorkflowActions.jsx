import React, { useState } from "react";
import { Button, ButtonGroup, Form, Modal, Spinner, Table, Badge } from "react-bootstrap";
import {
  saveRenjaDokumenDocxToFile,
  saveRenjaDokumenPdfToFile,
  saveRenjaOfficialDocxToFile,
  saveRenjaOfficialPdfToFile,
  fetchRenjaDokumenChangeLog,
} from "../services/planningRenjaApi";

/**
 * Pilih dokumen Renja v2 dari ringkasan dashboard → generate Word/PDF.
 */
const RenjaWorkflowActions = ({ dokumenList = [], onAfterExport }) => {
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logRows, setLogRows] = useState([]);
  const [logLoading, setLogLoading] = useState(false);

  const selected = dokumenList.find((d) => String(d.id) === String(selectedId));
  const label = selected?.judul || selected?.perangkat_daerah_nama || "Renja";

  const run = async (kind) => {
    if (!selectedId) {
      alert("Pilih dokumen Renja v2 di dropdown terlebih dahulu.");
      return;
    }
    setBusy(kind);
    try {
      if (kind === "pvw-docx") await saveRenjaDokumenDocxToFile(selectedId, label);
      else if (kind === "pvw-pdf") await saveRenjaDokumenPdfToFile(selectedId, label);
      else if (kind === "off-docx") await saveRenjaOfficialDocxToFile(selectedId, label);
      else if (kind === "off-pdf") await saveRenjaOfficialPdfToFile(selectedId, label);
      if (typeof onAfterExport === "function") onAfterExport();
    } catch (err) {
      console.error(err);
      let msg = "Gagal men-generate dokumen.";
      try {
        if (err?.response?.data instanceof ArrayBuffer) {
          const text = new TextDecoder().decode(err.response.data);
          const json = JSON.parse(text);
          msg = json?.message || msg;
        } else {
          msg = err?.response?.data?.message || err.message || msg;
        }
      } catch {
        /* noop */
      }
      alert(msg);
    } finally {
      setBusy(null);
    }
  };

  const openLog = async () => {
    if (!selectedId) {
      alert("Pilih dokumen dulu.");
      return;
    }
    setLogOpen(true);
    setLogLoading(true);
    try {
      const rows = await fetchRenjaDokumenChangeLog(selectedId);
      setLogRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setLogRows([]);
      alert(e?.response?.data?.message || "Gagal memuat log.");
    } finally {
      setLogLoading(false);
    }
  };

  return (
    <div className="border rounded p-3 bg-white">
      <div className="fw-bold mb-2">📄 Ekspor dokumen Renja (v2)</div>
      <p className="small text-muted mb-2">
        <strong>Preview</strong> = ringkasan baris internal. <strong>Dokumen resmi</strong> = BAB
        I–V (Document Engine). Pilih dokumen lalu unduh.
      </p>
      <Form.Group className="mb-2">
        <Form.Label className="small mb-1">Dokumen Renja</Form.Label>
        <Form.Select
          size="sm"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">— Pilih dokumen —</option>
          {dokumenList.map((d) => (
            <option key={d.id} value={d.id}>
              #{d.id} · {d.tahun} · {d.perangkat_daerah_nama || d.perangkat_daerah_id}{" "}
              · {d.judul || "(tanpa judul)"}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      <div className="small text-muted mb-1">Preview</div>
      <ButtonGroup size="sm" className="flex-wrap mb-2">
        <Button
          variant="outline-success"
          disabled={!!busy}
          onClick={() => run("pvw-docx")}
        >
          {busy === "pvw-docx" ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              …
            </>
          ) : (
            "Preview Word"
          )}
        </Button>
        <Button variant="outline-danger" disabled={!!busy} onClick={() => run("pvw-pdf")}>
          {busy === "pvw-pdf" ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              …
            </>
          ) : (
            "Preview PDF"
          )}
        </Button>
      </ButtonGroup>
      <div className="small text-muted mb-1">Dokumen resmi (Renja OPD)</div>
      <ButtonGroup size="sm" className="flex-wrap">
        <Button variant="success" disabled={!!busy} onClick={() => run("off-docx")}>
          {busy === "off-docx" ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              …
            </>
          ) : (
            "Dokumen resmi Word"
          )}
        </Button>
        <Button variant="primary" disabled={!!busy} onClick={() => run("off-pdf")}>
          {busy === "off-pdf" ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              …
            </>
          ) : (
            "Dokumen resmi PDF"
          )}
        </Button>
        <Button variant="outline-secondary" disabled={!!busy} onClick={openLog}>
          Lihat perubahan
        </Button>
      </ButtonGroup>

      <Modal show={logOpen} onHide={() => setLogOpen(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Log perubahan (renja_item)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {logLoading ? (
            <Spinner />
          ) : logRows.length === 0 ? (
            <div className="small text-muted">Tidak ada baris log (cascade RKPD belum terjadi).</div>
          ) : (
            <Table size="sm" striped bordered responsive>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Item</th>
                  <th>Field</th>
                  <th>Lama</th>
                  <th>Baru</th>
                  <th>Tipe</th>
                </tr>
              </thead>
              <tbody>
                {logRows.map((L) => (
                  <tr key={L.id}>
                    <td className="text-nowrap small">{L.created_at || "—"}</td>
                    <td>{L.entity_id}</td>
                    <td>{L.field_key}</td>
                    <td className="small">{String(L.old_value ?? "").slice(0, 60)}</td>
                    <td className="small">{String(L.new_value ?? "").slice(0, 60)}</td>
                    <td>
                      <Badge bg="secondary">{L.change_type || L.source}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default RenjaWorkflowActions;
