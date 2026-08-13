import React, { useEffect, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { createFoodOpsDocumentVersion } from '../services/foodOpsApi';

/**
 * CORRECTIVE MANDATE UAT-01C — modal fokus utk mengekspos endpoint versi
 * yang SUDAH ADA (`createFoodOpsDocumentVersion`/`createNewVersion`) ke UI.
 * HANYA field yang benar-benar didukung backend (mandat §11): ringkasan
 * dokumen induk read-only, versi saat ini read-only, preview versi baru
 * read-only (BUKAN otoritatif — backend yang menghitung ulang nomor versi
 * sesungguhnya, mandat §13), dan berkas baru (wajib). TIDAK ADA field
 * "Catatan Versi" — model `FoodOpsDocument` tidak punya kolom `catatan`
 * sama sekali (diverifikasi via model), jadi tidak ditambahkan (mandat
 * §11 "Do not invent unsupported fields").
 */
export default function FoodOpsNewVersionModal({ show, onHide, document, onCreated }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!show) { setFile(null); setSaving(false); } }, [show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Berkas versi baru wajib dipilih.'); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await createFoodOpsDocumentVersion(document.id, formData);
      toast.success('Versi baru berhasil dibuat.');
      setFile(null);
      onHide();
      await onCreated?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Gagal membuat versi baru.');
    } finally {
      setSaving(false);
    }
  };

  if (!document) return null;

  return (
    <Modal show={show} onHide={onHide}>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton><Modal.Title>Buat Versi Baru</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label className="text-muted small">Dokumen Induk</Form.Label>
            <div className="fw-semibold">{document.judul}</div>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label className="text-muted small">Versi Saat Ini</Form.Label>
            <div>{document.versi}</div>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="text-muted small">Versi Baru</Form.Label>
            <div>{Number(document.versi) + 1} <span className="text-muted small">(preview — nomor final ditentukan server)</span></div>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Berkas Baru (PDF/DOCX/XLSX/JPG/PNG, maks 10MB) *</Form.Label>
            <Form.Control required type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={saving}>Batal</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan Versi Baru'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
