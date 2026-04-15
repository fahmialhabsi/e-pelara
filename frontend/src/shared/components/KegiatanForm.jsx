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
import Select from "react-select";
import useKegiatanFormLogic from "@/features/rpjmd/hooks/useKegiatanFormLogic";
import { formatProgramOptionLabel } from "@/utils/programDisplayLabel";
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
    masterKegiatanOptions,
    masterKegiatanLoading,
    applyMasterKegiatanSelection,
    selectedMasterKegiatanOption,
    hasMasterKegiatanList,
    kodeKegiatanOutsideMaster,
    masterProgramsLoading,
  } = useKegiatanFormLogic(existingData, onSubmitSuccess);

  const { dokumen, tahun } = useDokumen();
  const navigate = useNavigate();

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
                    onChange={handleProgramChange}
                    required
                    disabled={false}
                  >
                    <option value="">-- Pilih Program --</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatProgramOptionLabel(p)}
                      </option>
                    ))}
                  </Form.Select>
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

              <Tab eventKey="kegiatan" title="Kegiatan">
                {!kegiatanData.program_id ? (
                  <Alert variant="info" className="mt-3">
                    Pilih <strong>Program</strong> di tab Informasi Umum terlebih
                    dahulu agar daftar kegiatan master bisa dimuat.
                  </Alert>
                ) : null}

                {kegiatanData.program_id &&
                (masterProgramsLoading || masterKegiatanLoading) ? (
                  <div className="text-muted small mt-3 mb-2">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Memuat referensi kegiatan dari master…
                  </div>
                ) : null}

                {hasMasterKegiatanList ? (
                  <Form.Group className="mb-3 mt-3">
                    <Form.Label>Pilih kegiatan (master referensi)</Form.Label>
                    <Select
                      classNamePrefix="ep-master-kegiatan"
                      options={masterKegiatanOptions}
                      value={selectedMasterKegiatanOption}
                      onChange={(opt) => applyMasterKegiatanSelection(opt)}
                      isClearable
                      isSearchable
                      isDisabled={isPelaksana}
                      placeholder="Cari kode atau nama kegiatan…"
                      noOptionsMessage={() => "Tidak ada data"}
                    />
                    <Form.Text className="text-muted d-block mt-1">
                      Data dari <code>/api/master/kegiatan</code> mengikuti
                      kode program yang dipilih. Satu baris mengisi kode dan nama
                      kegiatan.
                    </Form.Text>
                  </Form.Group>
                ) : kegiatanData.program_id &&
                  !masterProgramsLoading &&
                  !masterKegiatanLoading ? (
                  <Alert variant="light" className="mt-3 border">
                    Tidak ada baris kegiatan master untuk program ini (kode
                    program RPJMD tidak cocok dengan master, atau master
                    belum diimpor). Isi kode dan nama kegiatan manual di bawah.
                  </Alert>
                ) : null}

                {kodeKegiatanOutsideMaster ? (
                  <Alert variant="warning" className="mb-3">
                    Kode/nama kegiatan tidak cocok dengan baris master. Sesuaikan
                    manual atau pilih dari daftar di atas.
                  </Alert>
                ) : null}

                {hasMasterKegiatanList &&
                selectedMasterKegiatanOption &&
                !kodeKegiatanOutsideMaster ? (
                  <>
                    <Form.Control
                      type="hidden"
                      name="kode_kegiatan"
                      value={kegiatanData.kode_kegiatan || ""}
                    />
                    <Form.Control
                      type="hidden"
                      name="nama_kegiatan"
                      value={kegiatanData.nama_kegiatan || ""}
                    />
                  </>
                ) : (
                  <>
                    <Form.Group className="mb-3 mt-3">
                      <Form.Label>Kode Kegiatan</Form.Label>
                      <Form.Control
                        type="text"
                        name="kode_kegiatan"
                        value={kegiatanData.kode_kegiatan || ""}
                        onChange={handleChange}
                        required
                        disabled={isPelaksana}
                        isInvalid={duplicateField === "kode_kegiatan"}
                      />
                      {checking && (
                        <Spinner
                          animation="border"
                          size="sm"
                          className="ms-2"
                        />
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
                        onChange={handleChange}
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
                  </>
                )}
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
