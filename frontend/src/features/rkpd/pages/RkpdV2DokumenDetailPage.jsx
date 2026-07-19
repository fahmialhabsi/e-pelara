import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardBody, Button, Table, Form, Modal, Spinner, Badge, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  canManagePlanningWorkflow,
  canRestorePlanningDocumentVersion,
} from '../../../utils/roleUtils';
import { useAuth } from '../../../hooks/useAuth';
import PlanningAuditSection from '../../planning-audit/components/PlanningAuditSection';
import {
  fetchRkpdDokumenById,
  fetchRkpdDokumenAudit,
  updateRkpdDokumenV2,
  createRkpdItemV2,
  updateRkpdItemV2,
  fetchRkpdDokumenChangeLog,
  saveRkpdDokumenDocxToFile,
  saveRkpdDokumenPdfToFile,
  saveRkpdOfficialDocxToFile,
  saveRkpdOfficialPdfToFile,
  fetchRkpdValidateOfficial,
} from '../services/planningRkpdV2Api';
import RkpdDashboardLayout from './RkpdDashboardLayout';
import RkpdItemModal from '../components/RkpdItemModal';
import api from '../../../services/api';

const emptyItem = {
  program: '',
  kegiatan: '',
  sub_kegiatan: '',
  indikator: '',
  target: '',
  satuan: '',
  pagu: '',
  urutan: 0,
};

const RkpdV2DokumenDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const can = canManagePlanningWorkflow(user?.role);

  const [doc, setDoc] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [officialValidate, setOfficialValidate] = useState(null);
  const [busyValidate, setBusyValidate] = useState(false);

  const [judul, setJudul] = useState('');
  const [namaOpd, setNamaOpd] = useState('');
  const [textBab2, setTextBab2] = useState('');
  const [status, setStatus] = useState('draft');
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaReasonText, setMetaReasonText] = useState('');
  const [metaReasonFile, setMetaReasonFile] = useState('');
  const [auditRows, setAuditRows] = useState([]);

  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [savingItem, setSavingItem] = useState(false);
  const [itemReasonText, setItemReasonText] = useState('');
  const [itemReasonFile, setItemReasonFile] = useState('');

  const [logModal, setLogModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logLoading, setLogLoading] = useState(false);

  const [step, setStep] = useState(1);
  const [itemSearch, setItemSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const d = await fetchRkpdDokumenById(id);
      setDoc(d);
      setItems(d?.items || []);
      setJudul(d?.judul || '');
      setNamaOpd(d?.nama_opd || '');
      setTextBab2(d?.text_bab2 || '');
      setStatus(d?.status || 'draft');
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || 'Gagal memuat dokumen.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const loadAudit = useCallback(async () => {
    try {
      const rows = await fetchRkpdDokumenAudit(id);
      setAuditRows(Array.isArray(rows) ? rows : []);
    } catch {
      setAuditRows([]);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadAudit();
  }, [id, loadAudit]);

  const saveMeta = async () => {
    if (!can) return;
    const rt = metaReasonText.trim();
    const rf = metaReasonFile.trim();
    if (!rt && !rf) {
      toast.error('Isi alasan perubahan (teks) atau referensi berkas dasar perubahan.');
      return;
    }
    setSavingMeta(true);
    try {
      console.log('TEXT_BAB2 =', textBab2);
      const d = await updateRkpdDokumenV2(id, {
        judul: judul.trim(),
        nama_opd: namaOpd.trim(),
        text_bab2: textBab2.trim() || null,
        status,
        change_reason_text: rt || undefined,
        change_reason_file: rf || undefined,
      });
      setDoc(d);
      toast.success('Dokumen diperbarui.');
      await loadAudit();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Gagal simpan.');
    } finally {
      setSavingMeta(false);
    }
  };

  const openAddItem = () => {
    setEditingItem(null);
    setItemForm({ ...emptyItem, urutan: items.length + 1 });
    setItemReasonText('');
    setItemReasonFile('');
    setItemModal(true);
  };

  const openEditItem = (row) => {
    setEditingItem(row);
    console.log('PRIORITAS DAERAH ROW =', row.prioritas_daerah);
    setItemForm({
      prioritas_daerah: row.prioritas_daerah || '',
      program: row.program || '',
      kegiatan: row.kegiatan || '',
      sub_kegiatan: row.sub_kegiatan || '',
      indikator: row.indikator || '',
      target: row.target != null ? String(row.target) : '',
      satuan: row.satuan || '',
      pagu: row.pagu != null ? String(row.pagu) : '',
      urutan: row.urutan ?? 0,
    });
    setItemReasonText('');
    setItemReasonFile('');
    setItemModal(true);
  };

  const handleDeleteItem = async (row) => {
    if (!window.confirm(`Hapus item "${row.sub_kegiatan || row.id}"?`)) return;
    const reason = window.prompt('Alasan penghapusan (wajib):');
    if (!reason?.trim()) {
      toast.error('Alasan wajib diisi.');
      return;
    }
    try {
      await api.delete(`/rkpd/item/${row.id}`, { data: { change_reason_text: reason.trim() } });
      toast.success('Item dihapus.');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal hapus item.');
    }
  };

  const saveItem = async () => {
    if (!can) return;
    const rt = itemReasonText.trim();
    const rf = itemReasonFile.trim();
    if (editingItem && !rt && !rf) {
      toast.error('Isi alasan perubahan item (teks) atau referensi berkas.');
      return;
    }
    setSavingItem(true);
    try {
      const base = {
        urutan: Number(itemForm.urutan) || 0,
        program: itemForm.program || null,
        kegiatan: itemForm.kegiatan || null,
        sub_kegiatan: itemForm.sub_kegiatan || null,
        indikator: itemForm.indikator || null,
        target: itemForm.target === '' ? null : Number(itemForm.target),
        satuan: itemForm.satuan || null,
        pagu: itemForm.pagu === '' ? null : Number(itemForm.pagu),
        status_baris: 'draft',
        change_reason_text: rt || undefined,
        change_reason_file: rf || undefined,
      };
      if (editingItem) {
        await updateRkpdItemV2(editingItem.id, base);
        toast.success(
          'Item diperbarui — perubahan tercatat & cascade ke Renja (jika ada mapping).',
        );
      } else {
        await createRkpdItemV2({
          ...base,
          rkpd_dokumen_id: Number(id),
        });
        toast.success('Item ditambahkan.');
      }
      setItemModal(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Gagal simpan item.');
    } finally {
      setSavingItem(false);
    }
  };

  const openLogs = async () => {
    setLogModal(true);
    setLogLoading(true);
    try {
      const rows = await fetchRkpdDokumenChangeLog(id);
      setLogs(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal memuat log.');
      setLogs([]);
    } finally {
      setLogLoading(false);
    }
  };

  const runOfficialValidate = async () => {
    if (!doc?.id) return;
    setBusyValidate(true);
    setOfficialValidate(null);
    try {
      const r = await fetchRkpdValidateOfficial(doc.id);
      setOfficialValidate(r);
      if (r.ok) toast.success('Prasyarat ekspor resmi terpenuhi.');
      else toast.warning('Prasyarat ekspor resmi belum terpenuhi — lihat daftar di bawah.');
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Gagal memvalidasi.');
    } finally {
      setBusyValidate(false);
    }
  };

  if (loading) {
    return (
      <RkpdDashboardLayout>
        <Spinner animation="border" />
      </RkpdDashboardLayout>
    );
  }

  if (err || !doc) {
    return (
      <RkpdDashboardLayout>
        <Alert variant="danger">{err || 'Tidak ditemukan.'}</Alert>
        <Link to="/dashboard-rkpd">← Dashboard</Link>
      </RkpdDashboardLayout>
    );
  }

  return (
    <RkpdDashboardLayout>
      <Alert variant="info" className="small mb-3">
        <strong>Preview</strong> Word/PDF = ringkasan baris <code>rkpd_item</code> (data internal).{' '}
        <strong>Dokumen resmi</strong> = struktur BAB (Document Engine). Isi <code>text_bab2</code>{' '}
        (BAB II) dan <code>prioritas_daerah</code> per baris wajib untuk ekspor resmi — generate
        diblokir jika tidak lengkap.
      </Alert>
      {officialValidate && (
        <Alert variant={officialValidate.ok ? 'success' : 'warning'} className="small mb-3">
          <strong>{officialValidate.ok ? 'Siap ekspor resmi.' : 'Belum siap ekspor resmi.'}</strong>
          <ul className="mb-0 mt-2">
            {(officialValidate.errors || []).map((e) => (
              <li key={e.code}>{e.message}</li>
            ))}
          </ul>
        </Alert>
      )}
      <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
        <div>
          <Link to="/dashboard-rkpd" className="small">
            ← Dashboard RKPD
          </Link>
          <h4 className="fw-bold text-primary mb-0 mt-1">Dokumen RKPD v2 #{doc.id}</h4>
          <div className="small text-muted">
            Tahun {doc.tahun} · periode_id {doc.periode_id}
          </div>
        </div>
        <div className="d-flex flex-column align-items-end gap-2">
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            <span className="small text-muted align-self-center me-1">Preview</span>
            <Button
              variant="outline-success"
              size="sm"
              onClick={() =>
                saveRkpdDokumenDocxToFile(doc.id, doc.judul).catch((e) =>
                  toast.error(e?.message || 'Gagal preview Word'),
                )
              }
            >
              Preview Word
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() =>
                saveRkpdDokumenPdfToFile(doc.id, doc.judul).catch((e) =>
                  toast.error(e?.message || 'Gagal preview PDF'),
                )
              }
            >
              Preview PDF
            </Button>
          </div>
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            <span className="small text-muted align-self-center me-1">Dokumen resmi</span>
            <Button
              variant="outline-primary"
              size="sm"
              disabled={busyValidate}
              onClick={runOfficialValidate}
            >
              {busyValidate ? 'Memeriksa…' : 'Cek prasyarat ekspor'}
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={() =>
                saveRkpdOfficialDocxToFile(doc.id, doc.judul).catch((e) =>
                  toast.error(e?.message || 'Gagal dokumen resmi Word'),
                )
              }
            >
              Dokumen resmi (Word)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                saveRkpdOfficialPdfToFile(doc.id, doc.judul).catch((e) =>
                  toast.error(e?.message || 'Gagal dokumen resmi PDF'),
                )
              }
            >
              Dokumen resmi (PDF)
            </Button>
          </div>
          <Button variant="outline-secondary" size="sm" onClick={openLogs}>
            Lihat perubahan
          </Button>
        </div>
      </div>

      <div className="d-flex align-items-center justify-content-between mb-3 p-2 bg-light border rounded">
        <div className="d-flex gap-2">
          {[
            { n: 1, label: 'Metadata' },
            { n: 2, label: 'Item Baris' },
            { n: 3, label: 'Review & Ekspor' },
          ].map((s) => (
            <Button
              key={s.n}
              size="sm"
              variant={step === s.n ? 'primary' : 'outline-secondary'}
              onClick={() => setStep(s.n)}
            >
              {s.n}. {s.label}
            </Button>
          ))}
        </div>
        <div className="d-flex gap-2">
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={step === 1}
            onClick={() => setStep((v) => Math.max(1, v - 1))}
          >
            ← Sebelumnya
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={step === 3}
            onClick={() => setStep((v) => Math.min(3, v + 1))}
          >
            Selanjutnya →
          </Button>
        </div>
      </div>

      {step === 1 && (
        <Card className="mb-3 shadow-sm">
          <CardBody>
            <h6 className="fw-bold">Metadata</h6>
            <Form.Group className="mb-2">
              <Form.Label className="small">Judul</Form.Label>
              <Form.Control
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                disabled={!can}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label className="small">Nama OPD</Form.Label>
              <Form.Control
                value={namaOpd}
                onChange={(e) => setNamaOpd(e.target.value)}
                disabled={!can}
                placeholder="Dinas Pangan …"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label className="small">
                BAB II — Analisis Kondisi <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={textBab2}
                onChange={(e) => setTextBab2(e.target.value)}
                disabled={!can}
                placeholder="Narasi analisis kondisi daerah minimal 20 karakter..."
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label className="small">Status</Form.Label>
              <Form.Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={!can}
              >
                <option value="draft">draft</option>
                <option value="review">review</option>
                <option value="final">final</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label className="small">Alasan perubahan (wajib salah satu)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={metaReasonText}
                onChange={(e) => setMetaReasonText(e.target.value)}
                disabled={!can}
                placeholder="Ringkasan alasan"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label className="small">Referensi berkas</Form.Label>
              <Form.Control
                value={metaReasonFile}
                onChange={(e) => setMetaReasonFile(e.target.value)}
                disabled={!can}
                placeholder="path / URL / nama berkas"
              />
            </Form.Group>
            {can && (
              <Button size="sm" onClick={saveMeta} disabled={savingMeta}>
                {savingMeta ? <Spinner size="sm" /> : 'Simpan metadata'}
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      {step === 2 && (
        <Card className="shadow-sm mb-3">
          <CardBody>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="fw-bold mb-0">Item baris (rkpd_item)</h6>
              {can && (
                <Button size="sm" variant="primary" onClick={openAddItem}>
                  + Tambah item
                </Button>
              )}
            </div>
            <Form.Control
              className="mb-2"
              size="sm"
              placeholder="Cari program / kegiatan / sub kegiatan..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
            />
            <div className="table-responsive">
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Program</th>
                    <th>Kegiatan</th>
                    <th>Sub</th>
                    <th>Pagu</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const q = itemSearch.trim().toLowerCase();
                    const filteredItems = q
                      ? items.filter((row) =>
                          [row.program, row.kegiatan, row.sub_kegiatan]
                            .filter(Boolean)
                            .some((v) => String(v).toLowerCase().includes(q)),
                        )
                      : items;

                    if (filteredItems.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="text-muted small">
                            {items.length === 0
                              ? 'Belum ada item. Tambah minimal satu untuk validasi final.'
                              : 'Tidak ada item yang cocok dengan pencarian.'}
                          </td>
                        </tr>
                      );
                    }

                    return filteredItems.map((row) => (
                      <tr key={row.id}>
                        <td>{row.urutan}</td>
                        <td>{row.program}</td>
                        <td>{row.kegiatan}</td>
                        <td>{row.sub_kegiatan}</td>
                        <td>{row.pagu}</td>
                        <td>
                          {can && (
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => openEditItem(row)}
                            >
                              Edit
                            </Button>
                          )}
                          {can && (
                            <Button
                              size="sm"
                              variant="outline-danger"
                              className="ms-1"
                              onClick={() => handleDeleteItem(row)}
                            >
                              Hapus
                            </Button>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </Table>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 3 && (
        <>
          <Card className="mb-3 shadow-sm">
            <CardBody>
              <h6 className="fw-bold">Ringkasan Dokumen</h6>
              <ul className="small mb-0">
                <li>Judul: {doc.judul}</li>
                <li>Nama OPD: {doc.nama_opd || '-'}</li>
                <li>Status: {doc.status}</li>
                <li>Jumlah item baris: {items.length}</li>
              </ul>
              <div className="small text-muted mt-2">
                Gunakan tombol "Cek prasyarat ekspor" dan "Dokumen resmi" di bagian atas halaman
                untuk memvalidasi dan mengekspor dokumen ini.
              </div>
            </CardBody>
          </Card>

          <div className="mb-3">
            <PlanningAuditSection
              documentType="rkpd_dokumen"
              documentId={Number(id)}
              auditRows={auditRows}
              auditLoading={false}
              allowRestore={canRestorePlanningDocumentVersion(user?.role)}
              onVersionRestored={() => {
                load();
                loadAudit();
              }}
              defaultExpanded={false}
            />
          </div>
        </>
      )}

      <RkpdItemModal
        show={itemModal}
        onHide={() => setItemModal(false)}
        doc={doc}
        editingItem={editingItem}
        onSaved={async (form, reasonText, reasonFile) => {
          if (editingItem && !reasonText?.trim() && !reasonFile?.trim()) {
            toast.error('Isi alasan perubahan item (teks) atau referensi berkas.');
            return;
          }
          setSavingItem(true);
          try {
            const base = {
              urutan: Number(form.urutan) || 0,
              prioritas_daerah: form.prioritas_daerah || null,
              program: form.program || null,
              kegiatan: form.kegiatan || null,
              sub_kegiatan: form.sub_kegiatan || null,
              indikator: form.indikator || null,
              target:
                !form.target || String(form.target).trim() === ''
                  ? null
                  : Number(String(form.target).trim().replace(',', '.')),
              satuan: form.satuan || null,
              pagu: form.pagu === '' ? null : Number(form.pagu),
              status_baris: 'draft',
              change_reason_text: reasonText?.trim() || undefined,
              change_reason_file: reasonFile?.trim() || undefined,
            };
            if (editingItem) {
              await updateRkpdItemV2(editingItem.id, base);
              toast.success('Item diperbarui.');
            } else {
              await createRkpdItemV2({ ...base, rkpd_dokumen_id: Number(id) });
              toast.success('Item ditambahkan.');
            }
            setItemModal(false);
            load();
          } catch (e) {
            toast.error(e?.response?.data?.message || e.message || 'Gagal simpan item.');
          } finally {
            setSavingItem(false);
          }
        }}
        saving={savingItem}
      />

      <Modal show={logModal} onHide={() => setLogModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Riwayat perubahan (rkpd_item)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {logLoading ? (
            <Spinner />
          ) : logs.length === 0 ? (
            <div className="text-muted small">Belum ada entri log untuk dokumen ini.</div>
          ) : (
            <Table size="sm" striped bordered>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Item</th>
                  <th>Field</th>
                  <th>Lama</th>
                  <th>Baru</th>
                  <th>Tipe</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((L) => (
                  <tr key={L.id}>
                    <td className="text-nowrap small">{L.created_at || '—'}</td>
                    <td>{L.entity_id}</td>
                    <td>{L.field_key}</td>
                    <td className="small">{String(L.old_value ?? '').slice(0, 80)}</td>
                    <td className="small">{String(L.new_value ?? '').slice(0, 80)}</td>
                    <td>
                      <Badge bg="secondary">{L.change_type || L.source}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>
    </RkpdDashboardLayout>
  );
};

export default RkpdV2DokumenDetailPage;
