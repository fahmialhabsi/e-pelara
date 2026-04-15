import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Card,
  Table,
  Tabs,
  Tab,
  Breadcrumb,
  Alert,
  Spinner,
  Container,
} from "react-bootstrap";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useDokumen } from "../../hooks/useDokumen";
import {
  extractListData,
  normalizeListItems,
} from "../../utils/apiResponse";

export default function MisiForm() {
  const { user } = useAuth();
  const { dokumen, tahun } = useDokumen();
  const [visiList, setVisiList] = useState([]);
  const [misiList, setMisiList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [visiPreview, setVisiPreview] = useState("");
  const [activeTab, setActiveTab] = useState("form");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const initialFormData = {
    visiId: "",
    noMisi: "",
    misi: "",
    deskripsi: "",
  };

  const [rpjmdId, setRpjmdId] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  useEffect(() => {
    if (!dokumen || !tahun) return;

    const fetchRpjmdId = async () => {
      try {
        const res = await api.get("/rpjmd", {
          params: { jenis_dokumen: dokumen, tahun },
        });
        const first = extractListData(res.data)[0];
        if (first?.id) {
          setRpjmdId(first.id);
        }
      } catch {
        console.error("Gagal memuat RPJMD");
      }
    };

    fetchRpjmdId();
  }, [dokumen, tahun]);

  useEffect(() => {
    if (!dokumen || !tahun || !user?.periode_id) return;
    (async () => {
      try {
        setLoading(true);
        const [visiRes, misiRes] = await Promise.all([
          api.get("/visi", { params: { jenis_dokumen: dokumen, tahun } }),
          api.get("/misi", { params: { jenis_dokumen: dokumen, tahun } }),
        ]);
        setVisiList(normalizeListItems(visiRes.data));
        setMisiList(normalizeListItems(misiRes.data));
        setErrorMsg("");
      } catch {
        setErrorMsg("Gagal memuat data, silakan refresh halaman.");
      } finally {
        setLoading(false);
      }
    })();
  }, [dokumen, tahun, user?.periode_id]);

  useEffect(() => {
    if (!selectedId && formData.visiId) {
      const misiPadaVisi = misiList.filter(
        (m) => String(m.visi_id) === formData.visiId
      );
      const nextNoMisi = misiPadaVisi.length + 1;
      setFormData((prev) => ({ ...prev, noMisi: nextNoMisi.toString() }));
      const selectedVisi = visiList.find(
        (v) => String(v.id) === formData.visiId
      );
      setVisiPreview(selectedVisi?.isi_visi || "");
    } else if (!formData.visiId) {
      setVisiPreview("");
    }
  }, [formData.visiId, misiList, selectedId, visiList]);

  const handleVisiChange = (e) => {
    const visiId = e.target.value;
    setFormData((prev) => ({ ...prev, visiId, noMisi: "" }));
  };

  const handleCancel = () => {
    setSelectedId(null);
    setFormData(initialFormData);
    setVisiPreview("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const payload = {
      rpjmd_id: rpjmdId,
      visi_id: formData.visiId,
      no_misi: parseInt(formData.noMisi, 10),
      isi_misi: formData.misi,
      deskripsi: formData.deskripsi,
      jenis_dokumen: dokumen,
      tahun: tahun,
      periode_id: user?.periode_id,
    };

    if (!rpjmdId) {
      alert("Data RPJMD tidak tersedia.");
      return;
    }

    try {
      if (selectedId) {
        await api.put(`/misi/${selectedId}`, payload);
        setSuccessMsg("Misi berhasil diperbarui.");
      } else {
        await api.post("/misi", payload);
        setSuccessMsg("Misi berhasil ditambahkan.");
      }
      const misiRes = await api.get("/misi", {
        params: { jenis_dokumen: dokumen, tahun },
      });
      setMisiList(normalizeListItems(misiRes.data));
      handleCancel();
      setActiveTab("daftar");
    } catch {
      setErrorMsg("Gagal simpan misi.");
    }
  };

  const handleEdit = (item) => {
    setSelectedId(item.id);
    setFormData({
      visiId: item.visi_id?.toString() || "",
      noMisi: item.no_misi?.toString() || "",
      misi: item.isi_misi || "",
      deskripsi: item.deskripsi || "",
    });
    setVisiPreview(item.visi?.isi_visi || "");
    setActiveTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus misi ini?")) return;
    try {
      await api.delete(`/misi/${id}`);
      const misiRes = await api.get("/misi", {
        params: { jenis_dokumen: dokumen, tahun },
      });
      setMisiList(normalizeListItems(misiRes.data));
      if (selectedId === id) handleCancel();
    } catch {
      setErrorMsg("Gagal hapus misi.");
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Container className="my-4">
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item href="/dashboard">Dashboard</Breadcrumb.Item>
        <Breadcrumb.Item active>Manajemen Misi</Breadcrumb.Item>
      </Breadcrumb>

      <div className="mb-3">
        <strong>Dokumen Aktif:</strong> {dokumen} <br />
        <strong>Tahun:</strong> {tahun}
      </div>

      {errorMsg && (
        <Alert variant="danger" onClose={() => setErrorMsg("")} dismissible>
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" onClose={() => setSuccessMsg("")} dismissible>
          {successMsg}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(key) => setActiveTab(key)}
            className="mb-3"
          >
            <Tab
              eventKey="form"
              title={selectedId ? "Edit Misi" : "Tambah Misi"}
            >
              <Form onSubmit={handleSubmit} className="pt-3">
                <Form.Group className="mb-3">
                  <Form.Label>Visi</Form.Label>
                  <Form.Select
                    name="visiId"
                    value={formData.visiId}
                    onChange={handleVisiChange}
                    required
                  >
                    <option value="">-- Pilih Visi --</option>
                    {visiList.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.isi_visi.substring(0, 120)}...
                      </option>
                    ))}
                  </Form.Select>
                  {visiPreview && (
                    <Form.Text className="text-muted">{visiPreview}</Form.Text>
                  )}
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>No. Misi</Form.Label>
                  <Form.Control
                    type="number"
                    name="noMisi"
                    value={formData.noMisi}
                    onChange={handleChange}
                    placeholder="Auto sesuai tabel"
                    required
                    readOnly={!!selectedId}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Pernyataan Misi</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="misi"
                    rows={3}
                    value={formData.misi}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Deskripsi (Opsional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="deskripsi"
                    rows={2}
                    value={formData.deskripsi}
                    onChange={handleChange}
                  />
                </Form.Group>
                <div className="d-flex justify-content-end gap-2">
                  <Button
                    variant="secondary"
                    type="reset"
                    onClick={handleCancel}
                  >
                    {selectedId ? "Batal" : "Reset"}
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={!rpjmdId || loading}
                  >
                    {selectedId ? "Update" : "Simpan"}
                  </Button>
                </div>
              </Form>
            </Tab>
            <Tab eventKey="daftar" title="Daftar Misi">
              <Table striped bordered hover className="mt-3">
                <thead>
                  <tr>
                    <th>Visi</th>
                    <th>No. Misi</th>
                    <th>Misi</th>
                    <th>Deskripsi</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {misiList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center">
                        Tidak ada data misi.
                      </td>
                    </tr>
                  ) : (
                    misiList.map((m) => (
                      <tr key={m.id}>
                        <td>{m.visi?.isi_visi.substring(0, 30)}...</td>
                        <td>{m.no_misi}</td>
                        <td>{m.isi_misi}</td>
                        <td>{m.deskripsi}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleEdit(m)}
                          >
                            Ubah
                          </Button>{" "}
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(m.id)}
                          >
                            Hapus
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  );
}
