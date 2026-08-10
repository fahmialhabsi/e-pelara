import React, { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { createFoodOpsRegulation, getFoodOpsDocuments, updateFoodOpsRegulation } from '../services/foodOpsApi';
import { JENIS_PRODUK_HUKUM_LABEL } from '../services/foodOpsConstants';

function emptyForm() {
  return {
    document_id: '', jenis_produk_hukum: '', nomor: '', tahun: '', judul_resmi: '', instansi_penerbit: '',
    tanggal_penetapan: '', tanggal_berlaku: '', status_berlaku: 'berlaku', legal_hierarchy: '', scope: '', catatan: '',
  };
}

/** Validasi murni (testable tanpa render) — mandat §64 basic validation. */
export function isRegulationFormValid(form, isEditing) {
  if (!form?.jenis_produk_hukum) return false;
  if (!isEditing && !form?.document_id) return false;
  return true;
}

export default function FoodOpsRegulationForm({ show, onHide, editing, onSaved }) {
  const [form, setForm] = useState(emptyForm());
  const [regulationDocs, setRegulationDocs] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    setForm(editing ? { ...emptyForm(), ...editing, document_id: editing.document_id } : emptyForm());
    getFoodOpsDocuments({ document_class: 'REGULATION' }).then(setRegulationDocs).catch(() => setRegulationDocs([]));
  }, [show, editing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await updateFoodOpsRegulation(editing.id, { ...form, lock_version: editing.lock_version });
      else await createFoodOpsRegulation(form);
      toast.success('Metadata regulasi tersimpan.');
      onHide();
      await onSaved();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Gagal menyimpan metadata regulasi.');
    } finally { setSaving(false); }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton><Modal.Title>{editing ? 'Ubah' : 'Tambah'} Regulasi</Modal.Title></Modal.Header>
        <Modal.Body>
          {!editing && (
            <Form.Group className="mb-2"><Form.Label>Dokumen (document_class=REGULATION) *</Form.Label>
              <Form.Select required value={form.document_id} onChange={(e) => setForm({ ...form, document_id: e.target.value })}>
                <option value="">— pilih dokumen yang sudah diunggah —</option>
                {regulationDocs.map((d) => <option key={d.id} value={d.id}>{d.judul} (v{d.versi})</option>)}
              </Form.Select>
              <Form.Text muted>Unggah dokumen dgn class &quot;Regulasi&quot; terlebih dahulu di menu Dokumen &amp; Evidence.</Form.Text>
            </Form.Group>
          )}
          <Row>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Jenis Produk Hukum *</Form.Label>
              <Form.Select required value={form.jenis_produk_hukum} onChange={(e) => setForm({ ...form, jenis_produk_hukum: e.target.value })}>
                <option value="">— pilih —</option>
                {Object.entries(JENIS_PRODUK_HUKUM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Form.Select>
            </Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Nomor</Form.Label><Form.Control value={form.nomor} onChange={(e) => setForm({ ...form, nomor: e.target.value })} /></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Tahun</Form.Label><Form.Control value={form.tahun} onChange={(e) => setForm({ ...form, tahun: e.target.value })} /></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Instansi Penerbit</Form.Label><Form.Control value={form.instansi_penerbit} onChange={(e) => setForm({ ...form, instansi_penerbit: e.target.value })} /></Form.Group></Col>
          </Row>
          <Form.Group className="mb-2"><Form.Label>Judul Resmi</Form.Label><Form.Control value={form.judul_resmi} onChange={(e) => setForm({ ...form, judul_resmi: e.target.value })} /></Form.Group>
          <Row>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Tanggal Penetapan</Form.Label><Form.Control type="date" value={form.tanggal_penetapan} onChange={(e) => setForm({ ...form, tanggal_penetapan: e.target.value })} /></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Tanggal Berlaku</Form.Label><Form.Control type="date" value={form.tanggal_berlaku} onChange={(e) => setForm({ ...form, tanggal_berlaku: e.target.value })} /></Form.Group></Col>
          </Row>
          <Form.Group className="mb-2"><Form.Label>Status Berlaku</Form.Label>
            <Form.Select value={form.status_berlaku} onChange={(e) => setForm({ ...form, status_berlaku: e.target.value })}>
              <option value="berlaku">Berlaku</option>
              <option value="diubah">Diubah</option>
              <option value="dicabut">Dicabut</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2"><Form.Label>Catatan</Form.Label><Form.Control as="textarea" rows={2} value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Batal</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
