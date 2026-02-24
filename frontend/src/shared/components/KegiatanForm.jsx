// components/forms/KegiatanForm.jsx
import React from "react";
import {
  Form,
  Button,
  Alert,
  Tabs,
  Tab,
  Spinner,
  Container,
  Breadcrumb,
  Card,
} from "react-bootstrap";
import useKegiatanFormLogic from "@/features/rpjmd/hooks/useKegiatanFormLogic";
import { useDokumen } from "@/hooks/useDokumen";
import { useNavigate } from "react-router-dom";

function KegiatanForm({ existingData, onSubmitSuccess }) {
  const {
    kegiatanData,
    programs,
    duplicateField,
    checking,
    errorMsg,
    successMsg,
    isEdit,
    isPelaksana,
    loading,
    activeTab,
    setActiveTab,
    handleChange,
    handleSubmit,
    handleCancel,
    handleProgramChange,
    programsLoading,
    programsError,
  } = useKegiatanFormLogic(existingData, onSubmitSuccess);

  const { dokumen, tahun } = useDokumen();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (programs.length > 0 || kegiatanData.program_id) {
      console.log("isPelaksana", isPelaksana);
      console.log("program_id sekarang:", kegiatanData.program_id);
      console.log(
        "options:",
        programs.map((p) => p.id)
      );
    }
  }, [programs, kegiatanData.program_id]);

  if (programsLoading) {
    return (
      <Container className="my-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Memuat data program...</p>
      </Container>
    );
  }

  if (programsError) {
    return (
      <Container className="my-4 text-center">
        <Alert variant="danger">
          Gagal memuat data program. Silakan coba refresh halaman atau hubungi
          admin.
        </Alert>
      </Container>
    );
  }

  if (!programsLoading && programs.length === 0) {
    return (
      <Container className="my-4 text-center">
        <Alert variant="warning">
          Tidak ada data program yang tersedia. Pastikan data program sudah
          diinput untuk tahun <strong>{kegiatanData.tahun}</strong> dan jenis
          dokumen <strong>{kegiatanData.jenis_dokumen}</strong>.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate("/kegiatan-list")}>
          Daftar Kegiatan
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {isEdit ? "Edit Kegiatan" : "Tambah Kegiatan"}
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="mb-3">
        <strong>Dokumen Aktif:</strong> {dokumen || "-"} <br />
        <strong>Tahun:</strong> {tahun || "-"}
      </div>

      {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      <Card>
        <Card.Body>
          <Card.Title>
            {isEdit ? "Edit Kegiatan Prioritas" : "Tambah Kegiatan Prioritas"}
          </Card.Title>

          <Form onSubmit={handleSubmit}>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-3"
            >
              <Tab eventKey="umum" title="Informasi Umum">
                <Form.Group className="mb-3">
                  <Form.Label>Program</Form.Label>
                  <Form.Select
                    name="program_id"
                    value={kegiatanData.program_id}
                    onChange={(e) => {
                      console.log("Dropdown changed"); // test log
                      handleProgramChange(e);
                    }}
                    required
                    disabled={false}
                  >
                    <option value="">-- Pilih Program --</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.kode_program}: {p.nama_program}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Kode Kegiatan</Form.Label>
                  <Form.Control
                    type="text"
                    name="kode_kegiatan"
                    value={kegiatanData.kode_kegiatan || ""}
                    onChange={(e) => {
                      console.log(
                        "Form:onChange:",
                        e.target.name,
                        e.target.value
                      );
                      handleChange(e);
                    }}
                    required
                    disabled={isPelaksana}
                    isInvalid={duplicateField === "kode_kegiatan"}
                  />
                  {checking && (
                    <Spinner animation="border" size="sm" className="ms-2" />
                  )}
                  {duplicateField === "kode_kegiatan" && (
                    <Form.Text className="text-danger">
                      Kode kegiatan sudah digunakan di periode ini.
                    </Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Nama Kegiatan</Form.Label>
                  <Form.Control
                    name="nama_kegiatan"
                    value={kegiatanData.nama_kegiatan || ""}
                    onChange={(e) => {
                      console.log(
                        "Form:onChange:",
                        e.target.name,
                        e.target.value
                      );
                      handleChange(e);
                    }}
                    required
                    disabled={isPelaksana}
                    isInvalid={duplicateField === "nama_kegiatan"}
                  />
                  {duplicateField === "nama_kegiatan" && (
                    <Form.Text className="text-danger">
                      Nama kegiatan sudah digunakan di periode ini.
                    </Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>OPD Penanggung Jawab</Form.Label>
                  <Form.Control
                    name="opd_penanggung_jawab"
                    value={kegiatanData.opd_penanggung_jawab}
                    plaintext
                    readOnly
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Bidang OPD Penanggung Jawab</Form.Label>
                  <Form.Control
                    name="bidang_opd_penanggung_jawab"
                    value={kegiatanData.bidang_opd_penanggung_jawab}
                    plaintext
                    readOnly
                  />
                </Form.Group>

                <Alert variant="info" className="mt-3">
                  💡 <strong>Total Pagu Anggaran</strong> kegiatan akan dihitung{" "}
                  <em>otomatis</em> berdasarkan jumlah seluruh sub kegiatan yang
                  memiliki kode diawali dengan kode kegiatan ini. Anda tidak
                  perlu mengisi nilai manual.
                </Alert>

                {/* Hidden fields */}
                <Form.Control
                  type="hidden"
                  name="tahun"
                  value={kegiatanData.tahun || ""}
                />
                <Form.Control
                  type="hidden"
                  name="jenis_dokumen"
                  value={kegiatanData.jenis_dokumen || ""}
                />
                <Form.Control
                  type="hidden"
                  name="bidang_opd_penanggung_jawab"
                  value={kegiatanData.bidang_opd_penanggung_jawab || ""}
                />
              </Tab>
            </Tabs>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" type="reset" onClick={handleCancel}>
                Reset
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size="sm" animation="border" /> Menyimpan…
                  </>
                ) : (
                  "Simpan"
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default KegiatanForm;
