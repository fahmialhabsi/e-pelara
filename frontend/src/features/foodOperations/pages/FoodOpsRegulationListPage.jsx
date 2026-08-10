import React, { useEffect, useState } from 'react';
import { Badge, Button, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { getFoodOpsRegulations } from '../services/foodOpsApi';
import { JENIS_PRODUK_HUKUM_LABEL, STATUS_VERIFIKASI_LABEL } from '../services/foodOpsConstants';
import FoodOpsRegulationForm from '../components/FoodOpsRegulationForm';

export default function FoodOpsRegulationListPage() {
  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setRegulations(await getFoodOpsRegulations()); }
    catch { toast.error('Gagal memuat daftar regulasi.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (row) => { setEditing(row); setShowForm(true); };

  return (
    <div className="p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Daftar Regulasi</h4>
        <Button onClick={openCreate}>+ Tambah Regulasi</Button>
      </div>

      {loading ? <div className="text-muted">Memuat…</div> : regulations.length ? (
        <Table responsive size="sm" className="align-middle">
          <thead>
            <tr>
              <th>Jenis Produk Hukum</th><th>Nomor</th><th>Tahun</th><th>Judul</th><th>Penerbit</th>
              <th>Tanggal Berlaku</th><th>Status Berlaku</th><th>Versi Dokumen</th><th>Verifikasi</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {regulations.map((r) => (
              <tr key={r.id}>
                <td>{JENIS_PRODUK_HUKUM_LABEL[r.jenis_produk_hukum]}</td>
                <td>{r.nomor || '—'}</td>
                <td>{r.tahun || '—'}</td>
                <td>{r.judul_resmi || r.document?.judul}</td>
                <td>{r.instansi_penerbit || '—'}</td>
                <td>{r.tanggal_berlaku || '—'}</td>
                <td><Badge bg={r.status_berlaku === 'berlaku' ? 'success' : r.status_berlaku === 'dicabut' ? 'danger' : 'warning'}>{r.status_berlaku}</Badge></td>
                <td>{r.document?.versi ?? '—'}</td>
                <td><Badge bg={r.document?.status_verifikasi === 'valid' ? 'success' : 'warning'}>{STATUS_VERIFIKASI_LABEL[r.document?.status_verifikasi] || '—'}</Badge></td>
                <td><Button size="sm" variant="outline-primary" onClick={() => openEdit(r)}>Ubah</Button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : <div className="text-muted">Belum ada regulasi terdaftar.</div>}

      <FoodOpsRegulationForm show={showForm} onHide={() => setShowForm(false)} editing={editing} onSaved={load} />
    </div>
  );
}
