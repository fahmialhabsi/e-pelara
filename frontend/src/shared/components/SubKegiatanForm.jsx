// components/forms/SubKegiatanForm.jsx
import React, { useEffect, useState } from "react";
import {
  Container,
  Alert,
  Card,
  Button,
  Spinner,
  Tabs,
  Tab,
  Row,
  Col,
  Form,
  Breadcrumb,
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/services/api";
import useSubKegiatanFormLogic from "@/features/rpjmd/hooks/useSubKegiatanFormLogic";
import { useDokumen } from "@/hooks/useDokumen";

export default function SubKegiatanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dokumen, tahun } = useDokumen();

  const [existingData, setExistingData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(!!id);

  // ✅ Tambahkan fungsi redirect setelah submit berhasil
  const handleSuccessSubmit = () => {
    // Tunda navigasi sebentar agar server sempat menyimpan
    setTimeout(() => {
      navigate("/sub-kegiatan-list", {
        state: { reload: true }, // kirim flag untuk trigger fetch ulang
      });
    }, 500);
  };

  useEffect(() => {
    if (id) {
      api
        .get(`/sub-kegiatan/${id}`)
        .then((res) => {
          console.log("📦 SubKegiatan detail response:", res.data);
          setExistingData(res.data.data?.data || res.data.data);
        })
        .catch((err) => {
          console.error("❌ Gagal mengambil data sub kegiatan:", err);
        })
        .finally(() => setInitialLoading(false));
    }
  }, [id]);

  // ⬇️ Gunakan handleSuccessSubmit sebagai onSubmit
  const {
    message,
    setMessage,
    checking,
    formData,
    handleChange,
    handleSubmit,
    key,
    setKey,
    programList,
    kegiatanList,
    handleProgramChange,
    duplicateField,
    loading,
    onSubmit: propsOnSubmit,
  } = useSubKegiatanFormLogic(existingData, handleSuccessSubmit);

  if (initialLoading || loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Memuat data formulir...</p>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate("/sub-kegiatan-list")}>
          Daftar Sub Kegiatan
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {formData?.id ? "Edit Sub Kegiatan" : "Tambah Sub Kegiatan"}
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="mb-3">
        <strong>Dokumen Aktif:</strong> {dokumen || "-"} <br />
        <strong>Tahun:</strong> {tahun || "-"}
      </div>

      {message && (
        <Alert
          variant={/berhasil/i.test(message) ? "success" : "danger"}
          dismissible
          onClose={() => setMessage("")}
        >
          {message}
        </Alert>
      )}
      {checking && (
        <div className="mb-2">
          <Spinner animation="border" size="sm" className="me-2" />
          Memeriksa duplikasi...
        </div>
      )}

      <Card className="shadow-sm border-0">
        <Card.Body>
          <Card.Title className="mb-4">
            {formData.id ? "Edit" : "Tambah"} Sub Kegiatan
          </Card.Title>

          <Form onSubmit={handleSubmit}>
            <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-3">
              <Tab eventKey="informasi" title="Informasi Umum">
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Program</Form.Label>
                      <Form.Select
                        name="program_id"
                        value={formData.program_id}
                        onChange={(e) => handleProgramChange(e.target.value)}
                        required
                      >
                        <option value="">-- Pilih Program --</option>
                        {(programList || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.kode_program} - {p.nama_program}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group>
                      <Form.Label>Kegiatan</Form.Label>
                      <Form.Select
                        name="kegiatan_id"
                        value={formData.kegiatan_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">-- Pilih Kegiatan --</option>
                        {(kegiatanList || []).map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.kode_kegiatan} - {k.nama_kegiatan}
                          </option>
                        ))}
                      </Form.Select>
                      {formData?.kegiatan?.total_pagu_anggaran && (
                        <div className="mt-3">
                          <p className="mb-1 text-muted small">
                            💵 <strong>Total Pagu Kegiatan:</strong> Rp{" "}
                            {formData.kegiatan.total_pagu_anggaran.toLocaleString(
                              "id-ID"
                            )}
                          </p>
                          {formData.kegiatan.program?.total_pagu_anggaran && (
                            <p className="mb-0 text-muted small">
                              📊 <strong>Total Pagu Program:</strong> Rp{" "}
                              {formData.kegiatan.program.total_pagu_anggaran.toLocaleString(
                                "id-ID"
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Kode Sub Kegiatan</Form.Label>
                      <Form.Control
                        name="kode_sub_kegiatan"
                        value={formData.kode_sub_kegiatan}
                        onChange={handleChange}
                        isInvalid={duplicateField === "kode_sub_kegiatan"}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Nama Sub Kegiatan</Form.Label>
                      <Form.Control
                        name="nama_sub_kegiatan"
                        value={formData.nama_sub_kegiatan}
                        onChange={handleChange}
                        isInvalid={duplicateField === "nama_sub_kegiatan"}
                        required
                      />
                    </Form.Group>
                    <Form.Group className="mt-3">
                      <Form.Label>Pagu Anggaran</Form.Label>
                      <Form.Control
                        type="text"
                        name="pagu_anggaran"
                        value={formData.pagu_anggaran}
                        onChange={handleChange}
                        required
                      />
                      <Form.Text muted>
                        Nilai dalam rupiah. Hanya angka, titik akan ditambahkan
                        otomatis.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>
            </Tabs>

            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Nama OPD</Form.Label>
                  <Form.Control
                    name="nama_opd"
                    value={formData.nama_opd}
                    readOnly
                    plaintext
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Nama Bidang OPD</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    name="nama_bidang_opd"
                    value={formData.nama_bidang_opd}
                    readOnly
                    style={{ backgroundColor: "#f8f9fa", border: "none" }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Sub Bidang OPD</Form.Label>
                  <Form.Control
                    name="sub_bidang_opd"
                    value={formData.sub_bidang_opd}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="text-end mt-3">
              <Button variant="secondary" onClick={() => navigate(-1)}>
                Batal
              </Button>{" "}
              <Button variant="primary" type="submit">
                Simpan Sub Kegiatan
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
