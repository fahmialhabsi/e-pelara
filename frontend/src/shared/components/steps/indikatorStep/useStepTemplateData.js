import { useEffect, useState, useCallback } from "react";
import {
  extractSingleData,
  normalizeListItems,
} from "@/utils/apiResponse";
import {
  fetchIndikatorProgramOptions,
  fetchIndikatorTujuanContext,
  fetchOpdPenanggungJawabDropdown,
  fetchRekomendasiAiStatus,
  fetchTujuanForStep,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import { mapOpdPenanggungRowToSelectOption } from "@/features/rpjmd/services/indikatorRpjmdMapper";

/**
 * Fetch options & konteks untuk StepTemplate (OPD, tujuan, sasaran, program, indikator program, AI status).
 */
export default function useStepTemplateData({
  stepKey,
  tahun,
  dokumen,
  programId,
  setFieldValue,
  penanggungJawabRef,
  options,
  /** Nilai Formik saat ini — agar sinkron OPD jalan jika hydrate mengisi PJ setelah fetch opsi. */
  formPenanggungJawab,
}) {
  const [aiRecoAvailable, setAiRecoAvailable] = useState(null);
  const [aiRecoHint, setAiRecoHint] = useState("");
  const [tujuanOptions, setTujuanOptions] = useState([]);
  const [sasaranOptions, setSasaranOptions] = useState([]);
  const [programOptions, setProgramOptions] = useState([]);
  const [strategiOptions, setStrategiOptions] = useState([]);
  const [arahKebijakanOptions, setArahKebijakanOptions] = useState([]);
  const [subKegiatanOptions, setSubKegiatanOptions] = useState([]);
  const [programIndikatorOptions, setProgramIndikatorOptions] = useState([]);
  const [contextData, setContextData] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [penanggungJawabOptions, setPenanggungJawabOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { available, hint } = await fetchRekomendasiAiStatus();
        if (cancelled) return;
        setAiRecoAvailable(available);
        setAiRecoHint(hint);
      } catch {
        if (!cancelled) {
          setAiRecoAvailable(true);
          setAiRecoHint("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (stepKey !== "kegiatan" || !programId || !dokumen || !tahun) return;

    const fetchIndikatorProgram = async () => {
      try {
        const res = await fetchIndikatorProgramOptions({
          program_id: programId,
          jenis_dokumen: dokumen,
          tahun,
        });

        const opts = normalizeListItems(res.data).map((item) => ({
          value: item.id,
          label: `${item.kode_indikator} - ${item.nama_indikator}`,
        }));

        setProgramIndikatorOptions(opts);
      } catch (err) {
        console.error("❌ Gagal fetch indikator program:", err);
        setProgramIndikatorOptions([]);
      }
    };

    fetchIndikatorProgram();
  }, [stepKey, programId, dokumen, tahun]);

  const fetchContext = useCallback(async (noTujuan) => {
    if (!noTujuan) return;

    setLoadingContext(true);
    try {
      const response = await fetchIndikatorTujuanContext(noTujuan);

      setContextData(extractSingleData(response.data));
    } catch {
      setContextData(null);
    } finally {
      setLoadingContext(false);
    }
  }, []);

  useEffect(() => {
    // Jika stepKey === "tujuan", TujuanStep sudah mem-filter by misi_id.
    // Gunakan options.tujuan langsung agar dropdown tidak tampilkan data global.
    if (stepKey === "tujuan") {
      setTujuanOptions(options?.tujuan || []);
      return;
    }

    // Untuk step lain: fallback fetch global (tidak perlu filter misi)
    const fetchTujuan = async () => {
      try {
        const res = await fetchTujuanForStep({
          tahun,
          jenis_dokumen: dokumen,
        });
        const opts = normalizeListItems(res.data).map((item) => ({
          value: item.id,
          label: `${item.no_tujuan}: ${item.isi_tujuan}`,
          isi_tujuan: item.isi_tujuan,
          // no_tujuan disertakan agar handleTujuanChange dapat menyimpannya
          // ke Formik sebagai tujuan_no_tujuan_code (filter dropdown referensi impor)
          no_tujuan: item.no_tujuan || "",
        }));
        setTujuanOptions(opts);
      } catch { /* diam */ }
    };

    if (dokumen && tahun) fetchTujuan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, options?.tujuan, dokumen, tahun]);

  useEffect(() => {
    let cancelled = false;
    const fetchPenanggungJawab = async () => {
      try {
        const res = await fetchOpdPenanggungJawabDropdown({
          include_bidang: true,
          ...(tahun != null && tahun !== "" ? { tahun } : {}),
          ...(dokumen ? { jenis_dokumen: dokumen } : {}),
        });
        if (cancelled) return;
        const opts = normalizeListItems(res.data)
          .map((item) => mapOpdPenanggungRowToSelectOption(item))
          .filter(Boolean);

        setPenanggungJawabOptions(opts);

        if (typeof options?.setOPDOptions === "function") {
          options.setOPDOptions(opts);
        }
      } catch (error) {
        console.error("Gagal fetch penanggung jawab", error);
      }
    };

    fetchPenanggungJawab();
    return () => {
      cancelled = true;
    };
  }, [tahun, dokumen, setFieldValue]);

  useEffect(() => {
    if (!penanggungJawabOptions.length) return;
    const fromForm =
      formPenanggungJawab != null && String(formPenanggungJawab).trim() !== ""
        ? String(formPenanggungJawab).trim()
        : "";
    const fromRef =
      penanggungJawabRef?.current != null &&
      String(penanggungJawabRef.current).trim() !== ""
        ? String(penanggungJawabRef.current).trim()
        : "";
    const currentPj = fromForm || fromRef;
    if (!currentPj) return;
    const match = penanggungJawabOptions.find(
      (opt) => String(opt.value) === currentPj,
    );
    if (match) setFieldValue("penanggung_jawab", String(match.value));
  }, [
    penanggungJawabOptions,
    formPenanggungJawab,
    penanggungJawabRef,
    setFieldValue,
  ]);

  useEffect(() => {
    if (stepKey === "sasaran") {
      setSasaranOptions(options?.sasaran || []);
      return;
    }
    setSasaranOptions([]);
  }, [stepKey, options?.sasaran]);

  useEffect(() => {
    if (stepKey === "program") {
      setProgramOptions(options?.program || []);
      return;
    }
    setProgramOptions([]);
  }, [stepKey, options?.program]);

  useEffect(() => {
    if (
      stepKey === "strategi" ||
      stepKey === "arah_kebijakan" ||
      stepKey === "program"
    ) {
      setStrategiOptions(options?.strategi || []);
      return;
    }
    setStrategiOptions([]);
  }, [stepKey, options?.strategi]);

  useEffect(() => {
    if (stepKey === "arah_kebijakan") {
      setArahKebijakanOptions(options?.arah_kebijakan || []);
      return;
    }
    setArahKebijakanOptions([]);
  }, [stepKey, options?.arah_kebijakan]);

  useEffect(() => {
    if (stepKey === "sub_kegiatan") {
      setSubKegiatanOptions(options?.sub_kegiatan || []);
      return;
    }
    setSubKegiatanOptions([]);
  }, [stepKey, options?.sub_kegiatan]);

  return {
    aiRecoAvailable,
    aiRecoHint,
    tujuanOptions,
    sasaranOptions,
    programOptions,
    strategiOptions,
    arahKebijakanOptions,
    subKegiatanOptions,
    programIndikatorOptions,
    penanggungJawabOptions,
    contextData,
    loadingContext,
    fetchContext,
  };
}
