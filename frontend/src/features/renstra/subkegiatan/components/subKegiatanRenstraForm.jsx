import React from "react";
import { useSubkegiatanRenstraForm } from "@/hooks/templatesUseRenstra/useSubkegiatanRenstraForm";

export default function SubkegiatanRenstraForm({
  initialData = {},
  renstraAktif = {},
  onSuccess,
}) {
  const {
    form,
    isLoading,
    isSubmitting,
    error,
    kegiatanOptions,
    subKegiatanOptions,
    onSubmit,
    setValue,
  } = useSubkegiatanRenstraForm(initialData, renstraAktif, onSuccess);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  if (isLoading) return <div className="p-4">Memuat...</div>;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 p-4 bg-white rounded shadow"
    >
      {error && <div className="text-red-600">{error}</div>}

      {/* Kegiatan */}
      <div>
        <label className="block font-semibold mb-1">Kegiatan</label>
        <select
          {...register("kegiatan_id", {
            setValueAs: (v) => (v === "" ? null : Number(v)),
            onChange: (e) => {
              // reset sub-kegiatan saat kegiatan berubah
              setValue("sub_kegiatan_id", null, { shouldValidate: true });
              setValue("kode_sub_kegiatan", "");
              setValue("nama_sub_kegiatan", "");
              setValue("sub_bidang_opd", "");
              setValue("nama_opd", "");
              setValue("nama_bidang_opd", "");
            },
          })}
          className="border rounded p-2 w-full"
        >
          <option value="">-- Pilih Kegiatan --</option>
          {kegiatanOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.kegiatan_id && (
          <p className="text-red-600">{errors.kegiatan_id.message}</p>
        )}
      </div>

      {/* Sub Kegiatan RPJMD */}
      <div>
        <label className="block font-semibold mb-1">Sub Kegiatan RPJMD</label>
        <select
          {...register("sub_kegiatan_id", {
            setValueAs: (v) => (v === "" ? null : Number(v)),
            onChange: (e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              if (v == null) return;
              const sub = subKegiatanOptions.find((s) => s.value === v);
              if (!sub) return;
              // sinkron field turunan
              setValue("kode_sub_kegiatan", sub.kode_sub_kegiatan);
              setValue("nama_sub_kegiatan", sub.nama_sub_kegiatan);
              setValue("sub_bidang_opd", sub.sub_bidang_opd);
              setValue("nama_opd", sub.nama_opd);
              setValue("nama_bidang_opd", sub.nama_bidang_opd);
              setValue("renstra_program_id", sub.renstra_program_id ?? null, {
                shouldValidate: true,
              });
            },
          })}
          className="border rounded p-2 w-full"
          disabled={!subKegiatanOptions.length}
        >
          <option value="">-- Pilih Sub Kegiatan --</option>
          {subKegiatanOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.sub_kegiatan_id && (
          <p className="text-red-600">{errors.sub_kegiatan_id.message}</p>
        )}
      </div>

      {/* Kode Sub Kegiatan */}
      <div>
        <label className="block font-semibold mb-1">Kode Sub Kegiatan</label>
        <input
          {...register("kode_sub_kegiatan")}
          className="border rounded p-2 w-full bg-gray-50"
          readOnly
        />
      </div>

      {/* Nama Sub Kegiatan */}
      <div>
        <label className="block font-semibold mb-1">Nama Sub Kegiatan</label>
        <input
          {...register("nama_sub_kegiatan")}
          className="border rounded p-2 w-full bg-gray-50"
          readOnly
        />
      </div>

      {/* Sub Bidang OPD */}
      <div>
        <label className="block font-semibold mb-1">Sub Bidang OPD</label>
        <input
          {...register("sub_bidang_opd")}
          className="border rounded p-2 w-full bg-gray-50"
          readOnly
        />
      </div>

      {/* Nama OPD */}
      <div>
        <label className="block font-semibold mb-1">Nama OPD</label>
        <input
          {...register("nama_opd")}
          className="border rounded p-2 w-full bg-gray-50"
          readOnly
        />
      </div>

      {/* Nama Bidang OPD */}
      <div>
        <label className="block font-semibold mb-1">Nama Bidang OPD</label>
        <input
          {...register("nama_bidang_opd")}
          className="border rounded p-2 w-full bg-gray-50"
          readOnly
        />
      </div>

      {/* Hidden Fields */}
      <input
        type="hidden"
        {...register("renstra_program_id", {
          setValueAs: (v) => (v === "" ? null : Number(v)),
        })}
      />

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        {isSubmitting ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}
