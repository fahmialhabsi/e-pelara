import React, { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { createFoodOpsEvent, getFoodOpsDocumentLinks, getFoodOpsDocuments, updateFoodOpsEvent } from '../services/foodOpsApi';
import { EVENT_TYPE_LABEL, STATUS_TINDAK_LANJUT_LABEL } from '../services/foodOpsConstants';
import FieldProvenanceBadge, { classifyFieldProvenance } from '../../prosnp/components/FieldProvenanceBadge';

/** Field yg diturunkan dari dokumen sumber (mandat closure §13/§14) — dipakai utk reset saat sumber diganti/dihapus. */
const FIELDS_FROM_EVENT_SOURCE = ['nama_kegiatan', 'tanggal_mulai', 'penanggung_jawab', 'tahun'];

/**
 * FINAL CLOSURE MANDATE UAT-02/03 §13/§14 — "SOURCE SELECTOR MUST NOT USE
 * STALE STATE" / "AUTOFILL MUST NEVER OVERWRITE USER OVERRIDE SILENTLY".
 * Sebelum pass ini, mengganti dokumen sumber (A -> B) TIDAK memicu derivasi
 * ulang field yg SUDAH terisi dari dokumen A — `deriveEventAutofill` hanya
 * mengisi field yg MASIH KOSONG, sehingga nilai lama dari A tetap "menempel"
 * walau sumber sudah berganti ke B (stale state).
 *
 * Fungsi ini MURNI, testable tanpa render: mengosongkan HANYA field yg BUKAN
 * override eksplisit user (dicek via `classifyFieldProvenance` yg SUDAH ADA,
 * arsitektur override yg sama persis dipakai lintas modul — TIDAK membuat
 * sistem provenance paralel) sebelum derivasi dari sumber baru dijalankan.
 * Field yg SUDAH di-override user TETAP dipertahankan apa adanya (mandat:
 * "Changing unrelated form state must NOT silently restore the source
 * value"). Dipakai baik utk ganti sumber A->B maupun A->manual (dokumen
 * kosong): `deriveEventAutofill(null, clearedForm)` mengembalikan `{}`,
 * sehingga field yg baru dikosongkan tetap kosong (mode manual bersih).
 */
export function resetSourceDerivedFields(form, baseline, fields) {
  const nextForm = { ...form };
  const nextBaseline = { ...baseline };
  for (const field of fields) {
    if (classifyFieldProvenance(baseline?.[field], form?.[field]) !== 'OVERRIDE') {
      nextForm[field] = '';
      nextBaseline[field] = undefined;
    }
  }
  return { form: nextForm, baseline: nextBaseline };
}

/**
 * FINAL CLOSURE MANDATE §16/§19 — bentuk INI PERSIS bentuk runtime dari
 * `GET /food-operations/document-links?entity_type=EVENT`
 * (`foodOpsDocumentLinkService.listLinks`, `include: [{model: FoodOpsDocument,
 * as: 'document'}]`) — setiap baris link punya `document` NESTED (bukan rata/
 * digabung), sehingga `kelompok_uuid` HANYA dapat diakses via `l.document.
 * kelompok_uuid`, bukan `l.kelompok_uuid`. Diekstrak jadi fungsi murni
 * terpisah (bukan inline di `.then()`) supaya bisa diuji langsung dgn payload
 * berbentuk array realistis (mandat §16 "Do NOT count a static source regex
 * check as proof of runtime behavior").
 */
export function extractRegisteredLineages(links) {
  return new Set(
    (links || [])
      .filter((l) => l?.relation_type === 'KEGIATAN_SOURCE' && l?.document?.kelompok_uuid)
      .map((l) => l.document.kelompok_uuid),
  );
}

/**
 * CORRECTIVE MANDATE UAT-03 §4 — Owner UAT DEFECT A: `tahun` sebelumnya
 * di-pre-seed dgn tahun kalender SISTEM saat form Tambah dibuka
 * (`emptyForm(String(new Date().getFullYear()))`), SEBELUM dokumen sumber
 * dipilih. Karena `deriveEventAutofill` hanya mengisi `tahun` bila field itu
 * MASIH KOSONG, default non-kosong itu (mis. "2026") justru MENGHALANGI
 * derivasi aman dari `tanggal_dokumen` dokumen sumber (mis. 2025) begitu
 * user memilihnya — persis skenario Owner (Tanggal Mulai=2025-06-30, Tahun
 * tetap 2026, tersimpan ke DB). Diperbaiki dgn TIDAK PERNAH pre-seed `tahun`
 * dgn tahun sistem/klien (mandat §4 "Do NOT use... frontend initialization
 * year") — form Tambah kini konsisten dgn field wajib lain (nama_kegiatan/
 * tanggal_mulai) yg juga tidak punya default, murni kosong sampai diisi
 * user atau diturunkan dari dokumen.
 */
function emptyForm() {
  return {
    event_type: '', tahun: '', tanggal_mulai: '', tanggal_selesai: '', nama_kegiatan: '', lokasi: '',
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
  const [registeredLineages, setRegisteredLineages] = useState(new Set());
  // FINAL CLOSURE MANDATE §17 — "ASYNCHRONOUS LOADING / RACE SAFETY": daftar
  // dokumen dan daftar "sudah terdaftar" dimuat scr paralel (dua request
  // independen) — TANPA penanda ini, selector bisa sempat ter-render
  // enabled utk SEMUA opsi (krn registeredLineages masih Set kosong) sebelum
  // fetch document-links selesai. Selector dikunci (disabled) sampai KEDUA
  // fetch selesai (sukses ATAU gagal — gagal tetap "selesai", fallback aman
  // ke Set kosong spt sebelumnya).
  const [registeredStateReady, setRegisteredStateReady] = useState(false);

  useEffect(() => {
    if (show) {
      setForm(editing ? { ...emptyForm(), ...editing } : emptyForm());
      setSourceDocumentId('');
      setAutofillBaseline({});
      setRegisteredStateReady(false);
      if (!editing) {
        getFoodOpsDocuments({}).then(setSourceDocs).catch(() => setSourceDocs([]));
        // CORRECTIVE MANDATE UAT-03 §10/§11 — deteksi "Sudah Terdaftar"
        // SEBELUM user mengisi form & klik Simpan. Identitas sumber adalah
        // LINEAGE dokumen (`kelompok_uuid`, mandat §9), bukan document_id
        // spesifik — mencegah versi baru dari lineage yang sama dari
        // dianggap kandidat baru setelah lineage itu pernah dipakai. Reuse
        // endpoint document-links yang SUDAH ADA (`entity_type=EVENT`),
        // difilter di client ke relation_type KEGIATAN_SOURCE saja (BUKAN
        // tautan evidence biasa yang dibuat manual lewat "+ Tautkan").
        getFoodOpsDocumentLinks({ entity_type: 'EVENT' })
          .then((links) => setRegisteredLineages(extractRegisteredLineages(links)))
          .catch(() => setRegisteredLineages(new Set()))
          .finally(() => setRegisteredStateReady(true));
      }
    }
  }, [show, editing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateFoodOpsEvent(editing.id, { ...form, lock_version: editing.lock_version });
      } else {
        await createFoodOpsEvent(sourceDocumentId ? { ...form, source_document_id: sourceDocumentId } : form);
      }
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
              <Form.Select disabled={!registeredStateReady} value={sourceDocumentId} onChange={(e) => {
                const documentId = e.target.value;
                setSourceDocumentId(documentId);
                const dokumenTerpilih = sourceDocs.find((d) => String(d.id) === String(documentId));
                // FINAL CLOSURE MANDATE §13/§14 — kosongkan dulu field yg BUKAN
                // override user sebelum derivasi dari sumber baru, supaya nilai
                // dari sumber SEBELUMNYA tidak "menempel" (stale) saat sumber
                // diganti atau dikembalikan ke mode manual.
                const cleared = resetSourceDerivedFields(form, autofillBaseline, FIELDS_FROM_EVENT_SOURCE);
                const patch = deriveEventAutofill(dokumenTerpilih, cleared.form);
                setAutofillBaseline({ ...cleared.baseline, ...patch });
                setForm({ ...cleared.form, ...patch });
              }}>
                <option value="">{registeredStateReady ? '— tidak pakai dokumen sumber (isi manual) —' : 'Memuat status pendaftaran dokumen…'}</option>
                {sourceDocs.map((d) => (
                  <option key={d.id} value={d.id} disabled={registeredLineages.has(d.kelompok_uuid)}>
                    {d.judul} (v{d.versi}){registeredLineages.has(d.kelompok_uuid) ? ' — Sudah Terdaftar' : ''}
                  </option>
                ))}
              </Form.Select>
              <Form.Text muted>Mengisi Nama Kegiatan/Tanggal Mulai/Penanggung Jawab/Tahun dari metadata dokumen yang sudah ada — tidak perlu unggah ulang. Field lain (lokasi, pimpinan, hasil, tindak lanjut) tetap diisi manual krn dokumen tidak menyimpan data tsb. Dokumen berlabel &quot;Sudah Terdaftar&quot; sudah pernah dipakai membuat Kegiatan lain dan tidak dapat dipilih lagi.</Form.Text>
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
