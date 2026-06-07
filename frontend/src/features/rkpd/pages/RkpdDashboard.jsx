// File: frontend/src/features/rkpd/pages/RkpdDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Row, Col, Spinner, Badge, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../hooks/useAuth';
import { useDokumen } from '../../../hooks/useDokumen';
import { usePeriodeAktif } from '../../rpjmd/hooks/usePeriodeAktif';
import { canManagePlanningWorkflow } from '../../../utils/roleUtils';
import { fetchRkpdDashboardV2 } from '../services/planningDashboardApi';
import { deleteRkpd, updateRkpdStatus } from '../services/rkpdApi';
import RkpdDashboardLayout from './RkpdDashboardLayout';
import api from '../../../services/api';

const STATUS_COLOR = {
  draft: 'secondary',
  review: 'warning',
  final: 'success',
  approved: 'primary',
  rejected: 'danger',
};

const RkpdDashboard = () => {
  const navigate = useNavigate();
  const { tahun: tahunAktif } = useDokumen();
  const { periode_id } = usePeriodeAktif();
  const { user } = useAuth();
  const canManage = canManagePlanningWorkflow(user?.role);

  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (tahunAktif) params.tahun = tahunAktif;
      if (periode_id) params.periode_id = periode_id;
      const data = await fetchRkpdDashboardV2(params);
      setDash(data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [tahunAktif, periode_id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('rkpd-dashboard:refresh', handler);
    return () => window.removeEventListener('rkpd-dashboard:refresh', handler);
  }, [load]);

  const summary = dash?.summary;
  const dokumen = dash?.dokumen || [];

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus dokumen "${row.judul}"?`)) return;
    const reason = window.prompt('Alasan penghapusan (wajib):');
    if (!reason?.trim()) {
      toast.error('Alasan wajib diisi.');
      return;
    }
    try {
      await deleteRkpd(row.id, { change_reason_text: reason.trim() });
      toast.success('Dokumen dihapus.');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal menghapus.');
    }
  };

  const handleStatus = async (row, action) => {
    const reason = window.prompt(`Alasan "${action}" (wajib):`);
    if (!reason?.trim()) {
      toast.error('Alasan wajib diisi.');
      return;
    }
    const statusMap = { submit: 'review', approve: 'final', reject: 'draft' };
    const newStatus = statusMap[action] || action;
    try {
      await api.put(`/rkpd/dokumen/${row.id}`, {
        status: newStatus,
        change_reason_text: reason.trim(),
      });
      toast.success(`Status diperbarui: ${action}`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal update status.');
    }
  };

  return (
    <RkpdDashboardLayout>
      {/* Header */}
      <div className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="fw-bold text-primary mb-1">📋 Dashboard RKPD</h2>
          <p className="text-muted mb-0 small">
            Tahun Anggaran: <strong>{tahunAktif || '—'}</strong>
            {periode_id ? ` · Periode ${periode_id}` : ''}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/dashboard-rkpd/v2/buat')}
          >
            + Buat Dokumen RKPD
          </button>
        )}
      </div>

      {error && <div className="alert alert-warning">{error}</div>}

      {/* Kartu Ringkasan Status */}
      <Row className="mb-4">
        {[
          { label: 'Total Dokumen', val: summary?.total_dokumen, color: 'primary', icon: '📁' },
          { label: 'Draft', val: summary?.by_status?.draft, color: 'secondary', icon: '✏️' },
          { label: 'Review', val: summary?.by_status?.review, color: 'warning', icon: '🔍' },
          { label: 'Final', val: summary?.by_status?.final, color: 'success', icon: '✅' },
        ].map((s) => (
          <Col key={s.label} xs={6} md={3} className="mb-3">
            <Card className={`text-center shadow-sm border-top border-4 border-${s.color} h-100`}>
              <CardBody className="py-3">
                <div className="fs-4 mb-1">{s.icon}</div>
                <div className={`fs-3 fw-bold text-${s.color}`}>
                  {loading ? <Spinner size="sm" /> : (s.val ?? 0)}
                </div>
                <div className="text-muted small">{s.label}</div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Tabel Dokumen */}
      <Card className="shadow-sm">
        <CardBody>
          <h6 className="fw-bold text-primary mb-3">Daftar Dokumen RKPD</h6>
          {loading ? (
            <div className="text-center py-4">
              <Spinner />
            </div>
          ) : dokumen.length === 0 ? (
            <div className="text-center text-muted py-5">
              <div className="fs-1">📄</div>
              <p>Belum ada dokumen RKPD untuk tahun {tahunAktif || 'ini'}.</p>
              {canManage && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate('/dashboard-rkpd/v2/buat')}
                >
                  Buat Dokumen Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Judul Dokumen</th>
                    <th>OPD</th>
                    <th>Tahun</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {dokumen.map((d, i) => (
                    <tr key={d.id}>
                      <td className="text-muted small">{i + 1}</td>
                      <td className="fw-semibold">{d.judul || '—'}</td>
                      <td className="small text-muted">{d.nama_opd || '—'}</td>
                      <td>{d.tahun}</td>
                      <td>
                        <Badge bg={STATUS_COLOR[d.status] || 'secondary'}>{d.status}</Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => navigate(`/dashboard-rkpd/v2/dokumen/${d.id}`)}
                          >
                            Buka
                          </button>
                          {canManage && d.status === 'draft' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => handleStatus(d, 'submit')}
                            >
                              Submit
                            </button>
                          )}
                          {canManage && d.status === 'review' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              onClick={() => handleStatus(d, 'approve')}
                            >
                              Approve
                            </button>
                          )}
                          {canManage && d.status === 'review' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleStatus(d, 'reject')}
                            >
                              Reject
                            </button>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(d)}
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    </RkpdDashboardLayout>
  );
};

export default RkpdDashboard;
