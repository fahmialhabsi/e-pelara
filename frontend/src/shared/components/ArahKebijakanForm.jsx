import React, { useState, useEffect, useCallback } from "react";
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
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useDokumen } from "../../hooks/useDokumen";
import usePostDokThnWithContext from "../../hooks/usePostDokThnWithContext";
import { getPeriodeIdFromTahun } from "./utils/periodeUtils";
import {
  extractListData,
  normalizeListItems,
} from "../../utils/apiResponse";

export default function ArahKebijakanForm({
  existingData,
  onSubmitSuccess,
  onCancel,
}) {
  const isEdit = Boolean(existingData?.id);
  const navigate = useNavigate();
  const { dokumen, tahun } = useDokumen();
  const { postData, posting, error } = usePostDokThnWithContext();
  const [daftarPeriode, setDaftarPeriode] = useState([]);

  const [data, setData] = useState({
    tujuan: "",
    sasaran: "",
    strategi: "",
    kode_arah: "",
    deskripsi: "",
  });

  const [options, setOptions] = useState({
    tujuan: [],
    sasaran: [],
    strategi: [],
  });

  const [preview, setPreview] = useState({ tujuan: "", strategi: "" });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("struktur");

  const fetchTujuan = useCallback(async () => {
    const res = await api.get("/tujuan", {
      params: { jenis_dokumen: dokumen, tahun },
    });
    setOptions((prev) => ({
      ...prev,
      tujuan: normalizeListItems(res.data),
    }));
  }, [dokumen, tahun]);

  const fetchSasaran = useCallback(
    async (tujuan_id) => {
      const res = await api.get("/sasaran", {
        params: { jenis_dokumen: dokumen, tahun, tujuan_id },
      });
      const list = normalizeListItems(res.data);

      setOptions((prev) => ({ ...prev, sasaran: list }));
    },
    [dokumen, tahun]
  );

  const fetchStrategi = useCallback(
    async (sasaran_id) => {
      const res = await api.get("/strategi", {
        params: { jenis_dokumen: dokumen, tahun, sasaran_id },
      });
      const list = normalizeListItems(res.data);
      setOptions((prev) => ({ ...prev, strategi: list }));
    },
    [dokumen, tahun]
  );

  // useEffect yang fetch kode arah secara otomatis saat data.strategi berubah
  useEffect(() => {
    const fetchNextKode = async () => {
      if (!isEdit && data.strategi) {
        try {
          const res = await api.get("/arah-kebijakan/next-kode", {
            params: {
              strategi_id: data.strategi,
              jenis_dokumen: dokumen,
              tahun,
            },
          });
          setData((prev) => ({
            ...prev,
            kode_arah: res.data?.kode_arah || "",
          }));
        } catch (err) {
          console.error("Gagal mengambil kode arah otomatis:", err);
          toast.warning("Kode arah otomatis gagal diambil.");
        }
      }
    };

    fetchNextKode();
  }, [data.strategi, dokumen, tahun, isEdit]);

  const handleCascadeChange = async (key, value) => {
    const newData = { ...data, [key]: value };

    if (key === "tujuan") {
      newData.sasaran = "";
      newData.strategi = "";
      setPreview((prev) => ({
        ...prev,
        tujuan: options.tujuan.find((t) => t.id === +value)?.isi_tujuan || "",
      }));
      await fetchSasaran(value);
    } else if (key === "sasaran") {
      newData.strategi = "";
      await fetchStrategi(value);
    } else if (key === "strategi") {
      const selected = options.strategi.find((s) => s.id === +value);
      setPreview((prev) => ({ ...prev, strategi: selected?.deskripsi || "" }));
      // Hapus fetch kode arah dari sini supaya tidak duplikat
    }

    setData(newData);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!data.kode_arah && !isEdit) {
      toast.error("Kode arah kebijakan belum dibuat. Silakan pilih strategi.");
      return;
    }

    try {
      const tahunFinal = String(tahun);
      const periode_id = getPeriodeIdFromTahun(tahun, daftarPeriode);

      if (!periode_id) {
        toast.error("Periode tidak ditemukan untuk tahun " + tahun);
        return;
      }

      const payload = {
        deskripsi: data.deskripsi,
        strategi_id: data.strategi,
        periode_id,
        jenis_dokumen: dokumen,
        tahun: tahunFinal,
      };

      if (isEdit) {
        payload.kode_arah = data.kode_arah;
        await api.put(`/arah-kebijakan/${existingData.id}`, payload);
        toast.success("Data berhasil diperbarui!");
      } else {
        await postData("/arah-kebijakan", payload);
        toast.success("Data berhasil ditambahkan!");
        setData({
          tujuan: "",
          sasaran: "",
          strategi: "",
          kode_arah: "",
          deskripsi: "",
        });
      }

      onSubmitSuccess?.();
    } catch (err) {
      console.error("Gagal menyimpan data:", err);
      const msg =
        err.response?.data?.error?.includes("kode_arah") &&
        err.response?.data?.error?.includes("unique")
          ? "Kode arah kebijakan sudah ada."
          : err.response?.data?.message || "Gagal menyimpan data.";
      toast.error(msg);
    }
  };

  useEffect(() => {
    const initializeForm = async () => {
      await fetchTujuan();

      if (isEdit && existingData?.Strategi) {
        const strategi = existingData.Strategi;
        const sasaran = strategi.Sasaran;
        const tujuan = sasaran.Tujuan;

        const sasaranRes = await api.get("/sasaran", {
          params: { jenis_dokumen: dokumen, tahun, tujuan_id: tujuan.id },
        });

        const strategiRes = await api.get("/strategi", {
          params: { jenis_dokumen: dokumen, tahun, sasaran_id: sasaran.id },
        });

        setOptions((prev) => ({
          ...prev,
          sasaran: normalizeListItems(sasaranRes.data),
          strategi: normalizeListItems(strategiRes.data),
        }));
      }

      setLoading(false);
    };

    initializeForm();
  }, [isEdit, existingData, dokumen, tahun]);

  // Set data form hanya setelah opsi sasaran & strategi tersedia
  useEffect(() => {
    if (
      isEdit &&
      existingData?.Strategi &&
      options.sasaran.length > 0 &&
      options.strategi.length > 0
    ) {
      const strategi = existingData.Strategi;
      const sasaran = strategi.Sasaran;
      const tujuan = sasaran.Tujuan;

      setData({
        tujuan: tujuan.id,
        sasaran: sasaran.id,
        strategi: strategi.id,
        kode_arah: existingData.kode_arah,
        deskripsi: existingData.deskripsi,
      });

      setPreview({
        tujuan: tujuan?.isi_tujuan || "",
        strategi: strategi?.deskripsi || "",
      });
    }
  }, [isEdit, existingData, options.sasaran, options.strategi]);

  useEffect(() => {
    api
      .get("/periode-rpjmd")
      .then((res) => setDaftarPeriode(extractListData(res.data)));
  }, []);

  if (loading) return <Spinner className="my-5" animation="border" />;

  return (
    <Container className="my-4">
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate("/rpjmd/arah-kebijakan-list")}>
          Daftar Arah Kebijakan
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {isEdit ? "Edit" : "Tambah"} Arah Kebijakan
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="mb-3">
        <strong>Dokumen Aktif:</strong> {dokumen} <br />
        <strong>Tahun:</strong> {tahun}
      </div>

      <Card>
        <Card.Body>
          <Card.Title>{isEdit ? "Edit" : "Tambah"} Arah Kebijakan</Card.Title>
          <Form onSubmit={handleSubmit}>
            <Tabs
              activeKey={activeTab}
              onSelect={setActiveTab}
              className="mb-3"
            >
              <Tab eventKey="struktur" title="Struktur">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Tujuan</Form.Label>
                  <Form.Select
                    value={data.tujuan}
                    onChange={(e) =>
                      handleCascadeChange("tujuan", e.target.value)
                    }
                    required
                  >
                    <option value="">-- Pilih Tujuan --</option>
                    {options.tujuan.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.no_tujuan} - {t.isi_tujuan}
                      </option>
                    ))}
                  </Form.Select>
                  {preview.tujuan && (
                    <Form.Text className="text-muted">
                      {preview.tujuan}
                    </Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Sasaran</Form.Label>
                  <Form.Select
                    value={data.sasaran}
                    onChange={(e) =>
                      handleCascadeChange("sasaran", e.target.value)
                    }
                    required
                  >
                    <option value="">-- Pilih Sasaran --</option>
                    {Array.isArray(options.sasaran) &&
                      options.sasaran.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nomor} - {s.isi_sasaran}
                        </option>
                      ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Strategi</Form.Label>
                  <Form.Select
                    value={data.strategi}
                    onChange={(e) =>
                      handleCascadeChange("strategi", e.target.value)
                    }
                    required
                  >
                    <option value="">-- Pilih Strategi --</option>
                    {options.strategi.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.kode_strategi} - {s.deskripsi}
                      </option>
                    ))}
                  </Form.Select>
                  {preview.strategi && (
                    <Form.Text className="text-muted">
                      {preview.strategi}
                    </Form.Text>
                  )}
                </Form.Group>
              </Tab>

              <Tab eventKey="detail" title="Detail Arah Kebijakan">
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Kode Arah Kebijakan</Form.Label>
                  <Form.Control
                    value={data.kode_arah}
                    readOnly
                    placeholder="Akan otomatis diisi oleh sistem"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Uraian</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="deskripsi"
                    value={data.deskripsi}
                    onChange={handleInput}
                    required
                  />
                </Form.Group>
              </Tab>
            </Tabs>

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={
                  onCancel ?? (() => navigate("/rpjmd/arah-kebijakan-list"))
                }
              >
                Batal
              </Button>
              <Button type="submit" disabled={posting}>
                {posting ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>

            {error && (
              <Alert variant="danger" className="mt-2">
                {error}
              </Alert>
            )}
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
