// ✅ FIXED: VisiForm.js (Sinkron dengan Dokumen & Tahun aktif)
import React, { useEffect, useState } from "react";
import { Card, Form, Button, Alert, Spinner, Table } from "react-bootstrap";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useDokumen } from "../../hooks/useDokumen";
import { usePeriodeAktif } from "../../features/rpjmd/hooks/usePeriodeAktif";

const VisiForm = () => {
  const { user } = useAuth();
  const { periode_id, periodeList } = usePeriodeAktif();
  const { dokumen, tahun } = useDokumen();
  const [visiList, setVisiList] = useState([]);
  const [form, setForm] = useState({ isi_visi: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const periodeAktif = periodeList.find((p) => p.id === periode_id);

  const fetchVisi = async () => {
    try {
      setLoading(true);
      const response = await api.get("/visi", {
        params: {
          jenis_dokumen: dokumen,
          tahun: tahun,
        },
      });
      setVisiList(response.data);
    } catch (err) {
      console.error("Gagal memuat visi", err);
      setError("Gagal memuat visi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dokumen && tahun) {
      fetchVisi();
    }
  }, [dokumen, tahun]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEdit = (item) => {
    setForm({ isi_visi: item.isi_visi || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus visi ini?")) return;
    try {
      await api.delete(`/visi/${id}`);
      fetchVisi();
    } catch (err) {
      console.error("Gagal hapus visi:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!periodeAktif?.tahun_awal || !periodeAktif?.tahun_akhir) {
      setError(
        "Data periode aktif tidak lengkap. Coba pilih dokumen dan tahun lain."
      );
      return;
    }

    try {
      await api.post("/visi", {
        ...form,
        jenis_dokumen: dokumen,
        tahun: tahun,
        periode_id,
        tahun_awal: periodeAktif?.tahun_awal,
        tahun_akhir: periodeAktif?.tahun_akhir,
      });

      setSuccess("Visi berhasil ditambahkan.");
      setForm({ isi_visi: "" });
      fetchVisi();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal menyimpan visi");
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-primary text-white">
        📘 Form Visi RPJMD
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <div className="mb-3">
          <strong>Dokumen Aktif:</strong> {dokumen} <br />
          <strong>Tahun:</strong> {tahun}
        </div>

        <Form onSubmit={handleSubmit} className="mb-4">
          <Form.Group controlId="visiTextarea">
            <Form.Label>Isi Visi</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="isi_visi"
              value={form.isi_visi}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Button type="submit" className="mt-3">
            Simpan Visi
          </Button>
        </Form>

        <h5>📄 Daftar Visi RPJMD</h5>
        {loading ? (
          <Spinner animation="border" />
        ) : (
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>#</th>
                <th>Isi Visi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visiList.map((visi, index) => (
                <tr key={visi.id}>
                  <td>{index + 1}</td>
                  <td>{visi.isi_visi}</td>
                  <td>
                    <Button size="sm" onClick={() => handleEdit(visi)}>
                      Ubah
                    </Button>{" "}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(visi.id)}
                    >
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

export default VisiForm;
