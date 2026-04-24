import React, { useEffect, useState } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";

const baseFields = {
  nama_rpjmd: "",
  kepala_daerah: "",
  wakil_kepala_daerah: "",
  periode_awal: "",
  periode_akhir: "",
  tahun_penetapan: "",
  akronim: "",
  change_reason_text: "",
  foto_kepala_daerah: null,
  foto_wakil_kepala_daerah: null,
};

/**
 * Form CRUD metadata RPJMD (tema, periode, foto).
 * Nilai foto_* berupa File atau null (biarkan null pada edit jika tidak ganti file).
 */
export default function RpjmdMetadataForm({ mode, data, onSubmit, onCancel }) {
  const [form, setForm] = useState(baseFields);

  useEffect(() => {
    if (mode === "edit" && data) {
      setForm({
        ...baseFields,
        nama_rpjmd: data.nama_rpjmd ?? "",
        kepala_daerah: data.kepala_daerah ?? "",
        wakil_kepala_daerah: data.wakil_kepala_daerah ?? "",
        periode_awal: data.periode_awal ?? "",
        periode_akhir: data.periode_akhir ?? "",
        tahun_penetapan: data.tahun_penetapan ?? "",
        akronim: data.akronim ?? "",
      });
    } else {
      setForm({ ...baseFields });
    }
  }, [mode, data]);

  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files.length) {
      setForm((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const submit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Form onSubmit={submit}>
      <Row className="g-2 mb-2">
        <Col md={12}>
          <Form.Group>
            <Form.Label>Nama / Tema RPJMD</Form.Label>
            <Form.Control
              name="nama_rpjmd"
              value={form.nama_rpjmd}
              onChange={onChange}
              required
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Kepala Daerah</Form.Label>
            <Form.Control name="kepala_daerah" value={form.kepala_daerah} onChange={onChange} />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Wakil Kepala Daerah</Form.Label>
            <Form.Control
              name="wakil_kepala_daerah"
              value={form.wakil_kepala_daerah}
              onChange={onChange}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Periode Awal</Form.Label>
            <Form.Control name="periode_awal" value={form.periode_awal} onChange={onChange} />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Periode Akhir</Form.Label>
            <Form.Control name="periode_akhir" value={form.periode_akhir} onChange={onChange} />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Penetapan (metadata)</Form.Label>
            <Form.Control
              name="tahun_penetapan"
              value={form.tahun_penetapan}
              onChange={onChange}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Akronim</Form.Label>
            <Form.Control name="akronim" value={form.akronim} onChange={onChange} />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Foto Kepala Daerah (opsional)</Form.Label>
            <Form.Control name="foto_kepala_daerah" type="file" onChange={onChange} />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Foto Wakil (opsional)</Form.Label>
            <Form.Control name="foto_wakil_kepala_daerah" type="file" onChange={onChange} />
          </Form.Group>
        </Col>
        <Col md={12}>
          <Form.Group>
            <Form.Label>Alasan pencatatan / perubahan (wajib)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="change_reason_text"
              value={form.change_reason_text}
              onChange={onChange}
              required
              placeholder="Diperlukan untuk audit (buat, ubah, atau hapus)."
            />
          </Form.Group>
        </Col>
      </Row>
      <div className="d-flex gap-2">
        <Button type="submit" variant="primary">
          Simpan
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Batal
          </Button>
        ) : null}
      </div>
    </Form>
  );
}
