import React, { useEffect, useState } from 'react';
import { Badge, Table } from 'react-bootstrap';
import { getFoodOpsDocumentVersions } from '../services/foodOpsApi';

export default function FoodOpsDocumentVersionHistory({ documentId }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getFoodOpsDocumentVersions(documentId)
      .then((rows) => { if (active) setVersions(rows); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [documentId]);

  if (loading) return <div className="text-muted small">Memuat riwayat versi…</div>;
  if (!versions.length) return <div className="text-muted small">Belum ada riwayat versi.</div>;

  return (
    <Table size="sm" responsive>
      <thead><tr><th>Versi</th><th>Nama Berkas</th><th>Status</th><th>Diunggah</th></tr></thead>
      <tbody>
        {versions.map((v) => (
          <tr key={v.id}>
            <td>{v.versi}</td>
            <td>{v.file_name_original}</td>
            <td><Badge bg={v.status === 'aktif' ? 'success' : v.status === 'digantikan' ? 'secondary' : 'warning'}>{v.status}</Badge></td>
            <td>{new Date(v.created_at).toLocaleString('id-ID')}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
