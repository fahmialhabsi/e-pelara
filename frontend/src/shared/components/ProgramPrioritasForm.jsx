import React, { useState, useMemo } from "react";
import {
  Form,
  Button,
  Card,
  Spinner,
  Breadcrumb,
  Tabs,
  Tab,
  Toast,
  ToastContainer,
  Alert,
} from "react-bootstrap";
import Select from "react-select";
import useProgramFormLogic from "@/features/rpjmd/hooks/useProgramFormLogic";
import { usePeriode } from "@/contexts/PeriodeContext";
import {
  formatMasterProgramLabel,
} from "@/services/masterService";
import { normalizeProgramKodeForDisplay } from "@/utils/programDisplayLabel";

export default function ProgramPrioritasForm({
  existingData,
  onSubmitSuccess,
}) {
  const {
    id: rpjmd_id,
    tahun_awal,
    tahun_akhir,
    loading: periodeLoading,
  } = usePeriode();

  const [activeTab, setActiveTab] = useState("struktur");
  const {
    isEdit,
    isPelaksana,
    isPengawas,
    loading,
    programData,
    misis,
    tujuans,
    sasarans,
    strategis,
    filteredSasarans,
    filteredStrategis,
    filteredAras,
    bidangOptions,
    opdEntries,
    opdSelectOptions,
    handleChange,
    handleMultiChange,
    handleBidangChange,
    handleSubmit,
    submitting,
    toast,
    setToast,
    navigate,
    handleCancel,
    errorMsg,
    masterPrograms,
    masterProgramsLoading,
    masterDatasetKey,
    masterProgramsAllDatasets,
    masterProgramsError,
  } = useProgramFormLogic(existingData, onSubmitSuccess, tahun_awal);

  const multiSelectValue = (selected) =>
    Array.isArray(selected) ? selected : [];

  const strategiOptions = useMemo(
    () =>
      filteredStrategis.map((s) => ({
        value: s.id,
        label: `${s.kode_strategi} – ${s.deskripsi}`,
      })),
    [filteredStrategis]
  );

  const arahOptions = useMemo(
    () =>
      filteredAras.map((a) => ({
        value: a.id,
        label: `${a.kode_arah} – ${a.deskripsi}`,
      })),
    [filteredAras]
  );

  const selectedOpdValue = useMemo(() => {
    const opts = opdSelectOptions || [];
    return (
      opts.find(
        (o) => String(o.value) === String(programData.opd_penanggung_jawab),
      ) || null
    );
  }, [opdSelectOptions, programData.opd_penanggung_jawab]);

  const masterProgramOptions = useMemo(
    () =>
      (masterPrograms || []).map((p) => ({
        value: String(p.id),
        label: formatMasterProgramLabel(p),
        kode: normalizeProgramKodeForDisplay(
          p.kode_program_full || p.kode_program || "",
        ),
        nama: String(p.nama_program || "").trim(),
      })),
    [masterPrograms],
  );

  const selectedMasterOption = useMemo(() => {
    const k = normalizeProgramKodeForDisplay(programData.kode_program || "");
    const n = String(programData.nama_program || "").trim();
    if (!k && !n) return null;
    const byKode = masterProgramOptions.find((o) => o.kode === k);
    if (byKode) return byKode;
    if (n) {
      return masterProgramOptions.find((o) => o.nama === n) || null;
    }
    return null;
  }, [
    masterProgramOptions,
    programData.kode_program,
    programData.nama_program,
  ]);

  const hasMasterList = masterProgramOptions.length > 0;
  const kodeOutsideMaster =
    hasMasterList &&
    (Boolean(String(programData.kode_program || "").trim()) ||
      Boolean(String(programData.nama_program || "").trim())) &&
    !selectedMasterOption;

  const applyMasterSelection = (opt) => {
    if (!opt) {
      handleChange({ target: { name: "kode_program", value: "" } });
      handleChange({ target: { name: "nama_program", value: "" } });
      return;
    }
    handleChange({ target: { name: "kode_program", value: opt.kode } });
    handleChange({ target: { name: "nama_program", value: opt.nama } });
  };

  if (periodeLoading || loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-3">
          {periodeLoading
            ? "Memuat periode..."
            : loading
            ? "Memuat data..."
            : ""}
        </p>
      </div>
    );
  }

  return (
    <>
      {(isPelaksana || isPengawas) && (
        <Alert variant="warning">
          Anda tidak diizinkan menambah atau mengedit program. Anda hanya
          diizinkan untuk Kegiatan, Sub Kegiatan, dan Indikator.
        </Alert>
      )}

      <Breadcrumb className="mt-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate("/program-list")}>
          Daftar Program
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {isEdit ? "Edit Program" : "Tambah Program"}
        </Breadcrumb.Item>
      </Breadcrumb>

      <Card>
        <Card.Body>
          <Card.Title>
            {isEdit ? "Edit" : "Tambah"} Program Prioritas
          </Card.Title>
          <Form onSubmit={handleSubmit}>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-3"
            >
              <Tab eventKey="struktur" title="Struktur RPJMD">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>ID RPJMD</Form.Label>
                  <Form.Control
                    type="text"
                    value={programData.rpjmd_id}
                    readOnly
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Misi</Form.Label>
                  <Form.Select
                    name="misi_id"
                    value={programData.misi_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Pilih Misi --</option>
                    {misis.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.no_misi} - {m.isi_misi}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Tujuan</Form.Label>
                  <Form.Select
                    name="tujuan_id"
                    value={programData.tujuan_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Pilih Tujuan --</option>
                    {tujuans
                      .filter(
                        (t) => String(t.misi_id) === String(programData.misi_id)
                      )
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.no_tujuan} - {t.isi_tujuan}
                        </option>
                      ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Sasaran</Form.Label>
                  <Form.Select
                    name="sasaran_id"
                    value={programData.sasaran_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Pilih Sasaran --</option>
                    {Array.isArray(filteredSasarans) &&
                    filteredSasarans.length > 0 ? (
                      filteredSasarans.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nomor} – {s.isi_sasaran}
                        </option>
                      ))
                    ) : (
                      <option disabled>– Tidak ada sasaran tersedia –</option>
                    )}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Strategi (Berdasarkan Sasaran Terpilih)
                  </Form.Label>
                  <Select
                    options={strategiOptions}
                    isMulti
                    isClearable
                    value={programData.strategi_ids || []}
                    onChange={(val) => handleMultiChange("strategi_ids", val)}
                    placeholder="Pilih strategi yang mendukung sasaran..."
                  />
                  <Form.Text className="text-muted">
                    Pilih satu atau lebih strategi yang sesuai dengan sasaran
                    RPJMD.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    Arah Kebijakan (Berdasarkan Strategi yang Tersedia)
                  </Form.Label>
                  <Select
                    options={arahOptions}
                    isMulti
                    isClearable
                    value={multiSelectValue(programData.arah_ids) || []}
                    onChange={(val) => handleMultiChange("arah_ids", val)}
                    placeholder="Pilih arah kebijakan yang relevan..."
                  />
                  <Form.Text className="text-muted">
                    Arah kebijakan ditentukan berdasarkan strategi yang tersedia
                    pada sasaran.
                  </Form.Text>
                </Form.Group>
              </Tab>

              <Tab eventKey="program" title="Data Program">
                {hasMasterList ? (
                  <Form.Group className="mb-3 mt-3">
                    <Form.Label>Pilih program (master referensi)</Form.Label>
                    {masterProgramsLoading ? (
                      <div className="text-muted small mb-2">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Memuat daftar program…
                      </div>
                    ) : null}
                    <Select
                      classNamePrefix="ep-master-program"
                      options={masterProgramOptions}
                      value={selectedMasterOption}
                      onChange={(opt) => applyMasterSelection(opt)}
                      isClearable
                      isSearchable
                      placeholder="Cari kode atau nama program…"
                      noOptionsMessage={() => "Tidak ada data"}
                    />
                    <Form.Text className="text-muted d-block mt-1">
                      Data dari <code>/api/master/program</code>
                      {masterProgramsAllDatasets
                        ? " (semua dataset_key — impor Anda mungkin memakai key selain default)"
                        : masterDatasetKey
                          ? ` (datasetKey: ${masterDatasetKey})`
                          : " (dataset default sekretariat_bidang_sheet2)"}
                      . Pilih satu baris untuk mengisi kode dan nama.
                    </Form.Text>
                  </Form.Group>
                ) : (
                  !masterProgramsLoading && (
                    <Alert variant="light" className="mt-3 border">
                      Master program kosong atau tidak dapat dimuat.
                      {masterProgramsError ? (
                        <>
                          {" "}
                          <strong>Detail:</strong> {masterProgramsError}
                        </>
                      ) : null}{" "}
                      Isi kode dan nama secara manual di bawah, jalankan impor
                      Sheet2/CSV di backend, atau set{" "}
                      <code>VITE_MASTER_DATASET_KEY</code> agar sama dengan{" "}
                      <code>dataset_key</code> baris di tabel{" "}
                      <code>master_program</code>.
                    </Alert>
                  )
                )}

                {kodeOutsideMaster ? (
                  <Alert variant="warning" className="mb-3">
                    Kode/nama program saat ini tidak cocok dengan baris master.
                    Sesuaikan manual atau pilih dari daftar di atas.
                  </Alert>
                ) : null}

                {hasMasterList &&
                selectedMasterOption &&
                !kodeOutsideMaster ? (
                  <>
                    <Form.Control
                      type="hidden"
                      name="kode_program"
                      value={programData.kode_program || ""}
                    />
                    <Form.Control
                      type="hidden"
                      name="nama_program"
                      value={programData.nama_program || ""}
                    />
                  </>
                ) : (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Kode Program</Form.Label>
                      <Form.Control
                        type="text"
                        name="kode_program"
                        value={programData.kode_program || ""}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Nama Program</Form.Label>
                      <Form.Control
                        type="text"
                        name="nama_program"
                        value={programData.nama_program || ""}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </>
                )}

                <Form.Group className="mb-3">
                  <Form.Label>Prioritas</Form.Label>
                  <Form.Select
                    name="prioritas"
                    value={programData.prioritas}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Pilih Prioritas --</option>
                    <option value="Rendah">Rendah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                  </Form.Select>
                </Form.Group>
              </Tab>

              <Tab eventKey="penanggungjawab" title="Penanggung Jawab">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>OPD Penanggung Jawab</Form.Label>
                  {(opdSelectOptions || []).length === 0 ? (
                    <div className="text-muted fst-italic">
                      Memuat daftar OPD…
                    </div>
                  ) : (
                    <Select
                      options={opdSelectOptions}
                      value={selectedOpdValue}
                      onChange={(sel) =>
                        handleChange({
                          target: {
                            name: "opd_penanggung_jawab",
                            value: sel?.value || "",
                          },
                        })
                      }
                      isClearable
                      placeholder="-- Pilih OPD --"
                    />
                  )}
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Bidang Terkait</Form.Label>
                  <Select
                    options={bidangOptions || []}
                    value={programData.bidang_opd}
                    onChange={handleBidangChange}
                    isMulti
                    placeholder="Pilih bidang..."
                  />
                  <Form.Text className="text-muted">
                    {Array.isArray(programData.bidang_opd)
                      ? programData.bidang_opd.length
                      : 0}{" "}
                    bidang terpilih
                  </Form.Text>
                </Form.Group>
              </Tab>
            </Tabs>

            {errorMsg && (
              <Alert variant="danger" className="mt-3">
                {errorMsg}
              </Alert>
            )}

            <div className="d-flex gap-2 justify-content-between mt-3">
              <Button variant="secondary" onClick={handleCancel}>
                Reset
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner size="sm" /> Menyimpan…
                  </>
                ) : (
                  "Simpan"
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <ToastContainer position="top-end" className="p-3">
        <Toast
          show={toast.show}
          onClose={() => setToast({ ...toast, show: false })}
          delay={4000}
          autohide
          bg={toast.variant}
        >
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}
