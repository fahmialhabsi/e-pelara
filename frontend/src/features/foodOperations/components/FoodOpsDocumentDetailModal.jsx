import React, { useEffect, useState } from 'react';
import { Badge, Button, Col, Modal, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { classifyFoodOpsDocument, downloadFoodOpsDocument, getFoodOpsDocumentDetail, verifyFoodOpsDocument } from '../services/foodOpsApi';
import { AUTHORITY_LEVEL_LABEL, DOCUMENT_CLASS_LABEL, DOCUMENT_TYPE_LABEL, STATUS_VERIFIKASI_LABEL } from '../services/foodOpsConstants';
import FoodOpsDocumentVersionHistory from './FoodOpsDocumentVersionHistory';
import FoodOpsDocumentLinkManager from './FoodOpsDocumentLinkManager';

export default function FoodOpsDocumentDetailModal({ show, onHide, documentId, canVerify, onChanged }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!documentId) return;
    setLoading(true);
    try { setDoc(await getFoodOpsDocumentDetail(documentId)); }
    catch { toast.error('Gagal memuat detail dokumen.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (show) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [show, documentId]);

  const handleClassify = async () => {
    setBusy(true);
    try { await classifyFoodOpsDocument(documentId); toast.success('Klasifikasi selesai.'); await load(); await onChanged?.(); }
    catch (error) { toast.error(error?.response?.data?.message || 'Gagal mengklasifikasi dokumen.'); }
    finally { setBusy(false); }
  };
  const handleVerify = async (status) => {
    setBusy(true);
    try { await verifyFoodOpsDocument(documentId, { status_verifikasi: status, lock_version: doc.lock_version }); toast.success('Status verifikasi diperbarui.'); await load(); await onChanged?.(); }
    catch (error) { toast.error(error?.response?.data?.message || 'Gagal memperbarui verifikasi.'); }
    finally { setBusy(false); }
  };
  const handleDownload = async () => {
    try {
      const response = await downloadFoodOpsDocument(documentId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url; link.setAttribute('download', doc.file_name_original); window.document.body.appendChild(link); link.click(); link.remove();
    } catch { toast.error('Gagal mengunduh dokumen.'); }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton><Modal.Title>Detail Dokumen</Modal.Title></Modal.Header>
      <Modal.Body>
        {loading || !doc ? <div className="text-muted">Memuat…</div> : (
          <>
            <Row className="gy-2 mb-3">
              <Col md={12}><strong>{doc.judul}</strong></Col>
              <Col md={4}><span className="text-muted">Class:</span> {DOCUMENT_CLASS_LABEL[doc.document_class]}</Col>
              <Col md={4}><span className="text-muted">Jenis:</span> {DOCUMENT_TYPE_LABEL[doc.document_type] || doc.document_type}</Col>
              <Col md={4}><span className="text-muted">Versi:</span> {doc.versi}</Col>
              <Col md={4}><span className="text-muted">Nomor:</span> {doc.nomor_dokumen || '—'}</Col>
              <Col md={4}><span className="text-muted">Tanggal:</span> {doc.tanggal_dokumen || '—'}</Col>
              <Col md={4}><span className="text-muted">Penerbit:</span> {doc.penerbit || '—'}</Col>
              <Col md={12} className="d-flex gap-2 flex-wrap">
                <Badge bg="secondary">{doc.status}</Badge>
                <Badge bg={doc.status_verifikasi === 'valid' ? 'success' : 'warning'}>{STATUS_VERIFIKASI_LABEL[doc.status_verifikasi]}</Badge>
                {doc.authority_level && <Badge bg="info">{AUTHORITY_LEVEL_LABEL[doc.authority_level]}</Badge>}
                {doc.generated_status && <Badge bg="dark">{doc.generated_status}</Badge>}
              </Col>
            </Row>
            <div className="d-flex gap-2 flex-wrap mb-3">
              <Button size="sm" variant="outline-secondary" onClick={handleDownload}>Unduh Berkas</Button>
              <Button size="sm" variant="outline-primary" disabled={busy} onClick={handleClassify}>Klasifikasi Ulang</Button>
              {canVerify && (
                <>
                  <Button size="sm" variant="outline-success" disabled={busy} onClick={() => handleVerify('valid')}>Tandai Valid</Button>
                  <Button size="sm" variant="outline-danger" disabled={busy} onClick={() => handleVerify('invalid')}>Tandai Tidak Valid</Button>
                </>
              )}
            </div>
            {doc.klasifikasi_meta && (
              <div className="alert alert-light border small mb-3">
                Hasil klasifikasi: <strong>{DOCUMENT_TYPE_LABEL[doc.klasifikasi_meta.document_type] || doc.klasifikasi_meta.document_type}</strong>{' '}
                (confidence {doc.klasifikasi_meta.confidence}{doc.klasifikasi_meta.requires_review ? ', perlu ditinjau' : ''})
              </div>
            )}
            <hr />
            <h6>Riwayat Versi</h6>
            <FoodOpsDocumentVersionHistory documentId={documentId} />
            <hr />
            <h6>Relasi ke Kegiatan/Regulasi/Dokumen Lain</h6>
            <FoodOpsDocumentLinkManager documentId={documentId} />
          </>
        )}
      </Modal.Body>
      <Modal.Footer><Button variant="light" onClick={onHide}>Tutup</Button></Modal.Footer>
    </Modal>
  );
}
