import React, { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { createFoodOpsRegulation, getFoodOpsDocuments, getFoodOpsRegulations, updateFoodOpsRegulation } from '../services/foodOpsApi';
import { JENIS_PRODUK_HUKUM_LABEL } from '../services/foodOpsConstants';
import FieldProvenanceBadge from '../../prosnp/components/FieldProvenanceBadge';

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

/**
 * CORRECTIVE MANDATE UAT-02 — pemetaan document_type (FoodOps, kosakata
 * `foodOpsClassifier.FOOD_OPS_DOCUMENT_TYPES`) -> jenis_produk_hukum
 * (Regulasi, kosakata `JENIS_PRODUK_HUKUM_LABEL`) HANYA utk pasangan yang
 * SECARA ISTILAH persis padanan 1:1 tanpa penafsiran (nama resmi vs
 * singkatan standarnya, bukan tebakan) — dibuktikan per baris:
 *   undang_undang -> uu           ("Undang-Undang" = "UU")
 *   peraturan_pemerintah -> pp    ("Peraturan Pemerintah" = "PP")
 *   peraturan_presiden -> perpres ("Peraturan Presiden" = "Perpres")
 *   permendagri -> permendagri    (istilah SAMA PERSIS di kedua kosakata)
 *   peraturan_daerah -> perda     ("Peraturan Daerah" = "Perda")
 *   peraturan_gubernur -> pergub  ("Peraturan Gubernur" = "Pergub", kasus Owner UAT-02 A)
 *   keputusan_gubernur -> kepgub  ("Keputusan Gubernur" = "Kepgub", kasus Owner UAT-02 B)
 *   surat_keputusan -> sk         ("Surat Keputusan" = singkatan baku "SK")
 * document_type LAIN (surat_tugas/undangan/daftar_hadir/notulen/dokumentasi/
 * berita_acara/kartu_stok/kartu_gudang/kartu_persediaan/laporan/
 * bukti_serah_terima/surat_jalan/materi/other) BUKAN jenis produk hukum sama
 * sekali — TIDAK dipetakan, dibiarkan kosong (mandat §4 "if ambiguous, leave
 * unfilled"). `perpu`/`permen_lain`/`kepmendagri`/`lainnya` di
 * JENIS_PRODUK_HUKUM_LABEL TIDAK punya padanan document_type FoodOps apa pun
 * — tidak ada yang bisa dipetakan KE nilai-nilai itu.
 */
const DOCUMENT_TYPE_TO_JENIS_PRODUK_HUKUM = {
  undang_undang: 'uu',
  peraturan_pemerintah: 'pp',
  peraturan_presiden: 'perpres',
  permendagri: 'permendagri',
  peraturan_daerah: 'perda',
  peraturan_gubernur: 'pergub',
  keputusan_gubernur: 'kepgub',
  surat_keputusan: 'sk',
};

/**
 * Corrective "ProSN Semester-II Readiness — Regulation Recall-First Autofill"
 * (mandat §9/Req B) — dokumen kanonis (`FoodOpsDocument`) SUDAH menyimpan
 * judul/nomor_dokumen/tanggal_dokumen/penerbit; field ini SAH diturunkan
 * langsung (bukan fabrikasi — sumbernya sudah tersimpan).
 *
 * CORRECTIVE MANDATE UAT-02 — `jenis_produk_hukum` SEKARANG diturunkan via
 * `DOCUMENT_TYPE_TO_JENIS_PRODUK_HUKUM` di atas bila document_type sumber
 * punya padanan deterministik. Field lain yg SUDAH ditelusuri TIDAK punya
 * sumber aman (mandat §8/§9, ditelusuri penuh: `FoodOpsDocument` tidak
 * punya kolom tanggal-berlaku/catatan terpisah, dan `klasifikasi_meta`
 * — {document_type, confidence, reason, method, requires_review,
 * identity_evidence, reference_mentions} — juga tidak menyimpan field
 * terstruktur utk keduanya, hanya string heading yg cocok, bukan
 * tanggal/catatan tersendiri) TETAP SENGAJA dibiarkan kosong/tidak
 * disentuh — bukan ditebak: `tanggal_berlaku`, `status_berlaku`,
 * `legal_hierarchy`, `scope`, `catatan`. MURNI FUNGSI, testable tanpa
 * render. HANYA mengisi field yg MASIH KOSONG di form saat ini
 * (`currentForm`) — tidak pernah menimpa isian user.
 */
export function deriveRegulationAutofill(document, currentForm) {
  if (!document) return {};
  const patch = {};
  if (!currentForm?.judul_resmi) patch.judul_resmi = document.judul || '';
  if (!currentForm?.nomor) patch.nomor = document.nomor_dokumen || '';
  if (!currentForm?.tanggal_penetapan) patch.tanggal_penetapan = document.tanggal_dokumen || '';
  if (!currentForm?.instansi_penerbit) patch.instansi_penerbit = document.penerbit || '';
  // FINAL CLOSURE MANDATE Req #33 — `tahun` AMAN diturunkan sbg tahun dari
  // `tanggal_dokumen` yg SUDAH diturunkan dgn aman di atas (bukan sumber baru,
  // murni ekstraksi tahun dari tanggal yg sudah tervalidasi kanonis).
  if (!currentForm?.tahun && document.tanggal_dokumen && /^\d{4}/.test(String(document.tanggal_dokumen))) {
    patch.tahun = String(document.tanggal_dokumen).slice(0, 4);
  }
  if (!currentForm?.jenis_produk_hukum) {
    const mapped = DOCUMENT_TYPE_TO_JENIS_PRODUK_HUKUM[document.document_type];
    if (mapped) patch.jenis_produk_hukum = mapped;
  }
  return patch;
}

export default function FoodOpsRegulationForm({ show, onHide, editing, onSaved }) {
  const [form, setForm] = useState(emptyForm());
  const [regulationDocs, setRegulationDocs] = useState([]);
  const [registeredDocumentIds, setRegisteredDocumentIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [autofillBaseline, setAutofillBaseline] = useState({});

  useEffect(() => {
    if (!show) return;
    setForm(editing ? { ...emptyForm(), ...editing, document_id: editing.document_id } : emptyForm());
    setAutofillBaseline({});
    getFoodOpsDocuments({ document_class: 'REGULATION' }).then(setRegulationDocs).catch(() => setRegulationDocs([]));
    // CORRECTIVE MANDATE UAT-02 §6 — deteksi "Sudah Terdaftar" SEBELUM user
    // mengisi form & klik Simpan (sebelumnya baru diketahui lewat pesan error
    // backend "Dokumen ini sudah memiliki metadata regulasi." SETELAH submit).
    // Reuse endpoint list Regulasi yg sudah ada (tenant-scoped otomatis oleh
    // backend), TIDAK menambah endpoint/field backend baru sama sekali.
    if (!editing) {
      getFoodOpsRegulations().then((rows) => setRegisteredDocumentIds(new Set(rows.map((r) => r.document_id)))).catch(() => setRegisteredDocumentIds(new Set()));
    }
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
              <Form.Select required value={form.document_id} onChange={(e) => {
                const documentId = e.target.value;
                const dokumenTerpilih = regulationDocs.find((d) => String(d.id) === String(documentId));
                const patch = deriveRegulationAutofill(dokumenTerpilih, form);
                setAutofillBaseline((prev) => ({ ...prev, ...patch }));
                setForm((prev) => ({ ...prev, document_id: documentId, ...patch }));
              }}>
                <option value="">— pilih dokumen yang sudah diunggah —</option>
                {regulationDocs.map((d) => (
                  <option key={d.id} value={d.id} disabled={registeredDocumentIds.has(d.id)}>
                    {d.judul} (v{d.versi}){registeredDocumentIds.has(d.id) ? ' — Sudah Terdaftar' : ''}
                  </option>
                ))}
              </Form.Select>
              <Form.Text muted>Unggah dokumen dgn class &quot;Regulasi&quot; terlebih dahulu di menu Dokumen &amp; Evidence. Memilih dokumen otomatis mengisi Judul Resmi/Nomor/Tanggal Penetapan/Instansi Penerbit/Jenis Produk Hukum dari metadata dokumen (dapat diedit sebelum disimpan). Dokumen yang berlabel &quot;Sudah Terdaftar&quot; sudah memiliki metadata Regulasi dan tidak dapat dipilih lagi.</Form.Text>
            </Form.Group>
          )}
          <Row>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Jenis Produk Hukum * <FieldProvenanceBadge baseline={autofillBaseline.jenis_produk_hukum} currentValue={form.jenis_produk_hukum} onReset={() => setForm((prev) => ({ ...prev, jenis_produk_hukum: autofillBaseline.jenis_produk_hukum }))} /></Form.Label>
              <Form.Select required value={form.jenis_produk_hukum} onChange={(e) => setForm({ ...form, jenis_produk_hukum: e.target.value })}>
                <option value="">— pilih —</option>
                {Object.entries(JENIS_PRODUK_HUKUM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Form.Select>
            </Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Nomor <FieldProvenanceBadge baseline={autofillBaseline.nomor} currentValue={form.nomor} onReset={() => setForm((prev) => ({ ...prev, nomor: autofillBaseline.nomor }))} /></Form.Label><Form.Control value={form.nomor} onChange={(e) => setForm({ ...form, nomor: e.target.value })} /></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Tahun <FieldProvenanceBadge baseline={autofillBaseline.tahun} currentValue={form.tahun} onReset={() => setForm((prev) => ({ ...prev, tahun: autofillBaseline.tahun }))} /></Form.Label><Form.Control value={form.tahun} onChange={(e) => setForm({ ...form, tahun: e.target.value })} /></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Instansi Penerbit <FieldProvenanceBadge baseline={autofillBaseline.instansi_penerbit} currentValue={form.instansi_penerbit} onReset={() => setForm((prev) => ({ ...prev, instansi_penerbit: autofillBaseline.instansi_penerbit }))} /></Form.Label><Form.Control value={form.instansi_penerbit} onChange={(e) => setForm({ ...form, instansi_penerbit: e.target.value })} /></Form.Group></Col>
          </Row>
          <Form.Group className="mb-2"><Form.Label>Judul Resmi <FieldProvenanceBadge baseline={autofillBaseline.judul_resmi} currentValue={form.judul_resmi} onReset={() => setForm((prev) => ({ ...prev, judul_resmi: autofillBaseline.judul_resmi }))} /></Form.Label><Form.Control value={form.judul_resmi} onChange={(e) => setForm({ ...form, judul_resmi: e.target.value })} /></Form.Group>
          <Row>
            <Col md={6}><Form.Group className="mb-2"><Form.Label>Tanggal Penetapan <FieldProvenanceBadge baseline={autofillBaseline.tanggal_penetapan} currentValue={form.tanggal_penetapan} onReset={() => setForm((prev) => ({ ...prev, tanggal_penetapan: autofillBaseline.tanggal_penetapan }))} /></Form.Label><Form.Control type="date" value={form.tanggal_penetapan} onChange={(e) => setForm({ ...form, tanggal_penetapan: e.target.value })} /></Form.Group></Col>
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
