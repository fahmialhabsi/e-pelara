import React, { useEffect, useState } from 'react';
import { Badge, Button, Col, Form, Row, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { createFoodOpsDocumentLink, deleteFoodOpsDocumentLink, getFoodOpsDocumentLinks } from '../services/foodOpsApi';
import { LINK_ENTITY_TYPE_LABEL } from '../services/foodOpsConstants';

// Evidence & Operasi Pangan — Phase 0 (mandat §13/§14/§45). Phase 0 hanya
// mendukung entity_type EVENT/REGULATION/DOCUMENT sbg target link tervalidasi
// backend (GENERIC_REFERENCE ditolak backend — lihat foodOpsDocumentLinkService.js).
const LINKABLE_TYPES = ['EVENT', 'REGULATION', 'DOCUMENT'];

/**
 * Dua mode pemakaian (mandat §45/§51):
 * - `documentId` diisi -> tampilkan seluruh relasi MILIK dokumen ini, + form
 *   "+ Tautkan" utk membuat relasi baru dari sisi dokumen (dipakai di
 *   FoodOpsDocumentDetailModal).
 * - `entityType`+`entityId` diisi (documentId kosong) -> tampilkan relasi
 *   MENUJU entitas ini secara read-only (dipakai di FoodOpsEventListPage,
 *   `canManage` otomatis false krn pembuatan relasi selalu dari sisi dokumen).
 */
export default function FoodOpsDocumentLinkManager({ documentId = null, entityType: fixedEntityType = null, entityId: fixedEntityId = null, canManage = true }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('EVENT');
  const [entityId, setEntityId] = useState('');
  const [relationType, setRelationType] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const query = documentId ? { document_id: documentId } : { entity_type: fixedEntityType, entity_id: fixedEntityId };
      setLinks(await getFoodOpsDocumentLinks(query));
    } catch { toast.error('Gagal memuat relasi dokumen.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [documentId, fixedEntityType, fixedEntityId]);

  const handleLink = async (e) => {
    e.preventDefault();
    if (!entityId) { toast.error('ID entitas tujuan wajib diisi.'); return; }
    setSaving(true);
    try {
      await createFoodOpsDocumentLink({ document_id: documentId, entity_type: entityType, entity_id: Number(entityId), relation_type: relationType || null });
      toast.success('Relasi berhasil dibuat.');
      setEntityId(''); setRelationType('');
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Gagal membuat relasi.');
    } finally { setSaving(false); }
  };

  const handleUnlink = async (id) => {
    if (!window.confirm('Hapus relasi ini?')) return;
    try { await deleteFoodOpsDocumentLink(id); toast.success('Relasi dihapus.'); await load(); }
    catch (error) { toast.error(error?.response?.data?.message || 'Gagal menghapus relasi.'); }
  };

  return (
    <div>
      {loading ? <div className="text-muted small">Memuat…</div> : links.length ? (
        <Table size="sm" responsive className="mb-2">
          <thead><tr><th>Tipe Entitas</th><th>ID Entitas</th><th>Relasi</th><th>Ditautkan</th>{canManage && <th />}</tr></thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id}>
                <td><Badge bg="info">{LINK_ENTITY_TYPE_LABEL[l.entity_type] || l.entity_type}</Badge></td>
                <td>{l.entity_id}</td>
                <td>{l.relation_type || '—'}</td>
                <td>{new Date(l.linked_at).toLocaleDateString('id-ID')}</td>
                {canManage && <td><Button size="sm" variant="outline-danger" onClick={() => handleUnlink(l.id)}>Lepas</Button></td>}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : <div className="text-muted small mb-2">Belum ada relasi.</div>}

      {canManage && (
        <Form onSubmit={handleLink}>
          <Row className="g-2 align-items-end">
            <Col md={3}><Form.Label className="small">Tipe Entitas</Form.Label>
              <Form.Select size="sm" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                {LINKABLE_TYPES.map((t) => <option key={t} value={t}>{LINK_ENTITY_TYPE_LABEL[t]}</option>)}
              </Form.Select>
            </Col>
            <Col md={3}><Form.Label className="small">ID Entitas</Form.Label><Form.Control size="sm" type="number" value={entityId} onChange={(e) => setEntityId(e.target.value)} /></Col>
            <Col md={4}><Form.Label className="small">Relasi (opsional)</Form.Label><Form.Control size="sm" value={relationType} onChange={(e) => setRelationType(e.target.value)} placeholder="mis. EVIDENCE" /></Col>
            <Col md={2}><Button size="sm" type="submit" disabled={saving}>{saving ? 'Menautkan…' : '+ Tautkan'}</Button></Col>
          </Row>
        </Form>
      )}
    </div>
  );
}
