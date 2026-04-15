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
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePeriodeAktif } from "../../features/rpjmd/hooks/usePeriodeAktif";
import { toast } from "react-toastify";
import { normalizeListItems } from "../../utils/apiResponse";

function StrategiForm({ existingData, onSubmitSuccess, onCancel }) {
  const isEdit = Boolean(existingData?.id);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    dokumen,
    tahun,
    periode_id: currentPeriodeId,
    loading: periodeAktifLoading,
  } = usePeriodeAktif();

  const [tujuanList, setTujuanList] = useState([]);
  const [sasaranList, setSasaranList] = useState([]);
  const [previewTujuan, setPreviewTujuan] = useState("");
  const [previewSasaran, setPreviewSasaran] = useState("");
  const [previewKode, setPreviewKode] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState("struktur");

  const initialFormData = {
    sasaran_id: "",
    tujuan_id: "",
    deskripsi: "",
    kode_strategi: "",
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

      try {
        const [sasaranRes, tujuanRes] = await Promise.all([
          api.get("/sasaran", {
            params: {
              jenis_dokumen: dokumen,
              tahun,
              periode_id: currentPeriodeId,
            },
          }),
          api.get("/tujuan", {
            params: {
              jenis_dokumen: dokumen,
              tahun,
              periode_id: currentPeriodeId,
            },
          }),
        ]);

        setTujuanList(normalizeListItems(tujuanRes.data));
        setSasaranList(normalizeListItems(sasaranRes.data));

        setFormData((prev) => ({
          ...prev,
          periode_id: currentPeriodeId,
          jenis_dokumen: dokumen,
          tahun,
        }));
      } catch (err) {
        console.error("Gagal memuat data:", err);
        toast.error("Gagal memuat data.");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [authLoading, periodeAktifLoading, dokumen, tahun, currentPeriodeId]);

  useEffect(() => {
    if (
      !isEdit ||
      !existingData ||
      tujuanList.length === 0 ||
      sasaranList.length === 0
    )
      return;

    const tujuanId = String(existingData.Sasaran.Tujuan.id);
    const sasaranId = String(existingData.sasaran_id);

    setFormData({
      sasaran_id: sasaranId,
      tujuan_id: tujuanId,
      deskripsi: existingData.deskripsi || "",
      kode_strategi: existingData.kode_strategi || "",
      periode_id: existingData.periode_id || currentPeriodeId,
      jenis_dokumen: existingData.jenis_dokumen || dokumen,
      tahun: existingData.tahun || tahun,
    });

    setPreviewTujuan(existingData.Sasaran.Tujuan.isi_tujuan);
    setPreviewSasaran(existingData.Sasaran.isi_sasaran);
    setPreviewKode(existingData.kode_strategi);
    setIsLoadingData(false);
  }, [isEdit, existingData, tujuanList, sasaranList]);

  useEffect(() => {
    const selected = tujuanList.find(
      (t) => String(t.id) === String(formData.tujuan_id)
    );
    setPreviewTujuan(selected?.isi_tujuan || "");
  }, [formData.tujuan_id, tujuanList]);

  useEffect(() => {
    if (!Array.isArray(sasaranList)) return setPreviewSasaran("");
    const selected = sasaranList.find(
      (s) => String(s.id) === String(formData.sasaran_id)
    );
    setPreviewSasaran(selected?.isi_sasaran || "");
  }, [formData.sasaran_id, sasaranList]);

  useEffect(() => {
    const { sasaran_id, jenis_dokumen, tahun } = formData;
    if (!sasaran_id || !jenis_dokumen || !tahun || isEdit) return; // 👈 Tambahan isEdit

    api
      .get("/strategi/preview-kode", {
        params: { sasaran_id, jenis_dokumen, tahun },
      })
      .then((res) => {
        setPreviewKode(res.data.kode_strategi);
        setFormData((prev) => ({
          ...prev,
          kode_strategi: res.data.kode_strategi,
        }));
      })
      .catch((err) => {
        console.error("Gagal fetch preview kode:", err);
      });
  }, [formData.sasaran_id, formData.jenis_dokumen, formData.tahun, isEdit]);

  const handleSasaranChange = (e) => {
    const selectedId = e.target.value;
    const selected = sasaranList.find((s) => String(s.id) === selectedId);

    setFormData((prev) => ({
      ...prev,
      sasaran_id: selectedId,
    }));
    setPreviewSasaran(selected?.isi_sasaran || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.sasaran_id ||
      !formData.deskripsi.trim() ||
      !currentPeriodeId
    ) {
      toast.error("Harap lengkapi Sasaran, Deskripsi, dan Periode.");
      return;
    }

    // 🔹 Ambil sasaran yang dipilih
    const selectedSasaran = sasaranList.find(
      (s) => String(s.id) === String(formData.sasaran_id)
    );

    if (!selectedSasaran) {
      toast.error("Sasaran tidak ditemukan.");
      return;
    }

    try {
      const payload = {
        sasaran_id: formData.sasaran_id,
        deskripsi: formData.deskripsi,
        jenis_dokumen: dokumen,
        tahun,
      };

      if (isEdit) {
        await api.put(`/strategi/${existingData.id}`, {
          ...payload,
          kode_strategi: existingData.kode_strategi,
        });
        toast.success("Data berhasil diperbarui!");
      } else {
        await api.post("/strategi", payload);
        toast.success("Data berhasil ditambahkan!");
        setFormData(initialFormData);
        setPreviewKode("");
        setPreviewSasaran("");
        setPreviewTujuan("");
        setActiveTab("struktur");
      }

      onSubmitSuccess?.();
    } catch (err) {
      console.error("Gagal menyimpan:", err);
      toast.error("Gagal menyimpan data Strategi.");
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

  return (
    <Container className="my-4">
      <Card>
        <Card.Body>
          <Card.Title>
            {isEdit ? "Edit Strategi" : "Tambah Strategi"}
          </Card.Title>
          <Form onSubmit={handleSubmit}>
            <Tabs
              activeKey={activeTab}
              onSelect={setActiveTab}
              className="mb-3"
            >
              <Tab eventKey="struktur" title="Struktur">
                <Form.Group className="mb-3">
                  <Form.Label>Pilih Tujuan</Form.Label>
                  <Form.Select
                    value={formData.tujuan_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selected = tujuanList.find(
                        (t) => String(t.id) === selectedId
                      );
                      setFormData((prev) => ({
                        ...prev,
                        tujuan_id: selectedId,
                        sasaran_id: "",
                      }));
                      setPreviewSasaran("");
                      setPreviewTujuan(selected?.isi_tujuan || "");
                    }}
                  >
                    <option value="">-- Pilih Tujuan --</option>
                    {tujuanList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.no_tujuan} - {t.isi_tujuan?.slice(0, 50)}...
                      </option>
                    ))}
                  </Form.Select>
                  {previewTujuan && <Form.Text>{previewTujuan}</Form.Text>}
                </Form.Group>
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Pilih Sasaran</Form.Label>
                  <Form.Select
                    name="sasaran_id"
                    value={formData.sasaran_id}
                    onChange={handleSasaranChange}
                    required
                    disabled={!formData.tujuan_id}
                  >
                    <option value="">-- Pilih Sasaran --</option>
                    {Array.isArray(sasaranList) &&
                      sasaranList
                        .filter(
                          (s) =>
                            String(s.tujuan_id) === String(formData.tujuan_id)
                        )
                        .map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.nomor} - {s.isi_sasaran.slice(0, 50)}...
                          </option>
                        ))}
                  </Form.Select>
                  {previewSasaran && <Form.Text>{previewSasaran}</Form.Text>}
                </Form.Group>
              </Tab>
              <Tab eventKey="detail" title="Detail Strategi">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Kode Strategi</Form.Label>
                  <Form.Control
                    type="text"
                    name="kode_strategi"
                    value={previewKode}
                    readOnly
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Deskripsi Strategi</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="deskripsi"
                    value={formData.deskripsi}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        deskripsi: e.target.value,
                      }))
                    }
                    rows={3}
                    required
                  />
                </Form.Group>
              </Tab>
            </Tabs>

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={onCancel ?? (() => navigate("/rpjmd/strategi-list"))}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  isLoadingData ||
                  !formData.sasaran_id ||
                  !formData.deskripsi.trim() ||
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

export default StrategiForm;
