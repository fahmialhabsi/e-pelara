import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { createFoodOpsDocument } from '../services/foodOpsApi';
import { DOCUMENT_CLASS_LABEL, DOCUMENT_TYPE_LABEL, STATUS_VERIFIKASI_LABEL } from '../services/foodOpsConstants';

function emptyForm() {
  return { judul: '', document_class: '', document_type: '', nomor_dokumen: '', tanggal_dokumen: '', penerbit: '' };
}

/** Validasi murni (testable tanpa render) — mandat §64 basic validation. */
export function isUploadFormValid(form, file) {
  return Boolean(form?.judul && form?.document_class && form?.document_type && file);
}

/**
 * CORRECTIVE MANDATE UAT-01B — bangun FormData upload, opsional membawa
 * acknowledgment eksplisit "Tetap Buat Dokumen Baru" (mandat §10 — BUKAN
 * generic `skipDuplicateChecks`, HANYA field sempit `acknowledge_likely_same`
 * + `acknowledged_candidate_id` yang backend revalidasi ulang scr penuh).
 * MURNI FUNGSI, testable tanpa render.
 */
export function buildUploadFormData(form, file, acknowledgedCandidateId) {
  const formData = new FormData();
  Object.entries(form).forEach(([key, value]) => { if (value) formData.append(key, value); });
  formData.append('file', file);
  if (acknowledgedCandidateId) {
    formData.append('acknowledge_likely_same', 'true');
    formData.append('acknowledged_candidate_id', String(acknowledgedCandidateId));
  }
  return formData;
}

export default function FoodOpsDocumentUploadModal({ show, onHide, onUploaded, onUseExisting }) {
  const [form, setForm] = useState(emptyForm());
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [likelySameCandidate, setLikelySameCandidate] = useState(null);

  useEffect(() => {
    if (!show) { setForm(emptyForm()); setFile(null); setLikelySameCandidate(null); setSaving(false); }
  }, [show]);

  const submitUpload = async (acknowledgedCandidateId) => {
    setSaving(true);
    try {
      const formData = buildUploadFormData(form, file, acknowledgedCandidateId);
      await createFoodOpsDocument(formData);
      toast.success('Dokumen berhasil diunggah.');
      setForm(emptyForm());
      setFile(null);
      setLikelySameCandidate(null);
      onHide();
      await onUploaded();
    } catch (error) {
      const data = error?.response?.data;
      // CORRECTIVE MANDAT UAT-01B (mandat §7/§8) — LIKELY_SAME BUKAN kegagalan
      // teknis biasa: tampilkan panel resolusi eksplisit, JANGAN toast sukses,
      // JANGAN tutup modal, JANGAN buat apa pun sampai user memutuskan.
      if (data?.code === 'FOOD_OPS_DOCUMENT_LIKELY_SAME' && data?.details?.candidate) {
        setLikelySameCandidate(data.details.candidate);
      } else {
        toast.error(data?.message || 'Gagal mengunggah dokumen.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Berkas dokumen wajib dipilih.'); return; }
    await submitUpload(null);
  };

  const handleUseExisting = () => {
    const candidate = likelySameCandidate;
    setForm(emptyForm());
    setFile(null);
    setLikelySameCandidate(null);
    onHide();
    if (onUseExisting) onUseExisting(candidate);
    else toast.info(`Gunakan dokumen yang sudah ada: "${candidate.judul}" (ID ${candidate.id}).`);
  };

  const handleCreateNewAnyway = async () => {
    await submitUpload(likelySameCandidate.id);
  };

  const handleCancelInterception = () => {
    setForm(emptyForm());
    setFile(null);
    setLikelySameCandidate(null);
    onHide();
  };

  if (likelySameCandidate) {
    const c = likelySameCandidate;
    return (
      <Modal show={show} onHide={handleCancelInterception}>
        <Modal.Header closeButton><Modal.Title>Dokumen Serupa Ditemukan</Modal.Title></Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="mb-3">
            Dokumen yang akan diunggah sangat mirip dengan dokumen yang sudah terdaftar. Periksa dokumen berikut sebelum membuat dokumen baru.
          </Alert>
          <LikelySameCandidateTable candidate={c} />
        </Modal.Body>
        <Modal.Footer className="flex-wrap gap-2">
          <Button variant="light" onClick={handleCancelInterception} disabled={saving}>Batal</Button>
          <Button variant="outline-secondary" onClick={handleCreateNewAnyway} disabled={saving}>{saving ? 'Menyimpan…' : 'Tetap Buat Dokumen Baru'}</Button>
          <Button variant="primary" onClick={handleUseExisting} disabled={saving}>Gunakan Dokumen yang Sudah Ada</Button>
        </Modal.Footer>
      </Modal>
    );
  }

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

function LikelySameCandidateTable({ candidate }) {
  const rows = [
    ['Judul', candidate.judul],
    ['Nomor', candidate.nomor_dokumen || '—'],
    ['Class', DOCUMENT_CLASS_LABEL[candidate.document_class] || candidate.document_class],
    ['Jenis', DOCUMENT_TYPE_LABEL[candidate.document_type] || candidate.document_type],
    ['Tanggal', candidate.tanggal_dokumen || '—'],
    ['Penerbit', candidate.penerbit || '—'],
    ['Versi', candidate.versi],
    ['Status', candidate.status],
    ['Verifikasi', STATUS_VERIFIKASI_LABEL[candidate.status_verifikasi] || candidate.status_verifikasi],
  ];
  return (
    <table className="table table-sm mb-0">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}><th className="text-muted" style={{ width: '35%' }}>{label}</th><td>{value}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
