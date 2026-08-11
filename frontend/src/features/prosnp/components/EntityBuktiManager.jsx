import React, { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Form, Modal, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../../services/api';
import { bindFoodOpsEvidenceToProsn } from '../../foodOperations/services/foodOpsApi';
import FoodOpsEvidenceCandidatePanel from '../../foodOperations/components/FoodOpsEvidenceCandidatePanel';

const KATEGORI_LABEL = {
  surat_penugasan: 'Surat Penugasan', keputusan_kdh: 'Keputusan KDH', undangan: 'Undangan',
  daftar_hadir: 'Daftar Hadir', notulen: 'Notulen', dokumentasi: 'Dokumentasi', berita_acara: 'Berita Acara',
  kartu_stok: 'Kartu Stok', dokumen_pengadaan: 'Dokumen Pengadaan', dokumen_penyaluran: 'Dokumen Penyaluran',
  rekonsiliasi: 'Rekonsiliasi Stok', perkada: 'Perkada', bukti_implementasi: 'Bukti Implementasi',
  bukti_hasil: 'Bukti Hasil', dpa: 'DPA', renja: 'Renja', rkpd: 'RKPD',
  bukti_tindak_lanjut: 'Bukti Tindak Lanjut', bukti_penerimaan: 'Bukti Penerimaan',
  dokumen_penetapan: 'Dokumen Penetapan', dokumen_koreksi: 'Dokumen Koreksi', lainnya: 'Lainnya',
  sk_satgas_mbg: 'SK Satgas MBG', bukti_aktivitas_satgas_mbg: 'Bukti Aktivitas Satgas',
  daftar_sarpras_mbg: 'Daftar/Inventaris Sarpras', bukti_ketersediaan_sarpras_mbg: 'Bukti Ketersediaan Sarpras',
  laporan_satgas_mbg: 'Laporan Satgas', bukti_penyampaian_laporan_mbg: 'Bukti Penyampaian Laporan',
  dokumen_penetapan_sasaran_mbg: 'Dokumen Penetapan Sasaran', data_realisasi_penerima_mbg: 'Data Realisasi Penerima',
};
const VERIFIKASI_LABEL = { uploaded: 'Terunggah', valid: 'Valid', invalid: 'Tidak Valid', needs_clarification: 'Perlu Klarifikasi', duplicate: 'Duplikat', expired: 'Kedaluwarsa' };

/**
 * Kamus kategori bukti ProSN -> document_type FoodOps utk kandidat kandidat
 * evidence yang RELEVAN (mandat §26/§60) — HANYA pemetaan padanan istilah
 * satu-ke-satu yang sudah jelas (mis. "surat_penugasan" ProSN = "surat_tugas"
 * FoodOps, keduanya merujuk dokumen yang sama secara substansi), BUKAN aturan
 * bisnis baru. Kategori tanpa padanan jelas SENGAJA tidak dipetakan — recall
 * tetap bisa dipakai via kandidat EXACT (checksum/sudah tertaut) tanpa hint ini.
 * Corrective "B.1.3 Registry-First Evidence Discovery" menambah `kategori_prosn`
 * mentah (dikirim SELALU, di samping mapping ini) — backend memetakan kategori
 * B.1.3 (dokumen_penetapan/dokumen_penyaluran/dst.) secara otoritatif sendiri
 * (mandat §19 "server authoritative for canonical category normalization"),
 * jadi mapping frontend ini TETAP dipertahankan apa adanya utk kategori lain.
 */
const KATEGORI_TO_FOOD_OPS_DOCUMENT_TYPE = {
  surat_penugasan: 'surat_tugas', keputusan_kdh: 'keputusan_gubernur',
  undangan: 'undangan', daftar_hadir: 'daftar_hadir', notulen: 'notulen',
  berita_acara: 'berita_acara', dokumentasi: 'dokumentasi',
};

/**
 * Guard identitas sebelum memanggil endpoint entity-scoped (mandat corrective
 * pass "UI Evidence Counter Refresh" §5) — entityType `PENGISIAN` adalah binding
 * generik (entity_id selalu NULL di DB) sehingga tidak butuh entityId; tipe lain
 * WAJIB punya entityId non-null/non-undefined.
 */
export function hasValidBuktiEntityIdentity(pengisianId, entityType, entityId) {
  return Boolean(pengisianId) && Boolean(entityType)
    && (entityType === 'PENGISIAN' || (entityId !== null && entityId !== undefined));
}

/**
 * Corrective "B.1.3 Registry-First Evidence Discovery" §9/§12/§13 — mesin
 * state diskoveri evidence, MURNI FUNGSI (testable tanpa render). Kredibel =
 * EXACT/STRONG (STATE B/C bergabung utk kandidat tunggal — taksonomi mandat
 * tidak eksplisit menyebut "1 STRONG saja", diperlakukan sama dgn ONE_EXACT
 * krn tujuan UX-nya identik: satu rekomendasi menonjol yang butuh konfirmasi).
 */
export function classifyDiscoveryState({ hasBoundEvidence, candidates, candidatesReady }) {
  if (hasBoundEvidence) return 'ALREADY_BOUND';
  if (!candidatesReady) return 'IDLE';
  const credible = (candidates || []).filter((c) => c.relevance === 'EXACT' || c.relevance === 'STRONG');
  if (credible.length === 1) return 'ONE_EXACT';
  if (credible.length > 1) return 'MULTIPLE';
  if ((candidates || []).length > 0) return 'POSSIBLE';
  return 'NOT_FOUND';
}

/**
 * Manajer bukti terikat langsung ke SATU entity spesifik (surat/rapat/transaksi/
 * inovasi/target) — bukan generik per-indikator. Dipakai sbg tombol "Bukti (N)"
 * per baris register B.1.1-B.1.4 (mandat corrective pass §5/§6).
 *
 * `entityBusinessDate`/`entityJenisTransaksi` (OPSIONAL, mandat corrective
 * "B.1.3 Registry-First Evidence Discovery" §7/§8): konteks bisnis transaksi
 * (tanggal + jenis) utk resolusi Event FoodOps di backend. Hanya diisi oleh
 * pemanggil yang punya konteks ini (mis. CadanganPanganBerasSection utk
 * STOK_TRANSAKSI) — pemanggil lain (B.1.1/B.1.2/B.1.4) tidak mengirimnya sama
 * sekali, sehingga perilaku existing mereka TIDAK BERUBAH (backward compatible).
 */
export default function EntityBuktiManager({ pengisianId, entityType, entityId, kategoriPilihan, canUpload, canReview, label = 'Bukti', entityBusinessDate, entityJenisTransaksi }) {
  const [show, setShow] = useState(false);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState(kategoriPilihan?.[0] || '');
  const [nomorDokumen, setNomorDokumen] = useState('');
  const [tanggalDokumen, setTanggalDokumen] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusDraft, setStatusDraft] = useState({});
  const [showTambahBukti, setShowTambahBukti] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [candidatesReady, setCandidatesReady] = useState(false);
  const [manualUploadRevealed, setManualUploadRevealed] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState(null);
  const mountedRef = useRef(true);
  // Reset ke `true` juga di badan setup (bukan hanya inisialisasi `useRef`) —
  // React.StrictMode (dev) menjalankan setup->cleanup->setup pada mount pertama;
  // tanpa reset ini, cleanup pertama membuat mountedRef.current macet `false`
  // permanen walau komponen sebenarnya masih ter-mount (mandat corrective pass
  // "Loading-State Runtime Defect").
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const hasValidIdentity = hasValidBuktiEntityIdentity(pengisianId, entityType, entityId);

  const load = async () => {
    if (!hasValidIdentity || !mountedRef.current) return;
    setLoading(true);
    try {
      // entity_id disimpan NULL di DB utk entityType PENGISIAN (binding generik ke
      // pengisian, bukan record spesifik) — jangan kirim entity_id di kasus ini,
      // kalau tidak query tidak akan pernah cocok (bandingkan dgn NULL, bukan angka).
      const params = entityType === 'PENGISIAN' ? { entity_type: entityType } : { entity_type: entityType, entity_id: entityId };
      const response = await api.get(`/prosnp/pengisian/${pengisianId}/bukti-entity`, { params });
      if (mountedRef.current) setList(response.data?.data || []);
    } catch (error) {
      // Jangan timpa `list` yg sudah diketahui benar hanya krn satu request gagal —
      // error jaringan tdk boleh menyamar sbg "bukti = 0".
      if (mountedRef.current) toast.error('Gagal memuat bukti.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };
  // Muat count bukti SEJAK MOUNT dan setiap kali identitas entity berubah — counter
  // harus akurat dari server segera, bukan menunggu modal dibuka (corrective pass
  // "UI Evidence Counter Refresh"). Efek terpisah di bawah utk refresh saat modal
  // dibuka tetap dipertahankan; krn `show` selalu mulai `false`, keduanya tidak
  // pernah tumpang tindih pada mount awal.
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pengisianId, entityType, entityId]);
  useEffect(() => { if (show) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [show]);

  // Reset hasil diskoveri setiap kali kategori berganti — kandidat kategori
  // lama tidak boleh terus tampil utk kategori baru (mandat §9 "do not
  // silently convert").
  useEffect(() => {
    setCandidates([]); setCandidatesReady(false); setManualUploadRevealed(false); setDuplicateNotice(null);
  }, [kategori]);

  const submitUpload = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Pilih berkas terlebih dahulu.'); return; }
    if (!kategori) { toast.error('Pilih kategori bukti.'); return; }
    setBusy(true);
    setDuplicateNotice(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('judul', judul || file.name);
      formData.append('kategori', kategori);
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId);
      if (nomorDokumen) formData.append('nomor_dokumen', nomorDokumen);
      if (tanggalDokumen) formData.append('tanggal_dokumen', tanggalDokumen);
      await api.post(`/prosnp/pengisian/${pengisianId}/bukti`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Bukti berhasil diunggah dan terikat ke record ini.');
      setFile(null); setJudul(''); setNomorDokumen(''); setTanggalDokumen('');
      await load();
    } catch (error) {
      // STATE F (mandat §12/§14) — berkas identik sudah terdaftar di registry:
      // JANGAN buat duplikat kanonis baru, tawarkan dokumen existing utk ditautkan.
      if (error?.response?.data?.code === 'PROSNP_EVIDENCE_DUPLICATE_IN_REGISTRY') {
        setDuplicateNotice(error.response.data.data?.existing_document || null);
      } else {
        toast.error(error?.response?.data?.message || 'Unggah bukti gagal.');
      }
    } finally {
      setBusy(false);
    }
  };

  /** Phase 1 (mandat §28/§60-64) — ikat dokumen dari registry FoodOps ke record ProSN ini. Integrasi INTERNAL, bukan bridge e-SIGAP. Tidak pernah auto-link — user wajib pilih kategori & klik "Gunakan/Tautkan". */
  const bindFromFoodOps = async (candidate) => {
    if (!kategori) { toast.error('Pilih kategori bukti terlebih dahulu sebelum menautkan dari Evidence & Operasi Pangan.'); return; }
    setBusy(true);
    try {
      await bindFoodOpsEvidenceToProsn({ document_id: candidate.document_id, pengisian_id: pengisianId, entity_type: entityType, entity_id: entityId, kategori });
      toast.success('Dokumen berhasil ditautkan sebagai bukti dari Evidence & Operasi Pangan.');
      setDuplicateNotice(null);
      setShowTambahBukti(false);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Gagal menautkan dokumen.');
    } finally { setBusy(false); }
  };

  const download = async (bukti) => {
    try {
      const response = await api.get(`/prosnp/bukti/${bukti.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url; a.download = bukti.nama_asli; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Unduh bukti gagal.'); }
  };

  const saveVerifikasi = async (link) => {
    const draft = statusDraft[link.id] || { status_verifikasi: link.buktiDukung.status_verifikasi, catatan_pemeriksa: link.buktiDukung.catatan_pemeriksa || '' };
    setBusy(true);
    try {
      await api.patch(`/prosnp/bukti/${link.buktiDukung.id}/verifikasi`, { status_verifikasi: draft.status_verifikasi, catatan_pemeriksa: draft.catatan_pemeriksa, lock_version: link.buktiDukung.lock_version });
      toast.success('Status verifikasi bukti disimpan.');
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Gagal menyimpan verifikasi.');
    } finally { setBusy(false); }
  };

  const validCount = list.filter((l) => l.buktiDukung?.status_verifikasi === 'valid').length;
  const discoveryState = classifyDiscoveryState({ hasBoundEvidence: list.length > 0, candidates, candidatesReady });
  // Sesi diskoveri baru dimulai begitu kategori dipilih — TIDAK menunggu klik
  // manual (mandat §6.C "System automatically runs evidence discovery").
  const discoverySessionActive = Boolean(kategori) && (showTambahBukti || list.length === 0);
  // Kandidat kredibel (EXACT/STRONG) -> upload default tersembunyi/dilipat;
  // POSSIBLE/NOT_FOUND -> upload tetap tersedia langsung (mandat §13, JANGAN
  // "kandidat ada -> selalu sembunyikan upload").
  const collapseManualUpload = !manualUploadRevealed && (discoveryState === 'ONE_EXACT' || discoveryState === 'MULTIPLE');

  return (
    <>
      <Button size="sm" variant={validCount > 0 ? 'outline-success' : 'outline-secondary'} onClick={() => setShow(true)}>
        {label} ({validCount}/{list.length || 0})
      </Button>
      <Modal show={show} onHide={() => setShow(false)} size="lg" scrollable>
        <Modal.Header closeButton><Modal.Title>Bukti Terikat — {label}</Modal.Title></Modal.Header>
        <Modal.Body>
          {loading ? <div className="text-muted small">Memuat…</div> : (
            <Table size="sm" responsive className="align-middle mb-3">
              <thead><tr><th>Judul</th><th>Kategori</th><th>Verifikasi</th><th /></tr></thead>
              <tbody>
                {list.length ? list.map((link) => {
                  const bukti = link.buktiDukung;
                  const draft = statusDraft[link.id] || { status_verifikasi: bukti.status_verifikasi, catatan_pemeriksa: bukti.catatan_pemeriksa || '' };
                  return (
                    <tr key={link.id}>
                      <td>{bukti.judul}<div className="small text-muted">{bukti.nama_asli}</div></td>
                      <td>{KATEGORI_LABEL[bukti.kategori] || bukti.kategori || '-'}</td>
                      <td>
                        {canReview ? (
                          <>
                            <Form.Select size="sm" className="mb-1" value={draft.status_verifikasi}
                              onChange={(e) => setStatusDraft((prev) => ({ ...prev, [link.id]: { ...draft, status_verifikasi: e.target.value } }))}>
                              {Object.entries(VERIFIKASI_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </Form.Select>
                            <Button size="sm" disabled={busy} onClick={() => saveVerifikasi(link)}>Simpan</Button>
                          </>
                        ) : (
                          <Badge bg={bukti.status_verifikasi === 'valid' ? 'success' : 'secondary'}>{VERIFIKASI_LABEL[bukti.status_verifikasi]}</Badge>
                        )}
                      </td>
                      <td><Button size="sm" variant="outline-secondary" onClick={() => download(bukti)}>Unduh</Button></td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="4" className="text-center text-muted py-2">Belum ada bukti terikat ke record ini.</td></tr>
                )}
              </tbody>
            </Table>
          )}
          {/* STATE A — ALREADY_BOUND (mandat §12): sudah ada bukti terikat -> jangan
              dorong unggah lagi, sembunyikan form di belakang aksi eksplisit. */}
          {canUpload && list.length > 0 && !showTambahBukti && (
            <div className="text-center border-top pt-3">
              <Button size="sm" variant="outline-secondary" onClick={() => setShowTambahBukti(true)}>+ Tambah Bukti Lain</Button>
            </div>
          )}
          {canUpload && (list.length === 0 || showTambahBukti) && (
            <Form onSubmit={submitUpload} className="border-top pt-3">
              <Form.Group className="mb-2">
                <Form.Label>Kategori *</Form.Label>
                <Form.Select value={kategori} onChange={(e) => setKategori(e.target.value)}>
                  <option value="">— pilih —</option>
                  {(kategoriPilihan || Object.keys(KATEGORI_LABEL)).map((k) => <option key={k} value={k}>{KATEGORI_LABEL[k] || k}</option>)}
                </Form.Select>
              </Form.Group>

              {discoverySessionActive && (
                <div className="border rounded p-2 mb-3 bg-light">
                  <div className="small text-muted mb-2">Sistem mencari dokumen yang relevan di Evidence &amp; Operasi Pangan berdasarkan kategori dan konteks record ini — tidak perlu unggah ulang berkas yang sama bila sudah ditemukan.</div>
                  <FoodOpsEvidenceCandidatePanel
                    criteria={{
                      entity_type: entityType, entity_id: entityId,
                      document_type: KATEGORI_TO_FOOD_OPS_DOCUMENT_TYPE[kategori],
                      kategori_prosn: kategori,
                      jenis_transaksi: entityJenisTransaksi,
                      entity_business_date: entityBusinessDate,
                    }}
                    onUse={bindFromFoodOps}
                    onResult={(rows) => { setCandidates(rows); setCandidatesReady(true); }}
                  />
                  {(discoveryState === 'ONE_EXACT' || discoveryState === 'MULTIPLE') && !manualUploadRevealed && (
                    <div className="mt-2">
                      <Button size="sm" variant="link" className="p-0" onClick={() => setManualUploadRevealed(true)}>Dokumen berbeda — unggah baru</Button>
                    </div>
                  )}
                </div>
              )}

              {duplicateNotice && (
                <Alert variant="warning" className="small">
                  Berkas ini identik dengan dokumen yang sudah terdaftar: <strong>{duplicateNotice.judul}</strong>.
                  {' '}Gunakan dokumen yang sudah ada, jangan unggah ulang.
                  <div className="mt-2">
                    <Button size="sm" onClick={() => bindFromFoodOps({ document_id: duplicateNotice.id })} disabled={busy}>Gunakan Dokumen Ini</Button>
                  </div>
                </Alert>
              )}

              {(!collapseManualUpload || !discoverySessionActive) && (
                <>
                  <Form.Group className="mb-2">
                    <Form.Label>Berkas</Form.Label>
                    <Form.Control type="file" onChange={(e) => setFile(e.target.files[0] || null)} />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>Judul</Form.Label>
                    <Form.Control value={judul} onChange={(e) => setJudul(e.target.value)} placeholder={file?.name || ''} />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>Nomor Dokumen</Form.Label>
                    <Form.Control value={nomorDokumen} onChange={(e) => setNomorDokumen(e.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>Tanggal Dokumen</Form.Label>
                    <Form.Control type="date" value={tanggalDokumen} onChange={(e) => setTanggalDokumen(e.target.value)} />
                  </Form.Group>
                  <Button type="submit" size="sm" disabled={busy}>{busy ? 'Mengunggah…' : '+ Unggah & Ikat ke Record Ini'}</Button>
                </>
              )}
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
