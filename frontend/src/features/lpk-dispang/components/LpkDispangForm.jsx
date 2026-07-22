// LpkDispangForm untuk modul LPK-DISPANG
import React, { useEffect, useState } from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import { getDpaOptions, getDpaRealisasiKeuangan } from '../services/lpkDispangApi';

const buildInitialForm = (initialData, tahun, periodeId, lockedDpa) => ({
  tahun: initialData?.tahun || tahun || '',
  periode_id: initialData?.periode_id || periodeId || '',
  nama_kegiatan: initialData?.nama_kegiatan || lockedDpa?.nama_sub_kegiatan || '',
  dpa_id: initialData?.dpa_id || lockedDpa?.id || '',
  realisasi_fisik: initialData?.realisasi_fisik ?? '',
  ada_kendala: !!initialData?.keterangan,
  keterangan: initialData?.keterangan || '',
  jenis_dokumen: initialData?.jenis_dokumen || 'LPK',
});

const formatRp = (v) => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;

const LpkDispangForm = ({
  initialData = null,
  tahun,
  periodeId,
  onSubmit,
  onCancel,
  lockedDpa = null,
}) => {
  const [form, setForm] = useState(() =>
    buildInitialForm(initialData, tahun, periodeId, lockedDpa),
  );
  const [dpaOptions, setDpaOptions] = useState([]);
  const [realisasiKeuangan, setRealisasiKeuangan] = useState(
    initialData?.realisasi_keuangan ?? null,
  );

  useEffect(() => {
    if (lockedDpa || !form.tahun) return;
    getDpaOptions(form.tahun)
      .then(setDpaOptions)
      .catch(() => setDpaOptions([]));
  }, [form.tahun, lockedDpa]);

  useEffect(() => {
    if (!form.dpa_id) return undefined;
    let cancelled = false;
    getDpaRealisasiKeuangan(form.dpa_id)
      .then((res) => {
        if (!cancelled) setRealisasiKeuangan(res.realisasi_keuangan);
      })
      .catch(() => {
        if (!cancelled) setRealisasiKeuangan(null);
      });
    return () => {
      cancelled = true;
    };
  }, [form.dpa_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleDpaSelect = (e) => {
    const dpaId = e.target.value;
    const selected = dpaOptions.find((d) => String(d.id) === String(dpaId));
    setForm((f) => ({
      ...f,
      dpa_id: dpaId,
      nama_kegiatan: selected?.nama_sub_kegiatan || f.nama_kegiatan,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { ada_kendala, ...rest } = form;
    onSubmit({
      ...rest,
      realisasi_fisik: form.realisasi_fisik === '' ? null : Number(form.realisasi_fisik),
      periode_id: Number(form.periode_id),
      dpa_id: Number(form.dpa_id),
      keterangan: ada_kendala ? form.keterangan : null,
    });
  };

  return (
    <Card className="mb-3 border-primary-subtle">
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={12}>
              <Form.Label className="small fw-semibold">Sub Kegiatan (DPA)</Form.Label>
              {lockedDpa ? (
                <Form.Control
                  size="sm"
                  readOnly
                  disabled
                  value={lockedDpa.label}
                  className="bg-light"
                />
              ) : (
                <Form.Select
                  name="dpa_id"
                  value={form.dpa_id}
                  onChange={handleDpaSelect}
                  required
                  size="sm"
                >
                  <option value="">-- Pilih Sub Kegiatan --</option>
                  {dpaOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </Form.Select>
              )}
            </Col>

            <Col md={12}>
              <Form.Label className="small fw-semibold">Nama Kegiatan</Form.Label>
              <Form.Control
                size="sm"
                name="nama_kegiatan"
                value={form.nama_kegiatan}
                onChange={handleChange}
                required
              />
            </Col>

            <Col md={6}>
              <Form.Label className="small fw-semibold">
                Realisasi Fisik (sesuai satuan indikator)
              </Form.Label>
              <Form.Control
                size="sm"
                type="number"
                min="0"
                step="any"
                placeholder="mis. 2 (untuk 2 Dokumen)"
                name="realisasi_fisik"
                value={form.realisasi_fisik}
                onChange={handleChange}
              />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-semibold">
                Realisasi Keuangan (otomatis dari Penatausahaan)
              </Form.Label>
              <Form.Control
                size="sm"
                readOnly
                disabled
                value={form.dpa_id ? formatRp(realisasiKeuangan) : formatRp(0)}
                className="bg-light"
              />
            </Col>

            <Col md={12}>
              <Form.Label className="small fw-semibold">Kendala</Form.Label>
              <Form.Select
                size="sm"
                value={form.ada_kendala ? 'ada' : 'tidak'}
                onChange={(e) => setForm((f) => ({ ...f, ada_kendala: e.target.value === 'ada' }))}
              >
                <option value="tidak">Tidak Ada Kendala</option>
                <option value="ada">Ada Kendala</option>
              </Form.Select>
            </Col>

            {form.ada_kendala && (
              <Col md={12}>
                <Form.Label className="small fw-semibold">Uraikan Kendala</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  size="sm"
                  name="keterangan"
                  value={form.keterangan}
                  onChange={handleChange}
                  required
                />
              </Col>
            )}
          </Row>

          <div className="d-flex gap-2 mt-3">
            <Button type="submit" variant="primary" size="sm">
              {initialData ? 'Update' : 'Simpan'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline-secondary" size="sm" onClick={onCancel}>
                Batal
              </Button>
            )}
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default LpkDispangForm;
