import React, { useEffect, useState } from 'react';
import { Badge, Button, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { getFoodOpsEvents } from '../services/foodOpsApi';
import { EVENT_TYPE_LABEL, STATUS_TINDAK_LANJUT_LABEL } from '../services/foodOpsConstants';
import FoodOpsEventForm from '../components/FoodOpsEventForm';
import FoodOpsDocumentLinkManager from '../components/FoodOpsDocumentLinkManager';

export default function FoodOpsEventListPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setEvents(await getFoodOpsEvents()); }
    catch { toast.error('Gagal memuat daftar kegiatan.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (row) => { setEditing(row); setShowForm(true); };

  return (
    <div className="p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Kegiatan</h4>
        <Button onClick={openCreate}>+ Tambah Kegiatan</Button>
      </div>

      {loading ? <div className="text-muted">Memuat…</div> : events.length ? (
        <Table responsive size="sm" className="align-middle">
          <thead>
            <tr><th>Jenis</th><th>Tanggal</th><th>Nama Kegiatan</th><th>Lokasi</th><th>Pimpinan</th><th>Status Tindak Lanjut</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <React.Fragment key={ev.id}>
                <tr>
                  <td>{EVENT_TYPE_LABEL[ev.event_type] || ev.event_type}</td>
                  <td>{ev.tanggal_mulai}</td>
                  <td>{ev.nama_kegiatan}</td>
                  <td>{ev.lokasi || '—'}</td>
                  <td>{ev.pimpinan || '—'}</td>
                  <td><Badge bg={ev.status_tindak_lanjut === 'selesai' ? 'success' : 'secondary'}>{STATUS_TINDAK_LANJUT_LABEL[ev.status_tindak_lanjut]}</Badge></td>
                  <td className="text-nowrap">
                    <Button size="sm" variant="outline-primary" className="me-1" onClick={() => openEdit(ev)}>Ubah</Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}>
                      {expandedId === ev.id ? 'Tutup Evidence' : 'Evidence'}
                    </Button>
                  </td>
                </tr>
                {expandedId === ev.id && (
                  <tr><td colSpan={7}><div className="p-2 bg-light rounded"><FoodOpsDocumentLinkManager documentId={null} entityType="EVENT" entityId={ev.id} canManage={false} /><div className="small text-muted">Tautkan dokumen ke kegiatan ini dari menu Dokumen &amp; Evidence (pilih Tipe Entitas: Kegiatan, ID Entitas: {ev.id}).</div></div></td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </Table>
      ) : <div className="text-muted">Belum ada kegiatan.</div>}

      <FoodOpsEventForm show={showForm} onHide={() => setShowForm(false)} editing={editing} onSaved={load} />
    </div>
  );
}
