import { useEffect, useRef, useCallback } from "react";
import {
  fetchNextKodeIndikatorKegiatan,
  fetchNextKodeIndikatorProgram,
  fetchNextKodeIndikatorSasaran,
  fetchNextKodeIndikatorSubKegiatan,
  fetchNextKodeIndikatorTujuan,
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

      try {
        const response = await fetchNextKodeIndikatorSasaran(sasaranId);
        const { next_kode } = response.data;
        if (next_kode) {
          setFieldValue("kode_indikator", next_kode);
        }
      } catch (error) {
        console.error("Gagal fetch next kode sasaran:", error);
      }
    },
    [setFieldValue],
  );

  const fetchNextKodeProgram = useCallback(
    async (programId) => {
      if (!programId || !dokumen || !tahun) return;

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
        console.error("Gagal fetch next kode program:", error);
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

      try {
        const response = await fetchNextKodeIndikatorKegiatan(kegiatanId, {
          jenis_dokumen: dokumen,
          tahun,
        });
        const { next_kode } = response.data;
        const list = Array.isArray(latestValuesRef.current.kegiatan)
          ? latestValuesRef.current.kegiatan
          : [];
        // Jangan biarkan data legacy (mis. kode "IK-...") mengunci next-kode.
        const hasConcreteKode = list.some((it) => {
          const k = it?.kode_indikator ?? it?.kodeIndikator ?? "";
          return String(k).trim().toUpperCase().startsWith("IPK-");
        });
        if (listLooksPersistedFromServer(list) && hasConcreteKode) return;
        if (next_kode) {
          const raw = String(next_kode).trim();
          // Fallback defensif: jika backend lama belum prefix IPK-, tambahkan.
          const effective =
            raw && !raw.toUpperCase().startsWith("IPK-") ? `IPK-${raw}` : raw;
          setFieldValue("kode_indikator", effective);
        }
      } catch (error) {
        console.error("Gagal fetch next kode kegiatan:", error);
      }
    },
    [setFieldValue, dokumen, tahun],
  );

  const fetchNextKodeSubKegiatan = useCallback(
    async (subKegiatanId) => {
      if (!subKegiatanId || !dokumen || !tahun) return;

      try {
        const response = await fetchNextKodeIndikatorSubKegiatan(subKegiatanId, {
          jenis_dokumen: dokumen,
          tahun,
          // Basis kode indikator sub kegiatan mengikuti kode indikator kegiatan (IPK-... -> IPSK-...).
          indikator_kegiatan_kode_indikator:
            values?.kegiatan_kode_indikator || values?.indikator_kegiatan_kode_indikator || "",
        });
        const { next_kode } = response.data;
        const list = Array.isArray(latestValuesRef.current.sub_kegiatan)
          ? latestValuesRef.current.sub_kegiatan
          : [];
        const hasConcreteKode = list.some((it) => {
          const k = it?.kode_indikator ?? it?.kodeIndikator ?? "";
          return String(k).trim().toUpperCase().startsWith("IPSK-");
        });
        if (listLooksPersistedFromServer(list) && hasConcreteKode) return;
        if (next_kode) setFieldValue("kode_indikator", String(next_kode).trim());
      } catch (error) {
        console.error("Gagal fetch next kode sub kegiatan:", error);
      }
    },
    [setFieldValue, dokumen, tahun, values?.kegiatan_kode_indikator, values?.indikator_kegiatan_kode_indikator],
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
      return String(k).trim().toUpperCase().startsWith("IPK-");
    });
    if (listLooksPersistedFromServer(list) && hasConcreteKode) return;
    fetchNextKodeKegiatan(values.kegiatan_id);
  }, [values.kegiatan_id, values.kegiatan, stepKey, fetchNextKodeKegiatan]);

  useEffect(() => {
    if (stepKey !== "sub_kegiatan" || !values.sub_kegiatan_id) return;
    const list = Array.isArray(values.sub_kegiatan) ? values.sub_kegiatan : [];
    const hasConcreteKode = list.some((it) => {
      const k = it?.kode_indikator ?? it?.kodeIndikator ?? "";
      return String(k).trim().toUpperCase().startsWith("IPSK-");
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
