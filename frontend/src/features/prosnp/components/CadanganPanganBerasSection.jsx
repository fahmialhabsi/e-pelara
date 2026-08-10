import React, { useEffect, useState } from 'react';
import { Badge, Button, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  createProsnCadanganTarget,
  createProsnStokTransaksi,
  deleteProsnStokTransaksi,
  getProsnCadanganTarget,
  getProsnDpaSourceKegiatan,
  getProsnDpaSourceOpd,
  getProsnDpaSourceProgram,
  getProsnDpaSourceSubKegiatan,
  getProsnDpaSourceTahun,
  getProsnKomoditas,
  getProsnStokTransaksi,
  refreshProsnCadanganTargetSnapshot,
  updateProsnCadanganTarget,
  updateProsnStokTransaksi,
} from '../services/prosnpApi';
import ProsnSkorIndikatifCard from './ProsnSkorIndikatifCard';
import EntityBuktiManager from './EntityBuktiManager';
import ProsnAutofillModal from './ProsnAutofillModal';

const JENIS_LABEL = {
  saldo_awal: 'Saldo Awal', pengadaan: 'Pengadaan', penerimaan_lain_sah: 'Penerimaan Lain Sah',
  penyaluran: 'Penyaluran', susut_rusak: 'Susut/Rusak', koreksi_masuk: 'Koreksi Masuk', koreksi_keluar: 'Koreksi Keluar',
};
const OWNERSHIP_LABEL = { pemerintah_provinsi: 'Pemerintah Provinsi', bulog: 'Perum BULOG', distributor: 'Distributor/Pelaku Usaha', penggilingan: 'Penggilingan', lainnya: 'Lainnya' };
const VERIFIKASI_LABEL = { uploaded: 'Terunggah', valid: 'Valid', invalid: 'Tidak Valid', needs_clarification: 'Perlu Klarifikasi', duplicate: 'Duplikat', expired: 'Kedaluwarsa' };

function emptyTransaksi() {
  return { komoditas_id: '', tanggal: '', jenis_transaksi: 'saldo_awal', volume: '', satuan: 'Ton', lokasi_gudang: '', pengelola: '', nomor_dokumen: '', sumber_data: '', catatan: '', ownership: 'pemerintah_provinsi', status_verifikasi: 'uploaded' };
}
function emptyTarget(tahun) {
  return {
    tahun_target: tahun, nomor_keputusan: '', tanggal_keputusan: '', target_ton: '', satuan: 'Ton', tanggal_mulai_berlaku: '', status_aktif: true, catatan: '',
    source_mode: 'KEPUTUSAN_GUBERNUR', source_tahun: '', source_opd_id: '', source_kode_program: '', source_kode_kegiatan: '', source_kode_sub_kegiatan: '',
    source_not_available: false, manual_override_alasan: '',
  };
}
const B13_KODE_SUB_KEGIATAN_CADANGAN_PANGAN = '2.09.03.1.02.0005';
function formatRupiah(value) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

export default function CadanganPanganBerasSection({ indikator, pengisian, periode, editable, canReview, onChanged }) {
  const [transaksiList, setTransaksiList] = useState([]);
  const [komoditasList, setKomoditasList] = useState([]);
  const [targetList, setTargetList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTrxModal, setShowTrxModal] = useState(false);
  const [editingTrx, setEditingTrx] = useState(null);
  const [trxForm, setTrxForm] = useState(emptyTransaksi());
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetForm, setTargetForm] = useState(emptyTarget(periode.tahun));
  const [saving, setSaving] = useState(false);
  const [refreshingSnapshot, setRefreshingSnapshot] = useState(false);
  const [sumberTahunList, setSumberTahunList] = useState([]);
  const [sumberOpdList, setSumberOpdList] = useState([]);
  const [sumberProgramList, setSumberProgramList] = useState([]);
  const [sumberKegiatanList, setSumberKegiatanList] = useState([]);
  const [sumberSubKegiatanList, setSumberSubKegiatanList] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [trx, komoditas, target] = await Promise.all([
        getProsnStokTransaksi(pengisian.id), getProsnKomoditas(), getProsnCadanganTarget(periode.tahun),
      ]);
      setTransaksiList(trx); setKomoditasList(komoditas); setTargetList(target);
    } catch { toast.error('Gagal memuat data cadangan pangan.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pengisian.id]);

  const targetAktif = targetList.find((t) => t.status_aktif);

  const openCreateTrx = () => { setEditingTrx(null); setTrxForm(emptyTransaksi()); setShowTrxModal(true); };
  const openEditTrx = (trx) => { setEditingTrx(trx); setTrxForm({ ...trx, komoditas_id: trx.komoditas_id }); setShowTrxModal(true); };
  const submitTrx = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTrx) await updateProsnStokTransaksi(editingTrx.id, trxForm);
      else await createProsnStokTransaksi(pengisian.id, trxForm);
      toast.success('Transaksi stok tersimpan.');
      setShowTrxModal(false);
      await load(); await onChanged();
    } catch (error) { toast.error(error?.response?.data?.message || 'Gagal menyimpan transaksi.'); }
    finally { setSaving(false); }
  };
  const removeTrx = async (trx) => {
    if (!window.confirm('Hapus transaksi ini?')) return;
    try { await deleteProsnStokTransaksi(trx.id); toast.success('Transaksi dihapus.'); await load(); await onChanged(); }
    catch (error) { toast.error(error?.response?.data?.message || 'Gagal menghapus.'); }
  };

  const submitTarget = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (targetAktif) await updateProsnCadanganTarget(targetAktif.id, { ...targetForm, lock_version: targetAktif.lock_version });
      else await createProsnCadanganTarget(targetForm);
      toast.success('Target Keputusan KDH tersimpan.');
      setShowTargetModal(false);
      await load(); await onChanged();
    } catch (error) { toast.error(error?.response?.data?.message || 'Gagal menyimpan target.'); }
    finally { setSaving(false); }
  };

  const targetAktifDariDpaOperasional = targetAktif && Array.isArray(targetAktif.source_trace)
    && targetAktif.source_trace.some((t) => t?.jenis === 'sistem_dpa_operasional');
  const targetAktifDariRkaOperasional = targetAktif && Array.isArray(targetAktif.source_trace)
    && targetAktif.source_trace.some((t) => t?.jenis === 'sistem_rka_operasional');

  const openTargetModal = () => {
    setTargetForm(targetAktif
      ? { ...emptyTarget(periode.tahun), ...targetAktif, source_mode: (targetAktifDariDpaOperasional || targetAktifDariRkaOperasional) ? 'DPA_OPERASIONAL' : 'KEPUTUSAN_GUBERNUR' }
      : emptyTarget(periode.tahun));
    setSumberOpdList([]); setSumberProgramList([]); setSumberKegiatanList([]); setSumberSubKegiatanList([]);
    setShowTargetModal(true);
  };

  const loadSumberTahun = async () => { try { setSumberTahunList(await getProsnDpaSourceTahun()); } catch { setSumberTahunList([]); } };
  const loadSumberOpd = async (tahun) => { try { setSumberOpdList(tahun ? await getProsnDpaSourceOpd(tahun) : []); } catch { setSumberOpdList([]); } };
  const loadSumberProgram = async (tahun, opdId) => { try { setSumberProgramList(tahun && opdId ? await getProsnDpaSourceProgram(tahun, opdId) : []); } catch { setSumberProgramList([]); } };
  const loadSumberKegiatan = async (tahun, opdId, kodeProgram) => { try { setSumberKegiatanList(tahun && opdId && kodeProgram ? await getProsnDpaSourceKegiatan(tahun, opdId, kodeProgram) : []); } catch { setSumberKegiatanList([]); } };
  const loadSumberSubKegiatan = async (tahun, opdId, kodeKegiatan) => { try { setSumberSubKegiatanList(tahun && opdId && kodeKegiatan ? await getProsnDpaSourceSubKegiatan(tahun, opdId, kodeKegiatan) : []); } catch { setSumberSubKegiatanList([]); } };

  useEffect(() => { if (showTargetModal) loadSumberTahun(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showTargetModal]);
  useEffect(() => { loadSumberOpd(targetForm.source_tahun); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [targetForm.source_tahun]);
  useEffect(() => { loadSumberProgram(targetForm.source_tahun, targetForm.source_opd_id); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [targetForm.source_tahun, targetForm.source_opd_id]);
  useEffect(() => { loadSumberKegiatan(targetForm.source_tahun, targetForm.source_opd_id, targetForm.source_kode_program); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [targetForm.source_tahun, targetForm.source_opd_id, targetForm.source_kode_program]);
  useEffect(() => { loadSumberSubKegiatan(targetForm.source_tahun, targetForm.source_opd_id, targetForm.source_kode_kegiatan); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [targetForm.source_tahun, targetForm.source_opd_id, targetForm.source_kode_kegiatan]);

  const subKegiatanTerpilih = sumberSubKegiatanList.find((s) => s.kode_sub_kegiatan === targetForm.source_kode_sub_kegiatan);

  const doRefreshSnapshot = async () => {
    if (!targetAktif) return;
    setRefreshingSnapshot(true);
    try { await refreshProsnCadanganTargetSnapshot(targetAktif.id); toast.success('Snapshot sumber APBD diperbarui.'); await load(); }
    catch (error) { toast.error(error?.response?.data?.message || 'Gagal memperbarui snapshot.'); }
    finally { setRefreshingSnapshot(false); }
  };

  return (
    <div>
      <ProsnSkorIndikatifCard
        pengisianId={pengisian.id} bobotMaksimal={indikator.bobot_maksimal}
        skor={pengisian.skor_indikatif_internal} alasan={pengisian.skor_alasan} dihitungAt={pengisian.skor_dihitung_at}
        onChanged={async () => { await load(); await onChanged(); }}
      />

      {(() => {
        // Persentase Capaian B.1.3 — murni tampilan, nilainya reuse skor_detail
        // yang SUDAH dihitung backend (hitungB13), TIDAK dihitung ulang di FE
        // (mandat corrective 2026-08-08 §5.4: frontend hanya display).
        const detail = pengisian.skor_detail;
        if (!detail) {
          return (
            <div className="alert alert-light border small mb-3">
              Persentase Capaian: belum dihitung — klik &ldquo;Hitung Ulang Skor&rdquo; di atas setelah target dan transaksi diisi.
            </div>
          );
        }
        return (
          <div className="alert alert-light border small mb-3">
            {detail.jenis_penilaian === 'progress_checkpoint_semester_1' && (
              <Badge bg="warning" text="dark" className="mb-2">Progres Indikatif s.d. Semester I — bukan skor final tahunan</Badge>
            )}
            {detail.jenis_penilaian === 'annual_regulatory_final' && (
              <Badge bg="success" className="mb-2">Skor Regulasi Tahunan B.1.3</Badge>
            )}
            <Row className="gy-1">
              <Col md={4}><strong>Target Cadangan Beras:</strong> {detail.target_ton !== null && detail.target_ton !== undefined ? `${Number(detail.target_ton).toLocaleString('id-ID')} Ton` : '—'}</Col>
              <Col md={4}><strong>Saldo/Realisasi Semester:</strong> {detail.saldo_akhir !== null && detail.saldo_akhir !== undefined ? `${Number(detail.saldo_akhir).toLocaleString('id-ID')} Ton` : '—'}</Col>
              <Col md={4}>
                <strong>Persentase Capaian:</strong>{' '}
                {detail.capaian_persen !== null && detail.capaian_persen !== undefined
                  ? `${Number(detail.capaian_persen).toLocaleString('id-ID')} %`
                  : 'Belum dapat dihitung — target belum tersedia.'}
              </Col>
            </Row>
          </div>
        );
      })()}

      <div className="d-flex justify-content-between align-items-center mb-2">
        <strong>Target Cadangan Pangan Beras — Tahun {periode.tahun}</strong>
        <div className="d-flex gap-2">
          {editable && (
            <ProsnAutofillModal pengisianId={pengisian.id} entityType="CADANGAN_TARGET" onApplied={async () => { await load(); await onChanged(); }} label="+ Unggah & Analisis Keputusan KDH" />
          )}
          {(editable || canReview) && (
            <Button size="sm" variant="outline-primary" onClick={openTargetModal}>
              {targetAktif ? 'Ubah Target' : '+ Isi Target'}
            </Button>
          )}
        </div>
      </div>
      {targetAktif ? (
        <div className="small mb-3">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span>
              {targetAktif.nomor_keputusan && (
                <>Nomor <strong>{targetAktif.nomor_keputusan}</strong> ({new Date(targetAktif.tanggal_keputusan).toLocaleDateString('id-ID')}) — </>
              )}
              target <strong>{Number(targetAktif.target_ton).toLocaleString('id-ID')} {targetAktif.satuan}</strong>
            </span>
            <EntityBuktiManager
              pengisianId={pengisian.id} entityType="CADANGAN_TARGET" entityId={targetAktif.id}
              kategoriPilihan={['keputusan_kdh', 'kartu_stok', 'rekonsiliasi']}
              canUpload={editable} canReview={canReview} label="Bukti Target"
            />
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
            {targetAktifDariRkaOperasional ? (() => {
              const jejak = [...targetAktif.source_trace].reverse().find((t) => t?.jenis === 'sistem_rka_operasional');
              return (
                <>
                  <Badge bg="warning" text="dark">Sumber: RKA Operasional (Fallback)</Badge>
                  <span className="text-muted">
                    Sub Kegiatan {jejak?.kode_sub_kegiatan || B13_KODE_SUB_KEGIATAN_CADANGAN_PANGAN}
                    {jejak?.tahapan && ` · Tahapan ${jejak.tahapan}`}
                    {jejak?.version !== undefined && ` · Versi ${jejak.version}`}
                    {jejak?.approval_status && ` · Status: ${jejak.approval_status === 'APPROVED' ? 'Approved' : jejak.approval_status}`}
                    {targetAktif.source_tahun && ` · Tahun ${targetAktif.source_tahun}`}
                  </span>
                  {jejak?.fallback_reason && (
                    <div className="small text-muted w-100">DPA/DPPA belum menyediakan target valid: {jejak.fallback_reason}</div>
                  )}
                </>
              );
            })() : targetAktifDariDpaOperasional ? (() => {
              const jejak = [...targetAktif.source_trace].reverse().find((t) => t?.jenis === 'sistem_dpa_operasional');
              return (
                <>
                  <Badge bg="success">Sumber: DPA/DPPA Operasional</Badge>
                  <span className="text-muted">
                    Sub Kegiatan {jejak?.kode_sub_kegiatan || B13_KODE_SUB_KEGIATAN_CADANGAN_PANGAN}
                    {jejak?.versi !== undefined && ` · Versi ${jejak.versi} (${jejak.is_active_version ? 'Aktif' : 'Tidak Aktif'})`}
                    {targetAktif.source_tahun && ` · Tahun ${targetAktif.source_tahun}`}
                    {targetAktif.source_snapshot_at && ` · diperbarui ${new Date(targetAktif.source_snapshot_at).toLocaleString('id-ID')}`}
                  </span>
                </>
              );
            })() : targetAktif.source_type === 'sistem' ? (
              <>
                <Badge bg="success">Sumber: Sistem (DPA)</Badge>
                <span className="text-muted">
                  Pagu {formatRupiah(targetAktif.source_pagu_dpa)} · Realisasi {formatRupiah(targetAktif.source_realisasi)}
                  {targetAktif.source_snapshot_at && ` · diperbarui ${new Date(targetAktif.source_snapshot_at).toLocaleString('id-ID')}`}
                </span>
                {editable && (
                  <Button size="sm" variant="link" className="p-0" disabled={refreshingSnapshot} onClick={doRefreshSnapshot}>
                    {refreshingSnapshot ? 'Menyegarkan…' : 'Perbarui Snapshot dari Sumber'}
                  </Button>
                )}
              </>
            ) : (
              <>
                <Badge bg="secondary">Sumber: Manual</Badge>
                {targetAktif.manual_override_alasan && <span className="text-muted">Alasan: {targetAktif.manual_override_alasan}</span>}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="text-warning small mb-3">Belum ada target aktif untuk tahun {periode.tahun} — capaian tidak dapat dihitung sebelum target diisi.</div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-2">
        <strong>Register Transaksi/Mutasi Stok</strong>
        {editable && <Button size="sm" onClick={openCreateTrx}>+ Tambah Transaksi</Button>}
      </div>
      {loading ? <div className="text-muted small">Memuat…</div> : transaksiList.length ? (
        <Table size="sm" responsive className="align-middle">
          <thead><tr><th>Tanggal</th><th>Jenis</th><th className="text-end">Volume</th><th>Kepemilikan</th><th>Verifikasi</th><th>Bukti</th>{editable && <th />}</tr></thead>
          <tbody>
            {transaksiList.map((trx) => (
              <tr key={trx.id}>
                <td>{new Date(trx.tanggal).toLocaleDateString('id-ID')}</td>
                <td>{JENIS_LABEL[trx.jenis_transaksi]}<div className="small text-muted">{trx.komoditas?.nama}</div>{trx.is_carry_forward && <Badge bg="info" className="mt-1">Carry-forward otomatis</Badge>}</td>
                <td className="text-end">{Number(trx.volume).toLocaleString('id-ID')} {trx.satuan}</td>
                <td>
                  <Badge bg={trx.ownership === 'pemerintah_provinsi' ? 'success' : 'secondary'}>{OWNERSHIP_LABEL[trx.ownership]}</Badge>
                  {trx.ownership !== 'pemerintah_provinsi' && <div className="small text-muted">Info situasional, tidak dihitung capaian</div>}
                </td>
                <td><Badge bg={trx.status_verifikasi === 'valid' ? 'success' : 'secondary'}>{VERIFIKASI_LABEL[trx.status_verifikasi]}</Badge></td>
                <td>
                  {trx.is_carry_forward ? <span className="small text-muted">Tidak perlu bukti</span> : (
                    <EntityBuktiManager
                      pengisianId={pengisian.id} entityType="STOK_TRANSAKSI" entityId={trx.id}
                      kategoriPilihan={['dokumen_pengadaan', 'bukti_penerimaan', 'dokumen_penyaluran', 'berita_acara', 'dokumen_penetapan', 'dokumen_koreksi']}
                      canUpload={editable} canReview={canReview}
                    />
                  )}
                </td>
                {editable && (
                  <td className="text-nowrap">
                    <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => openEditTrx(trx)}>Edit</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => removeTrx(trx)}>Hapus</Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : <div className="text-muted small mb-2">Belum ada transaksi stok dicatat.</div>}

      <Modal show={showTrxModal} onHide={() => setShowTrxModal(false)} scrollable>
        <Form onSubmit={submitTrx}>
          <Modal.Header closeButton><Modal.Title>{editingTrx ? 'Ubah' : 'Tambah'} Transaksi Stok</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-2"><Form.Label>Komoditas *</Form.Label>
              <Form.Select required value={trxForm.komoditas_id} onChange={(e) => setTrxForm({ ...trxForm, komoditas_id: e.target.value })}>
                <option value="">— pilih —</option>
                {komoditasList.map((k) => <option key={k.id} value={k.id}>{k.nama}{k.flag_beras ? '' : ' (bukan Beras — tidak dihitung capaian)'}</option>)}
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Tanggal *</Form.Label><Form.Control required type="date" value={trxForm.tanggal} onChange={(e) => setTrxForm({ ...trxForm, tanggal: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Jenis Transaksi *</Form.Label>
                <Form.Select value={trxForm.jenis_transaksi} onChange={(e) => setTrxForm({ ...trxForm, jenis_transaksi: e.target.value })}>
                  {Object.entries(JENIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Form.Select>
              </Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Volume (Ton) *</Form.Label><Form.Control required type="number" step="0.01" value={trxForm.volume} onChange={(e) => setTrxForm({ ...trxForm, volume: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Kepemilikan *</Form.Label>
                <Form.Select value={trxForm.ownership} onChange={(e) => setTrxForm({ ...trxForm, ownership: e.target.value })}>
                  {Object.entries(OWNERSHIP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Form.Select>
              </Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Lokasi Gudang</Form.Label><Form.Control value={trxForm.lokasi_gudang} onChange={(e) => setTrxForm({ ...trxForm, lokasi_gudang: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Pengelola</Form.Label><Form.Control value={trxForm.pengelola} onChange={(e) => setTrxForm({ ...trxForm, pengelola: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Nomor Dokumen</Form.Label><Form.Control value={trxForm.nomor_dokumen} onChange={(e) => setTrxForm({ ...trxForm, nomor_dokumen: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Sumber Data</Form.Label><Form.Control value={trxForm.sumber_data} onChange={(e) => setTrxForm({ ...trxForm, sumber_data: e.target.value })} /></Form.Group></Col>
              {canReview && (
                <Col md={6}><Form.Group className="mb-2"><Form.Label>Status Verifikasi</Form.Label>
                  <Form.Select value={trxForm.status_verifikasi} onChange={(e) => setTrxForm({ ...trxForm, status_verifikasi: e.target.value })}>
                    {Object.entries(VERIFIKASI_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Form.Select>
                </Form.Group></Col>
              )}
            </Row>
            <Form.Group className="mb-2"><Form.Label>Catatan</Form.Label><Form.Control as="textarea" rows={2} value={trxForm.catatan} onChange={(e) => setTrxForm({ ...trxForm, catatan: e.target.value })} /></Form.Group>
            {trxForm.ownership !== 'pemerintah_provinsi' && (
              <div className="small text-warning">Transaksi kepemilikan selain Pemerintah Provinsi tersimpan sebagai info situasional, TIDAK dihitung dalam capaian ProSN.</div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowTrxModal(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showTargetModal} onHide={() => setShowTargetModal(false)}>
        <Form onSubmit={submitTarget}>
          <Modal.Header closeButton><Modal.Title>Target Cadangan Pangan Beras</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Sumber Target Operasional</Form.Label>
              <Form.Select value={targetForm.source_mode} onChange={(e) => setTargetForm({ ...targetForm, source_mode: e.target.value })}>
                <option value="KEPUTUSAN_GUBERNUR">Keputusan Gubernur (isi manual)</option>
                <option value="DPA_OPERASIONAL">DPA/DPPA Operasional (Sub Kegiatan {B13_KODE_SUB_KEGIATAN_CADANGAN_PANGAN})</option>
              </Form.Select>
            </Form.Group>

            {targetForm.source_mode === 'DPA_OPERASIONAL' ? (
              <>
                <div className="small text-muted mb-2">
                  Target akan diambil otomatis dari DPA/DPPA aktif Sub Kegiatan <strong>{B13_KODE_SUB_KEGIATAN_CADANGAN_PANGAN}</strong> (Pengelolaan
                  Cadangan Pangan Pemerintah Provinsi) sesuai Tahun dan OPD yang dipilih — angka target TIDAK diisi manual di sini.
                </div>
                <Row>
                  <Col md={6}><Form.Group className="mb-2"><Form.Label>Tahun APBD *</Form.Label>
                    <Form.Select required value={targetForm.source_tahun} onChange={(e) => setTargetForm({ ...targetForm, source_tahun: e.target.value, source_opd_id: '' })}>
                      <option value="">— pilih —</option>
                      {sumberTahunList.map((t) => <option key={t} value={t}>{t}</option>)}
                    </Form.Select>
                  </Form.Group></Col>
                  <Col md={6}><Form.Group className="mb-2"><Form.Label>OPD *</Form.Label>
                    <Form.Select required disabled={!targetForm.source_tahun} value={targetForm.source_opd_id} onChange={(e) => setTargetForm({ ...targetForm, source_opd_id: e.target.value })}>
                      <option value="">— pilih —</option>
                      {sumberOpdList.map((o) => <option key={o.opd_penanggung_jawab_id} value={o.opd_penanggung_jawab_id}>{o.nama_opd}</option>)}
                    </Form.Select>
                  </Form.Group></Col>
                </Row>
                <Form.Group className="mb-2"><Form.Label>Tanggal Mulai Berlaku</Form.Label><Form.Control type="date" value={targetForm.tanggal_mulai_berlaku} onChange={(e) => setTargetForm({ ...targetForm, tanggal_mulai_berlaku: e.target.value })} /></Form.Group>
                <Form.Group className="mb-2"><Form.Label>Catatan</Form.Label><Form.Control as="textarea" rows={2} value={targetForm.catatan} onChange={(e) => setTargetForm({ ...targetForm, catatan: e.target.value })} /></Form.Group>
              </>
            ) : (
              <>
                <Form.Group className="mb-2"><Form.Label>Nomor Keputusan *</Form.Label><Form.Control required value={targetForm.nomor_keputusan} onChange={(e) => setTargetForm({ ...targetForm, nomor_keputusan: e.target.value })} /></Form.Group>
                <Form.Group className="mb-2"><Form.Label>Tanggal Keputusan *</Form.Label><Form.Control required type="date" value={targetForm.tanggal_keputusan} onChange={(e) => setTargetForm({ ...targetForm, tanggal_keputusan: e.target.value })} /></Form.Group>
                <Form.Group className="mb-2"><Form.Label>Target (Ton) *</Form.Label><Form.Control required type="number" step="0.01" value={targetForm.target_ton} onChange={(e) => setTargetForm({ ...targetForm, target_ton: e.target.value })} /></Form.Group>
                <Form.Group className="mb-2"><Form.Label>Tanggal Mulai Berlaku</Form.Label><Form.Control type="date" value={targetForm.tanggal_mulai_berlaku} onChange={(e) => setTargetForm({ ...targetForm, tanggal_mulai_berlaku: e.target.value })} /></Form.Group>
                <Form.Group className="mb-2"><Form.Label>Catatan</Form.Label><Form.Control as="textarea" rows={2} value={targetForm.catatan} onChange={(e) => setTargetForm({ ...targetForm, catatan: e.target.value })} /></Form.Group>

                <hr />
                <Form.Label className="fw-semibold">Sumber Pagu/Realisasi (mandat §10 — telusuri ke APBD nyata)</Form.Label>
                <Form.Check
                  type="switch" className="mb-2" label="Sumber APBD tidak tersedia — isi manual (wajib jelaskan alasan)"
                  checked={!!targetForm.source_not_available}
                  onChange={(e) => setTargetForm({ ...targetForm, source_not_available: e.target.checked })}
                />
              </>
            )}
            {targetForm.source_mode !== 'DPA_OPERASIONAL' && (targetForm.source_not_available ? (
              <Form.Group className="mb-2">
                <Form.Label>Alasan Override Manual *</Form.Label>
                <Form.Control required as="textarea" rows={2} value={targetForm.manual_override_alasan} onChange={(e) => setTargetForm({ ...targetForm, manual_override_alasan: e.target.value })} />
              </Form.Group>
            ) : (
              <Row>
                <Col md={6}><Form.Group className="mb-2"><Form.Label>Tahun APBD</Form.Label>
                  <Form.Select value={targetForm.source_tahun} onChange={(e) => setTargetForm({ ...targetForm, source_tahun: e.target.value, source_opd_id: '', source_kode_program: '', source_kode_kegiatan: '', source_kode_sub_kegiatan: '' })}>
                    <option value="">— pilih —</option>
                    {sumberTahunList.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Form.Select>
                </Form.Group></Col>
                <Col md={6}><Form.Group className="mb-2"><Form.Label>OPD</Form.Label>
                  <Form.Select disabled={!targetForm.source_tahun} value={targetForm.source_opd_id} onChange={(e) => setTargetForm({ ...targetForm, source_opd_id: e.target.value, source_kode_program: '', source_kode_kegiatan: '', source_kode_sub_kegiatan: '' })}>
                    <option value="">— pilih —</option>
                    {sumberOpdList.map((o) => <option key={o.opd_penanggung_jawab_id} value={o.opd_penanggung_jawab_id}>{o.nama_opd}</option>)}
                  </Form.Select>
                </Form.Group></Col>
                <Col md={12}><Form.Group className="mb-2"><Form.Label>Program</Form.Label>
                  <Form.Select disabled={!targetForm.source_opd_id} value={targetForm.source_kode_program} onChange={(e) => setTargetForm({ ...targetForm, source_kode_program: e.target.value, source_kode_kegiatan: '', source_kode_sub_kegiatan: '' })}>
                    <option value="">— pilih —</option>
                    {sumberProgramList.map((p) => <option key={p.kode_program} value={p.kode_program}>{p.kode_program} — {p.nama_program}</option>)}
                  </Form.Select>
                </Form.Group></Col>
                <Col md={12}><Form.Group className="mb-2"><Form.Label>Kegiatan</Form.Label>
                  <Form.Select disabled={!targetForm.source_kode_program} value={targetForm.source_kode_kegiatan} onChange={(e) => setTargetForm({ ...targetForm, source_kode_kegiatan: e.target.value, source_kode_sub_kegiatan: '' })}>
                    <option value="">— pilih —</option>
                    {sumberKegiatanList.map((k) => <option key={k.kode_kegiatan} value={k.kode_kegiatan}>{k.kode_kegiatan} — {k.nama_kegiatan}</option>)}
                  </Form.Select>
                </Form.Group></Col>
                <Col md={12}><Form.Group className="mb-2"><Form.Label>Sub Kegiatan (whitelist ProSN)</Form.Label>
                  <Form.Select disabled={!targetForm.source_kode_kegiatan} value={targetForm.source_kode_sub_kegiatan} onChange={(e) => setTargetForm({ ...targetForm, source_kode_sub_kegiatan: e.target.value })}>
                    <option value="">— pilih —</option>
                    {sumberSubKegiatanList.map((s) => <option key={s.kode_sub_kegiatan} value={s.kode_sub_kegiatan}>{s.kode_sub_kegiatan} — {s.nama_sub_kegiatan} ({s.status_relevansi})</option>)}
                  </Form.Select>
                </Form.Group></Col>
                {subKegiatanTerpilih && (
                  <Col md={12}><div className="small text-success mb-2">Pagu DPA: {formatRupiah(subKegiatanTerpilih.pagu_dpa)} (status {subKegiatanTerpilih.approval_status})</div></Col>
                )}
              </Row>
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowTargetModal(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
