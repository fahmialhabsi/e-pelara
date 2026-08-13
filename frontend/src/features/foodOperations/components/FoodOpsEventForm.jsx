import React, { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { createFoodOpsEvent, getFoodOpsDocuments, updateFoodOpsEvent } from '../services/foodOpsApi';
import { EVENT_TYPE_LABEL, STATUS_TINDAK_LANJUT_LABEL } from '../services/foodOpsConstants';
import FieldProvenanceBadge from '../../prosnp/components/FieldProvenanceBadge';

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

/**
 * Corrective "ProSN Semester-II Readiness — Kegiatan Recall-First Autofill"
 * (mandat §10/Req C) — HANYA field yg SAH diturunkan langsung dari metadata
 * dokumen kanonis yg sudah tersimpan (judul/tanggal_dokumen/penerbit). Field
 * yg tidak punya padanan aman (lokasi, pimpinan, hasil, tindak_lanjut) SENGAJA
 * dibiarkan kosong — dokumen tidak punya struktur data utk itu, menebaknya
 * akan jadi fabrikasi (mandat §18 "never invent... results, follow-up").
 * MURNI FUNGSI, testable tanpa render. TIDAK PERNAH menimpa field yg sudah
 * diisi user.
 */
export function deriveEventAutofill(document, currentForm) {
  if (!document) return {};
  const patch = {};
  if (!currentForm?.nama_kegiatan) patch.nama_kegiatan = document.judul || '';
  if (!currentForm?.tanggal_mulai) patch.tanggal_mulai = document.tanggal_dokumen || '';
  if (!currentForm?.penanggung_jawab) patch.penanggung_jawab = document.penerbit || '';
  // FINAL CLOSURE MANDATE Req #33 — `tahun` AMAN diturunkan sbg tahun dari
  // `tanggal_dokumen` (bukan sumber baru, murni ekstraksi tahun dari tanggal
  // yg sudah tervalidasi kanonis di atas).
  if (!currentForm?.tahun && document.tanggal_dokumen && /^\d{4}/.test(String(document.tanggal_dokumen))) {
    patch.tahun = String(document.tanggal_dokumen).slice(0, 4);
  }
  return patch;
}

export default function FoodOpsEventForm({ show, onHide, editing, onSaved }) {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [sourceDocs, setSourceDocs] = useState([]);
  const [sourceDocumentId, setSourceDocumentId] = useState('');
  const [autofillBaseline, setAutofillBaseline] = useState({});

  useEffect(() => {
    if (show) {
      setForm(editing ? { ...emptyForm(), ...editing } : emptyForm(String(new Date().getFullYear())));
      setSourceDocumentId('');
      setAutofillBaseline({});
      if (!editing) getFoodOpsDocuments({}).then(setSourceDocs).catch(() => setSourceDocs([]));
    }
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
          {!editing && (
            <Form.Group className="mb-3">
              <Form.Label>Isi Otomatis dari Dokumen Existing (opsional)</Form.Label>
              <Form.Select value={sourceDocumentId} onChange={(e) => {
                const documentId = e.target.value;
                setSourceDocumentId(documentId);
                const dokumenTerpilih = sourceDocs.find((d) => String(d.id) === String(documentId));
                const patch = deriveEventAutofill(dokumenTerpilih, form);
                setAutofillBaseline((prev) => ({ ...prev, ...patch }));
                setForm((prev) => ({ ...prev, ...patch }));
              }}>
                <option value="">— tidak pakai dokumen sumber (isi manual) —</option>
                {sourceDocs.map((d) => <option key={d.id} value={d.id}>{d.judul} (v{d.versi})</option>)}
              </Form.Select>
              <Form.Text muted>Mengisi Nama Kegiatan/Tanggal Mulai/Penanggung Jawab dari metadata dokumen yang sudah ada — tidak perlu unggah ulang. Field lain (lokasi, pimpinan, hasil, tindak lanjut) tetap diisi manual krn dokumen tidak menyimpan data tsb.</Form.Text>
            </Form.Group>
          )}
          <Row>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Jenis Kegiatan *</Form.Label>
              <Form.Select required value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                <option value="">— pilih —</option>
                {Object.entries(EVENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Form.Select>
            </Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Tahun * <FieldProvenanceBadge baseline={autofillBaseline.tahun} currentValue={form.tahun} onReset={() => setForm((prev) => ({ ...prev, tahun: autofillBaseline.tahun }))} /></Form.Label><Form.Control required value={form.tahun} onChange={(e) => setForm({ ...form, tahun: e.target.value })} /></Form.Group></Col>
          </Row>
          <Form.Group className="mb-2"><Form.Label>Nama Kegiatan * <FieldProvenanceBadge baseline={autofillBaseline.nama_kegiatan} currentValue={form.nama_kegiatan} onReset={() => setForm((prev) => ({ ...prev, nama_kegiatan: autofillBaseline.nama_kegiatan }))} /></Form.Label><Form.Control required value={form.nama_kegiatan} onChange={(e) => setForm({ ...form, nama_kegiatan: e.target.value })} /></Form.Group>
          <Row>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Tanggal Mulai * <FieldProvenanceBadge baseline={autofillBaseline.tanggal_mulai} currentValue={form.tanggal_mulai} onReset={() => setForm((prev) => ({ ...prev, tanggal_mulai: autofillBaseline.tanggal_mulai }))} /></Form.Label><Form.Control required type="date" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} /></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Tanggal Selesai</Form.Label><Form.Control type="date" value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} /></Form.Group></Col>
          </Row>
          <Form.Group className="mb-2"><Form.Label>Lokasi</Form.Label><Form.Control value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} /></Form.Group>
          <Row>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Pimpinan</Form.Label><Form.Control value={form.pimpinan} onChange={(e) => setForm({ ...form, pimpinan: e.target.value })} /></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Penanggung Jawab <FieldProvenanceBadge baseline={autofillBaseline.penanggung_jawab} currentValue={form.penanggung_jawab} onReset={() => setForm((prev) => ({ ...prev, penanggung_jawab: autofillBaseline.penanggung_jawab }))} /></Form.Label><Form.Control value={form.penanggung_jawab} onChange={(e) => setForm({ ...form, penanggung_jawab: e.target.value })} /></Form.Group></Col>
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
