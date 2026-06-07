import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Form, Spinner, Alert } from 'react-bootstrap';
import Select from 'react-select';
import { useDokumen } from '../../../hooks/useDokumen';
import { usePeriodeAktif } from '../../rpjmd/hooks/usePeriodeAktif';
import { useAuth } from '../../../hooks/useAuth';
import { canManagePlanningWorkflow } from '../../../utils/roleUtils';
import { fetchReferensiBuatDokumenRenja, createRenjaDokumenV2 } from '../services/planningRenjaApi';
import DashboardLayout from './DashboardLayout';

const RenjaBuatDokumenPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tahun } = useDokumen();
  const { periode_id: periodeAktif } = usePeriodeAktif();
  const can = canManagePlanningWorkflow(user?.role);

  const [ref, setRef] = useState(null);
  const [loadingRef, setLoadingRef] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Pilihan user
  const [rkpdId, setRkpdId] = useState('');
  const [renstraId, setRenstraId] = useState('');
  const [judul, setJudul] = useState('');
  const [alasan, setAlasan] = useState('');

  // Load referensi sekali
  useEffect(() => {
    let ok = true;
    (async () => {
      setLoadingRef(true);
      try {
        const data = await fetchReferensiBuatDokumenRenja({
          periode_id: periodeAktif || undefined,
          include_test: 1,
        });
        if (ok) setRef(data);
      } catch (e) {
        if (ok) setErr(e?.response?.data?.message || e.message || 'Gagal memuat referensi.');
      } finally {
        if (ok) setLoadingRef(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [periodeAktif]);

  const rkpdDipilih = useMemo(
    () => (ref?.rkpdDokumen || []).find((r) => String(r.id) === String(rkpdId)),
    [ref, rkpdId],
  );
  const tahunVal = rkpdDipilih?.tahun || tahun || '';
  const periodeVal = rkpdDipilih?.periode_id || periodeAktif || '';
  const namaOpd = rkpdDipilih?.nama_opd || '';
  const renstraFiltered = ref?.renstraPdDokumen || [];
  useEffect(() => {
    if (namaOpd && tahunVal) setJudul(`Renja ${namaOpd} Tahun ${tahunVal}`);
  }, [namaOpd, tahunVal]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!periodeVal || !tahunVal || !renstraId || !judul.trim() || !alasan.trim()) {
      setErr('RKPD, Renstra PD, judul, dan alasan wajib diisi.');
      return;
    }
    setBusy(true);
    try {
      const renstraDipilih = (ref?.renstraPdDokumen || []).find(
        (r) => String(r.id) === String(renstraId),
      );
      const body = {
        periode_id: Number(periodeVal),
        tahun: Number(tahunVal),
        perangkat_daerah_id: renstraDipilih?.perangkat_daerah_id
          ? Number(renstraDipilih.perangkat_daerah_id)
          : null,
        renstra_pd_dokumen_id: Number(renstraId),
        rkpd_dokumen_id: rkpdId ? Number(rkpdId) : null,
        judul: judul.trim(),
        status: 'draft',
        change_reason_text: alasan.trim(),
      };
      const row = await createRenjaDokumenV2(body);
      if (!row?.id) throw new Error('Tidak ada id dokumen.');
      navigate(`/dashboard-renja/v2/dokumen/${row.id}`);
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex.message || 'Gagal membuat dokumen.');
    } finally {
      setBusy(false);
    }
  };

  if (!can)
    return (
      <DashboardLayout>
        <Alert variant="danger">Tidak ada akses menulis dokumen Renja.</Alert>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="mb-3">
        <h4 className="fw-bold text-success mb-1">📝 Buat Dokumen Renja</h4>
        <p className="text-muted small">
          Pilih RKPD acuan → Perangkat Daerah → Renstra PD → isi judul.
        </p>
      </div>

      {err && <Alert variant="warning">{err}</Alert>}

      <Card className="shadow-sm">
        <CardBody>
          {loadingRef ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <Form onSubmit={submit}>
              {/* Step 1: RKPD */}
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">
                  1. RKPD Acuan <span className="text-muted fw-normal">(opsional)</span>
                </Form.Label>
                <Form.Select
                  value={rkpdId}
                  onChange={(e) => {
                    setRkpdId(e.target.value);
                  }}
                >
                  <option value="">— tidak ada —</option>
                  {(ref?.rkpdDokumen || []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.tahun} — {r.judul} [{r.status}]
                    </option>
                  ))}
                </Form.Select>
                {rkpdDipilih && (
                  <Form.Text className="text-success">
                    Tahun: {rkpdDipilih.tahun} · Periode: {rkpdDipilih.periode_id}
                  </Form.Text>
                )}
              </Form.Group>

              {/* Step 2: Perangkat Daerah */}
              {rkpdDipilih?.nama_opd && (
                <div className="mb-3 p-2 bg-light rounded border">
                  <small className="text-muted">OPD:</small> <strong>{rkpdDipilih.nama_opd}</strong>
                </div>
              )}

              {/* Step 3: Renstra PD */}
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">
                  3. Renstra PD <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={renstraId}
                  onChange={(e) => setRenstraId(e.target.value)}
                  disabled={!rkpdId}
                >
                  <option value="">— pilih Renstra PD —</option>
                  {renstraFiltered.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.judul} [{r.status}]
                    </option>
                  ))}
                </Form.Select>
                {rkpdId && renstraFiltered.length === 0 && (
                  <Form.Text className="text-danger">Tidak ada Renstra PD untuk OPD ini.</Form.Text>
                )}
              </Form.Group>

              {/* Judul */}
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">
                  Judul Dokumen <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Judul dokumen Renja"
                  required
                />
              </Form.Group>

              {/* Dasar Penyusunan Dan Perubahan Renja */}
              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">
                  Upload Dasar <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setAlasan(e.target.files?.[0]?.name || '')}
                />
                {alasan && <Form.Text className="text-success">File: {alasan}</Form.Text>}
              </Form.Group>

              <div className="d-flex gap-2">
                <Button type="submit" variant="success" disabled={busy}>
                  {busy ? <Spinner size="sm" /> : '💾 Simpan & Kelola Item'}
                </Button>
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={() => navigate('/dashboard-renja')}
                >
                  Batal
                </Button>
              </div>
            </Form>
          )}
        </CardBody>
      </Card>
    </DashboardLayout>
  );
};

export default RenjaBuatDokumenPage;
