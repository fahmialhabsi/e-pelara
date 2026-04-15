import React, { useEffect } from "react";
import { Card, Button, Form, Input, Spin, Alert } from "antd";
import { useNavigate } from "react-router-dom";
import { Controller } from "react-hook-form";
import { useSubkegiatanRenstraForm } from "@/hooks/templatesUseRenstra/useSubkegiatanRenstraForm";

export default function SubkegiatanRenstraForm({
  initialData = {},
  renstraAktif = {},
  onSuccess,
}) {
  const navigate = useNavigate();

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
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;

  const toSelectValue = (v) => (v != null && v !== "" ? String(v) : "");

  // Autofill OPD dari renstra aktif hanya saat tambah — edit pakai nilai record (initialData)
  useEffect(() => {
    if (initialData?.id) return;
    if (renstraAktif?.nama_opd) {
      setValue("nama_opd", renstraAktif.nama_opd);
    }
    if (renstraAktif?.bidang_opd) {
      setValue("nama_bidang_opd", renstraAktif.bidang_opd);
    }
    if (renstraAktif?.sub_bidang_opd) {
      setValue("sub_bidang_opd", renstraAktif.sub_bidang_opd);
    }
  }, [initialData?.id, renstraAktif, setValue]);

  if (isLoading) return <Spin tip="Memuat data..." fullscreen />;

  return (
    <Card
      key={initialData?.id ?? "new"}
      title={initialData?.id ? "Edit Sub Kegiatan Renstra" : "Tambah Sub Kegiatan Renstra"}
    >
      {/* Navigasi */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali
        </Button>
        <Button onClick={() => navigate("/renstra/subkegiatan")}>
          📄 Daftar Sub Kegiatan
        </Button>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ maxWidth: 640 }}
      >
        {/* Kegiatan */}
        <Form.Item
          label="Kegiatan"
          validateStatus={errors.kegiatan_id ? "error" : ""}
          help={errors.kegiatan_id?.message}
          required
        >
          <Controller
            name="kegiatan_id"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                value={toSelectValue(field.value)}
                onChange={(e) => {
                  const raw = e.target.value;
                  const v = raw === "" ? null : Number(raw);
                  field.onChange(v);
                  setValue("sub_kegiatan_id", null, { shouldValidate: true });
                  setValue("kode_sub_kegiatan", "");
                  setValue("nama_sub_kegiatan", "");
                  const keg = kegiatanOptions.find(
                    (k) => Number(k.value) === Number(v)
                  );
                  setValue(
                    "renstra_program_id",
                    v == null ? null : keg?.renstra_program_id ?? null,
                    { shouldValidate: true }
                  );
                  if (!initialData?.id) {
                    setValue(
                      "sub_bidang_opd",
                      renstraAktif?.sub_bidang_opd || ""
                    );
                    setValue("nama_opd", renstraAktif?.nama_opd || "");
                    setValue(
                      "nama_bidang_opd",
                      renstraAktif?.bidang_opd || ""
                    );
                  }
                }}
                style={{
                  width: "100%",
                  padding: "4px 8px",
                  border: "1px solid #d9d9d9",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                <option value="">-- Pilih Kegiatan --</option>
                {kegiatanOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          />
        </Form.Item>

        {/* Sub Kegiatan */}
        <Form.Item
          label="Sub Kegiatan"
          validateStatus={errors.sub_kegiatan_id ? "error" : ""}
          help={errors.sub_kegiatan_id?.message}
          required
        >
          <Controller
            name="sub_kegiatan_id"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                value={toSelectValue(field.value)}
                onChange={(e) => {
                  const raw = e.target.value;
                  const v = raw === "" ? null : Number(raw);
                  field.onChange(v);
                  if (v == null) return;
                  const sub = subKegiatanOptions.find(
                    (s) => Number(s.value) === Number(v)
                  );
                  if (!sub) return;
                  setValue("kode_sub_kegiatan", sub.kode_sub_kegiatan);
                  setValue("nama_sub_kegiatan", sub.nama_sub_kegiatan);
                  setValue(
                    "sub_bidang_opd",
                    sub.sub_bidang_opd || renstraAktif?.sub_bidang_opd || ""
                  );
                  setValue("nama_opd", sub.nama_opd || renstraAktif?.nama_opd || "");
                  setValue(
                    "nama_bidang_opd",
                    sub.nama_bidang_opd || renstraAktif?.bidang_opd || ""
                  );
                  setValue("renstra_program_id", sub.renstra_program_id ?? null, {
                    shouldValidate: true,
                  });
                }}
                disabled={!subKegiatanOptions.length}
                style={{
                  width: "100%",
                  padding: "4px 8px",
                  border: "1px solid #d9d9d9",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                <option value="">-- Pilih Sub Kegiatan --</option>
                {subKegiatanOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          />
        </Form.Item>

        {/* Kode Sub Kegiatan */}
        <Form.Item label="Kode Sub Kegiatan">
  <Input
    {...register("kode_sub_kegiatan")}
    value={watch("kode_sub_kegiatan") || ""}
    readOnly
    style={{ background: "#fafafa" }}
  />
</Form.Item>

        {/* Nama Sub Kegiatan */}
        <Form.Item label="Nama Sub Kegiatan">
  <Input
    {...register("nama_sub_kegiatan")}
    value={watch("nama_sub_kegiatan") || ""}
    readOnly
    style={{ background: "#fafafa" }}
  />
</Form.Item>

        {/* Nama OPD — terisi dari pilihan sub kegiatan / renstra aktif */}
        <Form.Item label="Nama OPD">
          <Controller
            name="nama_opd"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value ?? ""}
                readOnly
                style={{ background: "#fafafa" }}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Nama Bidang OPD">
          <Controller
            name="nama_bidang_opd"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value ?? ""}
                readOnly
                style={{ background: "#fafafa" }}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Sub Bidang OPD">
          <Controller
            name="sub_bidang_opd"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value ?? ""}
                readOnly
                style={{ background: "#fafafa" }}
              />
            )}
          />
        </Form.Item>

        {/* Hidden Fields */}
        <input
          type="hidden"
          {...register("renstra_program_id", {
            setValueAs: (v) => (v === "" ? null : Number(v)),
          })}
        />

        <div style={{ marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Menyimpan..." : initialData?.id ? "Update" : "Simpan"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
