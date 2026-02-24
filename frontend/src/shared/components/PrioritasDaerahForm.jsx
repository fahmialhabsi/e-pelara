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
import Select from "react-select";
import api from "../../services/api";
import { useDokumen } from "../../hooks/useDokumen";
import { usePeriodeAktif } from "../../features/rpjmd/hooks/usePeriodeAktif";

export default function PrioritasDaerahForm({ existingData, onSubmitSuccess }) {
  const navigate = useNavigate();
  const isEdit = Boolean(existingData?.id);
  const { dokumen, tahun } = useDokumen();
  const { periode_id } = usePeriodeAktif();

  const initialForm = {
    kode_prioda: "",
    nama_prioda: "",
    uraian_prioda: "",
    opd_tujuan: [],
  };
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [opdOptions, setOpdOptions] = useState([]);
  const [activeTab, setActiveTab] = useState("umum");

  const handleCancel = () => {
    setFormData(initialForm);
  };

  useEffect(() => {
    (async () => {
      try {
        const opdRes = await api.get("/opd-penanggung-jawab", {
          params: { page: 1, limit: 1000 },
        });
        const opdData = Array.isArray(opdRes.data)
          ? opdRes.data
          : opdRes.data?.data || [];
        setOpdOptions(
          opdData.map((opd) => ({
            value: opd.nama_opd,
            label: opd.nama_opd,
          }))
        );
      } catch (err) {
        console.error("Gagal memuat opsi:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const populateFormIfEditing = () => {
      if (isEdit && existingData && opdOptions.length) {
        const selOpd = (existingData.opd_tujuan || "")
          .split(",")
          .map((name) => opdOptions.find((o) => o.value === name))
          .filter(Boolean);

        setFormData({
          kode_prioda: existingData.kode_prioda || "",
          nama_prioda: existingData.nama_prioda || "",
          uraian_prioda: existingData.uraian_prioda || "",
          opd_tujuan: selOpd,
        });
      }
    };
    populateFormIfEditing();
  }, [loading, opdOptions, existingData, isEdit]);

  const handleOpdChange = (selArr) =>
    setFormData((f) => ({ ...f, opd_tujuan: selArr || [] }));
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!periode_id) {
      alert("Periode aktif tidak ditemukan.");
      return;
    }

    try {
      const payload = {
        ...formData,
        opd_tujuan: formData.opd_tujuan.map((o) => o.value).join(","),
        dokumen,
        tahun,
        periode_id,
      };
      if (isEdit) {
        await api.put(`/prioritas-daerah/${existingData.id}`, payload);
        alert("Data berhasil diperbarui");
      } else {
        await api.post("/prioritas-daerah", payload);
        alert("Data berhasil ditambahkan");
      }
      setFormData(initialForm);
      onSubmitSuccess?.();
    } catch (err) {
      console.error(err);
      alert(`Gagal menyimpan: ${err.response?.status || err.message}`);
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
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate("/rpjmd/prioda-list")}>
          Daftar Prioritas Daerah
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {isEdit ? "Edit Prioritas Daerah" : "Tambah Prioritas Daerah"}
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="mb-3">
        <strong>Dokumen Aktif:</strong> {dokumen || "-"} <br />
        <strong>Tahun:</strong> {tahun || "-"}
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body>
          <Card.Title>
            {isEdit ? "Edit Prioritas Daerah" : "Tambah Prioritas Daerah"}
          </Card.Title>
          <Form onSubmit={handleSubmit}>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-3"
            >
              <Tab eventKey="umum" title="Informasi Umum">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Kode Prioritas Daerah</Form.Label>
                  <Form.Control
                    type="text"
                    name="kode_prioda"
                    value={formData.kode_prioda}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Nama Prioritas Daerah</Form.Label>
                  <Form.Control
                    type="text"
                    name="nama_prioda"
                    value={formData.nama_prioda}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Tab>
              <Tab eventKey="uraian" title="Uraian">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Uraian Prioritas Daerah</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="uraian_prioda"
                    value={formData.uraian_prioda}
                    onChange={handleChange}
                    rows={3}
                    required
                  />
                </Form.Group>
              </Tab>
              <Tab eventKey="opd" title="OPD Tujuan">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>OPD Tujuan</Form.Label>
                  <Select
                    options={opdOptions}
                    value={formData.opd_tujuan}
                    onChange={handleOpdChange}
                    isMulti
                    placeholder="Pilih OPD"
                    closeMenuOnSelect={false}
                    maxMenuHeight={200}
                    required
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
