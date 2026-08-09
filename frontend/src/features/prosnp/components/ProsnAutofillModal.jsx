import React, { useState } from 'react';
import { Alert, Badge, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { createProsnBukti, analisisBuktiProsn, terapkanAutofillProsn } from '../services/prosnpApi';

/**
 * Spesifikasi 35 v3 §15 — Auto-Fill Preview UX, pola `SdiAutofillModal.jsx`
 * (Ant Design) diadaptasi ke react-bootstrap krn modul ProSN B.1.1-B.1.4
 * (`EntityBuktiManager.jsx` dkk) memakai react-bootstrap, bukan Ant Design
 * (CLAUDE.md: "match UI library modul yang sedang diedit").
 *
 * Alur: Upload staging (reuse `POST /pengisian/:id/bukti`, §7 Phase A) ->
 * Analisis (`POST /bukti/:id/analisis`) -> Preview tabel per-field -> Terapkan
 * (`POST /pengisian/:id/autofill-apply`, idempotent+concurrency-safe §31).
 * Tidak ada auto-save — menutup modal tanpa "Gunakan Hasil" tidak menciptakan
 * apa pun selain bukti yang sudah ter-upload (tetap tersedia utk dianalisis
 * ulang kapan saja).
 */
const CONFIDENCE_BADGE = { HIGH: 'success', MEDIUM: 'warning', LOW: 'secondary', NONE: 'danger' };
const SOURCE_LABEL = {
  DOCUMENT_EXTRACTED: 'Dokumen', RULE_DERIVED: 'Aturan', DPA_RECALL: 'DPA', PENATAUSAHAAN_RECALL: 'Penatausahaan',
  RENSTRA_RECALL: 'Renstra', INDIKATOR_RENSTRA_RECALL: 'Renstra', AI_SUGGESTED: 'AI', USER_CONFIRMED: 'Manual', NOT_FOUND: 'Tidak ditemukan',
};
const FIELD_LABEL = {
  nomor_surat: 'Nomor surat', tanggal_surat: 'Tanggal surat', pejabat_penandatangan: 'Pejabat penandatangan',
  ringkasan_isi: 'Ringkasan isi penugasan',
};

/**
 * Corrective Pass "B.1.1 Required ringkasan_isi + Validation-Aware Autofill"
 * — `preview.validation` (bila ada, saat ini hanya B.1.1/`penugasan_kdh`,
 * lihat `prosnpAutoFillOrchestrator.js`) dipakai utk menghitung kesiapan
 * Apply SECARA LIVE mengikuti state centang/edit pengguna saat ini — backend
 * validation (`prosnpSuratPenugasanService.validatePayload`) TETAP menjadi
 * satu-satunya sumber kebenaran aturan; helper ini hanya MENCERMINKAN aturan
 * yg SAMA lebih awal supaya user tidak pernah menekan Apply yang pasti gagal.
 */
function computeApplyReadiness(validation, fields, checked, nilaiAkhirFn) {
  if (!validation) return { ready: true, missingLabels: [] }; // tipe_form lain: belum diotorisasi, fallback ke perilaku lama
  const byKey = Object.fromEntries((fields || []).map((f) => [f.field_key, f]));
  const isSelectedWithValue = (key) => {
    if (!checked[key]) return false;
    const f = byKey[key];
    if (!f) return false;
    const v = nilaiAkhirFn(f);
    return v !== null && v !== undefined && v !== '';
  };
  const missingRequired = (validation.required_fields || []).filter((key) => !isSelectedWithValue(key));
  const missingGroups = (validation.required_any_of_groups || []).filter(
    (g) => !g.fields.some((key) => checked[key] && nilaiAkhirFn(byKey[key] || {}) === true),
  );
  const missingLabels = [
    ...missingRequired.map((key) => FIELD_LABEL[key] || key),
    ...missingGroups.map((g) => g.message),
  ];
  return { ready: missingRequired.length === 0 && missingGroups.length === 0, missingLabels };
}

export default function ProsnAutofillModal({ pengisianId, entityType, onApplied, label = '+ Unggah & Analisis Dokumen' }) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState('upload'); // upload | analisis | preview
  const [file, setFile] = useState(null);
  const [judul, setJudul] = useState('');
  const [busy, setBusy] = useState(false);
  const [buktiId, setBuktiId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [checked, setChecked] = useState({});
  const [edited, setEdited] = useState({});

  const reset = () => { setStep('upload'); setFile(null); setJudul(''); setBuktiId(null); setPreview(null); setChecked({}); setEdited({}); };
  const close = () => { if (busy) return; setShow(false); reset(); };

  const submitUpload = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Pilih berkas terlebih dahulu.'); return; }
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('judul', judul || file.name);
      formData.append('entity_type', 'PENGISIAN');
      const bukti = await createProsnBukti(pengisianId, formData);
      setBuktiId(bukti.id);
      setStep('analisis');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unggah bukti gagal.');
    } finally { setBusy(false); }
  };

  const jalankanAnalisis = async () => {
    setBusy(true);
    try {
      const hasil = await analisisBuktiProsn(buktiId, {});
      setPreview(hasil);
      const requiredSet = new Set(hasil.validation?.required_fields || []);
      const defaultChecked = {};
      (hasil.fields || []).forEach((f) => {
        const punyaNilai = f.value !== null && f.value !== undefined && f.value !== '';
        // Field WAJIB (mis. ringkasan_isi) selalu dicentang default bila punya
        // nilai, TERLEPAS dari tingkat keyakinan — field opsional tetap
        // memakai heuristik lama (hanya HIGH/MEDIUM yang auto-centang).
        defaultChecked[f.field_key] = requiredSet.has(f.field_key) ? punyaNilai : (f.confidence === 'HIGH' || f.confidence === 'MEDIUM');
      });
      setChecked(defaultChecked);
      setEdited({});
      setStep('preview');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Analisis dokumen gagal.');
    } finally { setBusy(false); }
  };

  const nilaiAkhir = (f) => (f.field_key in edited ? edited[f.field_key] : f.value);
  const kesiapanApply = preview ? computeApplyReadiness(preview.validation, preview.fields, checked, nilaiAkhir) : { ready: true, missingLabels: [] };

  const terapkan = async () => {
    if (!kesiapanApply.ready) { toast.error(`Belum dapat diterapkan: ${kesiapanApply.missingLabels.join('; ')}.`); return; }
    const fieldsTerpilih = preview.fields
      .filter((f) => checked[f.field_key] && f.value !== null && f.value !== undefined)
      .map((f) => ({ ...f, value: nilaiAkhir(f) }));
    if (!fieldsTerpilih.length) { toast.error('Pilih minimal satu usulan untuk diterapkan.'); return; }
    setBusy(true);
    try {
      const hasil = await terapkanAutofillProsn(pengisianId, { bukti_id: buktiId, entity_type: entityType, fields: fieldsTerpilih });
      toast.success(hasil.idempotent_replay ? 'Data ini sudah pernah diterapkan sebelumnya — tidak ada data ganda.' : 'Autofill berhasil diterapkan, data baru ditambahkan ke register.');
      onApplied?.();
      close();
    } catch (error) {
      if (error?.response?.data?.code === 'AUTOFILL_STALE') {
        toast.error('Data sumber (DPA/Penatausahaan/Renstra) berubah sejak preview terakhir — silakan analisis ulang.');
        setStep('analisis');
      } else {
        toast.error(error?.response?.data?.message || 'Menerapkan autofill gagal.');
      }
    } finally { setBusy(false); }
  };

  const jumlahTerpilih = preview ? preview.fields.filter((f) => checked[f.field_key] && f.value !== null && f.value !== undefined).length : 0;

  return (
    <>
      <Button size="sm" variant="outline-primary" onClick={() => setShow(true)}>{label}</Button>
      <Modal show={show} onHide={close} size="lg" scrollable backdrop={busy ? 'static' : true}>
        <Modal.Header closeButton={!busy}><Modal.Title>Analisis Dokumen & Isi Otomatis</Modal.Title></Modal.Header>
        <Modal.Body>
          {step === 'upload' && (
            <Form onSubmit={submitUpload}>
              <Form.Group className="mb-2">
                <Form.Label>Berkas</Form.Label>
                <Form.Control type="file" onChange={(e) => setFile(e.target.files[0] || null)} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Judul</Form.Label>
                <Form.Control value={judul} onChange={(e) => setJudul(e.target.value)} placeholder={file?.name || ''} />
              </Form.Group>
              <Button type="submit" disabled={busy}>{busy ? <Spinner size="sm" animation="border" /> : 'Unggah'}</Button>
            </Form>
          )}
          {step === 'analisis' && (
            <div className="text-center py-4">
              <p>Berkas berhasil diunggah. Klik tombol di bawah untuk menganalisis isi dokumen dan mengisi field secara otomatis.</p>
              <Button onClick={jalankanAnalisis} disabled={busy}>
                {busy ? <><Spinner size="sm" animation="border" className="me-2" />Menganalisis dokumen…</> : 'Analisis & Isi Otomatis'}
              </Button>
            </div>
          )}
          {step === 'preview' && preview && (
            <>
              <Alert variant="info" className="small py-2">
                Jenis dokumen terdeteksi: <strong>{preview.klasifikasi.jenis_dokumen || 'tidak diketahui'}</strong>{' '}
                <Badge bg={CONFIDENCE_BADGE[preview.klasifikasi.confidence] || 'secondary'}>{preview.klasifikasi.confidence}</Badge>
                <div className="text-muted">{preview.klasifikasi.reason}</div>
                <div className="text-muted mt-1">Jenis dokumen ini adalah bantuan klasifikasi internal, bukan daftar resmi jenis dokumen dari Kepmendagri.</div>
              </Alert>
              {preview.warnings?.length > 0 && (
                <Alert variant="warning" className="small py-2">{preview.warnings.join(' ')}</Alert>
              )}
              {!kesiapanApply.ready && (
                <Alert variant="danger" className="small py-2">
                  Belum dapat diterapkan: {kesiapanApply.missingLabels.join('; ')}.
                </Alert>
              )}
              <Table size="sm" responsive className="align-middle mb-0">
                <thead><tr><th style={{ width: 36 }} /><th>Field</th><th>Nilai Usulan</th><th>Sumber</th><th>Keyakinan</th></tr></thead>
                <tbody>
                  {preview.fields.map((f) => {
                    const isNotFound = f.value === null || f.value === undefined;
                    const nilai = nilaiAkhir(f);
                    const wajib = preview.validation?.required_fields?.includes(f.field_key);
                    const dalamGrupWajib = preview.validation?.required_any_of_groups?.some((g) => g.fields.includes(f.field_key));
                    return (
                      <tr key={f.field_key}>
                        <td>
                          <Form.Check
                            checked={!!checked[f.field_key]}
                            disabled={isNotFound}
                            onChange={(e) => setChecked((s) => ({ ...s, [f.field_key]: e.target.checked }))}
                          />
                        </td>
                        <td>
                          <small>{f.field_key}</small>
                          {wajib && <Badge bg="danger" className="ms-1" title="Field ini wajib diisi agar Apply berhasil">Wajib</Badge>}
                          {!wajib && dalamGrupWajib && <Badge bg="warning" text="dark" className="ms-1" title="Salah satu dari grup cakupan ini wajib dipilih">Salah satu wajib</Badge>}
                        </td>
                        <td>
                          {isNotFound ? (
                            <Form.Control size="sm" disabled placeholder="Data tidak ditemukan" />
                          ) : typeof nilai === 'boolean' ? (
                            <Form.Check type="switch" checked={!!nilai} onChange={(e) => setEdited((s) => ({ ...s, [f.field_key]: e.target.checked }))} />
                          ) : Array.isArray(nilai) ? (
                            <small>{nilai.join(', ')}</small>
                          ) : (
                            <Form.Control size="sm" value={nilai ?? ''} onChange={(e) => setEdited((s) => ({ ...s, [f.field_key]: e.target.value }))} />
                          )}
                        </td>
                        <td><small>{SOURCE_LABEL[f.source_type] || f.source_type}</small></td>
                        <td title={f.reason || ''}><Badge bg={CONFIDENCE_BADGE[f.confidence] || 'secondary'}>{f.confidence}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
        {step === 'preview' && (
          <Modal.Footer>
            <Button variant="secondary" onClick={close} disabled={busy}>Batal</Button>
            <Button variant="primary" onClick={terapkan} disabled={busy || !jumlahTerpilih || !kesiapanApply.ready} title={!kesiapanApply.ready ? kesiapanApply.missingLabels.join('; ') : undefined}>
              {busy ? <Spinner size="sm" animation="border" /> : `Gunakan ${jumlahTerpilih} Hasil`}
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </>
  );
}
