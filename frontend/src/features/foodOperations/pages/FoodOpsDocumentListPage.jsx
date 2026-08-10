import React, { useEffect, useState } from 'react';
import { Badge, Button, Col, Form, Row, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../hooks/useAuth';
import { getFoodOpsDocuments } from '../services/foodOpsApi';
import { DOCUMENT_CLASS_LABEL, DOCUMENT_TYPE_LABEL, STATUS_VERIFIKASI_LABEL } from '../services/foodOpsConstants';
import FoodOpsDocumentUploadModal from '../components/FoodOpsDocumentUploadModal';
import FoodOpsDocumentDetailModal from '../components/FoodOpsDocumentDetailModal';

const REVIEW_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS'];
const isReviewer = (role) => REVIEW_ROLES.includes(String(role || '').toUpperCase());

export default function FoodOpsDocumentListPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ tahun: '', document_type: '', document_class: '', status_verifikasi: '' });
  const [showUpload, setShowUpload] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      setDocuments(await getFoodOpsDocuments(query));
    } catch { toast.error('Gagal memuat daftar dokumen.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filters]);

  return (
    <div className="p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Dokumen &amp; Evidence</h4>
        <Button onClick={() => setShowUpload(true)}>+ Unggah Dokumen</Button>
      </div>

      <Row className="g-2 mb-3">
        <Col md={3}><Form.Control placeholder="Tahun" value={filters.tahun} onChange={(e) => setFilters({ ...filters, tahun: e.target.value })} /></Col>
        <Col md={3}>
          <Form.Select value={filters.document_class} onChange={(e) => setFilters({ ...filters, document_class: e.target.value })}>
            <option value="">— Semua Class —</option>
            {Object.entries(DOCUMENT_CLASS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select value={filters.document_type} onChange={(e) => setFilters({ ...filters, document_type: e.target.value })}>
            <option value="">— Semua Jenis —</option>
            {Object.entries(DOCUMENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select value={filters.status_verifikasi} onChange={(e) => setFilters({ ...filters, status_verifikasi: e.target.value })}>
            <option value="">— Semua Status Verifikasi —</option>
            {Object.entries(STATUS_VERIFIKASI_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Form.Select>
        </Col>
      </Row>

      {loading ? <div className="text-muted">Memuat…</div> : documents.length ? (
        <Table responsive size="sm" className="align-middle">
          <thead>
            <tr>
              <th>Judul</th><th>Jenis</th><th>Class</th><th>Nomor</th><th>Tanggal</th><th>Versi</th>
              <th>Status</th><th>Verifikasi</th><th>Authority</th><th>Tanggal Upload</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id}>
                <td>{d.judul}</td>
                <td>{DOCUMENT_TYPE_LABEL[d.document_type] || d.document_type}</td>
                <td>{DOCUMENT_CLASS_LABEL[d.document_class]}</td>
                <td>{d.nomor_dokumen || '—'}</td>
                <td>{d.tanggal_dokumen || '—'}</td>
                <td>{d.versi}</td>
                <td><Badge bg={d.status === 'aktif' ? 'success' : 'secondary'}>{d.status}</Badge></td>
                <td><Badge bg={d.status_verifikasi === 'valid' ? 'success' : 'warning'}>{STATUS_VERIFIKASI_LABEL[d.status_verifikasi]}</Badge></td>
                <td>{d.authority_level || '—'}</td>
                <td>{new Date(d.created_at).toLocaleDateString('id-ID')}</td>
                <td><Button size="sm" variant="outline-primary" onClick={() => setDetailId(d.id)}>Detail</Button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : <div className="text-muted">Belum ada dokumen.</div>}

      <FoodOpsDocumentUploadModal show={showUpload} onHide={() => setShowUpload(false)} onUploaded={load} />
      {detailId && (
        <FoodOpsDocumentDetailModal show={!!detailId} onHide={() => setDetailId(null)} documentId={detailId} canVerify={isReviewer(user?.role)} onChanged={load} />
      )}
    </div>
  );
}
