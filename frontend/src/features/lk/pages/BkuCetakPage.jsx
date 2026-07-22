import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Space, InputNumber, Typography, Table, message } from "antd";
import { getBkuCetak, getPejabatPenandatanganTahun, getBkuTutupBukuStatus } from "../services/lkApi";
import { tampilSaldo, formatRupiah } from "../utils/lkFormat.jsx";

const { Title, Text } = Typography;

export default function BkuCetakPage() {
  const nav = useNavigate();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [pejabat, setPejabat] = useState([]);
  const [tutupStatus, setTutupStatus] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getBkuCetak(tahun, bulan);
      setPayload(res);
      const [pejabatRes, tutupRes] = await Promise.all([
        getPejabatPenandatanganTahun(tahun).catch(() => ({ data: [] })),
        getBkuTutupBukuStatus(tahun, bulan).catch(() => ({ data: null })),
      ]);
      setPejabat(pejabatRes.data || []);
      setTutupStatus(tutupRes.data || null);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat data cetak");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- muat ulang via tombol / ganti periode
  }, [tahun, bulan]);

  const penggunaAnggaran = pejabat.find(
    (p) => p.role === "PENGGUNA_ANGGARAN" || p.role === "KUASA_PENGGUNA_ANGGARAN",
  );

  const columns = [
    { title: "No.", key: "no_urut", width: 48, render: (_, __, idx) => idx + 1 },
    { title: "Tanggal", dataIndex: "tanggal", key: "tanggal" },
    { title: "No. Bukti", dataIndex: "nomor_bukti", key: "nomor_bukti" },
    { title: "Uraian", dataIndex: "uraian", key: "uraian", ellipsis: true },
    { title: "Jenis", dataIndex: "jenis_transaksi", key: "jenis_transaksi" },
    { title: "Terima", dataIndex: "penerimaan", key: "penerimaan", render: formatRupiah },
    { title: "Keluar", dataIndex: "pengeluaran", key: "pengeluaran", render: formatRupiah },
    { title: "Saldo", dataIndex: "saldo", key: "saldo", render: (v) => tampilSaldo(v) },
    { title: "Akun", dataIndex: "kode_akun", key: "kode_akun" },
  ];

  return (
    <div style={{ padding: 24 }} className="bku-cetak-root">
      <Card loading={loading}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space wrap className="hide-on-print">
            <Button onClick={() => nav("/lk/bku")}>Kembali</Button>
            <Text>Tahun</Text>
            <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
            <Text>Bulan</Text>
            <InputNumber min={1} max={12} value={bulan} onChange={(v) => setBulan(v || bulan)} />
            <Button type="primary" onClick={load}>
              Muat
            </Button>
            <Button onClick={() => window.print()}>Cetak / PDF</Button>
          </Space>
          <div style={{ textAlign: "center" }}>
            <Title level={4} style={{ marginBottom: 0 }}>
              {payload?.judul || "Buku Kas Umum"}
            </Title>
            <Text type="secondary">
              Bendahara — format standar ringkas
              {tutupStatus?.status && tutupStatus.status !== "BELUM_TUTUP"
                ? ` • Status: ${tutupStatus.status === "DISETUJUI" ? "Disetujui (final)" : "Ditutup (menunggu persetujuan)"}`
                : " • Status: Belum ditutup"}
            </Text>
          </div>
          <Table
            size="small"
            rowKey={(r) =>
              r.id ??
              r.kode_akun ??
              `${r.tanggal ?? ""}-${r.nomor_bukti ?? ""}-${r.uraian ?? ""}`
            }
            dataSource={payload?.baris || []}
            columns={columns}
            pagination={false}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 48, padding: "0 24px" }}>
            <div style={{ textAlign: "center", width: 260 }}>
              <Text>Bendahara Pengeluaran</Text>
              <div style={{ height: 72 }} />
              <Text strong style={{ borderTop: "1px solid #000", display: "inline-block", minWidth: 200, paddingTop: 4 }}>
                (.......................................)
              </Text>
            </div>
            <div style={{ textAlign: "center", width: 260 }}>
              <Text>Mengetahui, Pengguna Anggaran</Text>
              <div style={{ height: 72 }} />
              <Text strong style={{ borderTop: "1px solid #000", display: "inline-block", minWidth: 200, paddingTop: 4 }}>
                {penggunaAnggaran?.nama || "(.......................................)"}
              </Text>
              {penggunaAnggaran?.nip && (
                <div>
                  <Text type="secondary">NIP. {penggunaAnggaran.nip}</Text>
                </div>
              )}
            </div>
          </div>
        </Space>
      </Card>
      <style>{`
        @media print {
          .hide-on-print { display: none !important; }
          .bku-cetak-root { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
