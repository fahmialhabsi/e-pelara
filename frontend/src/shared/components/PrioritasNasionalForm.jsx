import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Card,
  Spinner,
  Breadcrumb,
  Tabs,
  Tab,
  Container,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useDokumen } from "../../hooks/useDokumen";
import { usePeriodeAktif } from "../../features/rpjmd/hooks/usePeriodeAktif";
import { konteksBannerRows } from "../../utils/planningDokumenUtils";

function PrioritasNasionalForm({ existingData, onSubmitSuccess }) {
  const navigate = useNavigate();
  const { dokumen, tahun } = useDokumen();
  const { periode_id, periodeList } = usePeriodeAktif();
  const periodeAktif = periodeList.find(
    (p) => String(p.id) === String(periode_id),
  );
  const isEdit = existingData && existingData.id;

  const [loading, setLoading] = useState(true);

  const initialFormData = {
    kode_prionas: "",
    uraian_prionas: "",
    nama_prionas: "",
    sumber: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [activeTab, setActiveTab] = useState("umum");

  const handleCancel = () => {
    setFormData(initialFormData);
  };

  const safeCallback =
    typeof onSubmitSuccess === "function"
      ? onSubmitSuccess
      : () => navigate("/rpjmd/prionas-list");

  useEffect(() => {
    if (isEdit) {
      setFormData({
        kode_prionas: existingData.kode_prionas || "",
        uraian_prionas: existingData.uraian_prionas || "",
        nama_prionas: existingData.nama_prionas || "",
        sumber: existingData.sumber || "",
      });
    }
    setLoading(false);
  }, [existingData, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, dokumen, tahun };

      if (isEdit) {
        await api.put(`/prioritas-nasional/${existingData.id}`, payload);
        alert("Data berhasil diperbarui.");
      } else {
        await api.post("/prioritas-nasional", payload);
        alert("Data berhasil ditambahkan.");
      }
      safeCallback();
    } catch (err) {
      console.error("Gagal menyimpan data:", err);
      alert(
        err.response?.data?.message || "Terjadi kesalahan saat menyimpan data."
      );
    }
  };

  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Container className="my-4">
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Balik ke beranda
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate("/rpjmd/prionas-list")}>
          Daftar Prioritas Nasional
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {isEdit ? "Edit Prioritas Nasional" : "Tambah Prioritas Nasional"}
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="mb-3">
        {konteksBannerRows(dokumen, tahun, periodeAktif).map((r) => (
          <span key={r.key} className="d-block">
            <strong>{r.label}:</strong> {r.value}
          </span>
        ))}
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body>
          <Card.Title>
            {isEdit ? "Edit Prioritas Nasional" : "Tambah Prioritas Nasional"}
          </Card.Title>
          <Form onSubmit={handleSubmit}>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-3"
            >
              <Tab eventKey="umum" title="Informasi Umum">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Kode Prioritas Nasional</Form.Label>
                  <Form.Control
                    type="text"
                    name="kode_prionas"
                    value={formData.kode_prionas}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Nama Prioritas Nasional</Form.Label>
                  <Form.Control
                    type="text"
                    name="nama_prionas"
                    value={formData.nama_prionas}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Tab>
              <Tab eventKey="uraian" title="Uraian">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Uraian Prioritas Nasional</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="uraian_prionas"
                    value={formData.uraian_prionas}
                    onChange={handleChange}
                    rows={4}
                    required
                  />
                </Form.Group>
              </Tab>
              <Tab eventKey="sumber" title="Sumber">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Sumber</Form.Label>
                  <Form.Control
                    type="text"
                    name="sumber"
                    value={formData.sumber}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Tab>
            </Tabs>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" type="reset" onClick={handleCancel}>
                Reset
              </Button>
              <Button type="submit" variant="primary">
                {isEdit ? "Update" : "Simpan"}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default PrioritasNasionalForm;
