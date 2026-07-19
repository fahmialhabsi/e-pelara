import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import api from '../../../services/api';

const emptyForm = {
  program: '',
  kegiatan: '',
  sub_kegiatan: '',
  indikator: '',
  target: '',
  satuan: '',
  pagu: '',
  urutan: 1,
  mode: 'rkpd',
  dasar_hukum: '',
};

const RenjaItemModal = ({ show, onHide, onSave, editData, rkpdDokumenId, urutan = 1 }) => {
  const [form, setForm] = useState({ ...emptyForm, urutan });
  const [mode, setMode] = useState('rkpd'); // 'rkpd' | 'tambahan'
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // RKPD items
  const [rkpdItems, setRkpdItems] = useState([]);
  const [loadingRkpd, setLoadingRkpd] = useState(false);
  const [selectedRkpdItem, setSelectedRkpdItem] = useState(null);

  // Cascading
  const programs = useMemo(
    () => [...new Set(rkpdItems.map((i) => i.program).filter(Boolean))],
    [rkpdItems],
  );
  const kegiatanList = useMemo(() => {
    if (!form.program) return [];
    return [
      ...new Set(
        rkpdItems
          .filter((i) => i.program === form.program)
          .map((i) => i.kegiatan)
          .filter(Boolean),
      ),
    ];
  }, [rkpdItems, form.program]);
  const subKegiatanList = useMemo(() => {
    if (!form.kegiatan) return [];
    return rkpdItems.filter((i) => i.program === form.program && i.kegiatan === form.kegiatan);
  }, [rkpdItems, form.program, form.kegiatan]);

  // Load RKPD items
  useEffect(() => {
    if (!show || !rkpdDokumenId) return;
    setLoadingRkpd(true);
    api
      .get('/rkpd/item', { params: { rkpd_dokumen_id: rkpdDokumenId } })
      .then((r) => setRkpdItems(r.data?.data || r.data?.rows || []))
      .catch(() => setRkpdItems([]))
      .finally(() => setLoadingRkpd(false));
  }, [show, rkpdDokumenId]);

  // Auto-select sub kegiatan jika hanya 1 item
  useEffect(() => {
    if (subKegiatanList.length === 1 && !selectedRkpdItem) {
      handlePilihSubKegiatan(subKegiatanList[0]);
    }
  }, [subKegiatanList]);

  // Reset saat buka
  useEffect(() => {
    if (!show) return;
    if (editData) {
      setForm({ ...emptyForm, ...editData });
      setMode('tambahan'); // edit selalu manual
    } else {
      setForm({ ...emptyForm, urutan });
      setMode(rkpdDokumenId ? 'rkpd' : 'tambahan');
      setSelectedRkpdItem(null);
    }
    setErr('');
  }, [show, editData, urutan, rkpdDokumenId]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Pilih sub kegiatan dari RKPD
  const handlePilihSubKegiatan = (item) => {
    console.log('RKPD item dipilih:', item);
    setSelectedRkpdItem(item);
    setForm((p) => ({
      ...p,
      program: item.program || '',
      kegiatan: item.kegiatan || '',
      sub_kegiatan: item.sub_kegiatan || '',
      indikator: item.indikator || '',
      target: item.target != null ? String(item.target) : '',
      satuan: item.satuan || '',
      pagu: item.pagu != null ? String(item.pagu) : '',
    }));
  };

  const handleSubmit = async () => {
    setErr('');
    if (!form.program?.trim()) {
      setErr('Program wajib diisi.');
      return;
    }
    if (!form.kegiatan?.trim()) {
      setErr('Kegiatan wajib diisi.');
      return;
    }
    if (!form.sub_kegiatan?.trim()) {
      setErr('Sub Kegiatan wajib diisi.');
      return;
    }
    if (!form.indikator?.trim()) {
      setErr('Indikator wajib diisi.');
      return;
    }
    if (mode === 'rkpd') {
      if (!form.target || form.target === '') {
        setErr('Target kosong — harap lengkapi data di Modul RKPD terlebih dahulu.');
        return;
      }
      if (!form.satuan?.trim()) {
        setErr('Satuan kosong — harap lengkapi data di Modul RKPD terlebih dahulu.');
        return;
      }
      if (!form.pagu || form.pagu === '' || Number(form.pagu) === 0) {
        setErr('Pagu Anggaran kosong — harap lengkapi data di Modul RKPD terlebih dahulu.');
        return;
      }
    }
    if (mode === 'tambahan' && !form.dasar_hukum?.trim()) {
      setErr('Dasar hukum wajib diisi untuk item di luar RKPD.');
      return;
    }
    setBusy(true);
    try {
      await onSave({ ...form, mode, rkpd_item_id: selectedRkpdItem?.id || null });
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || 'Gagal menyimpan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      scrollable
      dialogClassName="modal-dialog-scrollable"
      style={{ marginTop: '40px', marginBottom: '20px' }}
    >
      <Modal.Header closeButton className="bg-success text-white">
        <Modal.Title className="fs-6 fw-bold">
          {editData ? '✏️ Edit Item Renja' : '➕ Tambah Item Renja'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Nomor Urut */}
        <div className="row mb-3">
          <div className="col-md-3">
            <Form.Label className="fw-semibold small">Nomor Urut</Form.Label>
            <Form.Control
              size="sm"
              type="number"
              value={form.urutan}
              onChange={(e) => set('urutan', e.target.value)}
            />
          </div>
          {rkpdDokumenId && !editData && (
            <div className="col-md-9 d-flex align-items-end gap-2">
              <Button
                size="sm"
                variant={mode === 'rkpd' ? 'success' : 'outline-success'}
                onClick={() => {
                  setMode('rkpd');
                  setSelectedRkpdItem(null);
                  setForm((p) => ({ ...p, program: '', kegiatan: '', sub_kegiatan: '' }));
                }}
              >
                📋 Dari RKPD
              </Button>
              <Button
                size="sm"
                variant={mode === 'tambahan' ? 'warning' : 'outline-warning'}
                onClick={() => setMode('tambahan')}
              >
                ➕ Item Tambahan
              </Button>
              <small className="text-muted">
                {mode === 'rkpd'
                  ? 'Pilih dari daftar item RKPD'
                  : 'Input manual — wajib dasar hukum'}
              </small>
            </div>
          )}
        </div>

        <hr className="my-2" />

        {/* MODE RKPD */}
        {mode === 'rkpd' && (
          <div>
            <p className="small fw-semibold text-success mb-2">📋 Pilih dari Item RKPD Acuan</p>
            {loadingRkpd ? (
              <div className="text-center py-3">
                <Spinner size="sm" />
              </div>
            ) : (
              <>
                {/* Step Program */}
                <Form.Group className="mb-2">
                  <Form.Label className="small fw-semibold">1. Program</Form.Label>
                  <Form.Select
                    size="sm"
                    value={form.program}
                    onChange={(e) => {
                      set('program', e.target.value);
                      set('kegiatan', '');
                      set('sub_kegiatan', '');
                      setSelectedRkpdItem(null);
                    }}
                  >
                    <option value="">— Pilih Program —</option>
                    {programs.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {/* Step Kegiatan */}
                <Form.Group className="mb-2">
                  <Form.Label className="small fw-semibold">2. Kegiatan</Form.Label>
                  <Form.Select
                    size="sm"
                    value={form.kegiatan}
                    onChange={(e) => {
                      set('kegiatan', e.target.value);
                      set('sub_kegiatan', '');
                      setSelectedRkpdItem(null);
                    }}
                    disabled={!form.program}
                  >
                    <option value="">— Pilih Kegiatan —</option>
                    {kegiatanList.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {/* Step Sub Kegiatan */}
                {form.kegiatan && (
                  <Form.Group className="mb-3">
                    <Form.Text className="text-muted d-block mb-1">
                      👆 Klik sub kegiatan untuk memilih dan auto-isi form
                    </Form.Text>
                    <Form.Label className="small fw-semibold">3. Sub Kegiatan</Form.Label>
                    <div
                      className="border rounded p-2"
                      style={{ maxHeight: 180, overflowY: 'auto' }}
                    >
                      {subKegiatanList.length === 0 ? (
                        <small className="text-muted">Tidak ada sub kegiatan.</small>
                      ) : (
                        subKegiatanList.map((item) => (
                          <div
                            key={item.id}
                            className={`p-2 rounded mb-1 cursor-pointer ${selectedRkpdItem?.id === item.id ? 'bg-success text-white' : 'bg-light'}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handlePilihSubKegiatan(item)}
                          >
                            <div className="small fw-semibold">{item.sub_kegiatan}</div>
                            <div className="d-flex gap-3 mt-1" style={{ fontSize: '0.75rem' }}>
                              <span>
                                Indikator: {item.indikator_kinerja || item.indikator || '—'}
                              </span>
                              <span>Pagu: Rp {Number(item.pagu || 0).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Form.Group>
                )}

                {/* Preview terpilih */}
                {selectedRkpdItem && (
                  <Alert variant="success" className="py-2 small">
                    ✅ Terpilih: <strong>{selectedRkpdItem.sub_kegiatan}</strong>
                    <br />
                    Indikator: {form.indikator} · Target: {form.target} {form.satuan} · Pagu: Rp{' '}
                    {Number(form.pagu || 0).toLocaleString('id-ID')}
                  </Alert>
                )}
              </>
            )}
          </div>
        )}

        {/* MODE TAMBAHAN */}
        {mode === 'tambahan' && (
          <div>
            {!editData && (
              <Alert variant="warning" className="py-2 small">
                ⚠️ Item di luar RKPD — wajib melampirkan dasar hukum sebagai justifikasi.
              </Alert>
            )}
            <div className="row">
              <div className="col-12 mb-2">
                <Form.Label className="small fw-semibold">
                  Program <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  size="sm"
                  value={form.program}
                  onChange={(e) => set('program', e.target.value)}
                  placeholder="Nama program"
                />
              </div>
              <div className="col-12 mb-2">
                <Form.Label className="small fw-semibold">
                  Kegiatan <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  size="sm"
                  value={form.kegiatan}
                  onChange={(e) => set('kegiatan', e.target.value)}
                  placeholder="Nama kegiatan"
                />
              </div>
              <div className="col-12 mb-2">
                <Form.Label className="small fw-semibold">
                  Sub Kegiatan <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  size="sm"
                  value={form.sub_kegiatan}
                  onChange={(e) => set('sub_kegiatan', e.target.value)}
                  placeholder="Nama sub kegiatan"
                />
              </div>
            </div>
          </div>
        )}

        <hr className="my-2" />

        {/* Field umum */}
        <p className="small fw-semibold text-primary mb-2">📊 Indikator & Anggaran</p>
        <div className="row">
          <div className="col-md-6 mb-2">
            <Form.Label className="small fw-semibold">
              Indikator Kinerja <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              size="sm"
              value={form.indikator}
              onChange={(e) => set('indikator', e.target.value)}
              placeholder="Indikator kinerja utama"
            />
          </div>
          <div className="col-md-2 mb-2">
            <Form.Label className="small fw-semibold">Target</Form.Label>
            <Form.Control
              size="sm"
              value={form.target}
              onChange={(e) => set('target', e.target.value)}
              placeholder="Angka"
            />
          </div>
          <div className="col-md-4 mb-2">
            <Form.Label className="small fw-semibold">Satuan</Form.Label>
            <Form.Control
              size="sm"
              value={form.satuan}
              onChange={(e) => set('satuan', e.target.value)}
              placeholder="unit, %, paket, dll"
            />
          </div>
          <div className="col-md-6 mb-2">
            <Form.Label className="small fw-semibold">Pagu Anggaran (Rp)</Form.Label>
            <Form.Control
              size="sm"
              type="number"
              value={form.pagu}
              onChange={(e) => set('pagu', e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        {/* Dasar hukum — hanya mode tambahan */}
        {mode === 'tambahan' && (
          <div className="mt-2">
            <Form.Label className="small fw-semibold text-warning">
              📎 Dasar Hukum / Justifikasi <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              size="sm"
              value={form.dasar_hukum}
              onChange={(e) => set('dasar_hukum', e.target.value)}
              placeholder="Contoh: Instruksi Gubernur No. X/2026 tentang ..."
            />
            <Form.Text className="text-muted">
              Wajib diisi sebagai justifikasi item di luar RKPD.
            </Form.Text>
          </div>
        )}
        {err && (
          <Alert variant="warning" className="py-2 small">
            {err}
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="outline-secondary" size="sm" onClick={onHide}>
          Batal
        </Button>
        <Button variant="success" size="sm" onClick={handleSubmit} disabled={busy}>
          {busy ? <Spinner size="sm" /> : '💾 Simpan Item'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RenjaItemModal;
