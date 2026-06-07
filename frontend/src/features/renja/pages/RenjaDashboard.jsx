import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Row, Col, Spinner, Badge, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../hooks/useAuth';
import { useDokumen } from '../../../hooks/useDokumen';
import { usePeriodeAktif } from '../../rpjmd/hooks/usePeriodeAktif';
import { canManagePlanningWorkflow } from '../../../utils/roleUtils';
import { updateRenjaStatus } from '../services/renjaApi';
import { getAllRenjaDokumen } from '../services/planningRenjaApi';
import api from '../../../services/api';
import DashboardLayout from './DashboardLayout';

const STATUS_COLOR = {
  draft: 'secondary',
  review: 'warning',
  final: 'success',
  approved: 'primary',
  rejected: 'danger',
};

const RenjaDashboard = () => {
  const navigate = useNavigate();
  const { tahun: tahunAktif } = useDokumen();
  const { periode_id } = usePeriodeAktif();
  const { user } = useAuth();
  const canManage = canManagePlanningWorkflow(user?.role);
  const [dokumen, setDokumen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (tahunAktif) params.tahun = tahunAktif;
      if (periode_id) params.periode_id = periode_id;
      const data = await getAllRenjaDokumen(params);
      setDokumen(Array.isArray(data) ? data : data?.rows || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [tahunAktif, periode_id]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = {
    total: dokumen.length,
    draft: dokumen.filter((d) => d.status === 'draft').length,
    review: dokumen.filter((d) => d.status === 'review').length,
    final: dokumen.filter((d) => d.status === 'final').length,
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus "${row.judul}"?`)) return;
    const reason = window.prompt('Alasan (wajib):');
    if (!reason?.trim()) {
      toast.error('Alasan wajib.');
      return;
    }
    try {
      await api.delete(`/renja/v2/${row.id}`, { data: { change_reason_text: reason.trim() } });
      toast.success('Dihapus.');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal.');
    }
  };

  const handleStatus = async (row, action) => {
    const reason = window.prompt(`Alasan "${action}" (wajib):`);
    if (!reason?.trim()) {
      toast.error('Alasan wajib.');
      return;
    }
    try {
      await updateRenjaStatus(row.id, { action, change_reason_text: reason.trim() });
      toast.success('Status diperbarui.');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal.');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="fw-bold text-primary mb-1">📋 Dashboard Renja</h2>
          <p className="text-muted mb-0 small">
            Tahun: <strong>{tahunAktif || '—'}</strong>
            {periode_id ? ` · Periode ${periode_id}` : ''}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/dashboard-renja/v2/buat')}
          >
            + Buat Dokumen Renja
          </button>
        )}
      </div>
      {error && <div className="alert alert-warning">{error}</div>}
      <Row className="mb-4">
        {[
          { label: 'Total', val: summary.total, color: 'primary', icon: '📁' },
          { label: 'Draft', val: summary.draft, color: 'secondary', icon: '✏️' },
          { label: 'Review', val: summary.review, color: 'warning', icon: '🔍' },
          { label: 'Final', val: summary.final, color: 'success', icon: '✅' },
        ].map((s) => (
          <Col key={s.label} xs={6} md={3} className="mb-3">
            <Card border={s.color} className="h-100 text-center shadow-sm">
              <CardBody>
                <div className="fs-2">{s.icon}</div>
                <div className={`fs-4 fw-bold text-${s.color}`}>{s.val ?? 0}</div>
                <div className="text-muted small">{s.label}</div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>
      <Card className="shadow-sm">
        <CardBody>
          <h5 className="fw-semibold mb-3">Daftar Dokumen Renja</h5>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : dokumen.length === 0 ? (
            <p className="text-muted text-center py-4">Belum ada dokumen Renja.</p>
          ) : (
            <Table responsive hover size="sm">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Judul</th>
                  <th>Tahun</th>
                  <th>OPD</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {dokumen.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{row.judul || '—'}</td>
                    <td>{row.tahun || '—'}</td>
                    <td>{row.nama_opd || row.perangkat_daerah?.nama || '—'}</td>
                    <td>
                      <Badge bg={STATUS_COLOR[row.status] || 'secondary'}>{row.status}</Badge>
                    </td>
                    <td className="d-flex gap-1 flex-wrap">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => navigate(`/dashboard-renja/v2/dokumen/${row.id}`)}
                      >
                        Detail
                      </button>
                      {canManage && row.status === 'draft' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => handleStatus(row, 'submit')}
                          >
                            Submit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(row)}
                          >
                            Hapus
                          </button>
                        </>
                      )}
                      {canManage && row.status === 'review' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => handleStatus(row, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleStatus(row, 'reject')}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </DashboardLayout>
  );
};

export default RenjaDashboard;
