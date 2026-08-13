import React, { useEffect, useState } from 'react';
import { Badge, Button, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { createProsnInovasi, deleteProsnInovasi, getProsnInovasi, updateProsnInovasi } from '../services/prosnpApi';
import ProsnSkorIndikatifCard from './ProsnSkorIndikatifCard';
import EntityBuktiManager from './EntityBuktiManager';
import ProsnAutofillModal from './ProsnAutofillModal';
import PreBindEvidencePicker from './PreBindEvidencePicker';
import { bindFoodOpsEvidenceToProsn } from '../../foodOperations/services/foodOpsApi';
import { DOCUMENT_TYPE_LABEL } from '../../foodOperations/services/foodOpsConstants';

const STATUS_IMPLEMENTASI_LABEL = { gagasan: 'Gagasan', diterapkan_sebagian: 'Diterapkan Sebagian', diterapkan_penuh: 'Diterapkan Penuh' };
const STATUS_PERKADA_LABEL = { belum_ada: 'Belum Ada', proses_penyusunan: 'Proses Penyusunan', ditetapkan: 'Ditetapkan' };

function emptyForm() {
  return {
    nama_inovasi: '', masalah_awal: '', tujuan: '', unsur_kebaruan: '', proses_sebelum: '', proses_setelah: '', ruang_lingkup: '',
    relevansi_pengadaan: false, relevansi_pengelolaan: false, relevansi_penyaluran: false, relevansi_umum: false,
    tanggal_mulai: '', status_implementasi: 'gagasan', unit_pelaksana: '', lokasi: '', penerima_manfaat: '',
    hasil_kuantitatif: '', hasil_kualitatif: '', sub_kegiatan_basis: '', status_evaluasi: '',
    status_perkada: 'belum_ada', jenis_perkada: '', nomor_perkada: '', tanggal_perkada: '', relevansi_dijelaskan: '',
  };
}

/**
 * Corrective "ProSN Semester-II Readiness — B.1.4 Field-Level Perkada
 * Autofill" (mandat §13/Req F) — HANYA field yg SAH diturunkan dari metadata
 * dokumen Perkada kanonis tersimpan (nomor_dokumen/tanggal_dokumen/
 * document_type). `status_perkada` diisi 'ditetapkan' HANYA bila saat ini
 * masih default 'belum_ada' — dokumen Perkada yg SUDAH terbit/tersimpan
 * secara faktual berarti sudah ditetapkan (bukan tebakan, itu fakta yg
 * melekat pada eksistensi dokumennya), TIDAK PERNAH menimpa pilihan eksplisit
 * user (mis. 'proses_penyusunan'). MURNI FUNGSI, testable tanpa render.
 */
export function derivePerkadaAutofill(document, currentForm) {
  if (!document) return {};
  const patch = {};
  if (!currentForm?.nomor_perkada) patch.nomor_perkada = document.nomor_dokumen || '';
  if (!currentForm?.tanggal_perkada) patch.tanggal_perkada = document.tanggal_dokumen || '';
  if (!currentForm?.jenis_perkada) patch.jenis_perkada = DOCUMENT_TYPE_LABEL[document.document_type] || '';
  if (!currentForm?.status_perkada || currentForm.status_perkada === 'belum_ada') patch.status_perkada = 'ditetapkan';
  return patch;
}

export default function InovasiPerkadaSection({ indikator, pengisian, editable, canReview, onChanged }) {
  // MBG 2.7 (dan indikator non-Ketahanan-Pangan lain yg reuse tipe_form ini di masa
  // depan) pakai toggle relevansi generik, bukan 3 checkbox spesifik pengadaan/
  // pengelolaan/penyaluran gabah-beras (spek 34 §7, D3).
  const isKetahananPangan = (indikator.masterIndikator?.kelompok_tematik || 'ketahanan_pangan') === 'ketahanan_pangan';
  const [inovasiList, setInovasiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [sourcePerkadaDocument, setSourcePerkadaDocument] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setInovasiList(await getProsnInovasi(pengisian.id)); }
    catch { toast.error('Gagal memuat register inovasi.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pengisian.id]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setSourcePerkadaDocument(null); setShowModal(true); };
  const openEdit = (inovasi) => { setEditing(inovasi); setForm({ ...emptyForm(), ...inovasi }); setSourcePerkadaDocument(null); setShowModal(true); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let record;
      if (editing) record = await updateProsnInovasi(editing.id, form);
      else record = await createProsnInovasi(pengisian.id, form);
      // Corrective "B.1.4 Field-Level Perkada Autofill" (mandat §13) — ikat
      // dokumen Perkada yg dipilih via PreBindEvidencePicker sbg bukti, baik
      // saat create MAUPUN edit (Perkada sering baru diketahui setelah inovasi
      // sudah tercatat) — user SUDAH eksplisit klik "Gunakan" saat memilih.
      if (sourcePerkadaDocument) {
        try {
          await bindFoodOpsEvidenceToProsn({ document_id: sourcePerkadaDocument.id, pengisian_id: pengisian.id, entity_type: 'INOVASI', entity_id: record.id, kategori: 'perkada' });
        } catch (bindError) {
          toast.error(bindError?.response?.data?.message || 'Inovasi tersimpan, tapi gagal mengikat dokumen Perkada sbg bukti — tautkan manual lewat Bukti.');
        }
      }
      toast.success('Inovasi tersimpan.');
      setShowModal(false);
      await load(); await onChanged();
    } catch (error) { toast.error(error?.response?.data?.message || 'Gagal menyimpan inovasi.'); }
    finally { setSaving(false); }
  };
  const remove = async (inovasi) => {
    if (!window.confirm(`Hapus inovasi "${inovasi.nama_inovasi}"?`)) return;
    try { await deleteProsnInovasi(inovasi.id); toast.success('Inovasi dihapus.'); await load(); await onChanged(); }
    catch (error) { toast.error(error?.response?.data?.message || 'Gagal menghapus.'); }
  };

  return (
    <div>
      <ProsnSkorIndikatifCard
        pengisianId={pengisian.id} bobotMaksimal={indikator.bobot_maksimal}
        skor={pengisian.skor_indikatif_internal} alasan={pengisian.skor_alasan} dihitungAt={pengisian.skor_dihitung_at}
        tipeForm={indikator.tipe_form} detail={pengisian.skor_detail}
        onChanged={async () => { await load(); await onChanged(); }}
      />
      <div className="d-flex justify-content-between align-items-center mb-2">
        <strong>{isKetahananPangan ? 'Register Inovasi Pengadaan/Pengelolaan Gabah-Beras & Penyaluran CBP' : `Register Inovasi ${indikator.nama || ''}`}</strong>
        {editable && (
          <div className="d-flex gap-2">
            <ProsnAutofillModal pengisianId={pengisian.id} entityType="INOVASI" onApplied={async () => { await load(); await onChanged(); }} />
            <Button size="sm" onClick={openCreate}>+ Tambah Inovasi</Button>
          </div>
        )}
      </div>
      {loading ? <div className="text-muted small">Memuat…</div> : inovasiList.length ? (
        <Table size="sm" responsive className="align-middle">
          <thead><tr><th>Nama Inovasi</th><th>Implementasi</th><th>Perkada</th><th>Bukti</th>{editable && <th />}</tr></thead>
          <tbody>
            {inovasiList.map((inovasi) => (
              <tr key={inovasi.id}>
                <td>{inovasi.nama_inovasi}</td>
                <td><Badge bg={inovasi.status_implementasi === 'diterapkan_penuh' ? 'success' : inovasi.status_implementasi === 'diterapkan_sebagian' ? 'warning' : 'secondary'}>{STATUS_IMPLEMENTASI_LABEL[inovasi.status_implementasi]}</Badge></td>
                <td><Badge bg={inovasi.status_perkada === 'ditetapkan' ? 'success' : 'secondary'}>{STATUS_PERKADA_LABEL[inovasi.status_perkada]}</Badge></td>
                <td>
                  <EntityBuktiManager
                    pengisianId={pengisian.id} entityType="INOVASI" entityId={inovasi.id}
                    kategoriPilihan={['bukti_implementasi', 'perkada', 'bukti_hasil']}
                    canUpload={editable} canReview={canReview}
                  />
                </td>
                {editable && (
                  <td className="text-nowrap">
                    <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => openEdit(inovasi)}>Edit</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => remove(inovasi)}>Hapus</Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : <div className="text-muted small mb-2">Belum ada inovasi dicatat.</div>}

      {/* Corrective "B.1.4 Tambah Inovasi Modal — Footer Accessibility Fix"
          (sama persis root cause & pola fix dgn B.1.2, diverifikasi terpisah
          dari source): <Form> sebelumnya membungkus Modal.Header+Modal.Body+
          Modal.Footer sekaligus, merusak layout flex `.modal-dialog-scrollable`
          milik Bootstrap. <Form> sekarang HANYA membungkus isi Modal.Body;
          tombol Simpan terhubung ke form via atribut native `form` (HTML5),
          perilaku submit TIDAK berubah sama sekali. */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" scrollable>
        <Modal.Header closeButton><Modal.Title>{editing ? 'Ubah' : 'Tambah'} Inovasi</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form id="formTambahInovasi" onSubmit={submit}>
            <Form.Group className="mb-2"><Form.Label>Nama Inovasi *</Form.Label><Form.Control required value={form.nama_inovasi} onChange={(e) => setForm({ ...form, nama_inovasi: e.target.value })} /></Form.Group>
            <Row>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Masalah Awal</Form.Label><Form.Control as="textarea" rows={2} value={form.masalah_awal} onChange={(e) => setForm({ ...form, masalah_awal: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Tujuan</Form.Label><Form.Control as="textarea" rows={2} value={form.tujuan} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} /></Form.Group></Col>
              <Col md={12}><Form.Group className="mb-2"><Form.Label>Unsur Kebaruan</Form.Label><Form.Control as="textarea" rows={2} value={form.unsur_kebaruan} onChange={(e) => setForm({ ...form, unsur_kebaruan: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Proses Sebelum</Form.Label><Form.Control as="textarea" rows={2} value={form.proses_sebelum} onChange={(e) => setForm({ ...form, proses_sebelum: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Proses Setelah</Form.Label><Form.Control as="textarea" rows={2} value={form.proses_setelah} onChange={(e) => setForm({ ...form, proses_setelah: e.target.value })} /></Form.Group></Col>
              <Col md={12}><Form.Group className="mb-2"><Form.Label>Ruang Lingkup</Form.Label><Form.Control value={form.ruang_lingkup} onChange={(e) => setForm({ ...form, ruang_lingkup: e.target.value })} /></Form.Group></Col>
            </Row>
            <Form.Group className="mb-2">
              {isKetahananPangan ? (
                <>
                  <Form.Label>Relevansi * (pilih minimal satu)</Form.Label>
                  <div className="d-flex gap-3">
                    <Form.Check label="Pengadaan" checked={form.relevansi_pengadaan} onChange={(e) => setForm({ ...form, relevansi_pengadaan: e.target.checked })} />
                    <Form.Check label="Pengelolaan" checked={form.relevansi_pengelolaan} onChange={(e) => setForm({ ...form, relevansi_pengelolaan: e.target.checked })} />
                    <Form.Check label="Penyaluran CBP" checked={form.relevansi_penyaluran} onChange={(e) => setForm({ ...form, relevansi_penyaluran: e.target.checked })} />
                  </div>
                </>
              ) : (
                <Form.Check label="Inovasi ini relevan dengan objek indikator ProSN yang dinilai *" checked={form.relevansi_umum} onChange={(e) => setForm({ ...form, relevansi_umum: e.target.checked })} />
              )}
            </Form.Group>
            <Row>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>Tanggal Mulai</Form.Label><Form.Control type="date" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} /></Form.Group></Col>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>Status Implementasi *</Form.Label>
                <Form.Select value={form.status_implementasi} onChange={(e) => setForm({ ...form, status_implementasi: e.target.value })}>
                  {Object.entries(STATUS_IMPLEMENTASI_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Form.Select>
              </Form.Group></Col>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>Unit Pelaksana</Form.Label><Form.Control value={form.unit_pelaksana} onChange={(e) => setForm({ ...form, unit_pelaksana: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Lokasi</Form.Label><Form.Control value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Penerima Manfaat</Form.Label><Form.Control value={form.penerima_manfaat} onChange={(e) => setForm({ ...form, penerima_manfaat: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Hasil Kuantitatif</Form.Label><Form.Control as="textarea" rows={2} value={form.hasil_kuantitatif} onChange={(e) => setForm({ ...form, hasil_kuantitatif: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Hasil Kualitatif</Form.Label><Form.Control as="textarea" rows={2} value={form.hasil_kualitatif} onChange={(e) => setForm({ ...form, hasil_kualitatif: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Sub Kegiatan Basis</Form.Label><Form.Control value={form.sub_kegiatan_basis} onChange={(e) => setForm({ ...form, sub_kegiatan_basis: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Status Evaluasi</Form.Label><Form.Control value={form.status_evaluasi} onChange={(e) => setForm({ ...form, status_evaluasi: e.target.value })} /></Form.Group></Col>
            </Row>
            <Form.Group className="mb-2"><Form.Label>Relevansi Dijelaskan (wajib bila Sub Kegiatan Basis di luar 4 default B.1.4)</Form.Label><Form.Control as="textarea" rows={2} value={form.relevansi_dijelaskan} onChange={(e) => setForm({ ...form, relevansi_dijelaskan: e.target.value })} /></Form.Group>
            <hr />
            <PreBindEvidencePicker
              kategoriProsn="perkada"
              label="Isi Otomatis field Perkada dari Dokumen Existing (opsional) — tidak perlu unggah ulang."
              onSelect={(document) => { setSourcePerkadaDocument(document); setForm((prev) => ({ ...prev, ...derivePerkadaAutofill(document, prev) })); }}
            />
            <Row>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>Status Perkada *</Form.Label>
                <Form.Select value={form.status_perkada} onChange={(e) => setForm({ ...form, status_perkada: e.target.value })}>
                  {Object.entries(STATUS_PERKADA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Form.Select>
              </Form.Group></Col>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>Jenis Perkada</Form.Label><Form.Control value={form.jenis_perkada} onChange={(e) => setForm({ ...form, jenis_perkada: e.target.value })} /></Form.Group></Col>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>Tanggal Perkada</Form.Label><Form.Control type="date" value={form.tanggal_perkada} onChange={(e) => setForm({ ...form, tanggal_perkada: e.target.value })} /></Form.Group></Col>
              <Col md={12}><Form.Group className="mb-2"><Form.Label>Nomor Perkada {form.status_perkada === 'ditetapkan' && '*'}</Form.Label><Form.Control required={form.status_perkada === 'ditetapkan'} value={form.nomor_perkada} onChange={(e) => setForm({ ...form, nomor_perkada: e.target.value })} /></Form.Group></Col>
            </Row>
            <div className="small text-muted">Dokumen Perkada diunggah lewat bagian Bukti Dukung di bawah (kategori: Perkada) — tanpa dokumen, skor dibatasi maksimal 1.00 meski status sudah Ditetapkan.</div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowModal(false)}>Batal</Button>
          <Button type="submit" form="formTambahInovasi" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
