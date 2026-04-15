import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Alert,
  Form,
  Spinner,
} from "react-bootstrap";
import api from "../../services/api";
import RpjmdMetadataForm from "./RpjmdMetadataForm";
import { useAuth } from "../../hooks/useAuth";
import { normalizeListItems } from "@/utils/apiResponse";
import { canRestorePlanningDocumentVersion } from "../../utils/roleUtils";
import AuditTimeline from "../../features/planning-audit/components/AuditTimeline";
import BeforeAfterDiffCard from "../../features/planning-audit/components/BeforeAfterDiffCard";
import DocumentTracePanel from "../../features/planning-audit/components/DocumentTracePanel";
import VersionHistoryPanel from "../../features/planning-audit/components/VersionHistoryPanel";

export default function RPJMDPage() {
  const { user } = useAuth();
  const allowedRoles = ["SUPER_ADMIN", "ADMINISTRATOR"];
  const canDelete = user?.role === "SUPER_ADMIN";

  const [list, setList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("add");
  const [currentItem, setCurrentItem] = useState(null);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditFor, setAuditFor] = useState(null);
  const [auditRows, setAuditRows] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    try {
      const res = await api.get("/rpjmd");
      setList(normalizeListItems(res.data));
    } catch (err) {
      console.error("Error fetching RPJMD list:", err);
      alert("Gagal memuat daftar RPJMD.");
    }
  };

  const openAudit = async (item) => {
    setAuditFor(item);
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditRows([]);
    try {
      const res = await api.get(`/rpjmd/${item.id}/audit`);
      const payload = res.data;
      setAuditRows(Array.isArray(payload?.data) ? payload.data : []);
    } catch (err) {
      console.error(err);
      alert("Gagal memuat riwayat audit.");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleAdd = () => {
    setMode("add");
    setCurrentItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setMode("edit");
    setCurrentItem(item);
    setShowModal(true);
  };

  const handleDeleteClick = (item) => {
    setDeleteTarget(item);
    setDeleteReason("");
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    const text = String(deleteReason || "").trim();
    if (!text) {
      alert("Alasan penghapusan wajib diisi.");
      return;
    }
    try {
      await api.delete(`/rpjmd/${deleteTarget.id}`, {
        data: { change_reason_text: text },
      });
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchList();
      alert("RPJMD berhasil dihapus.");
    } catch (err) {
      console.error("Failed to delete:", err);
      alert(err?.response?.data?.message || "Gagal menghapus RPJMD.");
    }
  };

  const handleClose = () => setShowModal(false);

  const handleSubmit = async (data) => {
    try {
      const form = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined && !(value instanceof File)) {
          form.append(key, value);
        }
      });
      if (data.foto_kepala_daerah instanceof File) {
        form.append("foto_kepala_daerah", data.foto_kepala_daerah);
      }
      if (data.foto_wakil_kepala_daerah instanceof File) {
        form.append("foto_wakil_kepala_daerah", data.foto_wakil_kepala_daerah);
      }

      if (mode === "edit") {
        await api.put(`/rpjmd/${currentItem.id}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("RPJMD berhasil diperbarui.");
      } else {
        await api.post("/rpjmd/create", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("RPJMD berhasil ditambahkan.");
      }
      fetchList();
      setShowModal(false);
    } catch (err) {
      console.error("Save error:", err);
      alert(err?.response?.data?.error || err?.response?.data?.message || "Gagal menyimpan RPJMD.");
    }
  };

  if (!allowedRoles.includes(user?.role)) {
    return (
      <Container className="p-5 d-flex justify-content-center align-items-center">
        <Alert variant="danger" className="text-center w-100 fw-bold fs-5">
          Maaf, Anda tidak berwenang untuk membuka halaman RPJMD ini.
        </Alert>
      </Container>
    );
  }

  const latestDiffNormalized =
    auditRows.find((r) => r.normalized?.changed_fields?.length)?.normalized ||
    auditRows.find((r) => r.action_type === "UPDATE" && r.normalized)?.normalized ||
    null;

  return (
    <Container className="mt-4">
      <Row className="mb-3 align-items-center">
        <Col>
          <h4>Daftar RPJMD Provinsi</h4>
          <p className="text-muted small mb-0">
            Setiap perubahan memerlukan alasan; riwayat audit tersedia per baris.
          </p>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={handleAdd}>
            Tambah RPJMD
          </Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Tema</th>
                <th>Kepala Daerah</th>
                <th>Wakil</th>
                <th>Periode</th>
                <th>Versi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id}>
                  <td>{item.nama_rpjmd}</td>
                  <td>{item.kepala_daerah}</td>
                  <td>{item.wakil_kepala_daerah}</td>
                  <td>
                    {item.periode_awal} – {item.periode_akhir}
                  </td>
                  <td>{item.version ?? 1}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      className="me-1"
                      onClick={() => openAudit(item)}
                    >
                      Audit
                    </Button>
                    <Button
                      size="sm"
                      variant="info"
                      className="me-1"
                      onClick={() => handleEdit(item)}
                    >
                      Ubah
                    </Button>
                    {canDelete ? (
                      <Button size="sm" variant="danger" onClick={() => handleDeleteClick(item)}>
                        Hapus
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={handleClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{mode === "edit" ? "Ubah RPJMD" : "Tambah RPJMD"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <RpjmdMetadataForm
            mode={mode}
            data={currentItem}
            onSubmit={handleSubmit}
            onCancel={handleClose}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={auditOpen} onHide={() => setAuditOpen(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Riwayat audit — {auditFor?.nama_rpjmd || auditFor?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {auditFor?.id ? (
            <Row className="mb-3 g-2 small">
              <Col md={6}>
                <DocumentTracePanel documentType="rpjmd" documentId={auditFor.id} />
              </Col>
              <Col md={6}>
                <VersionHistoryPanel
                  documentType="rpjmd"
                  documentId={auditFor.id}
                  allowRestore={canRestorePlanningDocumentVersion(user?.role)}
                  onRestored={fetchList}
                />
              </Col>
            </Row>
          ) : null}
          {auditLoading ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <>
              {latestDiffNormalized ? (
                <div className="mb-3">
                  <div className="fw-semibold small mb-2">Perbandingan field (update terakhir)</div>
                  <div className="rounded border p-2 bg-light">
                    <BeforeAfterDiffCard normalized={latestDiffNormalized} />
                  </div>
                </div>
              ) : null}
              <div className="small">
                <AuditTimeline rows={auditRows} loading={false} />
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={deleteOpen} onHide={() => setDeleteOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Hapus RPJMD</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small">Dokumen: {deleteTarget?.nama_rpjmd}</p>
          <Form.Group>
            <Form.Label>Alasan penghapusan (wajib)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Batal
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Hapus
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
