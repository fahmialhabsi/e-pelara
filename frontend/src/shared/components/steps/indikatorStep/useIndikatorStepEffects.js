import { useEffect, useRef, useCallback } from "react";
import {
  fetchNextKodeIndikatorKegiatan,
  fetchNextKodeIndikatorProgram,
  fetchNextKodeIndikatorSasaran,
  fetchNextKodeIndikatorSubKegiatan,
  fetchNextKodeIndikatorTujuan,
  fetchNextKodeIndikatorArahKebijakan,
  fetchIndikatorSasaranBySasaran,
  fetchNextKodeIndikatorStrategi,
  fetchIndikatorStrategiByStrategi,
  fetchIndikatorArahByArahKebijakan,
  fetchIndikatorProgramByProgram,
  fetchIndikatorProgramByKodePrefix,
  fetchIndikatorKegiatanByKegiatan,
  fetchIndikatorSubKegiatanBySubKegiatan,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import { listLooksPersistedFromServer } from "@/shared/components/steps/wizardIndikatorStepUtils";

/**
 * Efek sinkronisasi StepTemplate: konteks tujuan, next-kode, baseline dari capaian_5,
 * sync sasaran dari options, fokus error pertama, log debug kegiatan.
 */
export default function useIndikatorStepEffects({
  stepKey,
  values,
  errors,
  setFieldValue,
  dokumen,
  tahun,
  debouncedCapaian5,
  sasaranOptions,
  handleSasaranChange,
  fetchContext,
  formRef,
  kegiatanOptions,
}) {
  const fetchedOnceRef = useRef({});
  const latestValuesRef = useRef(values);
  latestValuesRef.current = values;
  /** true jika sasaran_id aktif sudah punya indikator di DB — cegah fetchNextKodeSasaran menimpa kode restore. */
  const hasExistingSasaranRef = useRef(false);
  /** true jika strategi_id aktif sudah punya indikator di DB — cegah fetchNextKodeStrategi menimpa kode restore. */
  const hasExistingStrategiRef = useRef(false);
  /** true jika arah_kebijakan_id aktif sudah punya indikator di DB — cegah fetchNextKodeArahKebijakan menimpa kode restore. */
  const hasExistingArahRef = useRef(false);
  /** true jika program_id aktif sudah punya indikator di DB — cegah fetchNextKodeProgram menimpa kode restore. */
  const hasExistingProgramRef = useRef(false);
  /** true jika kegiatan_id aktif sudah punya indikator di DB — cegah fetchNextKodeKegiatan menimpa kode restore. */
  const hasExistingKegiatanRef = useRef(false);
  /** true jika sub_kegiatan_id aktif sudah punya indikator di DB — cegah fetchNextKodeSubKegiatan menimpa kode restore. */
  const hasExistingSubKegiatanRef = useRef(false);

  const fetchNextKode = useCallback(
    async (tujuanId) => {
      if (!tujuanId || !dokumen || !tahun) return;

      if (fetchedOnceRef.current[tujuanId]) {
        return;
      }

      fetchedOnceRef.current[tujuanId] = true;

      try {
        const response = await fetchNextKodeIndikatorTujuan(tujuanId, {
          tahun,
          jenis_dokumen: dokumen,
        });
        const { kode } = response.data;

        if (kode) {
          setFieldValue("kode_indikator", kode);
        }
      } catch (error) {
        console.error("Gagal fetch next kode tujuan:", error);
      }
    },
    [setFieldValue, dokumen, tahun],
  );

  const fetchNextKodeSasaran = useCallback(
    async (sasaranId) => {
      if (!sasaranId) return;
      if (hasExistingSasaranRef.current) return;
      try {
        const response = await fetchNextKodeIndikatorSasaran(sasaranId);
        const { next_kode } = response.data;
        if (hasExistingSasaranRef.current) return;
        if (next_kode) {
          setFieldValue("kode_indikator", next_kode);
        }
      } catch (error) {
        if (!hasExistingSasaranRef.current) {
          console.error("Gagal fetch next kode sasaran:", error);
        }
      }
    },
    [setFieldValue],
  );

  const fetchNextKodeStrategi = useCallback(
    async (strategiId) => {
      if (!strategiId || !dokumen || !tahun) return;
      if (hasExistingStrategiRef.current) return;
      try {
        const response = await fetchNextKodeIndikatorStrategi(strategiId, {
          jenis_dokumen: dokumen,
          tahun,
        });
        const next_kode = response.data?.next_kode || response.data?.kode;
        if (hasExistingStrategiRef.current) return;
        if (next_kode) setFieldValue("kode_indikator", String(next_kode).trim());
      } catch (error) {
        if (!hasExistingStrategiRef.current) {
          console.error("Gagal fetch next kode strategi:", error);
        }
      }
    },
    [setFieldValue, dokumen, tahun],
  );

  const fetchNextKodeArahKebijakan = useCallback(
    async (arahKebijakanId) => {
      if (!arahKebijakanId) return;
      if (hasExistingArahRef.current) return;
      try {
        const response = await fetchNextKodeIndikatorArahKebijakan(arahKebijakanId, {
          jenis_dokumen: dokumen,
          tahun,
        });
        const next_kode = response.data?.next_kode || response.data?.kode;
        if (hasExistingArahRef.current) return;
        if (next_kode) setFieldValue("kode_indikator", String(next_kode).trim());
      } catch (error) {
        if (!hasExistingArahRef.current) {
          console.error("Gagal fetch next kode arah kebijakan:", error);
        }
      }
    },
    [setFieldValue, dokumen, tahun],
  );


  const fetchNextKodeProgram = useCallback(
    async (programId) => {
      if (!programId || !dokumen || !tahun) return;
      if (hasExistingProgramRef.current) return;
      // ProgramStep sudah mengisi kode_indikator via hydrate — jangan timpa.
      if (String(latestValuesRef.current.kode_indikator || "").trim()) return;

      try {
        const response = await fetchNextKodeIndikatorProgram(programId, {
          jenis_dokumen: dokumen,
          tahun,
          // Basis kode indikator program mengikuti kode indikator Arah Kebijakan (jika tersedia).
          arah_kebijakan_kode_indikator:
            values?.program_ref_ar_kode_indikator ||
            values?.arah_kebijakan_kode_indikator ||
            "",
        });
        const { next_kode } = response.data;
        if (hasExistingProgramRef.current) return;
        // Periksa lagi setelah await — ProgramStep mungkin sudah mengisi saat ini.
        if (String(latestValuesRef.current.kode_indikator || "").trim()) return;
        const list = Array.isArray(latestValuesRef.current.program)
          ? latestValuesRef.current.program
          : [];
        // Baris "referensi" legacy sering punya id numerik tapi program_id NULL.
        // Di Step Program, baris seperti itu tidak boleh mengunci next-kode (harus tetap generate IP-...).
        const hasConcreteFk = list.some((it) => {
          const fk = it?.program_id ?? it?.programId;
          return fk != null && String(fk).trim() !== "" && String(fk) !== "null";
        });
        if (listLooksPersistedFromServer(list) && hasConcreteFk) return;
        if (next_kode) {
          setFieldValue("kode_indikator", next_kode);
        }
      } catch (error) {
        if (!hasExistingProgramRef.current) {
          console.error("Gagal fetch next kode program:", error);
        }
      }
    },
    [
      setFieldValue,
      dokumen,
      tahun,
      values?.arah_kebijakan_kode_indikator,
      values?.program_ref_ar_kode_indikator,
    ],
  );

  const fetchNextKodeKegiatan = useCallback(
    async (kegiatanId) => {
      if (!kegiatanId || !dokumen || !tahun) return;
      if (hasExistingKegiatanRef.current) return;
      // KegiatanStep sudah mengisi kode_indikator via hydrate — jangan timpa.
      if (String(latestValuesRef.current.kode_indikator || "").trim()) return;

      try {
        const response = await fetchNextKodeIndikatorKegiatan(kegiatanId, {
          jenis_dokumen: dokumen,
          tahun,
          // Gunakan indikator_program_id (ID), bukan kode, agar backend menemukan record yang tepat
          indikator_program_id: values?.indikator_program_id || "",
        });
        const { next_kode } = response.data;
        if (hasExistingKegiatanRef.current) return;
        // Periksa lagi setelah await — KegiatanStep mungkin sudah mengisi saat ini.
        if (String(latestValuesRef.current.kode_indikator || "").trim()) return;
        const list = Array.isArray(latestValuesRef.current.kegiatan)
          ? latestValuesRef.current.kegiatan
          : [];
        const hasConcreteKode = list.some((it) => {
          const k = it?.kode_indikator ?? it?.kodeIndikator ?? "";
          return String(k).trim().toUpperCase().startsWith("IK");
        });
        if (listLooksPersistedFromServer(list) && hasConcreteKode) return;
        if (next_kode) setFieldValue("kode_indikator", String(next_kode).trim());
      } catch (error) {
        if (!hasExistingKegiatanRef.current) {
          console.error("Gagal fetch next kode kegiatan:", error);
        }
      }
    },
    [setFieldValue, dokumen, tahun, values?.indikator_program_id],
  );

  const fetchNextKodeSubKegiatan = useCallback(
    async (subKegiatanId) => {
      if (!subKegiatanId || !dokumen || !tahun) return;
      if (hasExistingSubKegiatanRef.current) return;

      try {
        const response = await fetchNextKodeIndikatorSubKegiatan(subKegiatanId, {
          jenis_dokumen: dokumen,
          tahun,
          // Basis kode indikator sub kegiatan mengikuti kode indikator kegiatan (IPK-... -> IPSK-...).
          indikator_kegiatan_kode_indikator:
            values?.kegiatan_kode_indikator || values?.indikator_kegiatan_kode_indikator || "",
        });
        const { next_kode } = response.data;
        if (hasExistingSubKegiatanRef.current) return;
        const list = Array.isArray(latestValuesRef.current.sub_kegiatan)
          ? latestValuesRef.current.sub_kegiatan
          : [];
        const hasConcreteKode = list.some((it) => {
          const k = it?.kode_indikator ?? it?.kodeIndikator ?? "";
          return String(k).trim().toUpperCase().startsWith("ISK");
        });
        if (listLooksPersistedFromServer(list) && hasConcreteKode) return;
        if (next_kode) setFieldValue("kode_indikator", String(next_kode).trim());
      } catch (error) {
        if (!hasExistingSubKegiatanRef.current) {
          console.error("Gagal fetch next kode sub kegiatan:", error);
        }
      }
    },
    [setFieldValue, dokumen, tahun, values?.kegiatan_kode_indikator, values?.indikator_kegiatan_kode_indikator],
  );

  useEffect(() => {
    if (values.no_tujuan) {
      fetchContext(values.no_tujuan);
    }
  }, [values.no_tujuan, fetchContext]);

  // Fetch existing indikator sasaran → auto-populate nama + kode, atau biarkan fetchNextKodeSasaran berjalan.
  useEffect(() => {
    if (stepKey !== "sasaran" || !values.sasaran_id) return;
    hasExistingSasaranRef.current = false;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchIndikatorSasaranBySasaran(values.sasaran_id, {
          tahun,
          jenis_dokumen: dokumen,
        });
        if (cancelled) return;
        const raw = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        if (raw.length > 0) {
          hasExistingSasaranRef.current = true;
          const first = raw[0];
          setFieldValue("nama_indikator", first.nama_indikator || "");
          setFieldValue("kode_indikator", first.kode_indikator || "");
        }
      } catch { /* abaikan */ }
    })();
    return () => { cancelled = true; };
  }, [stepKey, values.sasaran_id, setFieldValue, tahun, dokumen]);

  useEffect(() => {
    if (stepKey === "sasaran" && values.nomor) {
      fetchNextKodeSasaran(values.nomor);
    }
  }, [values.nomor, stepKey, fetchNextKodeSasaran]);

  // Sinkronisasi sasaran: Nama Indikator dikosongkan → bersihkan Kode Indikator.
  useEffect(() => {
    if (stepKey !== "sasaran" || !hasExistingSasaranRef.current) return;
    if (!String(values.nama_indikator || "").trim()) {
      setFieldValue("kode_indikator", "");
    }
  }, [stepKey, values.nama_indikator, setFieldValue]);

  // Fetch existing indikator strategi → auto-populate nama + kode, atau biarkan fetchNextKodeStrategi berjalan.
  useEffect(() => {
    if (stepKey !== "strategi" || !values.strategi_id) return;
    hasExistingStrategiRef.current = false;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchIndikatorStrategiByStrategi(values.strategi_id, {
          tahun,
          jenis_dokumen: dokumen,
        });
        if (cancelled) return;
        const raw = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        if (raw.length > 0) {
          hasExistingStrategiRef.current = true;
          const first = raw[0];
          setFieldValue("nama_indikator", first.nama_indikator || "");
          setFieldValue("kode_indikator", first.kode_indikator || "");
        }
      } catch { /* abaikan */ }
    })();
    return () => { cancelled = true; };
  }, [stepKey, values.strategi_id, setFieldValue, tahun, dokumen]);

  useEffect(() => {
    if (stepKey !== "strategi" || !values.strategi_id) return;
    fetchNextKodeStrategi(values.strategi_id);
  }, [values.strategi_id, stepKey, fetchNextKodeStrategi]);

  // Sinkronisasi strategi: Nama Indikator dikosongkan → bersihkan Kode Indikator.
  useEffect(() => {
    if (stepKey !== "strategi" || !hasExistingStrategiRef.current) return;
    if (!String(values.nama_indikator || "").trim()) {
      setFieldValue("kode_indikator", "");
    }
  }, [stepKey, values.nama_indikator, setFieldValue]);

  // Fetch existing indikator arah kebijakan → auto-populate nama + kode, atau biarkan fetchNextKodeArahKebijakan berjalan.
  useEffect(() => {
    if (stepKey !== "arah_kebijakan" || !values.arah_kebijakan_id) return;
    hasExistingArahRef.current = false;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchIndikatorArahByArahKebijakan(values.arah_kebijakan_id, {
          tahun,
          jenis_dokumen: dokumen,
        });
        if (cancelled) return;
        const raw = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        if (raw.length > 0) {
          hasExistingArahRef.current = true;
          const first = raw[0];
          setFieldValue("nama_indikator", first.nama_indikator || "");
          setFieldValue("kode_indikator", first.kode_indikator || "");
        }
      } catch { /* abaikan */ }
    })();
    return () => { cancelled = true; };
  }, [stepKey, values.arah_kebijakan_id, setFieldValue, tahun, dokumen]);

  useEffect(() => {
    if (stepKey !== "arah_kebijakan" || !values.arah_kebijakan_id) return;
    fetchNextKodeArahKebijakan(values.arah_kebijakan_id);
  }, [values.arah_kebijakan_id, stepKey, fetchNextKodeArahKebijakan]);

  // Sinkronisasi arah kebijakan: Nama Indikator dikosongkan → bersihkan Kode Indikator.
  useEffect(() => {
    if (stepKey !== "arah_kebijakan" || !hasExistingArahRef.current) return;
    if (!String(values.nama_indikator || "").trim()) {
      setFieldValue("kode_indikator", "");
    }
  }, [stepKey, values.nama_indikator, setFieldValue]);


  // Fetch-existing indikator program dinonaktifkan — ProgramStep.jsx sudah menjadi sole hydrator
  // (hydrateDraftFromIndikatorRow mengisi semua field termasuk kode_indikator via filter arah_kebijakan_id).
  // Efek ini dulu menyebabkan race condition karena hanya set 2 field (nama + kode) sedangkan ProgramStep
  // mengisi semua field "tab umum sd target".
  useEffect(() => {
    if (stepKey !== "program" || !values.program_id) return;
    hasExistingProgramRef.current = false;
  }, [stepKey, values.program_id]);

  // Sinkronisasi program: Nama Indikator dikosongkan → bersihkan Kode Indikator.
  useEffect(() => {
    if (stepKey !== "program" || !hasExistingProgramRef.current) return;
    if (!String(values.nama_indikator || "").trim()) {
      setFieldValue("kode_indikator", "");
    }
  }, [stepKey, values.nama_indikator, setFieldValue]);

  // Fetch-existing indikator kegiatan dinonaktifkan — KegiatanStep.jsx sudah menjadi sole hydrator.
  // Efek ini dulu fetching tanpa indikator_program_id → menemukan record legacy "IK-..." yang salah.
  // KegiatanStep.jsx menggunakan indikator_program_id untuk mendapatkan record yang tepat.
  useEffect(() => {
    if (stepKey !== "kegiatan" || !values.kegiatan_id) return;
    hasExistingKegiatanRef.current = false;
  }, [stepKey, values.kegiatan_id]);

  // Sinkronisasi kegiatan: Nama Indikator dikosongkan → bersihkan Kode Indikator.
  useEffect(() => {
    if (stepKey !== "kegiatan" || !hasExistingKegiatanRef.current) return;
    if (!String(values.nama_indikator || "").trim()) {
      setFieldValue("kode_indikator", "");
    }
  }, [stepKey, values.nama_indikator, setFieldValue]);

  // Fetch existing indikator sub kegiatan → auto-populate nama + kode, atau biarkan fetchNextKodeSubKegiatan berjalan.
  useEffect(() => {
    if (stepKey !== "sub_kegiatan" || !values.sub_kegiatan_id) return;
    hasExistingSubKegiatanRef.current = false;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchIndikatorSubKegiatanBySubKegiatan(values.sub_kegiatan_id, {
          tahun,
          jenis_dokumen: dokumen,
        });
        if (cancelled) return;
        const raw = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        if (raw.length > 0) {
          // Cari record yang kode_indikator-nya sesuai prefix ISK dari kegiatan_kode_indikator.
          // Ini memastikan record yang ditampilkan terhubung ke Indikator Kegiatan yang dipilih user,
          // bukan record pertama yang kebetulan ada di database (bisa milik kegiatan lain).
          const kegKode = String(latestValuesRef.current?.kegiatan_kode_indikator || "").trim();
          const iskPrefix = kegKode.toUpperCase().startsWith("IK")
            ? `ISK${kegKode.slice(2)}`
            : "";

          let first = null;
          if (iskPrefix) {
            first = raw.find((r) => String(r.kode_indikator || "").startsWith(iskPrefix)) || null;
          } else {
            // Tidak ada basis kode kegiatan → fallback ke record pertama (perilaku lama)
            first = raw[0];
          }

          if (first) {
            const hasRealData =
              (first.kode_indikator || "").trim() !== "" ||
              (first.nama_indikator || "").trim() !== "";
            if (hasRealData) {
              hasExistingSubKegiatanRef.current = true;
              setFieldValue("nama_indikator", first.nama_indikator || "");
              setFieldValue("kode_indikator", first.kode_indikator || "");
            }
          }
          // Jika iskPrefix tersedia tapi tidak ada record yang cocok:
          // hasExistingSubKegiatanRef.current tetap false → fetchNextKodeSubKegiatan berjalan
          // untuk generate kode ISK baru sesuai kegiatan yang dipilih.
        }
      } catch { /* abaikan */ }
    })();
    return () => { cancelled = true; };
  }, [stepKey, values.sub_kegiatan_id, setFieldValue, tahun, dokumen]);

  // Sinkronisasi sub kegiatan: Nama Indikator dikosongkan → bersihkan Kode Indikator.
  useEffect(() => {
    if (stepKey !== "sub_kegiatan" || !hasExistingSubKegiatanRef.current) return;
    if (!String(values.nama_indikator || "").trim()) {
      setFieldValue("kode_indikator", "");
    }
  }, [stepKey, values.nama_indikator, setFieldValue]);

  useEffect(() => {
    if (stepKey !== "program" || !values.program_id) return;
    const list = Array.isArray(values.program) ? values.program : [];
    const hasConcreteFk = list.some((it) => {
      const fk = it?.program_id ?? it?.programId;
      return fk != null && String(fk).trim() !== "" && String(fk) !== "null";
    });
    if (listLooksPersistedFromServer(list) && hasConcreteFk) return;
    fetchNextKodeProgram(values.program_id);
  }, [
    values.program_id,
    values.program,
    values.program_ref_ar_kode_indikator,
    values.arah_kebijakan_kode_indikator,
    stepKey,
    fetchNextKodeProgram,
  ]);

  useEffect(() => {
    if (stepKey !== "kegiatan" || !values.kegiatan_id) return;
    const list = Array.isArray(values.kegiatan) ? values.kegiatan : [];
    const hasConcreteKode = list.some((it) => {
      const k = it?.kode_indikator ?? it?.kodeIndikator ?? "";
      return String(k).trim().toUpperCase().startsWith("IK");
    });
    if (listLooksPersistedFromServer(list) && hasConcreteKode) return;
    fetchNextKodeKegiatan(values.kegiatan_id);
  }, [values.kegiatan_id, values.kegiatan, stepKey, fetchNextKodeKegiatan]);

  useEffect(() => {
    if (stepKey !== "sub_kegiatan" || !values.sub_kegiatan_id) return;
    const list = Array.isArray(values.sub_kegiatan) ? values.sub_kegiatan : [];
    const hasConcreteKode = list.some((it) => {
      const k = it?.kode_indikator ?? it?.kodeIndikator ?? "";
      return String(k).trim().toUpperCase().startsWith("ISK");
    });
    if (listLooksPersistedFromServer(list) && hasConcreteKode) return;
    fetchNextKodeSubKegiatan(values.sub_kegiatan_id);
  }, [
    values.sub_kegiatan_id,
    values.sub_kegiatan,
    values.kegiatan_kode_indikator,
    values.indikator_kegiatan_kode_indikator,
    stepKey,
    fetchNextKodeSubKegiatan,
  ]);

  useEffect(() => {
    /* Hanya step Tujuan: jangan fetch next-kode T… di Sasaran/Strategi/dll. */
    if (stepKey !== "tujuan") return;

    const { no_tujuan } = values;

    if (!no_tujuan) return;

    const tujuanList = Array.isArray(values.tujuan) ? values.tujuan : [];
    if (listLooksPersistedFromServer(tujuanList)) return;

    if (fetchedOnceRef.current[`kode_${no_tujuan}`]) return;
    fetchedOnceRef.current[`kode_${no_tujuan}`] = true;

    fetchNextKode(no_tujuan);
  }, [stepKey, values.no_tujuan, values.tujuan, fetchNextKode]);

  useEffect(() => {
    if (!Object.keys(errors).length) return;
    const timer = setTimeout(() => {
      const el = formRef.current?.querySelector(
        ".is-invalid, [aria-invalid='true']",
      );
      if (el) el.focus({ preventScroll: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [errors, formRef]);

  useEffect(() => {
    /* Step Tujuan: baseline diisi otomatis dari capaian T1–T4 (impor 2.28), bukan dari capaian tahun 5. */
    if (stepKey === "tujuan") return;
    if (debouncedCapaian5 && debouncedCapaian5 !== values.baseline) {
      setFieldValue("baseline", debouncedCapaian5);
    }
  }, [debouncedCapaian5, values.baseline, setFieldValue, stepKey]);

  useEffect(() => {
    if (!sasaranOptions.length || !values.sasaran_id) return;

    const selected = sasaranOptions.find(
      (opt) => Number(opt.value) === Number(values.sasaran_id),
    );

    if (selected) {
      handleSasaranChange(selected);
    } else {
      console.warn("❗ Sasaran tidak ditemukan di options.");
    }
  }, [sasaranOptions, values.sasaran_id, handleSasaranChange]);
}
