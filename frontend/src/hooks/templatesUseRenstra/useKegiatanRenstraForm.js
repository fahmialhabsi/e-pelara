// hooks/templatesUseRenstra/useKegiatanRenstraForm.js
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import api from "@/services/api";

const schema = yup.object({
  program_renstra_id: yup.number().required("Program Renstra wajib dipilih"),
  kode_kegiatan: yup.string().required("Kode kegiatan wajib diisi"),
  nama_kegiatan: yup.string().required("Nama kegiatan wajib diisi"),
  renstra_id: yup.number().nullable(),
  bidang_opd: yup.string(),
});

/** Backend menyimpan FK ke renstra_program.id di field `program_id` (bukan program_renstra_id). */
function programRenstraIdFromRow(row) {
  if (!row) return undefined;
  const v = row.program_renstra_id ?? row.program_id;
  return v != null && v !== "" ? Number(v) : undefined;
}

/** Teks bidang + OPD dari baris program (tanpa " - " kosong). */
function bidangDisplayFromProgramRow(p) {
  if (!p) return "";
  const b = (p.bidang_opd_penanggung_jawab || "").trim();
  const o = (p.opd_penanggung_jawab || "").trim();
  if (b && o) return `${b} - ${o}`;
  if (b) return b;
  if (o) return o;
  return "";
}

/**
 * Saat edit: jika program dari API tidak punya bidang/OPD, jangan timpa nilai `bidang_opd`
 * yang sudah tersimpan di renstra_kegiatan (nilai yang tampil di daftar).
 */
function resolveBidangOpdForForm({ programRow, initialData, selectedProgramId }) {
  const fromProgram = bidangDisplayFromProgramRow(programRow);
  if (fromProgram) return fromProgram;
  const savedPrId = programRenstraIdFromRow(initialData);
  const sameProgram =
    initialData?.id != null &&
    savedPrId != null &&
    Number(selectedProgramId) === Number(savedPrId);
  if (sameProgram && initialData?.bidang_opd != null) {
    const saved = String(initialData.bidang_opd).trim();
    if (saved) return saved;
  }
  return "";
}

/** Referensi stabil untuk mode tambah — jangan pakai default `= {}` di parameter (identitas berubah tiap render → loop useEffect). */
export const EMPTY_KEGIATAN_INITIAL_DATA = Object.freeze({});

export function useKegiatanRenstraForm(
  initialData = EMPTY_KEGIATAN_INITIAL_DATA,
  renstraAktif = {}
) {
  const [programOptions, setProgramOptions] = useState([]);
  const [kegiatanOptions, setKegiatanOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      program_renstra_id: undefined,
      rpjmd_kegiatan_id: undefined,
      kode_kegiatan: "",
      nama_kegiatan: "",
      renstra_id: renstraAktif?.id || undefined,
      bidang_opd: "",
      ...initialData,
    },
    resolver: yupResolver(schema),
  });

  const { watch, setValue, reset } = form;
  const selectedProgramId = watch("program_renstra_id");

  const loadKegiatanByProgram = async (
    rpjmdProgramId,
    selectedRenstraProgramId
  ) => {
    if (!rpjmdProgramId) {
      setKegiatanOptions([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.get(
        `/renstra-kegiatan/by-program/${rpjmdProgramId}`
      );
      const raw = res.data?.data ?? res.data;
      const rows = Array.isArray(raw) ? raw : [];
      const options = rows.map((k) => ({
        value: k.value ?? k.kegiatan_rpjmd_id ?? k.id,
        label:
          k.label ||
          `${k.kode_kegiatan ?? ""} - ${k.nama_kegiatan ?? ""}`.trim(),
        kode_kegiatan: k.kode_kegiatan,
        nama_kegiatan: k.nama_kegiatan,
        rpjmd_program_id: k.rpjmd_program_id,
      }));
      // Edit: jika kode tidak ada di hasil API (format beda / data lama), sisipkan opsi dari record
      if (initialData?.id && initialData.kode_kegiatan) {
        const kodeNorm = String(initialData.kode_kegiatan).trim();
        const ada = options.some(
          (o) => String(o.kode_kegiatan ?? "").trim() === kodeNorm
        );
        if (!ada) {
          const nama =
            (initialData.nama_kegiatan || "").trim() ||
            (initialData.kegiatan_rpjmd?.nama_kegiatan || "").trim() ||
            "";
          options.unshift({
            value: initialData.rpjmd_kegiatan_id ?? kodeNorm,
            kode_kegiatan: initialData.kode_kegiatan,
            nama_kegiatan: nama,
            label: `${initialData.kode_kegiatan} - ${nama}`.trim(),
            rpjmd_program_id: null,
          });
        }
      }

      setKegiatanOptions(options);

      let selected;
      const savedPrId = programRenstraIdFromRow(initialData);
      const sameProgramAsRecord =
        savedPrId != null &&
        Number(selectedRenstraProgramId) === Number(savedPrId);
      if (sameProgramAsRecord && initialData?.rpjmd_kegiatan_id != null) {
        selected = options.find(
          (opt) => Number(opt.value) === Number(initialData.rpjmd_kegiatan_id)
        );
      }
      if (
        !selected &&
        sameProgramAsRecord &&
        initialData?.kode_kegiatan
      ) {
        selected = options.find(
          (opt) => opt.kode_kegiatan === initialData.kode_kegiatan
        );
      }
      if (!selected && options.length > 0 && !initialData?.id) {
        selected = options[0];
      }

      if (selected) {
        setValue("rpjmd_kegiatan_id", selected.value);
        setValue("kode_kegiatan", selected.kode_kegiatan);
        setValue("nama_kegiatan", selected.nama_kegiatan);
      } else if (initialData?.id) {
        setValue("kode_kegiatan", initialData.kode_kegiatan ?? "");
        setValue(
          "nama_kegiatan",
          (initialData.nama_kegiatan || "").trim() ||
            (initialData.kegiatan_rpjmd?.nama_kegiatan || "").trim() ||
            ""
        );
      }
    } catch (err) {
      console.error("Gagal load kegiatan:", err);
      setKegiatanOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reset({
      program_renstra_id: programRenstraIdFromRow(initialData),
      rpjmd_kegiatan_id:
        initialData.rpjmd_kegiatan_id != null
          ? Number(initialData.rpjmd_kegiatan_id)
          : undefined,
      kode_kegiatan: initialData.kode_kegiatan ?? "",
      nama_kegiatan:
        (initialData.nama_kegiatan || "").trim() ||
        (initialData.kegiatan_rpjmd?.nama_kegiatan || "").trim() ||
        "",
      renstra_id: initialData.renstra_id ?? renstraAktif?.id ?? undefined,
      bidang_opd: initialData.bidang_opd ?? "",
    });
  }, [
    initialData?.id,
    initialData?.program_id,
    initialData?.program_renstra_id,
    initialData?.rpjmd_kegiatan_id,
    initialData?.kode_kegiatan,
    initialData?.nama_kegiatan,
    initialData?.renstra_id,
    initialData?.bidang_opd,
    renstraAktif?.id,
    reset,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function initForm() {
      setIsLoading(true);
      try {
        const res = await api.get("/renstra-program");
        const raw = res.data?.data ?? res.data;
        const all = Array.isArray(raw) ? raw : [];
        const rid = renstraAktif?.id ?? initialData?.renstra_id;
        let programs = rid
          ? all.filter((p) => Number(p.renstra_id) === Number(rid))
          : all;

        const targetPrId = programRenstraIdFromRow(initialData);
        let defaultProgram = programs.find(
          (p) => Number(p.id) === Number(targetPrId)
        );

        if (
          initialData?.id &&
          targetPrId != null &&
          !defaultProgram &&
          initialData.program_renstra
        ) {
          const pr = initialData.program_renstra;
          programs = [
            {
              id: pr.id ?? targetPrId,
              kode_program: pr.kode_program,
              nama_program: pr.nama_program,
              renstra_id: pr.renstra_id ?? initialData.renstra_id,
              rpjmd_program_id: pr.rpjmd_program_id ?? null,
              bidang_opd_penanggung_jawab: pr.bidang_opd_penanggung_jawab,
              opd_penanggung_jawab: pr.opd_penanggung_jawab,
            },
            ...programs,
          ];
          defaultProgram = programs.find(
            (p) => Number(p.id) === Number(targetPrId)
          );
        }

        if (cancelled) return;
        setProgramOptions(programs);

        if (!defaultProgram && !initialData?.id && programs.length) {
          defaultProgram = programs[0];
        }

        if (defaultProgram) {
          setValue("program_renstra_id", Number(defaultProgram.id));
          setValue(
            "renstra_id",
            defaultProgram.renstra_id || renstraAktif?.id || undefined
          );
          setValue(
            "bidang_opd",
            resolveBidangOpdForForm({
              programRow: defaultProgram,
              initialData,
              selectedProgramId: defaultProgram.id,
            })
          );
        }
      } catch (err) {
        console.error("Gagal inisialisasi form:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    initForm();
    return () => {
      cancelled = true;
    };
  }, [
    initialData?.id,
    initialData?.program_id,
    initialData?.program_renstra_id,
    initialData?.program_renstra,
    initialData?.renstra_id,
    renstraAktif?.id,
    setValue,
  ]);

  useEffect(() => {
    if (!selectedProgramId || !programOptions.length) return;

    const selectedProgram = programOptions.find(
      (p) => Number(p.id) === Number(selectedProgramId)
    );
    if (!selectedProgram) return;

    setValue(
      "bidang_opd",
      resolveBidangOpdForForm({
        programRow: selectedProgram,
        initialData,
        selectedProgramId: selectedProgram.id,
      })
    );
    const rpjmdPid =
      selectedProgram.rpjmd_program_id ?? selectedProgram.id;
    loadKegiatanByProgram(rpjmdPid, selectedProgram.id);
  }, [
    selectedProgramId,
    programOptions,
    setValue,
    initialData?.id,
    initialData?.rpjmd_kegiatan_id,
    initialData?.kode_kegiatan,
    initialData?.nama_kegiatan,
    initialData?.program_id,
    initialData?.program_renstra_id,
  ]);

  const onSubmit = async (data, message) => {
    setIsSubmitting(true);
    try {
      await api.post("/renstra-kegiatan", {
        program_id: data.program_renstra_id,
        kode_kegiatan: data.kode_kegiatan,
        nama_kegiatan: data.nama_kegiatan,
        renstra_id: data.renstra_id,
        bidang_opd: data.bidang_opd,
      });
      message?.success("Data berhasil disimpan");
    } catch (err) {
      console.error("Gagal submit:", err);
      const msg =
        err.response?.data?.error || "Gagal menyimpan data, silakan coba lagi";
      message?.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    programOptions,
    kegiatanOptions,
    isLoading,
    isSubmitting,
    onSubmit,
  };
}
