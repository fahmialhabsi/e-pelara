// LakipListPage.jsx
import React, { useEffect, useState } from "react";
import { Button, InputNumber, Space, message } from "antd";
import { getAllLakip, syncRealisasiAnggaranLakip } from "../services/lakipApi";
import LakipTable from "../components/LakipTable";

const LakipListPage = () => {
  const [data, setData] = useState([]);
  const [tahunSync, setTahunSync] = useState(new Date().getFullYear() - 1);
  const [syncing, setSyncing] = useState(false);

  const reload = () => {
    getAllLakip().then(setData).catch(console.error);
  };

  useEffect(() => { reload(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const hasil = await syncRealisasiAnggaranLakip(tahunSync);
      message.success(
        `Realisasi anggaran tahun ${hasil.tahun} disinkronkan: ${hasil.updated} baris diperbarui, ${hasil.skipped} dilewati.`,
      );
      reload();
    } catch (error) {
      message.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Gagal sinkron realisasi anggaran",
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <h2>Daftar LAKIP</h2>
      <Space style={{ marginBottom: 16 }}>
        <InputNumber value={tahunSync} onChange={setTahunSync} style={{ width: 100 }} placeholder="Tahun" />
        <Button loading={syncing} onClick={handleSync}>
          Sinkronkan Realisasi Anggaran
        </Button>
      </Space>
      <LakipTable data={data} onEdit={() => {}} onDelete={() => {}} onRefresh={reload} />
    </div>
  );
};

export default LakipListPage;
