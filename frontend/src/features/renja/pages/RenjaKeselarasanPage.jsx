import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, CardBody, Spinner, Table } from 'react-bootstrap';
import RenjaPlanningDashboardLayout from './RenjaPlanningDashboardLayout';
import RenjaDokumenNavTabs from '../components/RenjaDokumenNavTabs';
import { fetchRenjaDokumenById, fetchRenjaKeselarasanTabelC } from '../services/planningRenjaApi';

/**
 * Panel Keselarasan — setara FORM 4 (Keselarasan Outcome Prioritas Asta Cita)
 * dan FORM 5 (Keselarasan Pro-SN/Tematik) pada Daftar Isian Fasilitasi
 * Permendagri 14/2026: membandingkan kode subkegiatan hasil Kesepakatan
 * Rakortekbang Tahun 2026 dengan kode yang sudah diakomodasi di dokumen Renja.
 *
 * Read-only — sumber datanya (Tabel C) adalah lampiran regulasi, bukan input
 * user, dan kode yang "belum terakomodasi" hanya menunjukkan bahwa Renja
 * belum memasukkan subkegiatan itu, bukan kesalahan data.
 */
const RenjaKeselarasanPage = () => {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [d, k] = await Promise.all([
        fetchRenjaDokumenById(id),
        fetchRenjaKeselarasanTabelC(id),
      ]);
      setDoc(d);
      setData(k);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || 'Gagal memuat keselarasan.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <RenjaPlanningDashboardLayout>
        <Spinner animation="border" />
      </RenjaPlanningDashboardLayout>
    );
  }

  return (
    <RenjaPlanningDashboardLayout>
      <div className="mb-3">
        <Link to={`/dashboard-renja/v2/dokumen/${id}`} className="small">
          ← Kembali ke Dokumen #{id}
        </Link>
        <h4 className="fw-bold text-success mb-0 mt-1">
          Keselarasan Tabel C Permendagri 14/2026
        </h4>
        <div className="small text-muted">
          {doc?.judul} · Bidang Urusan {data?.bidang_urusan || '—'}
        </div>
      </div>
      <RenjaDokumenNavTabs id={id} />

      <Alert variant="info" className="small">
        Setara <strong>FORM 4</strong> (Keselarasan Outcome Prioritas Asta Cita) dan{' '}
        <strong>FORM 5</strong> (Keselarasan Pro-SN/Tematik Pembangunan) pada Daftar Isian
        Fasilitasi Permendagri 14/2026 — membandingkan kode subkegiatan hasil Kesepakatan
        Rakortekbang Tahun 2026 dengan kode yang sudah diakomodasi pada dokumen Renja ini.
        Baris <Badge bg="warning" text="dark">belum</Badge> bukan kesalahan; artinya subkegiatan
        tersebut masih perlu ditelaah kelayakannya untuk ditambahkan.
      </Alert>

      {err && <Alert variant="danger">{err}</Alert>}

      {data && (
        <Card className="mb-3 shadow-sm">
          <CardBody>
            <div className="d-flex flex-wrap gap-4">
              <div>
                <div className="small text-muted">Total kode relevan</div>
                <div className="fs-4 fw-bold">{data.total}</div>
              </div>
              <div>
                <div className="small text-muted">Sudah terakomodasi</div>
                <div className="fs-4 fw-bold text-success">{data.terakomodasi}</div>
              </div>
              <div>
                <div className="small text-muted">Belum terakomodasi</div>
                <div className="fs-4 fw-bold text-warning">{data.belum_terakomodasi}</div>
              </div>
              <div className="ms-auto">
                <Button size="sm" variant="outline-secondary" onClick={load}>
                  ⟳ Muat Ulang
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardBody>
          <Table striped bordered hover size="sm" responsive>
            <thead>
              <tr>
                <th>Kode Subkegiatan</th>
                <th>Keterangan (Tabel C)</th>
                <th>Pro-SN</th>
                <th>Tematik</th>
                <th>Outcome Asta Cita</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.daftar || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted small">
                    Tidak ada kode Tabel C untuk bidang urusan dokumen ini, atau
                    kode_sub_kegiatan pada renja_item belum terisi.
                  </td>
                </tr>
              ) : (
                data.daftar.map((r, i) => (
                  <tr key={`${r.kode}-${i}`}>
                    <td className="text-nowrap">
                      <code>{r.kode}</code>
                    </td>
                    <td className="small">{r.keterangan || '—'}</td>
                    <td className="small">{r.pro_sn || '—'}</td>
                    <td className="small">{r.tematik || '—'}</td>
                    <td className="small">{r.outcome_prioritas || '—'}</td>
                    <td>
                      {r.terakomodasi ? (
                        <Badge bg="success">terakomodasi</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">
                          belum
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </RenjaPlanningDashboardLayout>
  );
};

export default RenjaKeselarasanPage;
