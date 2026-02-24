import React, { useEffect, useState } from "react";
import { Button, Card, Typography, App, Select, Form } from "antd";
import { useNavigate } from "react-router-dom";
import { useKegiatanRenstraForm } from "@/hooks/templatesUseRenstra/useKegiatanRenstraForm";

const { Text } = Typography;

const KegiatanRenstraForm = ({ initialData = {}, renstraAktif, onSuccess }) => {
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
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (programOptions.length && !previewProgram) {
      const program =
        programOptions.find((p) => p.id === initialData?.program_renstra_id) ||
        programOptions[0];
      setPreviewProgram(program?.nama_program || "");
    }
  }, [programOptions, initialData, previewProgram]);

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
        {/* Program Select */}
        <Form.Item
          label="Pilih Program Renstra"
          required
          validateStatus={errors.program_renstra_id ? "error" : ""}
          help={errors.program_renstra_id?.message}
        >
          <Select
            value={form.getValues("program_renstra_id")}
            onChange={(val) => setValue("program_renstra_id", val)}
            loading={isLoading}
            placeholder="Pilih Program Renstra"
          >
            {programOptions.map((item) => (
              <Select.Option key={item.id} value={item.id}>
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

        {/* Kegiatan Select */}
        <Form.Item
          label="Pilih Kegiatan Renstra"
          required
          validateStatus={errors.kode_kegiatan ? "error" : ""}
          help={errors.kode_kegiatan?.message}
        >
          <Select
            value={form.getValues("kode_kegiatan")}
            onChange={(val, option) => {
              setValue("kode_kegiatan", val);
              setValue("nama_kegiatan", option?.nama_kegiatan || val);
            }}
            placeholder="Pilih Kegiatan"
          >
            {kegiatanOptions.map((k, idx) => (
              <Select.Option
                key={k.kode_kegiatan || `k-${idx}`}
                value={k.kode_kegiatan}
                nama_kegiatan={k.nama_kegiatan} // ambil nama_kegiatan dari option
              >
                {k.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Bidang OPD */}
        <Form.Item label="Bidang Penanggung Jawab">
          <input
            type="text"
            readOnly
            {...form.register("bidang_opd")}
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #d9d9d9",
              borderRadius: 4,
            }}
          />
        </Form.Item>

        {/* Hidden Fields */}
        <input type="hidden" {...form.register("nama_kegiatan")} />
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
