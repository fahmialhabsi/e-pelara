import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardBody, Button, Table, Form, Modal, Spinner, Badge, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import {
  canManagePlanningWorkflow,
  canRestorePlanningDocumentVersion,
} from '../../../utils/roleUtils';
import PlanningAuditSection from '../../planning-audit/components/PlanningAuditSection';
import {
  fetchRenjaDokumenById,
  fetchRenjaDokumenAudit,
  updateRenjaDokumenV2,
  createRenjaItemV2,
  updateRenjaItemV2,
  fetchRenjaDokumenChangeLog,
  saveRenjaDokumenDocxToFile,
  saveRenjaDokumenPdfToFile,
  saveRenjaOfficialDocxToFile,
  saveRenjaOfficialPdfToFile,
  fetchRenjaValidateOfficial,
  deleteRenjaItemV2,
  linkRenjaItemToRkpd,
} from '../services/planningRenjaApi';
import {
  createRenjaRevision,
  getRenjaReadiness,
  runRenjaWorkflowAction,
} from '../services/renjaGovernanceApi';
import RenjaPlanningDashboardLayout from './RenjaPlanningDashboardLayout';
import RenjaDokumenNavTabs from '../components/RenjaDokumenNavTabs';
import MasterBelanjaCascading from '../../../shared/components/MasterBelanjaCascading';
import MasterRekeningCascading from '../../../shared/components/MasterRekeningCascading';
import RenjaItemModal from '../components/RenjaItemModal';

const emptyItem = {
  program: '',
  kegiatan: '',
  sub_kegiatan: '',
  indikator: '',
  target: '',
  satuan: '',
  pagu: '',
  kode_rekening: '',
  nama_rekening: '',
  rincian_belanja: null,
  urutan: 0,
};

const RenjaDokumenDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const can = canManagePlanningWorkflow(user?.role);

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [officialValidate, setOfficialValidate] = useState(null);
  const [busyValidate, setBusyValidate] = useState(false);
  const [busyGenBab, setBusyGenBab] = useState(false);

  const [judul, setJudul] = useState('');
  const [status, setStatus] = useState('draft');
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaReasonText, setMetaReasonText] = useState('');
  const [metaReasonFile, setMetaReasonFile] = useState('');
  const [auditRows, setAuditRows] = useState([]);

  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [savingItem, setSavingItem] = useState(false);

  const [linkModal, setLinkModal] = useState(false);
  const [linkTarget, setLinkTarget] = useState(null);
  const [rkpdItemId, setRkpdItemId] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [itemReasonText, setItemReasonText] = useState('');
  const [itemReasonFile, setItemReasonFile] = useState('');
  const [linkReasonText, setLinkReasonText] = useState('');
  const [linkReasonFile, setLinkReasonFile] = useState('');

  const [logModal, setLogModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [wfBusy, setWfBusy] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [readiness, setReadiness] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const d = await fetchRenjaDokumenById(id);
      setDoc(d);
      setJudul(d?.judul || '');
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
      const rows = await fetchRenjaDokumenAudit(id);
      setAuditRows(Array.isArray(rows) ? rows : []);
    } catch {
      setAuditRows([]);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadAudit();
  }, [id, loadAudit]);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const data = await getRenjaReadiness(id, { action: 'publish' });
        if (ok) setReadiness(data);
      } catch {
        if (ok) setReadiness(null);
      }
    })();
    return () => {
      ok = false;
    };
  }, [id, doc?.updated_at]);

  const saveMeta = async () => {
    if (!can) return;
    const rt = metaReasonText.trim();
    const rf = metaReasonFile.trim();
    // Catatan perubahan opsional
    setSavingMeta(true);
    try {
      const d = await updateRenjaDokumenV2(id, {
        judul: judul.trim(),
        status,
        change_reason_text: rt || 'Pembaruan metadata dokumen',
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
    setItemModal(true);
  };

  const openEditItem = (row) => {
    setEditingItem(row);
    setItemForm({
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

  const deleteItem = async (row) => {
    if (!window.confirm(`Hapus item "${row.sub_kegiatan || row.program}"?`)) return;
    const reason = window.prompt('Alasan penghapusan (wajib):');
    if (!reason?.trim()) {
      toast.error('Alasan wajib diisi.');
      return;
    }
    try {
      await deleteRenjaItemV2(row.id, {
        change_reason_text: reason.trim(),
        renja_dokumen_id: Number(id),
      });
      toast.success('Item dihapus.');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Gagal menghapus.');
    }
  };

  const saveItem = async () => {
    if (!can) return;
    const rt = itemReasonText.trim();
    const rf = itemReasonFile.trim();
    if (!rt && !rf) {
      toast.error('Isi alasan perubahan item (teks) atau referensi berkas.');
      return;
    }
    setSavingItem(true);
    try {
      const base = {
        urutan: Number(itemForm.urutan) || 0,
        program: itemForm.program || null,
        rkpd_item_id: formData?.rkpd_item_id || null,
        kegiatan: itemForm.kegiatan || null,
        sub_kegiatan: itemForm.sub_kegiatan || null,
        indikator: itemForm.indikator || null,
        target: itemForm.target === '' ? null : Number(itemForm.target),
        satuan: itemForm.satuan || null,
        pagu: itemForm.pagu === '' ? null : Number(itemForm.pagu),
        status_baris: 'draft',
        change_reason_text: rt || undefined,
        change_reason_file: rf || undefined,
        rincian_belanja: itemForm.rincian_belanja || null,
      };
      if (editingItem) {
        await updateRenjaItemV2(editingItem.id, base);
        toast.success('Item Renja diperbarui.');
      } else {
        await createRenjaItemV2({ ...base, renja_dokumen_id: Number(id) });
        toast.success('Item Renja ditambahkan.');
      }
      setItemModal(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Gagal simpan item.');
    } finally {
      setSavingItem(false);
    }
  };

  const openLink = (row) => {
    setLinkTarget(row);
    setRkpdItemId(
      row?.rkpdLink?.rkpd_item_id
        ? String(row.rkpdLink.rkpd_item_id)
        : row?.rkpd_item_id
          ? String(row.rkpd_item_id)
          : '',
    );
    setLinkReasonText(`Mapping otomatis dari RKPD acuan dokumen #${doc?.rkpd_dokumen_id || ''}`);
    setLinkReasonFile('');
    setLinkModal(true);
  };

  const saveLink = async () => {
    if (!linkTarget || !rkpdItemId.trim()) {
      toast.error('Masukkan rkpd_item_id.');
      return;
    }
    const rt = linkReasonText.trim();
    const rf = linkReasonFile.trim();
    if (!rt && !rf) {
      toast.error('Isi alasan mapping (teks) atau referensi berkas.');
      return;
    }
    setLinkBusy(true);
    try {
      await linkRenjaItemToRkpd(linkTarget.id, Number(rkpdItemId), {
        change_reason_text: rt || undefined,
        change_reason_file: rf || undefined,
      });
      toast.success('Mapping RKPD disimpan.');
      setLinkModal(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Gagal mapping.');
    } finally {
      setLinkBusy(false);
    }
  };

  const openLogs = async () => {
    setLogModal(true);
    setLogLoading(true);
    try {
      const rows = await fetchRenjaDokumenChangeLog(id);
      setLogs(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal log.');
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
      const r = await fetchRenjaValidateOfficial(doc.id);
      setOfficialValidate(r);
      if (r.ok) toast.success('Prasyarat ekspor resmi terpenuhi.');
      else toast.warning('Prasyarat ekspor resmi belum terpenuhi — lihat daftar di bawah.');
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Gagal memvalidasi.');
    } finally {
      setBusyValidate(false);
    }
  };

  const autoGenerateBab = async () => {
    if (
      !window.confirm(
        'Generate narasi BAB I, II, III, V secara otomatis? Data yang ada akan ditimpa.',
      )
    )
      return;
    setBusyGenBab(true);
    try {
      await api.post(`/renja/dokumen/${id}/auto-generate-bab`);
      toast.success('Narasi BAB berhasil di-generate. Silakan cek tab BAB I–V.');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal generate BAB.');
    } finally {
      setBusyGenBab(false);
    }
  };

  const items = doc?.items || [];
  const isReadonly = doc?.workflow_status === 'published';

  const runAction = async (action) => {
    setWfBusy(true);
    try {
      await runRenjaWorkflowAction(doc.id, action, {
        change_reason_text: `Workflow action: ${action}`,
      });
      await load();
      await loadAudit();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Gagal update workflow.');
    } finally {
      setWfBusy(false);
    }
  };

  const runCreateRevision = async () => {
    if (!revisionReason.trim()) {
      toast.error('Catatan perubahan atau upload dasar hukum wajib diisi.');
      return;
    }
    setWfBusy(true);
    try {
      const row = await createRenjaRevision(doc.id, {
        revision_type: 'perubahan',
        change_reason: revisionReason.trim(),
        change_reason_text: revisionReason.trim(),
      });
      window.location.href = `/dashboard-renja/v2/dokumen/${row.id}`;
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Gagal membuat revision.');
    } finally {
      setWfBusy(false);
    }
  };

  if (loading) {
    return (
      <RenjaPlanningDashboardLayout>
        <Spinner animation="border" />
      </RenjaPlanningDashboardLayout>
    );
  }

  if (err || !doc) {
    return (
      <RenjaPlanningDashboardLayout>
        <Alert variant="danger">{err || 'Tidak ditemukan.'}</Alert>
        <Link to="/dashboard-renja">← Dashboard</Link>
      </RenjaPlanningDashboardLayout>
    );
  }

  const handleMasterRekeningChange = async ({ program, kegiatan, subKegiatan }) => {
    setItemForm((prev) => ({
      ...prev,
      program: program?.nama_program || prev.program,
      kegiatan: kegiatan?.nama_kegiatan || prev.kegiatan,
      sub_kegiatan: subKegiatan?.nama_sub_kegiatan || prev.sub_kegiatan,
    }));

    if (subKegiatan?.kode_sub_kegiatan_full) {
      try {
        const res = await api.get('/rkpd-dokumen/item', {
          params: { sub_kegiatan: subKegiatan.nama_sub_kegiatan, limit: 1 },
        });

        const item = res.data?.data?.[0];
        if (item) {
          setItemForm((prev) => ({
            ...prev,
            indikator: item.indikator || prev.indikator,
            target: item.target != null ? String(item.target) : prev.target,
            satuan: item.satuan || prev.satuan,
            pagu: item.pagu != null ? String(item.pagu) : prev.pagu,
          }));
        }
      } catch (e) {
        console.error('Auto-fill RKPD gagal:', e);
      }
    }
  };

  return (
    <RenjaPlanningDashboardLayout>
      <Alert variant="info" className="small mb-3">
        <strong>Data internal:</strong> tabel <code>renja_item</code> di bawah.{' '}
        <strong>Preview dokumen:</strong> Word/PDF preview = ringkasan baris (bukan struktur bab
        resmi). <strong>Dokumen resmi:</strong> gunakan tombol hijau/biru — keluaran Document Engine
        (BAB I–V, OOXML/PDF terstruktur). Narasi bab tertentu dapat diisi lewat API (
        <code>text_bab1</code>, <code>text_bab2</code>, <code>text_bab5</code> pada dokumen). Ekspor
        resmi memvalidasi isi (baris, BAB II, Renstra); generate diblokir jika prasyarat tidak
        terpenuhi.
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
          <Link to="/dashboard-renja" className="small">
            ← Dashboard Renja
          </Link>
          <h4 className="fw-bold text-success mb-0 mt-1">Dokumen Renja v2 #{doc.id}</h4>
          <div className="small text-muted">
            Tahun {doc.tahun} · PD {doc.perangkat_daerah_id} · RKPD acuan{' '}
            {doc.rkpd_dokumen_id ? `#${doc.rkpd_dokumen_id}` : '—'}
          </div>
        </div>
        <div className="d-flex flex-column align-items-end gap-2">
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            <span className="small text-muted align-self-center me-1">Preview</span>
            <Button
              variant="outline-success"
              size="sm"
              onClick={() =>
                saveRenjaDokumenDocxToFile(doc.id, doc.judul).catch((e) =>
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
                saveRenjaDokumenPdfToFile(doc.id, doc.judul).catch((e) =>
                  toast.error(e?.message || 'Gagal preview PDF'),
                )
              }
            >
              Preview PDF
            </Button>
          </div>
          <div className="d-flex flex-wrap gap-2 justify-content-end mb-2">
            <Button
              variant="outline-info"
              size="sm"
              disabled={busyGenBab || isReadonly}
              onClick={autoGenerateBab}
            >
              {busyGenBab ? <Spinner size="sm" /> : 'Auto-Generate Narasi BAB'}
            </Button>
          </div>
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            <span className="small text-muted align-self-center me-1">Dokumen resmi</span>
            <Button
              variant="outline-success"
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
                saveRenjaOfficialDocxToFile(doc.id, doc.judul).catch((e) =>
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
                saveRenjaOfficialPdfToFile(doc.id, doc.judul).catch((e) =>
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
      <RenjaDokumenNavTabs id={id} />
      <Card className="mb-3 shadow-sm">
        <CardBody>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {['submit', 'review', 'approve', 'publish'].map((action) => (
              <Button
                key={action}
                size="sm"
                variant="outline-success"
                disabled={
                  wfBusy ||
                  !can ||
                  (action === 'submit' && readiness && !readiness.readiness?.ready_for_submit) ||
                  (action === 'publish' && readiness && !readiness.readiness?.ready_for_publish)
                }
                onClick={() => runAction(action)}
              >
                {action}
              </Button>
            ))}
            <input
              className="form-control form-control-sm"
              placeholder="Alasan create revision"
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              style={{ maxWidth: 280 }}
            />
            <Button
              size="sm"
              variant="warning"
              disabled={wfBusy || !can || !['approved', 'published'].includes(doc?.workflow_status)}
              onClick={runCreateRevision}
            >
              Create Revision
            </Button>
            <Button
              size="sm"
              variant="outline-success"
              as={Link}
              to={`/dashboard-renja/v2/dokumen/${id}/data-fix`}
            >
              Data Fix & Mapping
            </Button>
            <Badge bg={isReadonly ? 'success' : 'secondary'}>
              {isReadonly ? 'Readonly Final' : 'Editable Draft'}
            </Badge>
          </div>
        </CardBody>
      </Card>
      <Card className="mb-3 shadow-sm">
        <CardBody>
          <h6 className="fw-bold mb-1">Readiness Panel</h6>
          <div className="small">
            Siap submit: <b>{readiness?.readiness?.ready_for_submit ? 'Ya' : 'Tidak'}</b> · Siap
            publish: <b>{readiness?.readiness?.ready_for_publish ? 'Ya' : 'Tidak'}</b>
          </div>
          <div className="small text-muted">
            blocker {readiness?.summary?.blocking_count ?? 0} · warning{' '}
            {readiness?.summary?.warning_count ?? 0}
          </div>
          {!!(readiness?.next_actions || []).length && (
            <ul className="small mb-0 mt-1">
              {readiness.next_actions.slice(0, 5).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card className="mb-3 shadow-sm">
        <CardBody>
          <h6 className="fw-bold">Metadata</h6>
          <Form.Group className="mb-2">
            <Form.Label className="small">Judul</Form.Label>
            <Form.Control
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              disabled={!can || isReadonly}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label className="small">Status</Form.Label>
            <Form.Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={!can || isReadonly}
            >
              <option value="draft">draft</option>
              <option value="review">review</option>
              <option value="final">final</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label className="small fw-semibold">Catatan Perubahan</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={metaReasonText}
              onChange={(e) => setMetaReasonText(e.target.value)}
              disabled={!can || isReadonly}
              placeholder="Isi catatan jika ada perubahan pada dokumen"
            />
            <Form.Text className="text-muted">Kosongkan jika tidak ada perubahan.</Form.Text>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label className="small fw-semibold">📎 Upload Dasar Hukum Perubahan</Form.Label>
            <Form.Control
              type="file"
              accept=".pdf,.doc,.docx"
              disabled={!can || isReadonly}
              onChange={(e) => setMetaReasonFile(e.target.files?.[0]?.name || '')}
            />
            {metaReasonFile && (
              <Form.Text className="text-success">File: {metaReasonFile}</Form.Text>
            )}
          </Form.Group>
          {can && (
            <Button size="sm" onClick={saveMeta} disabled={savingMeta || isReadonly}>
              {savingMeta ? <Spinner size="sm" /> : 'Simpan metadata'}
            </Button>
          )}
        </CardBody>
      </Card>

      <div className="mb-3">
        <PlanningAuditSection
          documentType="renja_dokumen"
          documentId={Number(id)}
          auditRows={auditRows}
          auditLoading={false}
          allowRestore={canRestorePlanningDocumentVersion(user?.role)}
          onVersionRestored={() => {
            load();
            loadAudit();
          }}
        />
      </div>

      <Card className="shadow-sm">
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-bold mb-0">Item (renja_item)</h6>
            {can && (
              <Button size="sm" variant="success" onClick={openAddItem}>
                + Item
              </Button>
            )}
          </div>
          <Table striped bordered hover size="sm" responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>Program</th>
                <th>Kegiatan</th>
                <th>Sub</th>
                <th>rkpd_item</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted small">
                    Belum ada item.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.urutan}</td>
                    <td>{row.program}</td>
                    <td>{row.kegiatan}</td>
                    <td>{row.sub_kegiatan}</td>
                    <td>
                      {row.rkpdLink?.rkpd_item_id ? (
                        <Badge bg="info">#{row.rkpdLink.rkpd_item_id}</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">
                          belum
                        </Badge>
                      )}
                    </td>
                    <td>
                      {can && (
                        <>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="me-1"
                            disabled={isReadonly}
                            onClick={() => openEditItem(row)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-warning"
                            disabled={isReadonly}
                            onClick={() => openLink(row)}
                          >
                            Map RKPD
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            className="ms-1"
                            disabled={isReadonly}
                            onClick={() => deleteItem(row)}
                          >
                            Hapus
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
          <p className="small text-muted mb-0">
            Edit manual Renja saat ini <strong>tidak</strong> menulis{' '}
            <code>planning_line_item_change_log</code> — log terisi untuk baris Renja saat{' '}
            <strong>cascade dari RKPD</strong> (bukti di backend update RKPD item).
          </p>
        </CardBody>
      </Card>

      <RenjaItemModal
        show={itemModal}
        onHide={() => setItemModal(false)}
        editData={editingItem ? itemForm : null}
        rkpdDokumenId={doc?.rkpd_dokumen_id}
        urutan={(doc?.items?.length || 0) + 1}
        onSave={async (formData) => {
          if (!can) return;
          const base = {
            urutan: Number(formData.urutan) || 0,
            program: formData.program || null,
            kegiatan: formData.kegiatan || null,
            sub_kegiatan: formData.sub_kegiatan || null,
            indikator: formData.indikator || null,
            target: formData.target === '' ? null : Number(formData.target),
            satuan: formData.satuan || null,
            pagu: formData.pagu === '' ? null : Number(formData.pagu),
            status_baris: 'draft',
            change_reason_text: formData.dasar_hukum || 'Input dari form item Renja',
            rincian_belanja: formData.rincian_belanja || null,
            rkpd_item_id: formData.rkpd_item_id || null,
          };
          if (editingItem) {
            await updateRenjaItemV2(editingItem.id, base);
            toast.success('Item Renja diperbarui.');
          } else {
            await createRenjaItemV2({ ...base, renja_dokumen_id: Number(id) });
            toast.success('Item Renja ditambahkan.');
          }
          setItemModal(false);
          load();
        }}
      />

      <Modal
        show={linkModal}
        onHide={() => setLinkModal(false)}
        style={{ marginTop: '40px', marginBottom: '20px' }}
      >
        <Modal.Header closeButton className="bg-warning">
          <Modal.Title className="fs-6 fw-bold">🔗 Map ke RKPD Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small">RKPD Item ID</Form.Label>
            <Form.Control
              value={rkpdItemId}
              onChange={(e) => setRkpdItemId(e.target.value)}
              placeholder="ID baris rkpd_item"
              readOnly={!!rkpdItemId}
              className={rkpdItemId ? 'bg-light' : ''}
            />
            {rkpdItemId && (
              <Form.Text className="text-success">
                ✅ Auto-fill dari item RKPD yang dipilih
              </Form.Text>
            )}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small">Alasan Mapping</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={linkReasonText}
              onChange={(e) => setLinkReasonText(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label className="fw-semibold small">📎 Upload Berkas Referensi</Form.Label>
            <Form.Control
              type="file"
              onChange={(e) => setLinkReasonFile(e.target.files?.[0]?.name || '')}
            />
            {linkReasonFile && (
              <Form.Text className="text-success">File: {linkReasonFile}</Form.Text>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button variant="outline-secondary" size="sm" onClick={() => setLinkModal(false)}>
            Batal
          </Button>
          <Button variant="warning" size="sm" onClick={saveLink} disabled={linkBusy}>
            {linkBusy ? <Spinner size="sm" /> : '💾 Simpan Mapping'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={logModal} onHide={() => setLogModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Riwayat perubahan (renja_item)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {logLoading ? (
            <Spinner />
          ) : logs.length === 0 ? (
            <div className="text-muted small">
              Kosong — umumnya terisi setelah cascade dari perubahan RKPD, bukan edit manual Renja.
            </div>
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
    </RenjaPlanningDashboardLayout>
  );
};

export default RenjaDokumenDetailPage;
