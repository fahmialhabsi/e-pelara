import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  Card,
  Tab,
  Nav,
  ProgressBar,
  Button,
  Alert,
  Row,
  Form as BootstrapForm,
} from "react-bootstrap";
import Select from "react-select";
import { useFormikContext } from "formik";
import IndikatorTabContent from "../IndikatorTabContent";
import ReadOnlyIndikatorPreview from "@/shared/components/steps/ReadOnlyIndikatorPreview";
import useIndikatorFields from "../hooks/useIndikatorFields";
import useIndikatorBuilder from "../hooks/useIndikatorBuilder";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";
import { useDebounce } from "use-debounce";
import apiAI from "@/services/apiAI";
import api from "@/services/api";
import {
  INDIKATOR_FIELDS,
  TAB_LABELS,
  TIPE_INDIKATOR_MAP,
  MAX_INDIKATOR,
} from "@/shared/components/constants/indikatorFields";
import PreviewList from "@/shared/components/components/PreviewList";

const StepTemplate = ({
  stepKey,
  options = {},
  stepOptions = [],
  tabKey,
  setTabKey,
  onNext,
  onSave,
  opdOptions = [],
}) => {
  const kegiatanOptions = options?.kegiatan || [];
  const formRef = useRef(null);
  const [activeInnerTab, setActiveInnerTab] = useState(1);
  const [message, setMessage] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [rekomendasiAI, setRekomendasiAI] = useState("");
  const [tujuanOptions, setTujuanOptions] = useState([]);
  const [sasaranOptions, setSasaranOptions] = useState([]);
  const [programOptions, setProgramOptions] = useState([]);
  const [programIndikatorOptions, setProgramIndikatorOptions] = useState([]);
  const [contextData, setContextData] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const fetchedOnceRef = useRef({});
  const [penanggungJawabOptions, setPenanggungJawabOptions] = useState([]);

  const { values, errors, touched, setFieldValue, validateForm } =
    useFormikContext();
  const {
    tahun,
    dokumen,
    periode_id,
    loading: loadingPeriode,
  } = usePeriodeAktif();

  const list = Array.isArray(values[stepKey]) ? values[stepKey] : [];

  const { fields } = useIndikatorFields(
    values,
    setFieldValue,
    errors,
    touched,
    (opdOptions = []),
    (stepOptions = []),
    stepKey
  );

  const { resetForm } = useFormikContext();
  const { buildIndikatorItem, resetFields } = useIndikatorBuilder({});
  const [debouncedCapaian5] = useDebounce(values.capaian_tahun_5, 500);

  useEffect(() => {
    if (stepKey !== "kegiatan" || !values.program_id || !dokumen || !tahun)
      return;

    const fetchIndikatorProgram = async () => {
      try {
        const res = await api.get("/indikator-program", {
          params: {
            program_id: values.program_id,
            jenis_dokumen: dokumen,
            tahun,
          },
        });

        const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];

        const options = data.map((item) => ({
          value: item.id,
          label: `${item.kode_indikator} - ${item.nama_indikator}`,
        }));

        setProgramIndikatorOptions(options);
      } catch (err) {
        console.error("❌ Gagal fetch indikator program:", err);
        setProgramIndikatorOptions([]);
      }
    };

    fetchIndikatorProgram();
  }, [stepKey, values.program_id, dokumen, tahun]);

  const fetchContext = useCallback(async (noTujuan, penanggungJawab) => {
    if (!noTujuan || !penanggungJawab) return;

    setLoadingContext(true);
    try {
      const response = await api.get("/indikator-tujuans/context", {
        params: {
          tujuan_id: noTujuan, // gunakan tujuan_id
        },
      });

      setContextData(response.data);
    } catch (error) {
      setContextData(null);
    } finally {
      setLoadingContext(false);
    }
  }, []);

  useEffect(() => {
    const fetchTujuan = async () => {
      try {
        const res = await api.get("/tujuan", {
          params: { tahun, jenis_dokumen: dokumen },
        });

        const data = res.data ?? [];
        const opts = data.map((item) => ({
          value: item.id,
          label: `${item.no_tujuan}: ${item.isi_tujuan}`,
          isi_tujuan: item.isi_tujuan,
        }));
        setTujuanOptions(opts);
      } catch (error) {}
    };

    if (dokumen && tahun) fetchTujuan();
  }, [dokumen, tahun]);

  useEffect(() => {
    const fetchPenanggungJawab = async () => {
      try {
        const res = await api.get("/opd-penanggung-jawab/dropdown");
        const data = res.data ?? [];
        const opts = data.map((item) => ({
          value: item.id,
          label: `${item.nama_opd} - ${item.nama_bidang_opd}`,
          nama_opd: item.nama_opd,
          nama_bidang_opd: item.nama_bidang_opd,
        }));

        setPenanggungJawabOptions(opts);

        if (
          !values.penanggung_jawab ||
          isNaN(Number(values.penanggung_jawab))
        ) {
          setFieldValue("penanggung_jawab", opts[0]?.value ?? null);
        } else {
          const match = opts.find(
            (opt) => Number(opt.value) === Number(values.penanggung_jawab)
          );
          setFieldValue(
            "penanggung_jawab",
            match ? match.value : opts[0]?.value ?? null
          );
        }

        if (typeof options?.setOPDOptions === "function") {
          options.setOPDOptions(opts); // kirim ke parent jika diminta
        }
      } catch (error) {
        // Tetap log jika error agar diketahui
        console.error("Gagal fetch penanggung jawab", error);
      }
    };

    fetchPenanggungJawab();
  }, []);

  useEffect(() => {
    const fetchSasaran = async () => {
      try {
        const res = await api.get("/sasaran", {
          params: { tahun, jenis_dokumen: dokumen },
        });

        const data = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        const opts = data.map((s) => ({
          value: Number(s.id),
          label: `${s.nomor}: ${s.isi_sasaran}`,
          nomor: s.nomor,
          isi_sasaran: s.isi_sasaran,
          misi_id: s.Tujuan?.misi_id || "",
          tujuan_id: s.tujuan_id,
        }));

        setSasaranOptions(opts);
      } catch (error) {
        console.error("❌ Gagal fetch sasaran", error);
      }
    };

    if (dokumen && tahun && stepKey === "sasaran") {
      fetchSasaran();
    }
  }, [dokumen, tahun, stepKey]);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await api.get("/programs", {
          params: { tahun, jenis_dokumen: dokumen },
        });

        const data = Array.isArray(res.data?.data) ? res.data.data : [];

        const programOptions = data.map((p) => ({
          value: String(p.id),
          label: `${p.kode_program} - ${p.nama_program}`,
          nama_program: p.nama_program,
          kode_program: p.kode_program,
          misi_id: p.sasaran?.Tujuan?.Misi?.id || "",
          tujuan_id: p.sasaran?.Tujuan?.id || "",
          sasaran_id: p.sasaran?.id || "",
        }));

        setProgramOptions(programOptions);
      } catch (err) {
        console.error("Gagal mengambil data program:", err);
      }
    };

    if (dokumen && tahun && stepKey === "program") {
      fetchPrograms();
    }
  }, [dokumen, tahun, stepKey]);

  const fetchNextKode = useCallback(
    async (tujuanId) => {
      if (!tujuanId || !dokumen || !tahun) return;

      if (fetchedOnceRef.current[tujuanId]) {
        return;
      }

      fetchedOnceRef.current[tujuanId] = true;

      try {
        const response = await api.get(
          `/indikator-tujuans/${tujuanId}/next-kode`,
          {
            params: {
              tahun,
              jenis_dokumen: dokumen,
            },
          }
        );
        const { kode } = response.data;

        if (kode) {
          setFieldValue("kode_indikator", kode);
        }
      } catch (error) {
        console.error("Gagal fetch next kode tujuan:", error);
      }
    },
    [setFieldValue, dokumen, tahun]
  );

  // Fetch kode untuk SASARAN
  const fetchNextKodeSasaran = useCallback(
    async (sasaranId) => {
      if (!sasaranId) return;

      try {
        const response = await api.get(
          `/indikator-sasaran/${sasaranId}/next-kode`
        );
        const { next_kode } = response.data;
        if (next_kode) {
          setFieldValue("kode_indikator", next_kode);
        }
      } catch (error) {
        console.error("Gagal fetch next kode sasaran:", error);
      }
    },
    [setFieldValue]
  );

  const fetchNextKodeProgram = useCallback(
    async (programId) => {
      if (!programId || !dokumen || !tahun) return;

      try {
        const response = await api.get(
          `/indikator-program/${programId}/next-kode`,
          {
            params: {
              jenis_dokumen: dokumen,
              tahun,
            },
          }
        );
        const { next_kode } = response.data;
        if (next_kode) {
          setFieldValue("kode_indikator", next_kode);
        }
      } catch (error) {
        console.error("Gagal fetch next kode program:", error);
      }
    },
    [setFieldValue, dokumen, tahun]
  );

  const fetchNextKodeKegiatan = useCallback(
    async (kegiatanId) => {
      if (!kegiatanId || !dokumen || !tahun) return;

      try {
        const response = await api.get(
          `/indikator-kegiatan/${kegiatanId}/next-kode`,
          {
            params: {
              jenis_dokumen: dokumen,
              tahun,
            },
          }
        );
        const { next_kode } = response.data;
        if (next_kode) {
          setFieldValue("kode_indikator", next_kode);
        }
      } catch (error) {
        console.error("Gagal fetch next kode kegiatan:", error);
      }
    },
    [setFieldValue, dokumen, tahun]
  );

  useEffect(() => {
    if (values.no_tujuan) {
      fetchContext(values.no_tujuan);
    }
  }, [values.no_tujuan, fetchContext]);

  useEffect(() => {
    if (stepKey === "sasaran" && values.nomor) {
      fetchNextKodeSasaran(values.nomor);
    }
  }, [values.nomor, stepKey, fetchNextKodeSasaran]);

  useEffect(() => {
    if (stepKey === "program" && values.program_id) {
      fetchNextKodeProgram(values.program_id);
    }
  }, [values.program_id, stepKey, fetchNextKodeProgram]);

  useEffect(() => {
    if (stepKey === "kegiatan" && values.kegiatan_id) {
      fetchNextKodeKegiatan(values.kegiatan_id);
    }
  }, [values.kegiatan_id, stepKey, fetchNextKodeKegiatan]);

  useEffect(() => {
    const { no_tujuan } = values;

    if (!no_tujuan) return;

    if (fetchedOnceRef.current[`kode_${no_tujuan}`]) return;
    fetchedOnceRef.current[`kode_${no_tujuan}`] = true;

    fetchNextKode(no_tujuan);
  }, [values.no_tujuan, fetchNextKode]);

  useEffect(() => {
    if (!Object.keys(errors).length) return;
    const timer = setTimeout(() => {
      const el = formRef.current?.querySelector(
        ".is-invalid, [aria-invalid='true']"
      );
      if (el) el.focus({ preventScroll: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [errors]);

  const handleTujuanChange = useCallback(
    (selected) => {
      const { value = "", label = "", isi_tujuan = "" } = selected || {};
      setFieldValue("no_tujuan", value);
      setFieldValue("label_tujuan", label);
      setFieldValue("isi_tujuan", isi_tujuan);
      setFieldValue("tujuan_id", value);
    },
    [setFieldValue]
  );

  useEffect(() => {
    if (debouncedCapaian5 && debouncedCapaian5 !== values.baseline) {
      setFieldValue("baseline", debouncedCapaian5);
    }
  }, [debouncedCapaian5, values.baseline, setFieldValue]);

  const handleSasaranChange = useCallback(
    (selected) => {
      const {
        value = "",
        label = "",
        isi_sasaran = "",
        misi_id = "",
        tujuan_id = "",
      } = selected || {};

      setFieldValue("nomor", value);
      setFieldValue("label_sasaran", label);
      setFieldValue("isi_sasaran", isi_sasaran);
      setFieldValue("sasaran_id", value ? Number(value) : null);
      setFieldValue("misi_id", misi_id || "");
      setFieldValue("tujuan_id", tujuan_id || "");
    },
    [setFieldValue]
  );

  // ❗ letakkan ini setelah handleSasaranChange
  useEffect(() => {
    if (!sasaranOptions.length || !values.sasaran_id) return;

    const selected = sasaranOptions.find(
      (opt) => Number(opt.value) === Number(values.sasaran_id)
    );

    if (selected) {
      handleSasaranChange(selected);
    } else {
      console.warn("❗ Sasaran tidak ditemukan di options.");
    }
  }, [sasaranOptions, values.sasaran_id, handleSasaranChange]);

  const handleProgramChange = useCallback(
    (selected) => {
      const {
        value = "",
        label = "",
        nama_program = "",
        kode_program = "",
        misi_id = "",
        tujuan_id = "",
        sasaran_id = "",
      } = selected || {};

      setFieldValue("program_id", String(value));
      setFieldValue("kode_program", kode_program);
      setFieldValue("nama_program", nama_program);
      setFieldValue("label_program", label);
      setFieldValue("misi_id", misi_id || "");
      setFieldValue("tujuan_id", tujuan_id || "");
      setFieldValue("sasaran_id", sasaran_id || "");
    },
    [setFieldValue]
  );

  const handleKegiatanChange = useCallback(
    (selected) => {
      const {
        value = "",
        label = "",
        nama_kegiatan = "",
        kode_kegiatan = "",
        misi_id = "",
        tujuan_id = "",
        sasaran_id = "",
      } = selected || {};

      console.log("🔁 handleKegiatanChange called:", selected);

      setFieldValue("kegiatan_id", value);
      setFieldValue("kode_kegiatan", kode_kegiatan);
      setFieldValue("nama_kegiatan", nama_kegiatan);
      setFieldValue("label_kegiatan", label);

      setFieldValue("misi_id", misi_id);
      setFieldValue("tujuan_id", tujuan_id);
      setFieldValue("sasaran_id", sasaran_id);
    },
    [setFieldValue]
  );

  const handleFieldChange = useCallback(
    (name) => (e) => {
      if (name === "baseline") return; // 🔒 Kunci baseline
      setFieldValue(name, e.target.value);
    },
    [setFieldValue]
  );

  const handleFieldChangeWithUnit = useCallback(
    (name) => (e) => {
      const val = e.target.value.replace(/[^0-9.,]/g, "").trim(); // sudah betul
      setFieldValue(name, val);
    },
    [setFieldValue]
  );

  const isNumeric = (val) => {
    if (val == null || val === "") return true; // kosong dianggap valid
    return !isNaN(Number(val.toString().replace(",", ".")));
  };

  const normalizeNumber = (val) => {
    const num = parseFloat(val.toString().replace(",", "."));
    return isNaN(num) ? val : num.toFixed(2);
  };

  const handleAdd = useCallback(async () => {
    if (!tahun || !periode_id) {
      setMessage({
        variant: "warning",
        text: "Periode atau tahun belum tersedia.",
      });
      return;
    }

    const validationErrors = await validateForm();
    const hasBlocking = Object.entries(validationErrors).some(
      ([k, v]) => INDIKATOR_FIELDS.includes(k) && v
    );

    if (hasBlocking) {
      setMessage({ variant: "danger", text: "Periksa kembali isian Anda." });
      return;
    }

    // ✅ Validasi numerik sebelum proses lebih lanjut
    for (let i = 1; i <= 5; i++) {
      const valCapaian = values[`capaian_tahun_${i}`];
      const valTarget = values[`target_tahun_${i}`];

      if (!isNumeric(valCapaian)) {
        setMessage({
          variant: "danger",
          text: `Capaian Tahun ${i} harus berupa angka yang valid.`,
        });
        return;
      }

      if (!isNumeric(valTarget)) {
        setMessage({
          variant: "danger",
          text: `Target Tahun ${i} harus berupa angka yang valid.`,
        });
        return;
      }
    }

    // ✅ Normalisasi angka
    const normalizedValues = { ...values };
    for (let i = 1; i <= 5; i++) {
      normalizedValues[`capaian_tahun_${i}`] = normalizeNumber(
        values[`capaian_tahun_${i}`]
      );
      normalizedValues[`target_tahun_${i}`] = normalizeNumber(
        values[`target_tahun_${i}`]
      );
    }

    // ✅ Bangun dan simpan item indikator
    const newItem = buildIndikatorItem({
      ...normalizedValues,
      tipe_indikator: TIPE_INDIKATOR_MAP[stepKey] || values.tipe_indikator,
      misi_id: values.misi_id,
      tujuan_id: values.tujuan_id,
      sasaran_id: values.sasaran_id,
      program_id: values.program_id,
      indikator_program_id: values.indikator_program_id,
    });

    if (
      !Number(values.misi_id) ||
      !Number(values.tujuan_id) ||
      (stepKey === "sasaran" && !Number(values.sasaran_id))
    ) {
      setMessage({
        variant: "danger",
        text:
          "Pastikan Misi dan Tujuan telah dipilih" +
          (stepKey === "sasaran" ? " (termasuk Sasaran)" : "") +
          ".",
      });
      return;
    }

    setFieldValue(stepKey, [...list, newItem]);
    resetFields(setFieldValue);
    setMessage({ variant: "success", text: "Indikator berhasil ditambahkan." });
  }, [
    tahun,
    periode_id,
    validateForm,
    setFieldValue,
    values,
    stepKey,
    buildIndikatorItem,
    list,
    resetFields,
  ]);

  const handleGunakanSaranAI = useCallback(() => {
    if (!rekomendasiAI || list.length === 0) return;
    const updated = [...list];
    updated[updated.length - 1] = {
      ...updated[updated.length - 1],
      rekomendasi_ai: rekomendasiAI,
    };
    setFieldValue(stepKey, updated);
    setMessage({ variant: "success", text: "Saran AI berhasil ditambahkan." });
    setRekomendasiAI("");
  }, [rekomendasiAI, list, setFieldValue, stepKey]);

  const handleRekomendasiAI = useCallback(async () => {
    setLoadingAI(true);
    setRekomendasiAI("");

    const indikatorList = list.length ? list : [buildIndikatorItem(values)];

    if (!values.nama_indikator?.trim() || !values.tipe_indikator?.trim()) {
      setMessage({
        variant: "warning",
        text: "Lengkapi nama & tipe indikator sebelum meminta saran AI.",
      });
      setLoadingAI(false);
      return;
    }

    try {
      const response = await apiAI.post("/rekomendasi-ai", { indikatorList });

      const rekomendasi = response?.data?.rekomendasi;

      if (rekomendasi && rekomendasi.trim() !== "") {
        setRekomendasiAI(rekomendasi);
      } else {
        setRekomendasiAI("Tidak ada saran yang dihasilkan.");
        setMessage({
          variant: "info",
          text: "AI tidak menghasilkan saran. Silakan lengkapi data indikator secara manual.",
        });
      }
    } catch (err) {
      console.error("❌ Gagal meminta rekomendasi:", err);
      setRekomendasiAI("Gagal menghubungi AI.");
      setMessage({
        variant: "danger",
        text: "Terjadi kesalahan saat meminta saran.",
      });
    } finally {
      setLoadingAI(false);
    }
  }, [list, buildIndikatorItem, values]);

  useEffect(() => {
    if (stepKey === "kegiatan") {
      console.log("🎯 values.kegiatan_id:", values.kegiatan_id);
      console.log("📦 kegiatanOptions:", kegiatanOptions);
    }
  }, [stepKey, values.kegiatan_id, kegiatanOptions]);

  return (
    <Card ref={formRef} className="p-4 shadow-sm">
      {message && <Alert variant={message.variant}>{message.text}</Alert>}

      <ProgressBar
        now={((tabKey + 1) / TAB_LABELS.length) * 100}
        className="mb-3"
      />
      {/* STEP TUJUAN */}
      {stepKey === "tujuan" && (
        <BootstrapForm.Group className="mb-3">
          <BootstrapForm.Label>Pilih Tujuan</BootstrapForm.Label>
          <Select
            options={tujuanOptions}
            value={
              tujuanOptions.find((opt) => opt.value === values.no_tujuan) ||
              null
            }
            onChange={handleTujuanChange}
            placeholder="Pilih Tujuan"
            isClearable
          />
          {values.label_tujuan && (
            <div className="mt-2 text-muted">
              <small>{values.label_tujuan}</small>
            </div>
          )}
          {contextData && (
            <div className="mt-2 text-muted">
              <small>
                <strong>Context:</strong>{" "}
                {contextData?.text ?? "Tidak ada context."}
              </small>
            </div>
          )}
          {loadingContext && (
            <div className="text-muted">
              <small>Memuat context...</small>
            </div>
          )}
        </BootstrapForm.Group>
      )}
      {/* STEP SASARAN */}
      {stepKey === "sasaran" && (
        <BootstrapForm.Group className="mb-3">
          <BootstrapForm.Label>Pilih Sasaran</BootstrapForm.Label>
          <Select
            options={sasaranOptions}
            value={
              sasaranOptions.find(
                (opt) => Number(opt.value) === Number(values.sasaran_id)
              ) || null
            }
            onChange={handleSasaranChange}
            placeholder="Pilih Sasaran"
            isClearable
          />
        </BootstrapForm.Group>
      )}

      {/* STEP PROGRAM */}
      {stepKey === "program" && (
        <BootstrapForm.Group className="mb-3">
          <BootstrapForm.Label>Pilih Program</BootstrapForm.Label>
          <Select
            options={programOptions}
            value={
              programOptions.find((opt) => opt.value === values.program_id) ||
              null
            }
            onChange={handleProgramChange}
            placeholder="Pilih Program"
            isClearable
          />
        </BootstrapForm.Group>
      )}

      {/* STEP KEGIATAN */}
      {stepKey === "kegiatan" && (
        <>
          <BootstrapForm.Group className="mb-3">
            <BootstrapForm.Label>Pilih Kegiatan</BootstrapForm.Label>
            <Select
              options={kegiatanOptions}
              value={
                kegiatanOptions.find(
                  (opt) => String(opt.value) === String(values.kegiatan_id)
                ) || null
              }
              onChange={handleKegiatanChange}
              placeholder="Pilih Kegiatan"
              isClearable
            />
          </BootstrapForm.Group>

          <BootstrapForm.Group className="mb-3">
            <BootstrapForm.Label>Pilih Indikator Program</BootstrapForm.Label>
            <Select
              options={programIndikatorOptions}
              value={
                programIndikatorOptions.find(
                  (opt) =>
                    String(opt.value) === String(values.indikator_program_id)
                ) || null
              }
              onChange={(opt) =>
                setFieldValue("indikator_program_id", opt?.value ?? null)
              }
              placeholder="Pilih Indikator Program"
              isClearable
            />
          </BootstrapForm.Group>
        </>
      )}

      <Tab.Container
        activeKey={activeInnerTab}
        onSelect={(k) => setActiveInnerTab(Number(k))}
      >
        <Nav variant="tabs" className="mb-3">
          {TAB_LABELS.map((label, idx) => (
            <Nav.Item key={idx + 1}>
              <Nav.Link eventKey={idx + 1}>{label}</Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
        <Tab.Content>
          {[1, 2, 3, 4].map((key) => (
            <Tab.Pane eventKey={key} key={key}>
              <Row className="g-3">
                <IndikatorTabContent
                  tabKey={key}
                  fields={fields}
                  values={values}
                  errors={errors}
                  touched={touched}
                  setFieldValue={setFieldValue}
                  opdOptions={
                    penanggungJawabOptions.length > 0
                      ? penanggungJawabOptions
                      : opdOptions
                  }
                  stepOptions={stepOptions}
                  handleFieldChange={handleFieldChange}
                  handleFieldChangeWithUnit={handleFieldChangeWithUnit}
                />
              </Row>
            </Tab.Pane>
          ))}

          <Tab.Pane eventKey={5}>
            <PreviewList data={list} opdOptions={penanggungJawabOptions} />
            <div className="mt-3">
              <Button
                variant="info"
                onClick={handleRekomendasiAI}
                disabled={loadingAI}
              >
                {loadingAI
                  ? "Meminta saran AI..."
                  : "🔮 Buat Rekomendasi Otomatis"}
              </Button>
              {rekomendasiAI && (
                <Alert variant="light" className="mt-2">
                  <strong>Rekomendasi Wajib:</strong>
                  <div className="mt-2">{rekomendasiAI}</div>
                  <Button
                    variant="success"
                    size="sm"
                    className="mt-3"
                    onClick={handleGunakanSaranAI}
                    disabled={list.length === 0}
                  >
                    Gunakan Saran Ini
                  </Button>
                </Alert>
              )}
            </div>
            <div className="d-flex justify-content-between mt-4">
              <Button
                variant="outline-secondary"
                onClick={() => setTabKey(Math.max(tabKey - 1, 0))}
              >
                Sebelumnya
              </Button>
              <div>
                <Button
                  variant="secondary"
                  onClick={handleAdd}
                  disabled={list.length >= MAX_INDIKATOR}
                >
                  Tambah Indikator
                </Button>
                <Button
                  variant="success"
                  className="ms-2"
                  onClick={() => {
                    if (onNext) onNext();
                    else if (onSave) onSave();
                  }}
                >
                  Simpan & Lanjut
                </Button>
              </div>
            </div>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Card>
  );
};

export default StepTemplate;
