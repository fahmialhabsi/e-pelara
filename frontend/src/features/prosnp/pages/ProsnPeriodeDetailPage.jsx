import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../hooks/useAuth';
import {
  checklistProsnBukti,
  createProsnBukti,
  downloadProsnBukti,
  getProsnDukunganSistem,
  getProsnKategoriReferensi,
  getProsnPengisian,
  getProsnPeriodeDetail,
  reviseProsnBukti,
  transitionProsnPengisian,
  updateProsnPengisian,
} from '../services/prosnpApi';
import PenugasanKdhSection from '../components/PenugasanKdhSection';
import KoordinasiForkopimdaSection from '../components/KoordinasiForkopimdaSection';
import CadanganPanganBerasSection from '../components/CadanganPanganBerasSection';
import InovasiPerkadaSection from '../components/InovasiPerkadaSection';
import SatgasMbgSection from '../components/SatgasMbgSection';
import SarprasKomponenMbgSection from '../components/SarprasKomponenMbgSection';
import LaporanSatgasMbgSection from '../components/LaporanSatgasMbgSection';
import CapaianPersentaseMbgSection from '../components/CapaianPersentaseMbgSection';

const TIPE_FORM_BARU = [
  'penugasan_kdh', 'koordinasi_forkopimda', 'cadangan_pangan_beras', 'inovasi_dan_perkada',
  'status_bertingkat_evidence', 'checklist_proporsional_evidence', 'pelaporan_berkala_evidence', 'capaian_persentase_bertingkat',
];
// 4 tipe_form Ketahanan Pangan (B.1.1-B.1.4) hasil redesain Fase B — dipakai
// utk menyembunyikan Satuan/Bukti Dukung generik (mandat corrective 2026-08-08
// §5.2/§5.3). SENGAJA tidak memakai TIPE_FORM_BARU (yang juga memuat 4 tipe
// MBG) karena mandat eksplisit membatasi scope ke Ketahanan Pangan saja.
const KETAHANAN_PANGAN_TIPE_FORM_BARU = ['penugasan_kdh', 'koordinasi_forkopimda', 'cadangan_pangan_beras', 'inovasi_dan_perkada'];
const TEMATIK_LABEL = { ketahanan_pangan: 'Ketahanan Pangan', mbg: 'Makan Bergizi Gratis (MBG)' };

const formatRupiah = (value) => `Rp ${Math.round(Number(value) || 0).toLocaleString('id-ID')}`;
const REVIEW_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS'];
const isReviewer = (role) => REVIEW_ROLES.includes(String(role || '').toUpperCase());
const BUKTI_STATUS_BADGE = { aktif: 'success', perlu_perbaikan: 'warning', digantikan: 'secondary', dibatalkan: 'dark' };

const STATUS_BADGE = {
  belum_diisi: 'secondary',
  dalam_pengisian: 'info',
  lengkap: 'success',
  perlu_perbaikan: 'danger',
  diperiksa: 'primary',
  siap_diinput_prosn: 'primary',
  diinput_manual: 'dark',
  siap_diekspor: 'success',
  diarsipkan: 'secondary',
};
const STATUS_LABEL = {
  belum_diisi: 'Belum Diisi',
  dalam_pengisian: 'Dalam Pengisian',
  diperiksa: 'Diperiksa',
  lengkap: 'Lengkap',
  perlu_perbaikan: 'Perlu Perbaikan',
  siap_diinput_prosn: 'Siap Diinput ProSN',
  diinput_manual: 'Diinput Manual',
  siap_diekspor: 'Siap Diekspor',
  diarsipkan: 'Diarsipkan',
};
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PELAKSANA'];
const isOperator = (role) => WRITE_ROLES.includes(String(role || '').toUpperCase());
const isAdminRole = (role) => ['SUPER_ADMIN', 'ADMINISTRATOR'].includes(String(role || '').toUpperCase());
const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function buildFormState(indikator) {
  const pengisian = indikator.pengisian || {};
  const dataForm = pengisian.data_form || {};
  return {
    id: pengisian.id,
    pengisianId: pengisian.id,
    status: pengisian.status || 'belum_diisi',
    lock_version: pengisian.lock_version ?? 0,
    diisi_oleh: pengisian.diisi_oleh || null,
    skor_indikatif_internal: pengisian.skor_indikatif_internal ?? null,
    skor_alasan: pengisian.skor_alasan || null,
    skor_detail: pengisian.skor_detail || null,
    skor_dihitung_at: pengisian.skor_dihitung_at || null,
    satuan: pengisian.satuan ?? indikator.satuan_default ?? '',
    sumber_data: pengisian.sumber_data || '',
    sumber_data_tanggal_posisi: pengisian.sumber_data_tanggal_posisi || '',
    sumber_data_referensi_dokumen: pengisian.sumber_data_referensi_dokumen || '',
    periode_data: pengisian.periode_data || '',
    hambatan: pengisian.hambatan || '',
    tindak_lanjut: pengisian.tindak_lanjut || '',
    target_nilai: pengisian.target_nilai ?? '',
    realisasi_nilai: pengisian.realisasi_nilai ?? '',
    hambatan_kategori_id: pengisian.hambatan_kategori_id ?? '',
    tindak_lanjut_kategori_id: pengisian.tindak_lanjut_kategori_id ?? '',
    data_form: {
      program: dataForm.program || '',
      kegiatan: dataForm.kegiatan || '',
      sub_kegiatan: dataForm.sub_kegiatan || '',
      anggaran_target: dataForm.anggaran_target ?? '',
      anggaran_realisasi: dataForm.anggaran_realisasi ?? '',
      lokasi: dataForm.lokasi || '',
      pembilang: dataForm.pembilang ?? '',
      penyebut: dataForm.penyebut ?? '',
      periode_pengukuran: dataForm.periode_pengukuran || '',
      metode: dataForm.metode || '',
      kategori: Array.isArray(dataForm.kategori) && dataForm.kategori.length
        ? dataForm.kategori
        : [{ nama: '', jumlah: '' }],
    },
  };
}

function BuktiDukungSection({ indikator, pengisianId, canUpload, canReview, onChanged }) {
  const buktiList = useMemo(
    () => [...(indikator.buktiDukung || [])].sort((a, b) => new Date(b.diunggah_at) - new Date(a.diunggah_at)),
    [indikator.buktiDukung],
  );
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadJudul, setUploadJudul] = useState('');
  const [uploadJenis, setUploadJenis] = useState('');
  const [reviseTarget, setReviseTarget] = useState(null);
  const [reviseFile, setReviseFile] = useState(null);
  const [reviseCatatan, setReviseCatatan] = useState('');
  const [checklistDraft, setChecklistDraft] = useState({});
  const [busy, setBusy] = useState(false);

  const submitUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Pilih berkas terlebih dahulu.');
      return;
    }
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('judul', uploadJudul || uploadFile.name);
      if (uploadJenis) formData.append('jenis_bukti', uploadJenis);
      formData.append('indikator_ids', JSON.stringify([indikator.id]));
      await createProsnBukti(pengisianId, formData);
      toast.success('Bukti berhasil diunggah.');
      setShowUpload(false);
      setUploadFile(null);
      setUploadJudul('');
      setUploadJenis('');
      await onChanged();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unggah bukti gagal.');
    } finally {
      setBusy(false);
    }
  };

  const submitRevise = async (e) => {
    e.preventDefault();
    if (!reviseFile || !reviseTarget) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', reviseFile);
      formData.append('lock_version', reviseTarget.lock_version);
      if (reviseCatatan) formData.append('catatan', reviseCatatan);
      await reviseProsnBukti(reviseTarget.id, formData);
      toast.success('Versi baru bukti berhasil diunggah.');
      setReviseTarget(null);
      setReviseFile(null);
      setReviseCatatan('');
      await onChanged();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Revisi bukti gagal.');
    } finally {
      setBusy(false);
    }
  };

  const download = async (bukti) => {
    try {
      const response = await downloadProsnBukti(bukti.id);
      const url = URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = bukti.nama_asli;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Unduh bukti gagal.');
    }
  };

  const saveChecklist = async (bukti) => {
    const link = bukti.ProsnBuktiIndikator || {};
    const draft = checklistDraft[link.id] || { checklist_status: link.checklist_status, catatan_kekurangan: link.catatan_kekurangan || '' };
    setBusy(true);
    try {
      await checklistProsnBukti(link.id, {
        checklist_status: draft.checklist_status,
        catatan_kekurangan: draft.catatan_kekurangan || null,
        lock_version: link.lock_version,
      });
      toast.success('Checklist bukti disimpan.');
      await onChanged();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Checklist gagal disimpan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <strong className="small text-uppercase text-muted">Bukti Dukung</strong>
        {canUpload && (
          <Button size="sm" variant="outline-secondary" onClick={() => setShowUpload(true)}>
            + Unggah Bukti
          </Button>
        )}
      </div>
      {buktiList.length ? (
        <Table size="sm" responsive className="align-middle">
          <thead>
            <tr>
              <th>Judul</th>
              <th>Versi</th>
              <th>Status</th>
              {canReview && <th style={{ minWidth: 220 }}>Checklist</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {buktiList.map((bukti) => {
              const link = bukti.ProsnBuktiIndikator || {};
              const draft = checklistDraft[link.id] || {
                checklist_status: link.checklist_status,
                catatan_kekurangan: link.catatan_kekurangan || '',
              };
              return (
                <tr key={bukti.id}>
                  <td>
                    {bukti.judul}
                    <div className="small text-muted">{bukti.nama_asli}</div>
                  </td>
                  <td>v{bukti.versi}</td>
                  <td>
                    <Badge bg={BUKTI_STATUS_BADGE[bukti.status] || 'secondary'}>{bukti.status}</Badge>
                  </td>
                  {canReview && (
                    <td>
                      <Form.Select
                        size="sm"
                        className="mb-1"
                        value={draft.checklist_status}
                        onChange={(e) =>
                          setChecklistDraft((prev) => ({ ...prev, [link.id]: { ...draft, checklist_status: e.target.value } }))
                        }
                      >
                        <option value="belum_dicek">Belum Dicek</option>
                        <option value="sesuai">Sesuai</option>
                        <option value="tidak_sesuai">Tidak Sesuai</option>
                      </Form.Select>
                      <Form.Control
                        size="sm"
                        placeholder="Catatan kekurangan"
                        value={draft.catatan_kekurangan}
                        onChange={(e) =>
                          setChecklistDraft((prev) => ({ ...prev, [link.id]: { ...draft, catatan_kekurangan: e.target.value } }))
                        }
                      />
                    </td>
                  )}
                  <td className="text-nowrap">
                    <Button size="sm" variant="outline-secondary" className="me-1 mb-1" onClick={() => download(bukti)}>
                      Unduh
                    </Button>
                    {canUpload && bukti.status === 'aktif' && (
                      <Button size="sm" variant="outline-warning" className="me-1 mb-1" onClick={() => setReviseTarget(bukti)}>
                        Revisi
                      </Button>
                    )}
                    {canReview && (
                      <Button size="sm" disabled={busy} className="mb-1" onClick={() => saveChecklist(bukti)}>
                        Simpan
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <div className="text-muted small">Belum ada bukti dukung diunggah.</div>
      )}

      <Modal show={showUpload} onHide={() => setShowUpload(false)}>
        <Form onSubmit={submitUpload}>
          <Modal.Header closeButton>
            <Modal.Title>Unggah Bukti Dukung</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Berkas (PDF/XLSX/DOCX/JPG/PNG, maks 10MB)</Form.Label>
              <Form.Control type="file" onChange={(e) => setUploadFile(e.target.files[0] || null)} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Judul</Form.Label>
              <Form.Control value={uploadJudul} onChange={(e) => setUploadJudul(e.target.value)} placeholder={uploadFile?.name || ''} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Jenis Bukti (opsional)</Form.Label>
              <Form.Control value={uploadJenis} onChange={(e) => setUploadJenis(e.target.value)} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowUpload(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Mengunggah…' : 'Unggah'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!reviseTarget} onHide={() => setReviseTarget(null)}>
        <Form onSubmit={submitRevise}>
          <Modal.Header closeButton>
            <Modal.Title>Revisi Versi Bukti</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="small text-muted">
              Mengganti &ldquo;{reviseTarget?.judul}&rdquo; (v{reviseTarget?.versi}) dengan versi baru.
            </p>
            <Form.Group className="mb-3">
              <Form.Label>Berkas versi baru</Form.Label>
              <Form.Control type="file" onChange={(e) => setReviseFile(e.target.files[0] || null)} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Catatan revisi (opsional)</Form.Label>
              <Form.Control as="textarea" rows={2} value={reviseCatatan} onChange={(e) => setReviseCatatan(e.target.value)} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setReviseTarget(null)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan Versi Baru'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default function ProsnPeriodeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [periode, setPeriode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [pickerFor, setPickerFor] = useState(null);
  const [pickerRows, setPickerRows] = useState(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [kategoriHambatan, setKategoriHambatan] = useState([]);
  const [kategoriTindakLanjut, setKategoriTindakLanjut] = useState([]);

  useEffect(() => {
    getProsnKategoriReferensi('hambatan').then(setKategoriHambatan).catch(() => setKategoriHambatan([]));
    getProsnKategoriReferensi('tindak_lanjut').then(setKategoriTindakLanjut).catch(() => setKategoriTindakLanjut([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProsnPeriodeDetail(id);
      setPeriode(data);
      const indikators = data.indikators || [];
      setForms(Object.fromEntries(indikators.map((ind) => [ind.id, buildFormState(ind)])));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Periode ProSN tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const indikators = useMemo(
    () => [...(periode?.indikators || [])].sort((a, b) => (a.urutan || 0) - (b.urutan || 0)),
    [periode],
  );
  const indikatorsByTematik = useMemo(() => {
    const groups = {};
    for (const ind of indikators) {
      const tematik = ind.masterIndikator?.kelompok_tematik || 'ketahanan_pangan';
      if (!groups[tematik]) groups[tematik] = [];
      groups[tematik].push(ind);
    }
    return groups;
  }, [indikators]);

  const setField = (indikatorId, key, value) => {
    setForms((prev) => ({ ...prev, [indikatorId]: { ...prev[indikatorId], [key]: value } }));
  };
  const setDataFormField = (indikatorId, key, value) => {
    setForms((prev) => ({
      ...prev,
      [indikatorId]: { ...prev[indikatorId], data_form: { ...prev[indikatorId].data_form, [key]: value } },
    }));
  };
  const setKategoriRow = (indikatorId, index, key, value) => {
    setForms((prev) => {
      const kategori = [...prev[indikatorId].data_form.kategori];
      kategori[index] = { ...kategori[index], [key]: value };
      return { ...prev, [indikatorId]: { ...prev[indikatorId], data_form: { ...prev[indikatorId].data_form, kategori } } };
    });
  };
  const addKategoriRow = (indikatorId) => {
    setForms((prev) => ({
      ...prev,
      [indikatorId]: {
        ...prev[indikatorId],
        data_form: { ...prev[indikatorId].data_form, kategori: [...prev[indikatorId].data_form.kategori, { nama: '', jumlah: '' }] },
      },
    }));
  };
  const removeKategoriRow = (indikatorId, index) => {
    setForms((prev) => {
      const kategori = prev[indikatorId].data_form.kategori.filter((_, i) => i !== index);
      return {
        ...prev,
        [indikatorId]: { ...prev[indikatorId], data_form: { ...prev[indikatorId].data_form, kategori: kategori.length ? kategori : [{ nama: '', jumlah: '' }] } },
      };
    });
  };

  const rasioOf = (form) => {
    const pembilang = Number(form.data_form.pembilang);
    const penyebut = Number(form.data_form.penyebut);
    if (!penyebut || !Number.isFinite(pembilang) || !Number.isFinite(penyebut)) return null;
    return Math.round((pembilang / penyebut) * 100 * 100) / 100;
  };
  const totalKategoriOf = (form) =>
    form.data_form.kategori.reduce((sum, row) => sum + (Number(row.jumlah) || 0), 0);

  const canEdit = (form) =>
    isOperator(user?.role) &&
    periode?.status === 'aktif' &&
    ['belum_diisi', 'dalam_pengisian'].includes(form.status) &&
    (isAdminRole(user?.role) || !form.diisi_oleh || Number(form.diisi_oleh) === Number(user?.id));
  const canReopen = (form) =>
    isOperator(user?.role) &&
    periode?.status === 'aktif' &&
    form.status === 'perlu_perbaikan' &&
    (isAdminRole(user?.role) || Number(form.diisi_oleh) === Number(user?.id));
  const canMarkLengkap = (form) => canEdit(form) && form.status === 'dalam_pengisian';

  const buildPayload = (indikator, form) => {
    const base = {
      lock_version: form.lock_version,
      satuan: form.satuan || null,
      sumber_data: form.sumber_data || null,
      periode_data: form.periode_data || null,
      hambatan: form.hambatan || null,
      hambatan_kategori_id: toNumberOrNull(form.hambatan_kategori_id),
      tindak_lanjut: form.tindak_lanjut || null,
      tindak_lanjut_kategori_id: toNumberOrNull(form.tindak_lanjut_kategori_id),
    };
    if (indikator.tipe_form === 'dukungan_program') {
      base.data_form = {
        program: form.data_form.program || '',
        kegiatan: form.data_form.kegiatan || '',
        sub_kegiatan: form.data_form.sub_kegiatan || '',
        anggaran_target: toNumberOrNull(form.data_form.anggaran_target),
        anggaran_realisasi: toNumberOrNull(form.data_form.anggaran_realisasi),
        lokasi: form.data_form.lokasi || '',
      };
    } else if (indikator.tipe_form === 'target_capaian_rasio') {
      base.data_form = {
        pembilang: toNumberOrNull(form.data_form.pembilang),
        penyebut: toNumberOrNull(form.data_form.penyebut),
        periode_pengukuran: form.data_form.periode_pengukuran || '',
        metode: form.data_form.metode || '',
      };
      base.target_nilai = toNumberOrNull(form.target_nilai);
      base.realisasi_nilai = toNumberOrNull(form.realisasi_nilai);
      base.rasio_nilai = rasioOf(form);
    } else if (indikator.tipe_form === 'distribusi_status') {
      const kategori = form.data_form.kategori
        .filter((row) => row.nama)
        .map((row) => ({ nama: row.nama, jumlah: Number(row.jumlah) || 0 }));
      base.data_form = { kategori, total: totalKategoriOf(form) };
    }
    return base;
  };

  const save = async (indikator) => {
    const form = forms[indikator.id];
    setSavingId(indikator.id);
    try {
      await updateProsnPengisian(form.pengisianId, buildPayload(indikator, form));
      toast.success(`Data ${indikator.kode} berhasil disimpan.`);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Data gagal disimpan.');
    } finally {
      setSavingId(null);
    }
  };

  const transition = async (indikator, statusTujuan, extra = {}) => {
    const form = forms[indikator.id];
    setSavingId(indikator.id);
    try {
      await transitionProsnPengisian(form.pengisianId, { status_tujuan: statusTujuan, lock_version: form.lock_version, ...extra });
      toast.success(`Status ${indikator.kode} diperbarui menjadi ${STATUS_LABEL[statusTujuan] || statusTujuan}.`);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Status gagal diperbarui.');
    } finally {
      setSavingId(null);
    }
  };

  const refreshBukti = async (indikatorId, pengisianId) => {
    const result = await getProsnPengisian(pengisianId);
    const buktiDukung = result?.indikator?.buktiDukung || [];
    setPeriode((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        indikators: prev.indikators.map((ind) => (ind.id === indikatorId ? { ...ind, buktiDukung } : ind)),
      };
    });
  };

  const openPicker = async (indikatorId) => {
    setPickerFor(indikatorId);
    setPickerSearch('');
    if (pickerRows === null) {
      setPickerLoading(true);
      try {
        setPickerRows(await getProsnDukunganSistem(id));
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Data sistem (DPA) gagal dimuat.');
        setPickerRows([]);
      } finally {
        setPickerLoading(false);
      }
    }
  };
  const applyPick = (indikatorId, row) => {
    setForms((prev) => ({
      ...prev,
      [indikatorId]: {
        ...prev[indikatorId],
        data_form: {
          ...prev[indikatorId].data_form,
          program: row.program || '',
          kegiatan: row.kegiatan || '',
          sub_kegiatan: row.sub_kegiatan || '',
          anggaran_target: row.anggaran_target ?? '',
          anggaran_realisasi: row.anggaran_realisasi ?? '',
        },
      },
    }));
    setPickerFor(null);
    toast.info('Data sistem diterapkan ke form — silakan review sebelum Simpan.');
  };
  const filteredPickerRows = useMemo(() => {
    if (!pickerRows) return [];
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return pickerRows;
    return pickerRows.filter((row) =>
      [row.program, row.kegiatan, row.sub_kegiatan, row.kode_sub_kegiatan]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(q)),
    );
  }, [pickerRows, pickerSearch]);

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <Spinner />
      </div>
    );
  }
  if (!periode) {
    return (
      <div className="container-fluid py-5 text-center text-muted">Periode ProSN tidak ditemukan.</div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-4">
        <div>
          <Button variant="link" className="p-0 mb-1" onClick={() => navigate('/prosnp/periode')}>
            &larr; Kembali ke Daftar Periode
          </Button>
          <h2 className="mb-1 fw-bold" style={{ color: '#276749' }}>
            {periode.nama}
          </h2>
          <p className="text-muted mb-0">
            Tahun {periode.tahun} &middot; Semester {periode.semester} &middot; Status{' '}
            <Badge bg={periode.status === 'aktif' ? 'success' : 'secondary'}>{periode.status}</Badge>
          </p>
        </div>
      </div>

      {Object.entries(indikatorsByTematik).map(([tematik, indikatorsTematik]) => (
        <div key={tematik} className="mb-2">
          {Object.keys(indikatorsByTematik).length > 1 && (
            <h5 className="text-muted border-bottom pb-2 mb-3">{TEMATIK_LABEL[tematik] || tematik}</h5>
          )}
          {indikatorsTematik.map((indikator) => {
            const form = forms[indikator.id];
            if (!form) return null;
            const editable = canEdit(form);
            const saving = savingId === indikator.id;
            return (
              <Card className="shadow-sm border-0 mb-3" key={indikator.id}>
                <Card.Header className="d-flex flex-wrap justify-content-between align-items-center bg-white">
                  <div>
                    <strong>{indikator.kode}</strong> &mdash; {indikator.masterIndikator?.objek_kertas_kerja || indikator.nama}
                    <div className="small text-muted">
                      OPD Penanggung Jawab: {indikator.responsibleOpd?.nama || 'Belum ditetapkan'}
                      {indikator.masterIndikator?.evidence_requirement_provenance === 'internal_control' && (
                        <Badge bg="light" text="dark" className="ms-2 border">Kategori bukti: kontrol internal, bukan kutipan literal Kepmendagri</Badge>
                      )}
                    </div>
                  </div>
                  <Badge bg={STATUS_BADGE[form.status] || 'secondary'}>
                    {STATUS_LABEL[form.status] || form.status}
                  </Badge>
                </Card.Header>
            <Card.Body>
              {canReopen(form) && (
                <div className="alert alert-warning py-2 px-3 d-flex justify-content-between align-items-center">
                  <span>Pengisian ini diminta perbaikan. Buka kembali untuk mengedit.</span>
                  <Button size="sm" variant="outline-dark" disabled={saving} onClick={() => transition(indikator, 'dalam_pengisian')}>
                    Buka untuk Perbaikan
                  </Button>
                </div>
              )}

              {indikator.tipe_form === 'penugasan_kdh' && (
                <PenugasanKdhSection indikator={indikator} pengisian={form} editable={editable} canReview={isReviewer(user?.role)} onChanged={load} />
              )}
              {indikator.tipe_form === 'koordinasi_forkopimda' && (
                <KoordinasiForkopimdaSection indikator={indikator} pengisian={form} editable={editable} canReview={isReviewer(user?.role)} onChanged={load} />
              )}
              {indikator.tipe_form === 'cadangan_pangan_beras' && (
                <CadanganPanganBerasSection indikator={indikator} pengisian={form} periode={periode} editable={editable} canReview={isReviewer(user?.role)} onChanged={load} />
              )}
              {indikator.tipe_form === 'inovasi_dan_perkada' && (
                <InovasiPerkadaSection indikator={indikator} pengisian={form} editable={editable} canReview={isReviewer(user?.role)} onChanged={load} />
              )}
              {indikator.tipe_form === 'status_bertingkat_evidence' && (
                <SatgasMbgSection indikator={indikator} pengisian={form} editable={editable} canReview={isReviewer(user?.role)} onChanged={load} />
              )}
              {indikator.tipe_form === 'checklist_proporsional_evidence' && (
                <SarprasKomponenMbgSection indikator={indikator} pengisian={form} editable={editable} canReview={isReviewer(user?.role)} onChanged={load} />
              )}
              {indikator.tipe_form === 'pelaporan_berkala_evidence' && (
                <LaporanSatgasMbgSection indikator={indikator} pengisian={form} editable={editable} canReview={isReviewer(user?.role)} onChanged={load} />
              )}
              {indikator.tipe_form === 'capaian_persentase_bertingkat' && (
                <CapaianPersentaseMbgSection indikator={indikator} pengisian={form} editable={editable} canReview={isReviewer(user?.role)} onChanged={load} />
              )}

              {indikator.tipe_form === 'dukungan_program' && (
                <>
                  {editable && (
                    <div className="mb-3">
                      <Button variant="outline-primary" size="sm" onClick={() => openPicker(indikator.id)}>
                        Ambil dari Data Sistem
                      </Button>
                      <div className="form-text">
                        Mengambil Program/Kegiatan/Sub Kegiatan/Anggaran dari DPA — hasilnya tetap bisa diedit
                        sebelum Simpan.
                      </div>
                    </div>
                  )}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Program</Form.Label>
                      <Form.Control
                        disabled={!editable}
                        value={form.data_form.program}
                        onChange={(e) => setDataFormField(indikator.id, 'program', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Kegiatan</Form.Label>
                      <Form.Control
                        disabled={!editable}
                        value={form.data_form.kegiatan}
                        onChange={(e) => setDataFormField(indikator.id, 'kegiatan', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sub Kegiatan</Form.Label>
                      <Form.Control
                        disabled={!editable}
                        value={form.data_form.sub_kegiatan}
                        onChange={(e) => setDataFormField(indikator.id, 'sub_kegiatan', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Lokasi</Form.Label>
                      <Form.Control
                        disabled={!editable}
                        value={form.data_form.lokasi}
                        onChange={(e) => setDataFormField(indikator.id, 'lokasi', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Anggaran Target (Rp)</Form.Label>
                      <Form.Control
                        type="number"
                        disabled={!editable}
                        value={form.data_form.anggaran_target}
                        onChange={(e) => setDataFormField(indikator.id, 'anggaran_target', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Anggaran Realisasi (Rp)</Form.Label>
                      <Form.Control
                        type="number"
                        disabled={!editable}
                        value={form.data_form.anggaran_realisasi}
                        onChange={(e) => setDataFormField(indikator.id, 'anggaran_realisasi', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                </>
              )}

              {indikator.tipe_form === 'target_capaian_rasio' && (
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Target</Form.Label>
                      <Form.Control
                        type="number"
                        disabled={!editable}
                        value={form.target_nilai}
                        onChange={(e) => setField(indikator.id, 'target_nilai', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Realisasi</Form.Label>
                      <Form.Control
                        type="number"
                        disabled={!editable}
                        value={form.realisasi_nilai}
                        onChange={(e) => setField(indikator.id, 'realisasi_nilai', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Pembilang</Form.Label>
                      <Form.Control
                        type="number"
                        disabled={!editable}
                        value={form.data_form.pembilang}
                        onChange={(e) => setDataFormField(indikator.id, 'pembilang', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Penyebut</Form.Label>
                      <Form.Control
                        type="number"
                        disabled={!editable}
                        value={form.data_form.penyebut}
                        onChange={(e) => setDataFormField(indikator.id, 'penyebut', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Rasio (otomatis)</Form.Label>
                      <Form.Control readOnly value={rasioOf(form) ?? ''} placeholder="%" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Periode Pengukuran</Form.Label>
                      <Form.Control
                        disabled={!editable}
                        value={form.data_form.periode_pengukuran}
                        onChange={(e) => setDataFormField(indikator.id, 'periode_pengukuran', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Metode</Form.Label>
                      <Form.Control
                        disabled={!editable}
                        value={form.data_form.metode}
                        onChange={(e) => setDataFormField(indikator.id, 'metode', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              )}

              {indikator.tipe_form === 'distribusi_status' && (
                <>
                  <Table size="sm" className="align-middle">
                    <thead>
                      <tr>
                        <th>Kategori</th>
                        <th style={{ width: 180 }}>Jumlah</th>
                        {editable && <th style={{ width: 60 }} />}
                      </tr>
                    </thead>
                    <tbody>
                      {form.data_form.kategori.map((row, index) => (
                        <tr key={index}>
                          <td>
                            <Form.Control
                              disabled={!editable}
                              value={row.nama}
                              onChange={(e) => setKategoriRow(indikator.id, index, 'nama', e.target.value)}
                            />
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              disabled={!editable}
                              value={row.jumlah}
                              onChange={(e) => setKategoriRow(indikator.id, index, 'jumlah', e.target.value)}
                            />
                          </td>
                          {editable && (
                            <td>
                              <Button variant="outline-danger" size="sm" onClick={() => removeKategoriRow(indikator.id, index)}>
                                &times;
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {editable && (
                    <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => addKategoriRow(indikator.id)}>
                      + Tambah Kategori
                    </Button>
                  )}
                  <div className="fw-bold mb-3">Total: {totalKategoriOf(form)}</div>
                </>
              )}

              <div className="small text-uppercase text-muted mb-2">
                Catatan Internal (bukan fakta utama indikator)
              </div>
              <Row>
                {!KETAHANAN_PANGAN_TIPE_FORM_BARU.includes(indikator.tipe_form) && (
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Satuan</Form.Label>
                      <Form.Control
                        disabled={!editable}
                        value={form.satuan}
                        onChange={(e) => setField(indikator.id, 'satuan', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                )}
                <Col md={KETAHANAN_PANGAN_TIPE_FORM_BARU.includes(indikator.tipe_form) ? 12 : 8}>
                  <Form.Group className="mb-3">
                    <Form.Label>Sumber Data</Form.Label>
                    <Form.Control
                      disabled={!editable}
                      value={form.sumber_data}
                      onChange={(e) => setField(indikator.id, 'sumber_data', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-2">
                    <Form.Label>Kategori Hambatan</Form.Label>
                    <Form.Select
                      disabled={!editable}
                      value={form.hambatan_kategori_id}
                      onChange={(e) => setField(indikator.id, 'hambatan_kategori_id', e.target.value)}
                    >
                      <option value="">— Pilih kategori (opsional) —</option>
                      {kategoriHambatan.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Hambatan</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      disabled={!editable}
                      value={form.hambatan}
                      onChange={(e) => setField(indikator.id, 'hambatan', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-2">
                    <Form.Label>Kategori Tindak Lanjut</Form.Label>
                    <Form.Select
                      disabled={!editable}
                      value={form.tindak_lanjut_kategori_id}
                      onChange={(e) => setField(indikator.id, 'tindak_lanjut_kategori_id', e.target.value)}
                    >
                      <option value="">— Pilih kategori (opsional) —</option>
                      {kategoriTindakLanjut.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Tindak Lanjut</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      disabled={!editable}
                      value={form.tindak_lanjut}
                      onChange={(e) => setField(indikator.id, 'tindak_lanjut', e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {KETAHANAN_PANGAN_TIPE_FORM_BARU.includes(indikator.tipe_form) ? (
                <div className="text-muted small mb-3 fst-italic">
                  Bukti untuk indikator ini diunggah langsung pada setiap baris register di atas (tombol &ldquo;Bukti&rdquo;) —
                  bukan di sini. Unggahan tanpa keterikatan ke record register tidak diperiksa mesin skor.
                </div>
              ) : (
                <BuktiDukungSection
                  indikator={indikator}
                  pengisianId={form.pengisianId}
                  canUpload={editable}
                  canReview={isReviewer(user?.role)}
                  onChanged={() => refreshBukti(indikator.id, form.pengisianId)}
                />
              )}

              {editable && (
                <div className="d-flex gap-2">
                  <Button
                    style={{ backgroundColor: '#276749', borderColor: '#276749' }}
                    disabled={saving}
                    onClick={() => save(indikator)}
                  >
                    {saving ? 'Menyimpan…' : 'Simpan'}
                  </Button>
                  {canMarkLengkap(form) && (
                    <Button variant="outline-success" disabled={saving} onClick={() => transition(indikator, 'lengkap')}>
                      Tandai Lengkap
                    </Button>
                  )}
                </div>
              )}
              {!editable && !canReopen(form) && (
                <div className="text-muted small">
                  Data tidak dapat diubah pada status ini{form.diisi_oleh && !isAdminRole(user?.role) && Number(form.diisi_oleh) !== Number(user?.id) ? ' (dimiliki pengisi lain)' : ''}.
                </div>
              )}
            </Card.Body>
          </Card>
            );
          })}
        </div>
      ))}

      <Modal show={pickerFor !== null} onHide={() => setPickerFor(null)} size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Ambil dari Data Sistem (DPA)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            className="mb-3"
            placeholder="Cari Program/Kegiatan/Sub Kegiatan…"
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
          />
          {pickerLoading ? (
            <div className="text-center py-4">
              <Spinner />
            </div>
          ) : (
            <Table size="sm" hover responsive>
              <thead>
                <tr>
                  <th>Kode Sub Kegiatan</th>
                  <th>Program / Kegiatan / Sub Kegiatan</th>
                  <th className="text-end">Anggaran Target</th>
                  <th className="text-end">Anggaran Realisasi</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredPickerRows.length ? (
                  filteredPickerRows.map((row) => (
                    <tr key={row.kode_sub_kegiatan}>
                      <td className="text-nowrap">{row.kode_sub_kegiatan}</td>
                      <td>
                        <div className="small text-muted">{row.program}</div>
                        <div className="small text-muted">{row.kegiatan}</div>
                        <div>{row.sub_kegiatan}</div>
                      </td>
                      <td className="text-end text-nowrap">{formatRupiah(row.anggaran_target)}</td>
                      <td className="text-end text-nowrap">{formatRupiah(row.anggaran_realisasi)}</td>
                      <td>
                        <Button size="sm" onClick={() => applyPick(pickerFor, row)}>
                          Pilih
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-3">
                      Tidak ada data DPA yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
