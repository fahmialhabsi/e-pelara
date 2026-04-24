import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { usePeriodeAktif } from "../../features/rpjmd/hooks/usePeriodeAktif";
import usePostDokThnWithContext from "../../hooks/usePostDokThnWithContext";
import { getPeriodeIdFromTahun } from "./utils/periodeUtils";
import {
  extractListData,
  normalizeListItems,
  normalizeId,
} from "../../utils/apiResponse";
import { konteksBannerRows } from "../../utils/planningDokumenUtils";

export default function ArahKebijakanForm({
  existingData,
  onSubmitSuccess,
  onCancel,
}) {
  const isEdit = Boolean(existingData?.id);
  const navigate = useNavigate();
  const { dokumen, tahun, loading: periodeAktifLoading } = usePeriodeAktif();
  const { postData, posting, error } = usePostDokThnWithContext();
  const [daftarPeriode, setDaftarPeriode] = useState([]);

  const periodeAktifBanner = useMemo(() => {
    if (!daftarPeriode?.length || !tahun) return null;
    const pid = getPeriodeIdFromTahun(tahun, daftarPeriode);
    return daftarPeriode.find((p) => String(p.id) === String(pid)) || null;
  }, [daftarPeriode, tahun]);

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
        params: {
          jenis_dokumen: dokumen,
          tahun,
          sasaran_id,
          limit: 500,
          page: 1,
        },
      });
      const list = normalizeListItems(res.data);
      setOptions((prev) => ({ ...prev, strategi: list }));
    },
    [dokumen, tahun]
  );

  // Kode arah otomatis: hindari respons lawas menimpa strategi yang sudah diganti (race).
  useEffect(() => {
    if (isEdit || !data.strategi || !dokumen || !tahun) return;

    const sid = String(data.strategi);
    let cancelled = false;

    setData((prev) => {
      if (String(prev.strategi) !== sid) return prev;
      return { ...prev, kode_arah: "" };
    });

    (async () => {
      try {
        const res = await api.get("/arah-kebijakan/next-kode", {
          params: {
            strategi_id: sid,
            jenis_dokumen: dokumen,
            tahun,
          },
        });
        if (cancelled) return;
        setData((prev) => {
          if (String(prev.strategi) !== sid) return prev;
          return { ...prev, kode_arah: res.data?.kode_arah || "" };
        });
      } catch (err) {
        if (!cancelled) {
          console.error("Gagal mengambil kode arah otomatis:", err);
          toast.warning("Kode arah otomatis gagal diambil.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data.strategi, dokumen, tahun, isEdit]);

  const handleCascadeChange = async (key, rawValue) => {
    const value = rawValue === null || rawValue === undefined ? "" : String(rawValue);

    if (key === "tujuan") {
      setData((prev) => ({
        ...prev,
        tujuan: value,
        sasaran: "",
        strategi: "",
      }));
      setPreview((prev) => ({
        ...prev,
        tujuan: value
          ? options.tujuan.find((t) => String(t.id) === value)?.isi_tujuan ||
            ""
          : "",
        strategi: "",
      }));
      if (value) await fetchSasaran(value);
      else setOptions((p) => ({ ...p, sasaran: [], strategi: [] }));
    } else if (key === "sasaran") {
      setData((prev) => ({
        ...prev,
        sasaran: value,
        strategi: "",
      }));
      setPreview((prev) => ({ ...prev, strategi: "" }));
      if (value) await fetchStrategi(value);
      else setOptions((p) => ({ ...p, strategi: [] }));
    } else if (key === "strategi") {
      setData((prev) => ({ ...prev, strategi: value }));
      const selected = options.strategi.find((s) => String(s.id) === value);
      setPreview((prev) => ({ ...prev, strategi: selected?.deskripsi || "" }));
    }
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
        toast.error("Periode tidak ditemukan untuk rentang periode acuan saat ini.");
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
      const errText = `${err.response?.data?.error || ""} ${err.response?.data?.message || ""}`;
      const msg =
        err.response?.status === 409 ||
        (errText.toLowerCase().includes("kode_arah") &&
          errText.toLowerCase().includes("unique"))
          ? "Kode / kombinasi arah kebijakan sudah ada untuk strategi ini."
          : err.response?.data?.message || "Gagal menyimpan data.";
      toast.error(msg);
    }
  };

  useEffect(() => {
    if (periodeAktifLoading) return;

    const initializeForm = async () => {
      if (!dokumen || !tahun) {
        setLoading(false);
        return;
      }

      await fetchTujuan();

      if (isEdit && existingData?.Strategi) {
        const strategi = existingData.Strategi;
        const sasaran = strategi.Sasaran;
        const tujuan = sasaran.Tujuan;

        const sasaranRes = await api.get("/sasaran", {
          params: { jenis_dokumen: dokumen, tahun, tujuan_id: tujuan.id },
        });

        const strategiRes = await api.get("/strategi", {
          params: {
            jenis_dokumen: dokumen,
            tahun,
            sasaran_id: sasaran.id,
            limit: 500,
            page: 1,
          },
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
  }, [periodeAktifLoading, isEdit, existingData, dokumen, tahun]);

  /** Jika strategi terpilih tidak ada di daftar (mis. kode vs sasaran tidak selaras), ambil via GET /:id agar <select> tetap konsisten. */
  useEffect(() => {
    const sid = data.strategi;
    if (!sid || !dokumen || !tahun) return;
    if (options.strategi.some((s) => String(s.id) === String(sid))) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/strategi/${sid}`);
        const row = res.data;
        if (cancelled || !row?.id) return;
        const entry = {
          id: normalizeId(row.id),
          kode_strategi: row.kode_strategi,
          deskripsi: row.deskripsi,
        };
        setOptions((prev) => {
          if (prev.strategi.some((s) => String(s.id) === entry.id)) return prev;
          return { ...prev, strategi: [...prev.strategi, entry] };
        });
      } catch {
        /* strategi tidak ditemukan / akses */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data.strategi, dokumen, tahun, options.strategi]);

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
        tujuan: String(tujuan.id),
        sasaran: String(sasaran.id),
        strategi: String(strategi.id),
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

  if (periodeAktifLoading || loading) {
    return <Spinner className="my-5" animation="border" />;
  }

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
        {konteksBannerRows(dokumen, tahun, periodeAktifBanner).map((r) => (
          <span key={r.key} className="d-block">
            <strong>{r.label}:</strong> {r.value}
          </span>
        ))}
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
                      <option key={t.id} value={String(t.id)}>
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
                        <option key={s.id} value={String(s.id)}>
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
                      <option key={s.id} value={String(s.id)}>
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
