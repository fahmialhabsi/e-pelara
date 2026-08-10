import React, { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { createFoodOpsEvent, updateFoodOpsEvent } from '../services/foodOpsApi';
import { EVENT_TYPE_LABEL, STATUS_TINDAK_LANJUT_LABEL } from '../services/foodOpsConstants';

function emptyForm(tahun) {
  return {
    event_type: '', tahun: tahun || '', tanggal_mulai: '', tanggal_selesai: '', nama_kegiatan: '', lokasi: '',
    pimpinan: '', penanggung_jawab: '', agenda: '', hasil: '', tindak_lanjut: '', status_tindak_lanjut: 'belum_ditindaklanjuti',
  };
}

/** Validasi murni (testable tanpa render) — mandat §64 basic validation. */
export function isEventFormValid(form) {
  return Boolean(form?.event_type && form?.tahun && form?.tanggal_mulai && form?.nama_kegiatan);
}

export default function FoodOpsEventForm({ show, onHide, editing, onSaved }) {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) setForm(editing ? { ...emptyForm(), ...editing } : emptyForm(String(new Date().getFullYear())));
  }, [show, editing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await updateFoodOpsEvent(editing.id, { ...form, lock_version: editing.lock_version });
      else await createFoodOpsEvent(form);
      toast.success('Kegiatan tersimpan.');
      onHide();
      await onSaved();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Gagal menyimpan kegiatan.');
    } finally { setSaving(false); }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton><Modal.Title>{editing ? 'Ubah' : 'Tambah'} Kegiatan</Modal.Title></Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Jenis Kegiatan *</Form.Label>
              <Form.Select required value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                <option value="">— pilih —</option>
                {Object.entries(EVENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Form.Select>
            </Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Tahun *</Form.Label><Form.Control required value={form.tahun} onChange={(e) => setForm({ ...form, tahun: e.target.value })} /></Form.Group></Col>
          </Row>
          <Form.Group className="mb-2"><Form.Label>Nama Kegiatan *</Form.Label><Form.Control required value={form.nama_kegiatan} onChange={(e) => setForm({ ...form, nama_kegiatan: e.target.value })} /></Form.Group>
          <Row>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Tanggal Mulai *</Form.Label><Form.Control required type="date" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} /></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Tanggal Selesai</Form.Label><Form.Control type="date" value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} /></Form.Group></Col>
          </Row>
          <Form.Group className="mb-2"><Form.Label>Lokasi</Form.Label><Form.Control value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} /></Form.Group>
          <Row>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Pimpinan</Form.Label><Form.Control value={form.pimpinan} onChange={(e) => setForm({ ...form, pimpinan: e.target.value })} /></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Penanggung Jawab</Form.Label><Form.Control value={form.penanggung_jawab} onChange={(e) => setForm({ ...form, penanggung_jawab: e.target.value })} /></Form.Group></Col>
          </Row>
          <Form.Group className="mb-2"><Form.Label>Agenda</Form.Label><Form.Control as="textarea" rows={2} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} /></Form.Group>
          <Form.Group className="mb-2"><Form.Label>Hasil</Form.Label><Form.Control as="textarea" rows={2} value={form.hasil} onChange={(e) => setForm({ ...form, hasil: e.target.value })} /></Form.Group>
          <Form.Group className="mb-2"><Form.Label>Tindak Lanjut</Form.Label><Form.Control as="textarea" rows={2} value={form.tindak_lanjut} onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })} /></Form.Group>
          <Form.Group className="mb-2"><Form.Label>Status Tindak Lanjut</Form.Label>
            <Form.Select value={form.status_tindak_lanjut} onChange={(e) => setForm({ ...form, status_tindak_lanjut: e.target.value })}>
              {Object.entries(STATUS_TINDAK_LANJUT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Batal</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
