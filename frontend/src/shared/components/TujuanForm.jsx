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
  Alert,
} from "react-bootstrap";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useDokumen } from "../../hooks/useDokumen";

const StrukturTab = ({
  formData,
  rpjmdList,
  misiList,
  isiMisiPreview,
  handleMisiChange,
}) => (
  <>
    <Form.Group className="mb-3 mt-3">
      <Form.Label>RPJMD</Form.Label>
      <Form.Control
        type="text"
        readOnly
        value={
          rpjmdList.find((r) => r.id === formData.rpjmd_id)?.nama_rpjmd || ""
        }
      />
    </Form.Group>
    <Form.Group className="mb-3">
      <Form.Label>Pilih Misi</Form.Label>
      <Form.Select
        name="misi_id"
        value={formData.misi_id}
        onChange={handleMisiChange}
      >
        <option value="">-- Pilih Misi --</option>
        {misiList.map((m) => (
          <option key={m.id} value={m.id}>{`Misi ${
            m.no_misi
          }: ${m.isi_misi.substring(0, 50)}...`}</option>
        ))}
      </Form.Select>
      {isiMisiPreview && <Form.Text>{isiMisiPreview}</Form.Text>}
    </Form.Group>
  </>
);

const DetailTab = ({ formData, handleChange }) => (
  <>
    <Form.Group className="mb-3 mt-3">
      <Form.Label>No Tujuan</Form.Label>
      <Form.Control type="text" readOnly value={formData.no_tujuan || "-"} />
    </Form.Group>
    <Form.Group className="mb-3">
      <Form.Label>Isi Tujuan</Form.Label>
      <Form.Control
        type="text"
        name="isi_tujuan"
        value={formData.isi_tujuan}
        onChange={handleChange}
      />
    </Form.Group>
  </>
);

function TujuanForm({ initialData = null, onSuccess }) {
  const { dokumen, tahun } = useDokumen();
  const navigate = useNavigate();
  const [rpjmdList, setRpjmdList] = useState([]);
  const [misiList, setMisiList] = useState([]);
  const [isiMisiPreview, setIsiMisiPreview] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("struktur");

  const [formData, setFormData] = useState({
    rpjmd_id: "",
    misi_id: "",
    no_tujuan: "",
    isi_tujuan: "",
  });

  useEffect(() => {
    if (!dokumen || !tahun) return; // ⛔️ hindari fetch sebelum dokumen/tahun tersedia

    async function fetchData() {
      try {
        const [rpjmdRes, misiRes] = await Promise.all([
          api.get("/rpjmd", { params: { jenis_dokumen: dokumen, tahun } }),
          api.get("/misi", { params: { jenis_dokumen: dokumen, tahun } }),
        ]);

        setRpjmdList(rpjmdRes.data);
        setMisiList(misiRes.data);

        if (initialData) {
          const selectedMisi = misiRes.data.find(
            (m) => m.id === Number(initialData.misi_id)
          );
          setIsiMisiPreview(selectedMisi?.isi_misi || "");

          setFormData({
            rpjmd_id: initialData.rpjmd_id,
            misi_id: initialData.misi_id,
            no_tujuan: initialData.no_tujuan,
            isi_tujuan: initialData.isi_tujuan,
          });
        } else {
          const defaultRpjmdId = rpjmdRes.data[0]?.id || "";
          setFormData((prev) => ({
            ...prev,
            rpjmd_id: defaultRpjmdId,
          }));
        }
      } catch (err) {
        console.error("Gagal memuat data:", err);
        alert("Gagal memuat data. Silakan refresh halaman.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [initialData, dokumen, tahun]);

  const handleMisiChange = async (e) => {
    const selectedMisiId = Number(e.target.value);
    setFormData((prev) => ({
      ...prev,
      misi_id: selectedMisiId,
      no_tujuan: "-",
    }));

    const selectedMisi = misiList.find((m) => m.id === selectedMisiId);
    setIsiMisiPreview(selectedMisi?.isi_misi || "");

    try {
      const res = await api.get("/tujuan/next-no", {
        params: { misi_id: selectedMisiId, jenis_dokumen: dokumen, tahun },
      });
      setFormData((prev) => ({
        ...prev,
        misi_id: selectedMisiId,
        no_tujuan: res.data?.no_tujuan || "-",
      }));
    } catch (err) {
      console.error("Gagal mengambil nomor tujuan:", err);
      setFormData((prev) => ({ ...prev, no_tujuan: "-" }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setFormData({ rpjmd_id: "", misi_id: "", no_tujuan: "", isi_tujuan: "" });
    setIsiMisiPreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.no_tujuan) {
      alert("Nomor tujuan belum tersedia. Pastikan Anda memilih Misi.");
      return;
    }

    if (
      !formData.rpjmd_id ||
      !formData.misi_id ||
      !formData.isi_tujuan?.trim()
    ) {
      alert("Harap lengkapi semua field yang wajib diisi.");
      setActiveTab("struktur");
      return;
    }

    if (!dokumen || !tahun) {
      alert("Dokumen dan tahun belum tersedia.");
      return;
    }

    try {
      const payload = {
        rpjmd_id: formData.rpjmd_id,
        misi_id: formData.misi_id,
        no_tujuan: formData.no_tujuan,
        isi_tujuan: formData.isi_tujuan,
        jenis_dokumen: dokumen,
        tahun,
      };

      let response;
      if (initialData?.id) {
        response = await api.put(`/tujuan/${initialData.id}`, payload);
        alert("Tujuan berhasil diperbarui.");
      } else {
        console.log("Payload yang dikirim:", payload);
        response = await api.post("/tujuan", payload);

        alert("Tujuan berhasil disimpan.");
        setFormData((prev) => ({
          ...prev,
          isi_tujuan: "",
          no_tujuan: response.data?.no_tujuan || "",
        }));
        setActiveTab("struktur");
      }

      onSuccess?.();
    } catch (err) {
      console.error("Gagal menyimpan tujuan:", err);
      alert(err.response?.data?.message || "Gagal menyimpan tujuan.");
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
        <Breadcrumb.Item active>Tujuan</Breadcrumb.Item>
        <Breadcrumb.Item active>
          {initialData?.id ? "Edit Tujuan" : "Tambah Tujuan"}
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate("/rpjmd/tujuan-list")}>
          Daftar Tujuan
        </Breadcrumb.Item>
      </Breadcrumb>
      <div className="mb-3">
        <strong>Dokumen Aktif:</strong> {dokumen} <br />
        <strong>Tahun:</strong> {tahun}
      </div>
      <Card>
        <Card.Body>
          <Card.Title>
            {initialData?.id ? "Edit Tujuan RPJMD" : "Tambah Tujuan RPJMD"}
          </Card.Title>
          <Form onSubmit={handleSubmit}>
            <Tabs
              activeKey={activeTab}
              onSelect={setActiveTab}
              className="mb-3"
            >
              <Tab eventKey="struktur" title="Struktur">
                <StrukturTab
                  formData={formData}
                  rpjmdList={rpjmdList}
                  misiList={misiList}
                  isiMisiPreview={isiMisiPreview}
                  handleMisiChange={handleMisiChange}
                />
              </Tab>
              <Tab eventKey="detail" title="Detail Tujuan">
                <DetailTab formData={formData} handleChange={handleChange} />
              </Tab>
            </Tabs>
            {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" type="reset" onClick={handleCancel}>
                Reset
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {initialData?.id ? "Update" : "Simpan"}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default TujuanForm;
