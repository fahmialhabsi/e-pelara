// components/forms/SasaranForm.jsx
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
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { usePeriodeAktif } from "../../features/rpjmd/hooks/usePeriodeAktif";
import { toast } from "react-toastify";
import {
  extractListData,
  normalizeListItems,
} from "../../utils/apiResponse";
import { konteksBannerRows } from "../../utils/planningDokumenUtils";

function SasaranForm({ existingData, onSubmitSuccess, onCancel }) {
  const { user, loading: authLoading } = useAuth();
  const {
    dokumen,
    tahun,
    periode_id: currentPeriodeId,
    periodeList,
    loading: periodeAktifLoading,
  } = usePeriodeAktif();
  const periodeAktif = periodeList.find(
    (p) => String(p.id) === String(currentPeriodeId),
  );
  const navigate = useNavigate();
  const isEdit = Boolean(existingData?.id);

  const [rpjmdList, setRpjmdList] = useState([]);
  const [tujuanList, setTujuanList] = useState([]);
  const [isiTujuanPreview, setIsiTujuanPreview] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState("struktur");

  const initialFormData = {
    rpjmd_id: "",
    tujuan_id: "",
    no_tujuan: "",
    isi_tujuan: "",
    nomor: "",
    isi_sasaran: "",
    periode_id: "",
    jenis_dokumen: "",
    tahun: "",
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    const fetchData = async () => {
      if (
        authLoading ||
        periodeAktifLoading ||
        !dokumen ||
        !tahun ||
        !currentPeriodeId
      ) {
        setIsLoadingData(true);
        return;
      }

      setIsLoadingData(true);

      try {
        const [rpjmdRes, tujuanRes] = await Promise.all([
          api.get("/rpjmd", { params: { jenis_dokumen: dokumen, tahun } }),
          api.get("/tujuan", {
            params: {
              jenis_dokumen: dokumen,
              tahun,
              periode_id: currentPeriodeId,
            },
          }),
        ]);

        const rpjmdData = extractListData(rpjmdRes.data);
        const tujuanData = normalizeListItems(tujuanRes.data);

        setRpjmdList(rpjmdData);
        setTujuanList(tujuanData);

        let tujuanId = "";

        if (isEdit && existingData) {
          tujuanId = String(
            existingData.tujuan_id ?? existingData.tujuan?.id ?? ""
          );

          let matchedTujuan = tujuanData.find((t) => String(t.id) === tujuanId);

          if (!matchedTujuan && tujuanData.length > 0) {
            tujuanId = String(tujuanData[0].id);
            matchedTujuan = tujuanData[0];
          }

          setFormData({
            rpjmd_id: existingData.rpjmd_id || rpjmdData[0]?.id || "",
            tujuan_id: tujuanId,
            no_tujuan: existingData.no_tujuan || matchedTujuan?.no_tujuan || "",
            isi_tujuan:
              existingData.isi_tujuan || matchedTujuan?.isi_tujuan || "",
            nomor: existingData.nomor || "",
            isi_sasaran: existingData.isi_sasaran || "",
            periode_id: existingData.periode_id || currentPeriodeId,
            jenis_dokumen: existingData.jenis_dokumen || dokumen,
            tahun: existingData.tahun || tahun,
          });

          console.log("FormData saat tujuan dipilih:", formData);

          if (matchedTujuan) setIsiTujuanPreview(matchedTujuan.isi_tujuan);

          console.log("✅ Set tujuan_id:", tujuanId);
        } else {
          setFormData((prev) => ({
            ...prev,
            rpjmd_id: rpjmdData[0]?.id || "",
            periode_id: currentPeriodeId,
            jenis_dokumen: dokumen,
            tahun,
          }));
        }
      } catch (err) {
        console.error("Gagal memuat data:", err);
        toast.error("Gagal memuat data RPJMD atau Tujuan.");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [
    authLoading,
    periodeAktifLoading,
    dokumen,
    tahun,
    currentPeriodeId,
    isEdit,
    existingData,
  ]);

  const handleTujuanChange = async (e) => {
    const selectedId = e.target.value;
    const periodeIdFromForm = formData.periode_id;
    const dokumenFromForm = formData.jenis_dokumen;
    const konteksTahunAngka = formData.tahun;

    setFormData((prev) => ({ ...prev, tujuan_id: selectedId }));
    setIsiTujuanPreview("");
    setIsLoadingData(true);

    if (
      !selectedId ||
      !periodeIdFromForm ||
      !dokumenFromForm ||
      !konteksTahunAngka
    ) {
      setIsLoadingData(false);
      return;
    }

    try {
      const selectedTujuan = tujuanList.find(
        (item) => String(item.id) === String(selectedId)
      );

      if (!selectedTujuan) {
        setIsLoadingData(false);
        return;
      }

      const res = await api.get("/sasaran/next-number", {
        params: {
          tujuan_id: selectedId,
          jenis_dokumen: dokumenFromForm,
          tahun: konteksTahunAngka,
        },
      });

      const prefix = `S${selectedTujuan.no_tujuan}`;
      const rawNext = res.data?.nextNomor;
      const nextSeq = Number.parseInt(String(rawNext), 10);
      const seq = Number.isFinite(nextSeq) && nextSeq > 0 ? nextSeq : 1;
      const formattedNo = `${prefix}-${String(seq).padStart(2, "0")}`;

      setIsiTujuanPreview(selectedTujuan.isi_tujuan);
      setFormData((prev) => ({
        ...prev,
        no_tujuan: selectedTujuan.no_tujuan,
        isi_tujuan: selectedTujuan.isi_tujuan,
        nomor: formattedNo,
        isi_sasaran: "",
      }));
    } catch (err) {
      console.error("Gagal mengambil sasaran:", err);
      toast.error("Gagal memuat daftar sasaran.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.tujuan_id ||
      !formData.isi_sasaran.trim() ||
      !currentPeriodeId
    ) {
      toast.error("Harap lengkapi Tujuan, Sasaran, dan Periode.");
      return;
    }

    try {
      const payload = {
        ...formData,
        periode_id: currentPeriodeId,
        jenis_dokumen: dokumen,
        tahun,
      };

      if (isEdit) {
        await api.put(`/sasaran/${existingData.id}`, payload);
        toast.success("Data berhasil diperbarui!");
      } else {
        const response = await api.post("/sasaran", payload);
        console.log("Response dari POST:", response.data);
        toast.success("Data berhasil ditambahkan!");
        setFormData({
          ...initialFormData,
          rpjmd_id: rpjmdList[0]?.id || "",
          periode_id: currentPeriodeId,
          jenis_dokumen: dokumen,
          tahun,
        });
        setIsiTujuanPreview("");
        setActiveTab("struktur");
      }

      onSubmitSuccess?.();
    } catch (err) {
      console.error("Gagal menyimpan:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Gagal menyimpan data Sasaran."
      );
    }
  };

  if (authLoading || periodeAktifLoading || isLoadingData) {
    return (
      <Container className="my-4 text-center">
        <Spinner animation="border" />
        <p>Memuat data...</p>
      </Container>
    );
  }

  if (!dokumen || !tahun || !currentPeriodeId) {
    return (
      <Container className="my-4 text-center">
        <p>
          Konteks dokumen atau periode aktif belum tersedia. Atur pemilihan dokumen
          di header aplikasi.
        </p>
      </Container>
    );
  }

  if (tujuanList.length === 0 && !isEdit) {
    return (
      <Container className="my-4 text-center">
        <p>
          Belum ada data Tujuan untuk periode / konteks dokumen aktif ini.
        </p>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate("/rpjmd/sasaran-list")}>
          Daftar Sasaran
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {isEdit ? "Edit Sasaran" : "Tambah Sasaran"}
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="mb-3">
        {konteksBannerRows(dokumen, tahun, periodeAktif).map((r) => (
          <span key={r.key} className="d-block">
            <strong>{r.label}:</strong> {r.value}
          </span>
        ))}
      </div>

      <Card>
        <Card.Body>
          <Card.Title>{isEdit ? "Edit Sasaran" : "Tambah Sasaran"}</Card.Title>
          <Form onSubmit={handleSubmit}>
            <Tabs
              activeKey={activeTab}
              onSelect={setActiveTab}
              className="mb-3"
            >
              <Tab eventKey="struktur" title="Struktur">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Pilih Tujuan</Form.Label>
                  <Form.Select
                    name="tujuan_id"
                    value={String(formData.tujuan_id)}
                    onChange={handleTujuanChange}
                    required
                    disabled={tujuanList.length === 0}
                  >
                    <option value="">-- Pilih Tujuan --</option>
                    {tujuanList.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {`Tujuan ${m.no_tujuan}: ${m.isi_tujuan.slice(
                          0,
                          50
                        )}...`}
                      </option>
                    ))}
                  </Form.Select>
                  {isiTujuanPreview && (
                    <Form.Text>{isiTujuanPreview}</Form.Text>
                  )}
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>RPJMD</Form.Label>
                  <Form.Control
                    type="text"
                    readOnly
                    value={
                      rpjmdList.find((r) => r.id === formData.rpjmd_id)
                        ?.nama_rpjmd || "Tidak tersedia"
                    }
                  />
                </Form.Group>
              </Tab>
              <Tab eventKey="detail" title="Detail Sasaran">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Nomor Sasaran</Form.Label>
                  <Form.Control
                    type="text"
                    name="nomor"
                    value={formData.nomor}
                    readOnly
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Nama Sasaran</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="isi_sasaran"
                    value={formData.isi_sasaran}
                    onChange={handleChange}
                    rows={3}
                    required
                  />
                </Form.Group>
              </Tab>
            </Tabs>

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={onCancel ?? (() => navigate("/rpjmd/sasaran-list"))}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  isLoadingData ||
                  !formData.tujuan_id ||
                  !formData.isi_sasaran.trim() ||
                  !currentPeriodeId
                }
              >
                {isEdit ? "Update" : "Simpan"}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default SasaranForm;
