// src/components/ProgramPrioritasEdit.jsx
import React from "react";
import {
  Form,
  Button,
  Card,
  Alert,
  Spinner,
  Tabs,
  Tab,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import Select from "react-select";
import { useParams, useNavigate } from "react-router-dom";
import { usePeriode } from "@/contexts/PeriodeContext";
import useProgramFormLogic from "../../features/rpjmd/hooks/useProgramFormLogic";

function ProgramPrioritasEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading: periodeLoading, tahun_awal } = usePeriode();
  const [tabWarning, setTabWarning] = React.useState(null);

  const {
    isEdit,
    isPelaksana,
    isPengawas,
    loading,
    programData,
    misis,
    tujuans,
    sasarans,
    filteredSasarans = [],
    filteredStrategis = [],
    filteredAras = [],
    bidangOptions,
    uniqueOpds,
    opdEntries = [],
    allArahKebijakan,
    handleChange,
    handleMultiChange,
    handleBidangChange,
    handleSubmit,
    submitting,
    toast,
    setToast,
    handleCancel,
    handleClose,
    errorMsg: formErrorMsg,
    initCompleted,
  } = useProgramFormLogic(
    {},
    () =>
      navigate("/program-list", {
        state: {
          reload: true,
          message: "Program berhasil diperbarui",
          variant: "success",
        },
      }),
    tahun_awal
  );

  const selectedArahIds = programData.arah_ids || [];

  const arahIdValues = (selectedArahIds || []).map((a) =>
    typeof a === "object" ? a.value : a
  );

  const strategiIdValues = (programData.strategi_ids || []).map((s) =>
    typeof s === "object" ? s.value : s
  );

  const arahOptions = (filteredAras || [])
    .filter((arah) => arah?.id)
    .map((arah) => ({
      value: arah.id,
      label: `${arah.kode_arah || "?"} – ${
        arah.deskripsi || "(tanpa deskripsi)"
      }`.trim(),
    }));

  const [activeTab, setActiveTab] = React.useState("struktur");

  if (!initCompleted || loading) {
    return <Spinner className="my-5" />;
  }

  const strategiOptions = filteredStrategis.map((s) => ({
    value: s.id,
    label: `${s.kode_strategi} – ${s.deskripsi}`,
  }));

  const opdOptions = opdEntries.map((opd) => ({
    value: String(opd.id),
    label: opd.nama_opd,
  }));

  const selectedOpdOption = opdOptions.find(
    (o) => o.value === String(programData.opd_penanggung_jawab)
  );

  const onSubmit = (e) => {
    e.preventDefault();

    if (!programData.misi_id) {
      setActiveTab("struktur");
      return setTabWarning("Mohon pilih Misi terlebih dahulu.");
    }

    if (!programData.tujuan_id) {
      setActiveTab("struktur");
      return setTabWarning("Mohon pilih Tujuan terlebih dahulu.");
    }

    if (!programData.sasaran_id) {
      setActiveTab("struktur");
      return setTabWarning("Mohon pilih Sasaran terlebih dahulu.");
    }

    if (!programData.prioritas) {
      setActiveTab("program");
      return setTabWarning("Mohon pilih Prioritas Program.");
    }

    if (!programData.opd_penanggung_jawab) {
      setActiveTab("penanggungjawab");
      return setTabWarning("Mohon pilih OPD Penanggung Jawab.");
    }

    setTabWarning(null); // clear jika valid
    handleSubmit(e);
  };

  return (
    <Card key={programData.id} className="mt-4">
      <Card.Body>
        <Card.Title>Edit Program Prioritas</Card.Title>
        <Form onSubmit={onSubmit}>
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
                  value={String(programData.misi_id)}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Pilih Misi --</option>
                  {misis.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.no_misi} - {m.isi_misi}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Tujuan</Form.Label>
                <Form.Select
                  name="tujuan_id"
                  value={String(programData.tujuan_id)}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Pilih Tujuan --</option>
                  {tujuans
                    .filter(
                      (t) => String(t.misi_id) === String(programData.misi_id)
                    )
                    .map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.no_tujuan} - {t.isi_tujuan}
                      </option>
                    ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Sasaran</Form.Label>
                <Form.Select
                  name="sasaran_id"
                  value={String(programData.sasaran_id)}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Pilih Sasaran --</option>
                  {filteredSasarans.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.nomor} – {s.isi_sasaran}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Strategi</Form.Label>
                <Select
                  options={strategiOptions}
                  isMulti
                  value={programData.strategi_ids || []}
                  onChange={(val) => handleMultiChange("strategi_ids", val)}
                  placeholder="Pilih strategi..."
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Arah Kebijakan</Form.Label>
                <Select
                  options={arahOptions}
                  isMulti
                  value={programData.arah_ids || []}
                  onChange={(val) => handleMultiChange("arah_ids", val)}
                  placeholder="Pilih arah kebijakan..."
                />
              </Form.Group>
            </Tab>

            <Tab eventKey="program" title="Data Program">
              <Form.Group className="mb-3 mt-3">
                <Form.Label>Kode Program</Form.Label>
                <Form.Control
                  type="text"
                  name="kode_program"
                  value={programData.kode_program}
                  readOnly
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Nama Program</Form.Label>
                <Form.Control
                  type="text"
                  name="nama_program"
                  value={programData.nama_program}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

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
                <Form.Select
                  name="opd_penanggung_jawab"
                  value={selectedOpdOption?.value || ""}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Pilih OPD --</option>
                  {opdOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Bidang Terkait (maksimal 2)</Form.Label>
                <Select
                  options={bidangOptions}
                  value={programData.bidang_opd || []}
                  onChange={handleBidangChange}
                  isMulti
                  placeholder="Pilih bidang..."
                />
                <Form.Text className="text-muted">
                  {(programData.bidang_opd || []).length} bidang terpilih
                </Form.Text>
              </Form.Group>
            </Tab>
          </Tabs>

          <ToastContainer position="top-end" className="p-3">
            {tabWarning && (
              <Toast
                show={!!tabWarning}
                onClose={() => setTabWarning(null)}
                delay={3000}
                autohide
                bg="warning"
              >
                <Toast.Body className="text-dark">⚠️ {tabWarning}</Toast.Body>
              </Toast>
            )}
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

          <div className="d-flex gap-2 justify-content-between mt-3">
            <Button variant="secondary" onClick={handleCancel}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleClose}>
              Keluar
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
  );
}

export default ProgramPrioritasEdit;
