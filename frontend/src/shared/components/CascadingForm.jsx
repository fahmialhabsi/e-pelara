// src/shared/components/CascadingForm.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Form,
  Button,
  Spinner,
  Card,
  Alert,
  Breadcrumb,
  Container,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import CascadingSelectField from "./CascadingSelectField";
import CascadingMultiSelectField from "./CascadingMultiSelectField";
import { useDokumen } from "../../hooks/useDokumen";

function CascadingForm({ existingData = null, onSaved = () => {} }) {
  const { user, userReady, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedStrategiCode, setSelectedStrategiCode] = useState([]);
  const [data, setData] = useState({});
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const { dokumen, tahun } = useDokumen();

  const levels = useMemo(
    () => [
      { key: "misi", label: "Misi", api: "misi", paramKey: null },
      {
        key: "priorNasional",
        label: "Prioritas Nasional",
        api: "prioritas-nasional",
        paramKey: "misi",
      },
      {
        key: "priorDaerah",
        label: "Prioritas Daerah",
        api: "prioritas-daerah",
        paramKey: "priorNasional",
      },
      {
        key: "priorKepda",
        label: "Prioritas Kepala Daerah",
        api: "prioritas-gubernur",
        paramKey: "priorDaerah",
      },
      { key: "tujuan", label: "Tujuan", api: "tujuan", paramKey: "misi" },
      { key: "sasaran", label: "Sasaran", api: "sasaran", paramKey: "tujuan" },
      {
        key: "strategi",
        label: "Strategi",
        api: "strategi",
        paramKey: "sasaran",
      },
      {
        key: "arahKebijakan",
        label: "Arah Kebijakan",
        api: "arah-kebijakan",
        paramKey: "strategi",
      },
      {
        key: "program",
        label: "Program",
        api: "programs",
        paramKey: "sasaran",
      },
      {
        key: "kegiatan",
        label: "Kegiatan",
        api: "kegiatan",
        paramKey: "program",
      },
    ],
    []
  );

  const renderField = (lvl, idx) => {
    const isMulti = lvl.key === "strategi" || lvl.key === "arahKebijakan";
    const raw = data[lvl.key];
    const value = isMulti ? (Array.isArray(raw) ? raw : []) : raw ?? "";

    if (lvl.key === "tujuan") {
      console.log("🎯 Tujuan value:", value);
      console.log("🎯 Tujuan options:", options[lvl.key]);
    }

    const common = {
      label: lvl.label,
      fieldKey: lvl.key,
      value,
      options: options[lvl.key] || [],
      getOptionLabel,
    };

    if (isMulti) {
      return (
        <CascadingMultiSelectField
          key={lvl.key}
          {...common}
          isMulti
          onChange={(key, val) => {
            const e = { target: { value: val } }; // Simulasikan event
            handleChange(e, idx);
          }}
        />
      );
    }

    return (
      <CascadingSelectField
        key={lvl.key}
        {...common}
        onChange={(e) => handleChange(e, idx)}
        loading={loading[lvl.key]}
      />
    );
  };

  const fetchOptions = useCallback(
    async (level, parentValue = null, strategiCode = null) => {
      console.log(
        `📡 Fetching ${level.key} with parentValue=`,
        parentValue,
        " strategiCode=",
        strategiCode
      );
      setLoading((prev) => ({ ...prev, [level.key]: true }));
      try {
        const params = {};
        if (level.paramKey && parentValue != null) {
          params[`${level.paramKey}_id`] = Array.isArray(parentValue)
            ? parentValue.join(",")
            : parentValue.toString();
        }
        if (dokumen) params.jenis_dokumen = dokumen;
        if (tahun) {
          params.tahun = tahun;
          // if (level.key === "tujuan") params.periode_id = tahun;
        }
        if (level.key === "arahKebijakan" && strategiCode) {
          params.strategi_id = Array.isArray(strategiCode)
            ? strategiCode.join(",")
            : strategiCode;
        }
        console.log(`➡️ Params for ${level.key}`, params);

        if (level.key === "tujuan") {
          console.log("📍 Log DEBUG TUJUAN:");
          console.log("  misi_id         =", params.misi_id);
          console.log("  jenis_dokumen   =", params.jenis_dokumen);
          console.log("  tahun           =", params.tahun);
        }

        const res = await api.get(level.api, { params });
        const arr = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.data)
          ? res.data.data
          : [];

        // Set langsung tanpa filter manual
        setOptions((prev) => ({ ...prev, [level.key]: arr }));
        console.log(`✅ ${level.key} options count:`, arr.length);
        if (level.key === "tujuan" && arr.length === 0) {
          console.warn(
            "⚠️ Tidak ditemukan TUJUAN untuk kombinasi param:",
            params
          );
        }
      } catch (err) {
        console.error(`❌ Error fetching ${level.key}:`, err);
        setError(`Gagal memuat ${level.label}`);
      } finally {
        setLoading((prev) => ({ ...prev, [level.key]: false }));
      }
    },
    [dokumen, tahun]
  );

  const handleChange = useCallback(
    async (e, idx) => {
      const key = levels[idx].key;
      const raw = e.target.value;
      console.log(`🌀 handleChange: level=${key}, raw=`, raw);
      if (key === "misi") {
        console.log(
          "🧩 Misi dipilih, trigger fetch tujuan setelah prioritas..."
        );
      }

      const isMulti = key === "strategi" || key === "arahKebijakan";
      const val = isMulti ? (Array.isArray(raw) ? raw : [raw]) : raw;

      console.log(`🌀 computed val for ${key}=`, val);

      const newData = { ...data, [key]: val };
      levels.slice(idx + 1).forEach((l) => {
        newData[l.key] =
          l.key === "strategi" || l.key === "arahKebijakan" ? [] : "";
      });
      setData(newData);

      console.log("📦 Updated form state:", newData);

      setOptions((prev) => {
        const upd = { ...prev };
        levels.slice(idx + 1).forEach((l) => {
          upd[l.key] = [];
        });
        return upd;
      });

      if (key === "strategi") {
        setSelectedStrategiCode(val);
      }

      for (let i = idx + 1; i < levels.length; i++) {
        const next = levels[i];
        const parentVal = newData[next.paramKey];
        if (!parentVal || (Array.isArray(parentVal) && parentVal.length === 0))
          break;
        const strat = next.key === "arahKebijakan" ? newData.strategi : null;
        console.log(
          `🔁 Fetching ${next.key} parent=${next.paramKey}`,
          parentVal,
          "strat",
          strat
        );
        await fetchOptions(next, parentVal, strat);
      }
    },
    [data, levels, fetchOptions]
  );

  useEffect(() => {
    if (!dokumen || !tahun) return;

    const initForm = async () => {
      const initialData = {};
      let stratCode = [];

      await fetchOptions(levels[0]);

      for (const level of levels) {
        const parentId = level.paramKey ? initialData[level.paramKey] : null;
        let value = null;

        if (existingData) {
          if (level.key === "strategi") {
            const strategiIds = existingData.strategis?.map((s) => s.id) || [];
            stratCode = strategiIds;
            setSelectedStrategiCode(stratCode);

            await fetchOptions(level, parentId);
            value = strategiIds;
          } else if (level.key === "arahKebijakan") {
            const arahKebijakanIds =
              existingData.arahKebijakans?.map((a) => a.id) || [];
            const code = stratCode;
            if (!level.paramKey || initialData[level.paramKey]) {
              await fetchOptions(level, parentId, code);
            }
            value = arahKebijakanIds;
          } else {
            const code = level.key === "arahKebijakan" ? stratCode : null;
            if (!level.paramKey || initialData[level.paramKey]) {
              await fetchOptions(level, parentId, code);
            }

            value =
              existingData?.[level.key]?.id ||
              existingData?.[`${level.key}_id`] ||
              "";
          }
        }

        initialData[level.key] =
          level.key === "strategi" || level.key === "arahKebijakan"
            ? value || []
            : value || "";
      }

      setData(initialData);
    };

    initForm();
  }, [existingData, fetchOptions, levels, user, userReady]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitSuccess(null);

    const payload = {};
    const map = {
      misi: "misi",
      priorNasional: "prior_nas",
      priorDaerah: "prior_daerah",
      priorKepda: "prior_kepda",
      tujuan: "tujuan",
      sasaran: "sasaran",
      strategi: "strategi",
      arahKebijakan: "arah_kebijakan",
      program: "program",
      kegiatan: "kegiatan",
    };

    for (const lvl of levels) {
      const v = data[lvl.key];
      const mapped = map[lvl.key] || lvl.key;
      if (Array.isArray(v)) {
        if (v.length === 0) return setError(`Field ${lvl.label} wajib dipilih`);
        payload[`${mapped}_ids`] = v;
      } else {
        if (!v) return setError(`Field ${lvl.label} wajib dipilih`);
        payload[`${mapped}_id`] = v;
      }
    }

    payload.jenis_dokumen = dokumen;
    payload.tahun = tahun;

    try {
      console.log("🚀 Payload to POST /api/cascading:", payload);

      if (existingData?.id) {
        await api.put(`/cascading/${existingData.id}`, payload);
      } else {
        await api.post("/cascading", payload);
      }

      setSubmitSuccess("Berhasil menyimpan");
      setData({});
      setOptions({});
      setSelectedStrategiCode([]);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal simpan data.");
    }
  };

  const getOptionLabel = (key, item) => {
    switch (key) {
      case "misi":
        return `${item.no_misi} - ${item.isi_misi}`;
      case "priorNasional":
        return `${item.kode_prionas} - ${item.nama_prionas}`;
      case "priorDaerah":
        return `${item.kode_prioda} - ${item.nama_prioda}`;
      case "priorKepda":
        return `${item.kode_priogub} - ${item.nama_priogub}`;
      case "tujuan":
        return `${item.no_tujuan} - ${item.isi_tujuan}`;
      case "sasaran":
        return `${item.nomor} - ${item.isi_sasaran}`;
      case "strategi":
        return `${item.kode_strategi} - ${item.deskripsi}`;
      case "arahKebijakan":
        return `${item.kode_arah} - ${item.nama_arah || item.deskripsi}`;
      case "program":
        return `${item.kode_program} - ${item.nama_program}`;
      case "kegiatan":
        return `${item.kode_kegiatan} - ${item.nama_kegiatan}`;
      default:
        return item.nama || "";
    }
  };

  if (authLoading || !userReady || !user) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <div>Memuat data pengguna...</div>
      </div>
    );
  }

  if (!dokumen || !tahun) {
    return (
      <div className="text-center my-5">
        <Alert variant="warning">
          Silakan pilih dokumen dan tahun terlebih dahulu.
        </Alert>
      </div>
    );
  }

  return (
    <Container className="my-4">
      <Breadcrumb>
        <Breadcrumb.Item onClick={() => navigate("/dashboard")}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate("/rpjmd/cascading-list")}>
          Daftar Cascading
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="alert alert-warning">
        <strong>Dokumen Aktif:</strong> {dokumen || "[Kosong]"},{" "}
        <strong>Tahun:</strong> {tahun || "[Kosong]"}
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {submitSuccess && <Alert variant="success">{submitSuccess}</Alert>}
          <Form onSubmit={handleSubmit}>
            {levels.map((lvl, idx) => renderField(lvl, idx))}
            <div className="d-flex justify-content-end">
              <Button
                variant="secondary"
                onClick={() => onSaved(false)}
                className="me-2"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={levels.some((l) => {
                  const v = data[l.key];
                  return Array.isArray(v) ? v.length === 0 : !v;
                })}
              >
                Simpan
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default CascadingForm;
