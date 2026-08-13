import React, { useEffect, useState } from 'react';
import { Badge, Button, Table } from 'react-bootstrap';
import { getFoodOpsDocumentVersions } from '../services/foodOpsApi';
import FoodOpsNewVersionModal from './FoodOpsNewVersionModal';

/** CORRECTIVE MANDATE UAT-01C — versi TERKINI = versi bernomor tertinggi di lineage (murni derivasi tampilan, bukan otoritas — backend yang menentukan status sesungguhnya). */
export function findLatestVersion(versions) {
  if (!versions.length) return null;
  return versions.reduce((latest, v) => (v.versi > latest.versi ? v : latest), versions[0]);
}

export default function FoodOpsDocumentVersionHistory({ documentId, canManage = false, onVersionCreated }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewVersion, setShowNewVersion] = useState(false);

  const load = () => {
    setLoading(true);
    return getFoodOpsDocumentVersions(documentId)
      .then((rows) => setVersions(rows))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [documentId]);

  const latest = findLatestVersion(versions);

  const handleCreated = async () => {
    await load();
    const fresh = await getFoodOpsDocumentVersions(documentId);
    const freshLatest = findLatestVersion(fresh);
    if (freshLatest) onVersionCreated?.(freshLatest);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="text-muted small">{loading ? '' : `${versions.length} versi`}</span>
        {canManage && latest && (
          <Button size="sm" variant="outline-primary" onClick={() => setShowNewVersion(true)}>+ Buat Versi Baru</Button>
        )}
      </div>
      {loading ? <div className="text-muted small">Memuat riwayat versi…</div> : !versions.length ? (
        <div className="text-muted small">Belum ada riwayat versi.</div>
      ) : (
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
      )}
      <FoodOpsNewVersionModal show={showNewVersion} onHide={() => setShowNewVersion(false)} document={latest} onCreated={handleCreated} />
    </div>
  );
}
