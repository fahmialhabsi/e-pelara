import React, { useState } from "react";
import { Modal, Button } from "antd";
import { PulseLoader } from "react-spinners";
import { toast } from "react-toastify";
import api from "@/services/api";
import { useDokumen } from "@/hooks/useDokumen";

const InitRkpdButton = ({ tahun, onSuccess }) => {
  const { dokumen } = useDokumen(); // ambil jenis dokumen aktif dari context
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirm = async () => {
    if (!tahun || !dokumen) {
      toast.error("Tahun atau jenis dokumen tidak tersedia.");
      setConfirmOpen(false);
      return;
    }

    try {
      setLoading(true);
      await api.post("/rkpd-init/init", { tahun, jenis_dokumen: dokumen });
      toast.success("✅ Berhasil inisialisasi RKPD dari RPJMD.");

      setTimeout(() => {
        onSuccess?.();
      }, 1000); // 1 detik
    } catch (err) {
      console.error("Gagal inisialisasi:", err);
      toast.error("❌ Gagal inisialisasi.");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Button
        type="primary"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
      >
        Inisialisasi RKPD
      </Button>

      <Modal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onOk={handleConfirm}
        confirmLoading={loading}
        okText="Ya, Lanjutkan"
        cancelText="Batal"
        title="Konfirmasi Inisialisasi"
      >
        <p>
          Proses ini akan menyalin seluruh data dari RPJMD ke RKPD untuk tahun{" "}
          <strong>{tahun}</strong>. Lanjutkan?
        </p>
      </Modal>
    </>
  );
};

export default InitRkpdButton;
