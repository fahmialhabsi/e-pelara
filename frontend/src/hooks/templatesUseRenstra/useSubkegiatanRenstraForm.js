import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import api from "@/services/api";

// ===== Schema =====
const schema = Yup.object().shape({
  kegiatan_id: Yup.number().nullable().required("Kegiatan wajib diisi"),
  kode_sub_kegiatan: Yup.string().nullable(),
  nama_sub_kegiatan: Yup.string().nullable(),
  renstra_program_id: Yup.number()
    .nullable()
    .required("Program Renstra wajib diisi"),
  sub_kegiatan_id: Yup.number().nullable().required("Sub Kegiatan wajib diisi"),
  sub_bidang_opd: Yup.string().nullable(),
  nama_opd: Yup.string().nullable(),
  nama_bidang_opd: Yup.string().nullable(),
});

const getDefaultValues = (initialData) => ({
  id: initialData.id ?? null,
  kegiatan_id: initialData.kegiatan_id ?? null,
  kode_sub_kegiatan: initialData.kode_sub_kegiatan ?? "",
  nama_sub_kegiatan: initialData.nama_sub_kegiatan ?? "",
  renstra_program_id: initialData.renstra_program_id ?? null,
  sub_kegiatan_id: initialData.sub_kegiatan_id ?? null,
  sub_bidang_opd: initialData.sub_bidang_opd ?? "",
  nama_opd: initialData.nama_opd ?? "",
  nama_bidang_opd: initialData.nama_bidang_opd ?? "",
});

export function useSubkegiatanRenstraForm(
  initialData = {},
  renstraAktif = {},
  onSuccess
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [kegiatanOptions, setKegiatanOptions] = useState([]);
  const [subKegiatanOptions, setSubKegiatanOptions] = useState([]);

  const form = useForm({
    resolver: yupResolver(schema),
    defaultValues: getDefaultValues(initialData, renstraAktif),
  });

  const { watch, setValue } = form;
  const selectedKegiatanId = watch("kegiatan_id");
  const selectedSubKegiatanId = watch("sub_kegiatan_id");

  // ===== 1) Load daftar kegiatan =====
  useEffect(() => {
    const controller = new AbortController();

    async function fetchKegiatan() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get("/renstra-kegiatan", {
          signal: controller.signal,
        });
        const arr = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];

        const options = arr.map((k) => ({
          label: `${k.kode_kegiatan} - ${k.nama_kegiatan}`,
          value: k.id,
          kode_kegiatan: k.kode_kegiatan,
          renstra_program_id:
            k.renstra_program_id || k.program_renstra?.id || null,
        }));

        setKegiatanOptions(options);

        // Preselect kegiatan
        const pre =
          options.find((o) => o.value === initialData.kegiatan_id) ||
          options[0];
        if (pre) {
          setValue("kegiatan_id", pre.value, { shouldValidate: true });
          setValue("renstra_program_id", pre.renstra_program_id ?? null, {
            shouldValidate: true,
          });
        }
      } catch (e) {
        if (e.name !== "CanceledError" && e.name !== "AbortError") {
          console.error(e);
          setError("Gagal memuat data kegiatan");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchKegiatan();
    return () => controller.abort();
  }, [initialData.kegiatan_id, setValue]);

  // ===== 2) Load subkegiatan ketika kegiatan berubah =====
  useEffect(() => {
    if (!selectedKegiatanId) {
      setSubKegiatanOptions([]);
      return;
    }

    const controller = new AbortController();

    async function fetchSubKegiatan() {
      setIsLoading(true);
      setError(null);
      try {
        const keg = kegiatanOptions.find((k) => k.value === selectedKegiatanId);
        const kodeKegiatan = keg?.kode_kegiatan;
        if (!kodeKegiatan) {
          setSubKegiatanOptions([]);
          return;
        }

        const res = await api.get(
          "/renstra-subkegiatan/sub-kegiatan/by-kode-kegiatan",
          {
            params: { kode_kegiatan: kodeKegiatan },
            signal: controller.signal,
          }
        );

        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        const options = rows.map((s) => ({
          label: `${s.kode_sub_kegiatan} - ${s.nama_sub_kegiatan}`,
          value: s.sub_kegiatan_id, // FIX: pakai sub_kegiatan_id dari tabel RPJMD
          kode_sub_kegiatan: s.kode_sub_kegiatan,
          nama_sub_kegiatan: s.nama_sub_kegiatan,
          sub_kegiatan_id: s.sub_kegiatan_id,
          sub_bidang_opd: s.sub_bidang_opd || "",
          nama_opd: s.nama_opd || "",
          nama_bidang_opd: s.nama_bidang_opd || "",
          renstra_program_id: keg?.renstra_program_id ?? null,
        }));

        setSubKegiatanOptions(options);

        // Preselect sub kegiatan
        const pre =
          options.find(
            (o) => o.value === Number(initialData.sub_kegiatan_id)
          ) || options[0];

        if (pre) {
          setValue("sub_kegiatan_id", pre.value, { shouldValidate: true });
          setValue("kode_sub_kegiatan", pre.kode_sub_kegiatan);
          setValue("nama_sub_kegiatan", pre.nama_sub_kegiatan);
          setValue("sub_bidang_opd", pre.sub_bidang_opd);
          setValue("nama_opd", pre.nama_opd);
          setValue("nama_bidang_opd", pre.nama_bidang_opd);
          setValue("renstra_program_id", pre.renstra_program_id ?? null, {
            shouldValidate: true,
          });
        }
      } catch (e) {
        if (e.name !== "CanceledError" && e.name !== "AbortError") {
          console.error(e);
          setError("Gagal memuat daftar subkegiatan");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubKegiatan();
    return () => controller.abort();
  }, [
    selectedKegiatanId,
    kegiatanOptions,
    initialData.sub_kegiatan_id,
    setValue,
  ]);

  // ===== 3) Sinkron saat user memilih dropdown Sub Kegiatan =====
  useEffect(() => {
    if (!selectedSubKegiatanId) return;
    const sub = subKegiatanOptions.find(
      (s) => s.value === Number(selectedSubKegiatanId)
    );
    if (!sub) return;

    setValue("kode_sub_kegiatan", sub.kode_sub_kegiatan);
    setValue("nama_sub_kegiatan", sub.nama_sub_kegiatan);
    setValue("sub_kegiatan_id", sub.sub_kegiatan_id);
    setValue("sub_bidang_opd", sub.sub_bidang_opd);
    setValue("nama_opd", sub.nama_opd);
    setValue("nama_bidang_opd", sub.nama_bidang_opd);
    setValue("renstra_program_id", sub.renstra_program_id ?? null, {
      shouldValidate: true,
    });
  }, [selectedSubKegiatanId, subKegiatanOptions, setValue]);

  // ===== 4) Submit =====
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        kegiatan_id: data.kegiatan_id,
        sub_kegiatan_id: data.sub_kegiatan_id,
        kode_sub_kegiatan: data.kode_sub_kegiatan,
        nama_sub_kegiatan: data.nama_sub_kegiatan,
        renstra_program_id: data.renstra_program_id,
        sub_bidang_opd: data.sub_bidang_opd ?? null,
        nama_opd: data.nama_opd ?? null,
        nama_bidang_opd: data.nama_bidang_opd ?? null,
      };

      if (data.id) {
        await api.put(`/renstra-subkegiatan/${data.id}`, payload);
        alert("Subkegiatan berhasil diperbarui!");
      } else {
        await api.post("/renstra-subkegiatan", payload);
        alert("Subkegiatan berhasil ditambahkan!");
      }

      if (onSuccess) onSuccess();
    } catch (e) {
      console.error("Gagal submit:", e);
      alert("Gagal menyimpan data subkegiatan");
      setError("Gagal menyimpan data subkegiatan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    isLoading,
    isSubmitting,
    error,
    kegiatanOptions,
    subKegiatanOptions,
    onSubmit,
    setValue,
  };
}
