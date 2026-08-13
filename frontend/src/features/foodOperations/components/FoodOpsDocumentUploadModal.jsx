import React, { useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { createFoodOpsDocument } from '../services/foodOpsApi';
import { DOCUMENT_CLASS_LABEL, DOCUMENT_TYPE_LABEL } from '../services/foodOpsConstants';

function emptyForm() {
  return { judul: '', document_class: '', document_type: '', nomor_dokumen: '', tanggal_dokumen: '', penerbit: '' };
}

/** Validasi murni (testable tanpa render) — mandat §64 basic validation. */
export function isUploadFormValid(form, file) {
  return Boolean(form?.judul && form?.document_class && form?.document_type && file);
}

export default function FoodOpsDocumentUploadModal({ show, onHide, onUploaded }) {
  const [form, setForm] = useState(emptyForm());
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Berkas dokumen wajib dipilih.'); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => { if (value) formData.append(key, value); });
      formData.append('file', file);
      await createFoodOpsDocument(formData);
      toast.success('Dokumen berhasil diunggah.');
      setForm(emptyForm());
      setFile(null);
      onHide();
      await onUploaded();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Gagal mengunggah dokumen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton><Modal.Title>Unggah Dokumen</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2"><Form.Label>Judul *</Form.Label><Form.Control required value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} /></Form.Group>
          <Row>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Class Dokumen *</Form.Label>
              <Form.Select required value={form.document_class} onChange={(e) => setForm({ ...form, document_class: e.target.value })}>
                <option value="">— pilih —</option>
                {Object.entries(DOCUMENT_CLASS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Form.Select>
            </Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Jenis Dokumen *</Form.Label>
              <Form.Select required value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
                <option value="">— pilih —</option>
                {Object.entries(DOCUMENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Form.Select>
            </Form.Group></Col>
          </Row>
          <Form.Group className="mb-2"><Form.Label>Nomor Dokumen</Form.Label><Form.Control value={form.nomor_dokumen} onChange={(e) => setForm({ ...form, nomor_dokumen: e.target.value })} /></Form.Group>
          <Form.Group className="mb-2"><Form.Label>Tanggal Dokumen</Form.Label><Form.Control type="date" value={form.tanggal_dokumen} onChange={(e) => setForm({ ...form, tanggal_dokumen: e.target.value })} /></Form.Group>
          <Form.Group className="mb-2"><Form.Label>Penerbit</Form.Label><Form.Control value={form.penerbit} onChange={(e) => setForm({ ...form, penerbit: e.target.value })} /></Form.Group>
          <Form.Group className="mb-2"><Form.Label>Berkas (PDF/DOCX/XLSX/JPG/PNG, maks 10MB) *</Form.Label>
            <Form.Control required type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Batal</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Mengunggah…' : 'Unggah'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
