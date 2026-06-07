// File: frontend/src/features/rkpd/components/RkpdItemModal.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Button, Form, Spinner, Row, Col } from 'react-bootstrap';
import api from '../../../services/api';
import { extractListResponse } from '../../../utils/apiResponse';

const emptyForm = {
  program_id: '',
  program: '',
  kegiatan_id: '',
  kegiatan: '',
  sub_kegiatan_id: '',
  sub_kegiatan: '',
  indikator: '',
  satuan: '',
  target: '',
  pagu: '',
  prioritas_daerah: '',
  urutan: 1,
};

const fetchList = async (endpoint, params = {}) => {
  try {
    const res = await api.get(endpoint, { params: { ...params, limit: 1000 } });
    const { data } = extractListResponse(res.data);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

/**
 * Modal tambah/edit item RKPD dengan cascading dropdown dari Renstra.
 * Props:
 *  - show, onHide
 *  - doc: objek rkpd_dokumen (berisi arah_kebijakan_id, periode_id, tahun, dll)
 *  - editingItem: null = tambah baru, object = edit
 *  - onSaved(itemForm, reasonText, reasonFile): callback setelah simpan
 *  - saving: boolean
 */
export default function RkpdItemModal({ show, onHide, doc, editingItem, onSaved, saving }) {
  const [form, setForm] = useState(emptyForm);
  const [reasonText, setReasonText] = useState('');
  const [reasonFile, setReasonFile] = useState('');

  // Cascading lists
  const [programList, setProgramList] = useState([]);
  const [kegiatanList, setKegiatanList] = useState([]);
  const [subKegiatanList, setSubKegiatanList] = useState([]);
  const [indikatorList, setIndikatorList] = useState([]);

  // Loading states
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [loadingKegiatan, setLoadingKegiatan] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);
  const [prioritasDaerahList, setPrioritasDaerahList] = useState([]);

  // Resolve tahun dari periode
  const resolvedTahun = doc?.periode?.tahun_awal
    ? String(doc.periode.tahun_awal)
    : String(doc?.tahun || '');

  // Load program saat modal dibuka
  useEffect(() => {
    if (!show || !doc) return;

    fetchList('/prioritas-daerah', {
      jenis_dokumen: 'rkpd',
      tahun: resolvedTahun,
    }).then(setPrioritasDaerahList);

    setLoadingProgram(true);
    fetchList('/programs', {
      jenis_dokumen: 'rpjmd',
      tahun: resolvedTahun,
      limit: 1000,
    }).then((data) => {
      setProgramList(data);
      setLoadingProgram(false);
    });
  }, [show, doc, resolvedTahun]);

  // Reset form saat modal dibuka/tutup
  useEffect(() => {
    if (!show) return;
    if (editingItem) {
      setForm({
        program_id: editingItem.program_id || '',
        program: editingItem.program || '',
        kegiatan_id: editingItem.kegiatan_id || '',
        kegiatan: editingItem.kegiatan || '',
        sub_kegiatan_id: editingItem.sub_kegiatan_id || '',
        sub_kegiatan: editingItem.sub_kegiatan || '',
        indikator: editingItem.indikator || '',
        satuan: editingItem.satuan || '',
        target: editingItem.target || '',
        pagu: editingItem.pagu || '',
        urutan: editingItem.urutan || 1,
      });
    } else {
      setForm(emptyForm);
      setReasonText('');
      setReasonFile('');
    }
    setKegiatanList([]);
    setSubKegiatanList([]);
    setIndikatorList([]);
  }, [show, editingItem]);

  // Load kegiatan saat program dipilih
  useEffect(() => {
    if (!form.program_id) {
      setKegiatanList([]);
      return;
    }
    setLoadingKegiatan(true);
    fetchList('/kegiatan', {
      jenis_dokumen: 'rkpd',
      tahun: resolvedTahun,
      program_id: form.program_id,
    }).then((data) => {
      setKegiatanList(data);
      setLoadingKegiatan(false);
    });
  }, [form.program_id, resolvedTahun]);

  // Load sub kegiatan saat kegiatan dipilih
  useEffect(() => {
    if (!form.kegiatan_id) {
      setSubKegiatanList([]);
      return;
    }
    setLoadingSub(true);
    fetchList('/sub-kegiatan', {
      kegiatan_id: form.kegiatan_id,
      jenis_dokumen: 'rpjmd',
      tahun: resolvedTahun,
    }).then((data) => {
      setSubKegiatanList(data);
      setLoadingSub(false);
    });
  }, [form.kegiatan_id]);

  // Load indikator saat sub kegiatan dipilih
  useEffect(() => {
    if (!form.sub_kegiatan_id) {
      setIndikatorList([]);
      return;
    }
    fetchList('/indikator-renstra', {
      stage: 'sub_kegiatan',
      ref_id: form.sub_kegiatan_id,
    }).then(setIndikatorList);
  }, [form.sub_kegiatan_id]);

  const handleProgramChange = (e) => {
    const id = e.target.value;
    const selected = programList.find((p) => String(p.id) === id);
    setForm((prev) => ({
      ...prev,
      program_id: id,
      program: selected
        ? `${selected.kode_program || ''} - ${selected.nama_program || selected.nama || ''}`.trim()
        : '',
      kegiatan_id: '',
      kegiatan: '',
      sub_kegiatan_id: '',
      sub_kegiatan: '',
      indikator: '',
      satuan: '',
      target: '',
      pagu: '',
    }));
  };

  const handleKegiatanChange = (e) => {
    const id = e.target.value;
    const selected = kegiatanList.find((k) => String(k.id) === id);
    setForm((prev) => ({
      ...prev,
      kegiatan_id: id,
      kegiatan: selected
        ? `${selected.kode_kegiatan || ''} - ${selected.nama_kegiatan || selected.nama || ''}`.trim()
        : '',
      sub_kegiatan_id: '',
      sub_kegiatan: '',
      indikator: '',
      satuan: '',
      target: '',
      pagu: '',
    }));
  };

  const handleSubKegiatanChange = (e) => {
    const id = e.target.value;
    const selected = subKegiatanList.find((s) => String(s.id) === id);
    setForm((prev) => ({
      ...prev,
      sub_kegiatan_id: id,
      sub_kegiatan: selected
        ? `${selected.kode_sub_kegiatan || ''} - ${selected.nama_sub_kegiatan || selected.nama || ''}`.trim()
        : '',
      indikator: '',
      satuan: '',
      target: '',
      pagu: '',
    }));
  };

  const handleIndikatorChange = (e) => {
    const id = e.target.value;
    const selected = indikatorList.find((i) => String(i.id) === id);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        indikator: selected.nama_indikator || '',
        satuan: selected.satuan || '',
        target: selected.target_tahun_1 || '',
        pagu: selected.pagu_cached || selected.pagu_tahun_1 || '',
      }));
    }
  };

  const handleSubmit = () => {
    onSaved(form, reasonText, reasonFile);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable style={{ zIndex: 9999 }}>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title className="fs-6 fw-bold">
          {editingItem ? '✏️ Edit Item RKPD' : '➕ Tambah Item RKPD'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-3">
          {/* Prioritas Daerah */}
          <Col xs={12}>
            <Form.Group>
              <Form.Label className="small fw-semibold">
                Prioritas Daerah <span className="text-danger">*</span>
              </Form.Label>
              <Form.Select
                size="sm"
                value={form.prioritas_daerah}
                onChange={(e) => setForm({ ...form, prioritas_daerah: e.target.value })}
              >
                <option value="">-- Pilih Prioritas Daerah --</option>
                {prioritasDaerahList.map((p) => (
                  <option key={p.id} value={`${p.kode_prioda} - ${p.nama_prioda}`}>
                    {p.kode_prioda} - {p.nama_prioda}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          {/* Program */}
          <Col xs={12}>
            <Form.Group>
              <Form.Label className="small fw-semibold">
                Program <span className="text-danger">*</span>
              </Form.Label>
              {editingItem ? (
                <Form.Control
                  size="sm"
                  value={form.program}
                  onChange={(e) => setForm({ ...form, program: e.target.value })}
                />
              ) : loadingProgram ? (
                <Spinner size="sm" />
              ) : (
                <Form.Select size="sm" value={form.program_id} onChange={handleProgramChange}>
                  <option value="">-- Pilih Program --</option>
                  {programList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.kode_program} - {p.nama_program || p.nama}
                    </option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>
          </Col>

          {/* Kegiatan */}
          <Col xs={12}>
            <Form.Group>
              <Form.Label className="small fw-semibold">Kegiatan</Form.Label>
              {editingItem ? (
                <Form.Control
                  size="sm"
                  value={form.kegiatan}
                  onChange={(e) => setForm({ ...form, kegiatan: e.target.value })}
                />
              ) : (
                <Form.Select
                  size="sm"
                  value={form.kegiatan_id}
                  onChange={handleKegiatanChange}
                  disabled={!form.program_id}
                >
                  <option value="">-- Pilih Kegiatan --</option>
                  {kegiatanList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.kode_kegiatan} - {k.nama_kegiatan || k.nama}
                    </option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>
          </Col>

          {/* Sub Kegiatan */}
          <Col xs={12}>
            <Form.Group>
              <Form.Label className="small fw-semibold">Sub Kegiatan</Form.Label>
              {editingItem ? (
                <Form.Control
                  size="sm"
                  value={form.sub_kegiatan}
                  onChange={(e) => setForm({ ...form, sub_kegiatan: e.target.value })}
                />
              ) : (
                <Form.Select
                  size="sm"
                  value={form.sub_kegiatan_id}
                  onChange={handleSubKegiatanChange}
                  disabled={!form.kegiatan_id}
                >
                  <option value="">-- Pilih Sub Kegiatan --</option>
                  {subKegiatanList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.kode_sub_kegiatan} - {s.nama_sub_kegiatan || s.nama}
                    </option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>
          </Col>

          {/* Indikator Sub Kegiatan */}
          {indikatorList.length > 0 && (
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Indikator Sub Kegiatan</Form.Label>
                <Form.Select size="sm" onChange={handleIndikatorChange} defaultValue="">
                  <option value="">-- Pilih Indikator (auto-fill) --</option>
                  {indikatorList.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.kode_indikator} - {i.nama_indikator}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          )}

          {/* Indikator, Satuan, Target, Pagu */}
          <Col xs={12}>
            <Form.Group>
              <Form.Label className="small fw-semibold">Indikator</Form.Label>
              <Form.Control
                size="sm"
                value={form.indikator}
                onChange={(e) => setForm({ ...form, indikator: e.target.value })}
                placeholder="Indikator kinerja..."
              />
            </Form.Group>
          </Col>
          <Col xs={6}>
            <Form.Group>
              <Form.Label className="small fw-semibold">Satuan</Form.Label>
              <Form.Control
                size="sm"
                value={form.satuan}
                onChange={(e) => setForm({ ...form, satuan: e.target.value })}
              />
            </Form.Group>
          </Col>
          <Col xs={6}>
            <Form.Group>
              <Form.Label className="small fw-semibold">Target</Form.Label>
              <Form.Control
                size="sm"
                type="number"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
              />
            </Form.Group>
          </Col>
          <Col xs={12}>
            <Form.Group>
              <Form.Label className="small fw-semibold">Pagu Anggaran (Rp)</Form.Label>
              <Form.Control
                size="sm"
                type="number"
                value={form.pagu}
                onChange={(e) => setForm({ ...form, pagu: e.target.value })}
                placeholder="0"
              />
            </Form.Group>
          </Col>

          {/* Alasan */}
          <Col xs={12}>
            <Form.Group>
              <Form.Label className="small fw-semibold">
                Alasan perubahan <span className="text-muted">(wajib salah satu)</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                size="sm"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Tuliskan alasan..."
              />
            </Form.Group>
          </Col>
          <Col xs={12}>
            <Form.Group>
              <Form.Label className="small fw-semibold">Referensi berkas</Form.Label>
              <Form.Control
                size="sm"
                value={reasonFile}
                onChange={(e) => setReasonFile(e.target.value)}
                placeholder="path / URL / nama berkas"
              />
            </Form.Group>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide}>
          Batal
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={saving || (!form.program_id && !form.program)}
        >
          {saving ? <Spinner size="sm" /> : 'Simpan'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
