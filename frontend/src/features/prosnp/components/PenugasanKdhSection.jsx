import React, { useEffect, useState } from 'react';
import { Badge, Button, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  createProsnSuratPenugasan,
  deleteProsnSuratPenugasan,
  getProsnNomenklaturMapping,
  getProsnSuratPenugasan,
  updateProsnSuratPenugasan,
} from '../services/prosnpApi';
import ProsnSkorIndikatifCard from './ProsnSkorIndikatifCard';
import EntityBuktiManager from './EntityBuktiManager';
import ProsnAutofillModal from './ProsnAutofillModal';
import PreBindEvidencePicker from './PreBindEvidencePicker';
import { bindFoodOpsEvidenceToProsn } from '../../foodOperations/services/foodOpsApi';

const STATUS_TL_LABEL = { belum_ditindaklanjuti: 'Belum Ditindaklanjuti', sedang_diproses: 'Sedang Diproses', selesai: 'Selesai' };

function emptyForm() {
  return {
    nomor_surat: '', tanggal_surat: '', jenis_dokumen: '', pejabat_penandatangan: '',
    opd_penerima_nama: '', unit_pelaksana: '', tanggal_mulai_berlaku: '', tanggal_berakhir: '',
    ringkasan_isi: '', cakupan_pengadaan: false, cakupan_pengelolaan: false, cakupan_penyaluran: false,
    status_tindak_lanjut: 'belum_ditindaklanjuti', catatan: '',
    dukungan: [],
  };
}

/**
 * Corrective "ProSN Semester-II Readiness — B.1.1 Recall-First Autofill"
 * (mandat §11/Req D) — HANYA field yg SAH diturunkan dari metadata dokumen
 * kanonis tersimpan (nomor_dokumen/tanggal_dokumen). `pejabat_penandatangan`
 * SENGAJA TIDAK diisi otomatis — dokumen kanonis tidak menyimpan field
 * penandatangan terstruktur, mengisinya dari `penerbit` (nama OPD/instansi,
 * BUKAN nama pejabat perorangan) akan jadi fabrikasi identitas (mandat §18
 * "never invent... person"). MURNI FUNGSI, testable tanpa render.
 */
export function deriveSuratAutofill(document, currentForm) {
  if (!document) return {};
  const patch = {};
  if (!currentForm?.nomor_surat) patch.nomor_surat = document.nomor_dokumen || '';
  if (!currentForm?.tanggal_surat) patch.tanggal_surat = document.tanggal_dokumen || '';
  return patch;
}

export default function PenugasanKdhSection({ indikator, pengisian, editable, canReview, onChanged }) {
  const [suratList, setSuratList] = useState([]);
  const [mapping, setMapping] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [sourceDocument, setSourceDocument] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [surat, map] = await Promise.all([
        getProsnSuratPenugasan(pengisian.id),
        getProsnNomenklaturMapping({ master_indikator_id: indikator.master_indikator_id }),
      ]);
      setSuratList(surat);
      setMapping(map);
    } catch (error) {
      toast.error('Gagal memuat register surat penugasan.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pengisian.id]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setSourceDocument(null); setShowModal(true); };
  const openEdit = (surat) => {
    setEditing(surat);
    setForm({
      nomor_surat: surat.nomor_surat, tanggal_surat: surat.tanggal_surat, jenis_dokumen: surat.jenis_dokumen || '',
      pejabat_penandatangan: surat.pejabat_penandatangan, opd_penerima_nama: surat.opd_penerima_nama || '',
      unit_pelaksana: surat.unit_pelaksana || '', tanggal_mulai_berlaku: surat.tanggal_mulai_berlaku || '',
      tanggal_berakhir: surat.tanggal_berakhir || '', ringkasan_isi: surat.ringkasan_isi,
      cakupan_pengadaan: surat.cakupan_pengadaan, cakupan_pengelolaan: surat.cakupan_pengelolaan, cakupan_penyaluran: surat.cakupan_penyaluran,
      status_tindak_lanjut: surat.status_tindak_lanjut, catatan: surat.catatan || '',
      dukungan: (surat.dukungan || []).map((d) => ({ ...d })),
      lock_version: surat.lock_version,
    });
    setShowModal(true);
  };

  const addDukunganRow = (mapId) => {
    const item = mapping.find((m) => m.id === Number(mapId));
    if (!item) return;
    setForm((prev) => ({
      ...prev,
      dukungan: [...prev.dukungan, {
        kode_sub_kegiatan: item.kode_sub_kegiatan, program: item.nama_program, kegiatan: item.nama_kegiatan,
        sub_kegiatan: item.nama_sub_kegiatan, indikator_output: item.indikator_sub_kegiatan, target: '', pagu: '', realisasi: '', sumber_jenis: 'manual',
      }],
    }));
  };
  const removeDukunganRow = (index) => setForm((prev) => ({ ...prev, dukungan: prev.dukungan.filter((_, i) => i !== index) }));
  const setDukunganField = (index, key, value) => setForm((prev) => {
    const dukungan = [...prev.dukungan];
    dukungan[index] = { ...dukungan[index], [key]: value };
    return { ...prev, dukungan };
  });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let record;
      if (editing) record = await updateProsnSuratPenugasan(editing.id, form);
      else record = await createProsnSuratPenugasan(pengisian.id, form);
      // Corrective "B.1.1 Recall-First Autofill" (mandat §11) — bila record BARU
      // dibuat dari dokumen existing yg dipilih via PreBindEvidencePicker, ikat
      // otomatis sbg bukti (reuse sumber kanonis, TIDAK unggah ulang) — user
      // SUDAH eksplisit klik "Gunakan" saat memilih dokumen, ini bukan silent bind.
      if (!editing && sourceDocument) {
        try {
          await bindFoodOpsEvidenceToProsn({ document_id: sourceDocument.id, pengisian_id: pengisian.id, entity_type: 'SURAT_PENUGASAN', entity_id: record.id, kategori: 'surat_penugasan' });
        } catch (bindError) {
          toast.error(bindError?.response?.data?.message || 'Surat tersimpan, tapi gagal mengikat dokumen sumber sbg bukti — tautkan manual lewat Bukti.');
        }
      }
      toast.success('Surat penugasan tersimpan.');
      setShowModal(false);
      await load();
      await onChanged();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Gagal menyimpan surat penugasan.');
    } finally {
      setSaving(false);
    }
  };
  const remove = async (surat) => {
    if (!window.confirm(`Hapus surat "${surat.nomor_surat}"?`)) return;
    try {
      await deleteProsnSuratPenugasan(surat.id);
      toast.success('Surat penugasan dihapus.');
      await load();
      await onChanged();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Gagal menghapus.');
    }
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
        <strong>Register Surat Penugasan Kepala Daerah</strong>
        {editable && (
          <div className="d-flex gap-2">
            <ProsnAutofillModal pengisianId={pengisian.id} entityType="SURAT_PENUGASAN" onApplied={async () => { await load(); await onChanged(); }} />
            <Button size="sm" onClick={openCreate}>+ Tambah Surat</Button>
          </div>
        )}
      </div>
      {loading ? (
        <div className="text-muted small">Memuat…</div>
      ) : suratList.length ? (
        <Table size="sm" responsive className="align-middle">
          <thead>
            <tr><th>Nomor</th><th>Tanggal</th><th>Cakupan</th><th>Tindak Lanjut</th><th>Bukti</th>{editable && <th />}</tr>
          </thead>
          <tbody>
            {suratList.map((surat) => (
              <tr key={surat.id}>
                <td>{surat.nomor_surat}<div className="small text-muted">{surat.pejabat_penandatangan}</div></td>
                <td>{new Date(surat.tanggal_surat).toLocaleDateString('id-ID')}</td>
                <td>
                  {surat.cakupan_pengadaan && <Badge bg="info" className="me-1">Pengadaan</Badge>}
                  {surat.cakupan_pengelolaan && <Badge bg="info" className="me-1">Pengelolaan</Badge>}
                  {surat.cakupan_penyaluran && <Badge bg="info">Penyaluran</Badge>}
                </td>
                <td>{STATUS_TL_LABEL[surat.status_tindak_lanjut]}</td>
                <td>
                  <EntityBuktiManager
                    pengisianId={pengisian.id} entityType="SURAT_PENUGASAN" entityId={surat.id}
                    kategoriPilihan={['surat_penugasan', 'bukti_tindak_lanjut']}
                    canUpload={editable} canReview={canReview}
                  />
                </td>
                {editable && (
                  <td className="text-nowrap">
                    <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => openEdit(surat)}>Edit</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => remove(surat)}>Hapus</Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <div className="text-muted small mb-2">Belum ada surat penugasan dicatat.</div>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" scrollable>
        <Form onSubmit={submit}>
          <Modal.Header closeButton><Modal.Title>{editing ? 'Ubah' : 'Tambah'} Surat Penugasan</Modal.Title></Modal.Header>
          <Modal.Body>
            {!editing && (
              <PreBindEvidencePicker
                kategoriProsn="surat_penugasan"
                onSelect={(document) => { setSourceDocument(document); setForm((prev) => ({ ...prev, ...deriveSuratAutofill(document, prev) })); }}
              />
            )}
            <Row>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Nomor Surat *</Form.Label><Form.Control required value={form.nomor_surat} onChange={(e) => setForm({ ...form, nomor_surat: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Tanggal Surat *</Form.Label><Form.Control required type="date" value={form.tanggal_surat} onChange={(e) => setForm({ ...form, tanggal_surat: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Jenis Dokumen</Form.Label><Form.Control value={form.jenis_dokumen} onChange={(e) => setForm({ ...form, jenis_dokumen: e.target.value })} placeholder="Surat Tugas / SK / Nota Dinas" /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Pejabat Penandatangan *</Form.Label><Form.Control required value={form.pejabat_penandatangan} onChange={(e) => setForm({ ...form, pejabat_penandatangan: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>OPD Penerima Tugas</Form.Label><Form.Control value={form.opd_penerima_nama} onChange={(e) => setForm({ ...form, opd_penerima_nama: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Unit Pelaksana</Form.Label><Form.Control value={form.unit_pelaksana} onChange={(e) => setForm({ ...form, unit_pelaksana: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Tanggal Mulai Berlaku</Form.Label><Form.Control type="date" value={form.tanggal_mulai_berlaku} onChange={(e) => setForm({ ...form, tanggal_mulai_berlaku: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Tanggal Berakhir</Form.Label><Form.Control type="date" value={form.tanggal_berakhir} onChange={(e) => setForm({ ...form, tanggal_berakhir: e.target.value })} /></Form.Group></Col>
            </Row>
            <Form.Group className="mb-2"><Form.Label>Ringkasan Isi Penugasan *</Form.Label><Form.Control required as="textarea" rows={2} value={form.ringkasan_isi} onChange={(e) => setForm({ ...form, ringkasan_isi: e.target.value })} /></Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Cakupan Tugas * (pilih minimal satu)</Form.Label>
              <div className="d-flex gap-3">
                <Form.Check label="Pengadaan" checked={form.cakupan_pengadaan} onChange={(e) => setForm({ ...form, cakupan_pengadaan: e.target.checked })} />
                <Form.Check label="Pengelolaan" checked={form.cakupan_pengelolaan} onChange={(e) => setForm({ ...form, cakupan_pengelolaan: e.target.checked })} />
                <Form.Check label="Penyaluran" checked={form.cakupan_penyaluran} onChange={(e) => setForm({ ...form, cakupan_penyaluran: e.target.checked })} />
              </div>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Status Tindak Lanjut</Form.Label>
                  <Form.Select value={form.status_tindak_lanjut} onChange={(e) => setForm({ ...form, status_tindak_lanjut: e.target.value })}>
                    {Object.entries(STATUS_TL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3"><Form.Label>Catatan</Form.Label><Form.Control as="textarea" rows={2} value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></Form.Group>

            <hr />
            <Form.Label>Mapping Dukungan Program/Kegiatan/Sub Kegiatan (opsional)</Form.Label>
            <Form.Select className="mb-2" onChange={(e) => { addDukunganRow(e.target.value); e.target.value = ''; }} value="">
              <option value="">+ Pilih dari nomenklatur ProSN untuk ditambahkan…</option>
              {mapping.map((m) => <option key={m.id} value={m.id}>{m.kode_sub_kegiatan} — {m.nama_sub_kegiatan} ({m.status_relevansi})</option>)}
            </Form.Select>
            {form.dukungan.map((d, index) => (
              <Row key={index} className="g-1 mb-1 align-items-center">
                <Col md={4}><small>{d.sub_kegiatan}</small></Col>
                <Col md={2}><Form.Control size="sm" placeholder="Target" value={d.target || ''} onChange={(e) => setDukunganField(index, 'target', e.target.value)} /></Col>
                <Col md={2}><Form.Control size="sm" type="number" placeholder="Pagu" value={d.pagu || ''} onChange={(e) => setDukunganField(index, 'pagu', e.target.value)} /></Col>
                <Col md={2}><Form.Control size="sm" type="number" placeholder="Realisasi" value={d.realisasi || ''} onChange={(e) => setDukunganField(index, 'realisasi', e.target.value)} /></Col>
                <Col md={2}><Button size="sm" variant="outline-danger" onClick={() => removeDukunganRow(index)}>Hapus</Button></Col>
              </Row>
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowModal(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
