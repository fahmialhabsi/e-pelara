import React from "react";
import { Button, App, Popconfirm, Tooltip } from "antd";
import api from "@/services/api";

const VALID_STAGES = ["tujuan", "sasaran", "program", "kegiatan"];

const ImportFromRPJMDButton = ({ stage, renstraId, onSuccess }) => {
  const { message } = App.useApp();

  const handleImport = async () => {
    // ✅ Validasi renstraId
    if (!renstraId) {
      message.error("Renstra aktif belum dipilih");
      return;
    }

    // ✅ Validasi stage
    if (!VALID_STAGES.includes(stage)) {
      message.error(
        `Stage "${stage}" tidak valid. Pilih salah satu: ${VALID_STAGES.join(
          ", "
        )}`
      );
      return;
    }

    const payload = {
      stage,
      renstra_id: renstraId,
      source_doc: "rpjmd",
    };

    console.log("Payload import:", payload); // debug

    try {
      const res = await api.post("/indikator-renstra/import", payload);

      // ✅ Berhasil
      message.success(res.data.message || `Import ${stage} berhasil`);
      if (onSuccess) onSuccess();
    } catch (err) {
      // ✅ Tangani error dengan pesan jelas
      const response = err.response;
      if (response) {
        if (response.status === 400) {
          message.error(
            response.data?.error || "Bad Request (400): Periksa payload import"
          );
        } else if (response.status === 404) {
          message.error(response.data?.message || "Data tidak ditemukan (404)");
        } else {
          message.error(
            response.data?.error || `Server error (${response.status})`
          );
        }
      } else {
        message.error("Gagal import: Tidak ada respons dari server");
      }

      console.error("❌ Import error:", err.response?.data || err);
    }
  };

  return (
    <Tooltip
      title={
        renstraId
          ? `Import indikator ${stage}`
          : "Pilih Renstra aktif terlebih dahulu"
      }
    >
      <Popconfirm
        title={`Yakin import data "${stage}" dari RPJMD?`}
        onConfirm={handleImport}
        okText="Ya, Import"
        cancelText="Batal"
      >
        <Button type="primary" disabled={!renstraId}>
          📥 Import dari RPJMD
        </Button>
      </Popconfirm>
    </Tooltip>
  );
};

export default ImportFromRPJMDButton;
