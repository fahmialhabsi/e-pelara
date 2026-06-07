import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, Table, Button, Modal, Form, Spinner, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../../services/api';
import DashboardLayout from './DashboardLayout';
import Select from 'react-select';

const PerangkatDaerahPage = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nama: '', aktif: true });
  const [busy, setBusy] = useState(false);
  const [opdOptions, setOpdOptions] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/perangkat-daerah');
      setList(res.data?.data || []);
    } catch (e) {
      toast.error('Gagal memuat data OPD.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get('/opd-penanggung-jawab/dropdown')
      .then((r) => {
        const data = r.data?.data || r.data || [];
        setOpdOptions(
          [...new Set(data.map((d) => d.nama_opd).filter(Boolean))].map((n) => ({
            value: n,
            label: n,
          })),
        );
      })
      .catch(() => {});
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ kode: '', nama: '', aktif: true });
    setShow(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ nama: row.nama, aktif: row.aktif });
    setShow(true);
  };

  const handleSubmit = async () => {
    if (!form.nama?.trim()) {
      toast.error('Nama wajib diisi.');
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await api.put(`/perangkat-daerah/${editing.id}`, form);
        toast.success('OPD diperbarui.');
      } else {
        await api.post('/perangkat-daerah', form);
        toast.success('OPD ditambahkan.');
      }
      setShow(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal menyimpan.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus "${row.nama}"?`)) return;
    try {
      await api.delete(`/perangkat-daerah/${row.id}`);
      toast.success('OPD dihapus.');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal menghapus.');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <div>
          <h4 className="fw-bold text-success mb-1">🏢 Manajemen Perangkat Daerah</h4>
          <p className="text-muted small mb-0">
            Kelola daftar OPD yang digunakan dalam dokumen Renja.
          </p>
        </div>
        <Button variant="success" size="sm" onClick={openAdd}>
          + Tambah OPD
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardBody>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <Table responsive hover size="sm">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Nama OPD</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-3">
                      Belum ada data OPD.
                    </td>
                  </tr>
                ) : (
                  list.map((row, i) => (
                    <tr key={row.id}>
                      <td>{i + 1}</td>
                      <td>{row.nama}</td>
                      <td>
                        <Badge bg={row.aktif ? 'success' : 'secondary'}>
                          {row.aktif ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="d-flex gap-1">
                        <Button size="sm" variant="outline-primary" onClick={() => openEdit(row)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDelete(row)}
                        >
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title className="fs-6 fw-bold">
            {editing ? '✏️ Edit OPD' : '🏢 Tambah OPD'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small">
              Nama OPD <span className="text-danger">*</span>
            </Form.Label>
            <Select
              options={opdOptions}
              value={form.nama ? { value: form.nama, label: form.nama } : null}
              onChange={(opt) => setForm((p) => ({ ...p, nama: opt?.value || '' }))}
              placeholder="— Pilih nama OPD —"
              isClearable
            />
          </Form.Group>
          <Form.Group>
            <Form.Check
              type="switch"
              label="Aktif"
              checked={form.aktif}
              onChange={(e) => setForm((p) => ({ ...p, aktif: e.target.checked }))}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button variant="outline-secondary" size="sm" onClick={() => setShow(false)}>
            Batal
          </Button>
          <Button variant="success" size="sm" onClick={handleSubmit} disabled={busy}>
            {busy ? <Spinner size="sm" /> : '💾 Simpan'}
          </Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  );
};

export default PerangkatDaerahPage;
