import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Card,
  Spinner,
  Breadcrumb,
  Alert,
  Tabs,
  Tab,
  Container,
} from "react-bootstrap";
import Select from "react-select";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import { useDokumen } from "../../hooks/useDokumen";
import { usePeriodeAktif } from "../../features/rpjmd/hooks/usePeriodeAktif";
import { konteksBannerRows } from "../../utils/planningDokumenUtils";

export default function PrioritasGubernurForm({
  existingData = null,
  onSubmitSuccess = () => {},
}) {
  const isEdit = Boolean(existingData?.id);
  const [sasaranOptions, setSasaranOptions] = useState([]);

  const initialForm = {
    kode_priogub: "",
    nama_priogub: "",
    uraian_priogub: "",
    standar_layanan_opd: "",
    opd_tujuan: [],
  };

  const navigate = useNavigate();
  const { dokumen, tahun } = useDokumen();
  const { periode_id, periodeList } = usePeriodeAktif();
  const periodeAktif = periodeList.find(
    (p) => String(p.id) === String(periode_id),
  );
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [opdOptions, setOpdOptions] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("umum");
  const [validationErrors, setValidationErrors] = useState({});

  const handleCancel = () => {
    setFormData(initialForm);
    setErrorMsg("");
    // Jika ada error validasi saat cancel, bersihkan juga
    setValidationErrors({});
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const resOpd = await api.get("/opd-penanggung-jawab", {
          params: { page: 1, limit: 300 },
        });

        const list = Array.isArray(resOpd.data?.data)
          ? resOpd.data.data
          : Array.isArray(resOpd.data)
          ? resOpd.data
          : [];

        const opts = list.map((o) => ({
          value: o.nama_opd,
          label: o.nama_opd,
        }));

        setOpdOptions(opts);

        if (isEdit && existingData?.id) {
          let selectedOpdOptions = [];
          if (typeof existingData.opd_tujuan === "string") {
            selectedOpdOptions = existingData.opd_tujuan
              .split(",")
              .map((v) => v.trim())
              .map((name) => opts.find((opt) => opt.value === name))
              .filter(Boolean);
          }

          setFormData({
            kode_priogub: existingData.kode_priogub || "",
            nama_priogub: existingData.nama_priogub || "",
            uraian_priogub: existingData.uraian_priogub || "",
            standar_layanan_opd: existingData.standar_layanan_opd || "",
            opd_tujuan: selectedOpdOptions,
          });
        } else {
          setFormData(initialForm);
        }

        setErrorMsg("");
        setValidationErrors({});
      } catch (err) {
        console.error("Gagal memuat data:", err);
        setErrorMsg("Gagal memuat data, silakan muat ulang.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [existingData, isEdit]);

  const handleOpdChange = (selected) => {
    setFormData((f) => ({ ...f, opd_tujuan: selected || [] }));
    if (validationErrors.opd_tujuan) {
      // Hapus error jika sudah diperbaiki
      setValidationErrors((prev) => ({ ...prev, opd_tujuan: "" }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((f) => ({ ...f, [name]: value }));
    if (validationErrors[name]) {
      // Hapus error jika sudah diperbaiki
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    let errors = {};
    if (!formData.kode_priogub)
      errors.kode_priogub = "Kode Prioritas Gubernur wajib diisi.";
    if (!formData.nama_priogub)
      errors.nama_priogub = "Nama Prioritas Gubernur wajib diisi.";
    if (!formData.uraian_priogub)
      errors.uraian_priogub = "Uraian Prioritas wajib diisi.";
    if (!formData.standar_layanan_opd)
      errors.standar_layanan_opd = "Standar Layanan OPD wajib diisi.";
    if (!formData.opd_tujuan || formData.opd_tujuan.length === 0)
      errors.opd_tujuan = "OPD Tujuan wajib dipilih.";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    const errors = validateForm();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Pindah ke tab pertama yang memiliki error jika ada
      if (errors.kode_priogub || errors.nama_priogub) setActiveTab("umum");
      else if (errors.uraian_priogub || errors.standar_layanan_opd)
        setActiveTab("uraian");
      else if (errors.opd_tujuan) setActiveTab("opd");
      return;
    }

    try {
      const payload = {
        kode_priogub: formData.kode_priogub,
        nama_priogub: formData.nama_priogub,
        uraian_priogub: formData.uraian_priogub,
        standar_layanan_opd: formData.standar_layanan_opd,
        opd_tujuan: formData.opd_tujuan.map((o) => o.value).join(","),
        jenis_dokumen: dokumen,
        tahun,
      };
      if (isEdit) {
        await api.put(`/prioritas-gubernur/${existingData.id}`, payload);
      } else {
        await api.post("/prioritas-gubernur", payload);
      }
      onSubmitSuccess();
    } catch (err) {
      console.error(">> server message:", err.response?.data || err.message);
      setErrorMsg(
        err.response?.status === 403
          ? "Anda tidak memiliki hak akses."
          : `Gagal menyimpan data (${err.response?.status})`
      );
    }
  };

  if (loading)
    return (
      <div className="text-center my-4">
        <Spinner animation="border" />
      </div>
    );

  return (
    <Container className="my-4">
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate("/rpjmd/priogub-list")}>
          Daftar Prioritas Gubernur
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {isEdit ? "Edit Prioritas Gubernur" : "Tambah Prioritas Gubernur"}
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
            {isEdit ? "Edit" : "Tambah"} Prioritas Gubernur
          </Card.Title>
          {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-3"
            >
              <Tab eventKey="umum" title="Informasi Umum">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Kode Prioritas Gubernur</Form.Label>
                  <Form.Control
                    name="kode_priogub"
                    value={formData.kode_priogub}
                    onChange={handleChange}
                    isInvalid={!!validationErrors.kode_priogub}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.kode_priogub}
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Nama Prioritas Gubernur</Form.Label>
                  <Form.Control
                    name="nama_priogub"
                    value={formData.nama_priogub}
                    onChange={handleChange}
                    isInvalid={!!validationErrors.nama_priogub}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.nama_priogub}
                  </Form.Control.Feedback>
                </Form.Group>
              </Tab>

              <Tab eventKey="uraian" title="Uraian & Layanan">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Uraian Prioritas</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="uraian_priogub"
                    value={formData.uraian_priogub}
                    onChange={handleChange}
                    isInvalid={!!validationErrors.uraian_priogub}
                    rows={3}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.uraian_priogub}
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Standar Layanan OPD</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="standar_layanan_opd"
                    value={formData.standar_layanan_opd}
                    onChange={handleChange}
                    rows={3}
                    isInvalid={!!validationErrors.standar_layanan_opd}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.standar_layanan_opd}
                  </Form.Control.Feedback>
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
                    // Gunakan validasi kustom dan berikan fallback ke style default
                    styles={{
                      control: (base) => {
                        // Menggunakan Pendekatan 2
                        const hasError = !!validationErrors.opd_tujuan;
                        const errorColor = "red";
                        const normalBorderColor = base.borderColor; // Default border color
                        // Jika base['&:focus-within'] tidak ada, berikan default
                        const normalFocusBorderColor =
                          base["&:focus-within"]?.borderColor || "#80bdff";
                        const normalFocusBoxShadow =
                          base["&:focus-within"]?.boxShadow ||
                          "0 0 0 0.2rem rgba(0, 123, 255, 0.25)";

                        return {
                          ...base, // Sebarkan semua style dasar
                          borderColor: hasError
                            ? errorColor
                            : normalBorderColor, // Terapkan error border jika ada error
                          "&:focus-within": {
                            // Style untuk fokus
                            ...base["&:focus-within"], // Sebarkan style focus-within dasar
                            borderColor: hasError
                              ? errorColor
                              : normalFocusBorderColor, // Terapkan error border saat fokus jika ada error
                            boxShadow: hasError
                              ? "0 0 0 0.25rem rgba(255,0,0,0.25)"
                              : normalFocusBoxShadow, // Terapkan error shadow saat fokus jika ada error
                          },
                        };
                      },
                    }}
                  />
                  {/* Tampilkan pesan error validasi di bawah Select hanya jika ada error */}
                  {validationErrors.opd_tujuan && (
                    <div
                      style={{
                        color: "red",
                        fontSize: "0.875em",
                        marginTop: "0.25rem",
                      }}
                    >
                      {validationErrors.opd_tujuan}
                    </div>
                  )}
                </Form.Group>
              </Tab>
            </Tabs>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" type="reset" onClick={handleCancel}>
                Reset
              </Button>
              <Button type="submit" variant="primary">
                {isEdit ? "Perbarui" : "Simpan"}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
