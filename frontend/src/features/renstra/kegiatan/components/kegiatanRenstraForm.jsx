import React, { useEffect, useState } from "react";
import { Button, Card, Typography, App, Select, Form } from "antd";
import { useNavigate } from "react-router-dom";
import {
  useKegiatanRenstraForm,
  EMPTY_KEGIATAN_INITIAL_DATA,
} from "@/hooks/templatesUseRenstra/useKegiatanRenstraForm";

const { Text } = Typography;

const KegiatanRenstraForm = ({
  initialData = EMPTY_KEGIATAN_INITIAL_DATA,
  renstraAktif,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [previewProgram, setPreviewProgram] = useState("");

  const {
    form,
    onSubmit: submitToServer,
    isSubmitting,
    programOptions,
    isLoading,
    kegiatanOptions,
  } = useKegiatanRenstraForm(initialData, renstraAktif);

  const {
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = form;

  const programRenstraId = watch("program_renstra_id");
  const bidangOpd = watch("bidang_opd");

  useEffect(() => {
    if (!programOptions.length || programRenstraId == null) return;

    const program = programOptions.find(
      (p) => Number(p.id) === Number(programRenstraId)
    );

    setPreviewProgram(program?.nama_program || "");
  }, [programOptions, programRenstraId]);

  if (!renstraAktif) {
    return (
      <Card>
        <p>Renstra belum dipilih. Silakan pilih Renstra terlebih dahulu.</p>
      </Card>
    );
  }

  if (isLoading) return <div>Loading form...</div>;

  return (
    <Card
      title={
        initialData?.id ? "Edit Kegiatan Renstra" : "Tambah Kegiatan Renstra"
      }
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali
        </Button>
        <Button onClick={() => navigate("/renstra/kegiatan")}>
          📄 Daftar Kegiatan Renstra
        </Button>
      </div>

      <form
        onSubmit={handleSubmit(async (data) => {
          await submitToServer(data, message);
          onSuccess?.();
        })}
        style={{ maxWidth: 700 }}
      >
        <Form.Item
          label="Pilih Program Renstra"
          required
          validateStatus={errors.program_renstra_id ? "error" : ""}
          help={errors.program_renstra_id?.message}
        >
          <Select
            value={
              programRenstraId != null ? Number(programRenstraId) : undefined
            }
            onChange={(val) => {
              setValue(
                "program_renstra_id",
                val === undefined ? undefined : Number(val),
                { shouldDirty: true, shouldValidate: true }
              );

              setValue("kegiatan_id", undefined);
              setValue("kode_kegiatan", "");
              setValue("nama_kegiatan", "");
              setValue("bidang_opd", "");
            }}
            loading={isLoading}
            placeholder="Pilih Program Renstra"
          >
            {programOptions.map((item) => (
              <Select.Option key={item.id} value={Number(item.id)}>
                {item.kode_program} - {item.nama_program}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {previewProgram && (
          <Text type="secondary" style={{ marginBottom: 16, display: "block" }}>
            {previewProgram}
          </Text>
        )}

        <Form.Item
          label="Pilih Kegiatan Renstra"
          required
          validateStatus={errors.kegiatan_id ? "error" : ""}
          help={errors.kegiatan_id?.message}
        >
          <Select
            value={watch("kegiatan_id") || undefined}
            disabled={!programRenstraId}
            onChange={(val) => {
              const selected = kegiatanOptions.find(
                (item) => Number(item.id) === Number(val)
              );

              setValue("kegiatan_id", Number(val), {
                shouldDirty: true,
                shouldValidate: true,
              });
              setValue("kode_kegiatan", selected?.kode_kegiatan || "");
              setValue("nama_kegiatan", selected?.nama_kegiatan || "");
              setValue("bidang_opd", selected?.bidang_opd || "", {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
            placeholder="Pilih Kegiatan"
          >
            {kegiatanOptions.map((k) => (
              <Select.Option key={k.id} value={Number(k.id)}>
                {k.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Bidang Penanggung Jawab">
          <input
            type="text"
            readOnly
            value={bidangOpd || ""}
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #d9d9d9",
              borderRadius: 4,
            }}
          />
        </Form.Item>

        <input type="hidden" {...form.register("kegiatan_id")} />
        <input type="hidden" {...form.register("kode_kegiatan")} />
        <input type="hidden" {...form.register("nama_kegiatan")} />
        <input type="hidden" {...form.register("bidang_opd")} />
        <input type="hidden" {...form.register("renstra_id")} />
        <input type="hidden" {...form.register("program_renstra_id")} />

        {Object.keys(errors).length > 0 && (
          <div style={{ color: "red", marginTop: 8 }}>
            <strong>Form Error:</strong>
            <ul>
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>
                  {field}: {error?.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {initialData?.id ? "Update" : "Simpan"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default KegiatanRenstraForm;