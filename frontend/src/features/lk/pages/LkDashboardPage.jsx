import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Button,
  Space,
  InputNumber,
  Tag,
  message,
} from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getLkDashboard,
  syncBkuSigap,
  syncLkKinerja,
  generateLra,
  generateNeraca,
  generateLo,
  generateLpe,
  generateLak,
  generateCalkAll,
} from "../services/lkApi";
import { formatRupiah } from "../utils/lkFormat.jsx";

const { Title, Text, Paragraph } = Typography;

const SIGAP_URL = import.meta.env.VITE_SIGAP_MALUT_URL || "";

function fmtRingkas(n) {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} M`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} Jt`;
  return formatRupiah(v);
}

function StatusRow({ label, st }) {
  const ok = st?.status === "FINAL";
  const kosong = st?.status === "KOSONG";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
      <Text>{label}</Text>
      <Tag color={kosong ? "default" : ok ? "green" : "orange"}>
        {kosong ? "Belum ada data" : ok ? "FINAL" : "DRAFT"}
      </Tag>
    </div>
  );
}

export default function LkDashboardPage() {
  const nav = useNavigate();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [dash, setDash] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await getLkDashboard(tahun);
      setDash(d);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tahun]);

  const r = dash?.ringkasan_anggaran || {};
  const sl = dash?.status_laporan || {};
  const chartData = (dash?.grafik_realisasi_bulanan || []).map((x) => ({
    name: `B${x.bulan}`,
    nilai: x.nilai,
  }));

  const onSync = async () => {
    setLoading(true);
    try {
      await syncBkuSigap({ tahun_anggaran: tahun });
      const k = await syncLkKinerja(tahun);
      message.success(
        k.ok ? `Sinkron: kinerja ${k.imported} baris` : (k.reason || "Kinerja tidak di-sync"),
      );
      await load();
    } catch (e) {
      message.error(e.response?.data?.message || "Sinkron gagal");
    } finally {
      setLoading(false);
    }
  };

  const generateAllLk = async () => {
    setLoading(true);
    try {
      await generateLra(tahun);
      await generateNeraca(tahun);
      await generateLo(tahun);
      await generateLpe(tahun);
      await generateLak(tahun);
      await generateCalkAll(tahun);
      message.success("Perintah generate dikirim — periksa masing-masing laporan");
      await load();
    } catch (e) {
      message.error(e.response?.data?.message || "Salah satu generate gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Space wrap align="center" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Dashboard Laporan Keuangan
        </Title>
        <InputNumber min={2000} max={2100} value={tahun} onChange={(v) => v && setTahun(v)} />
        <Button onClick={load} loading={loading}>
          Muat ulang
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Anggaran (DPA)" value={fmtRingkas(r.anggaran)} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Realisasi" value={fmtRingkas(r.realisasi)} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Sisa" value={fmtRingkas(r.sisa)} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="Serapan"
              value={r.persen_serapan != null ? `${r.persen_serapan} %` : "—"}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Grafik pengeluaran BKU per bulan" style={{ marginTop: 16 }} loading={loading}>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v) => formatRupiah(v)} />
              <Bar dataKey="nilai" fill="#1677ff" name="Pengeluaran" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Status laporan">
            <StatusRow label="LRA" st={sl.lra} />
            <StatusRow label="Neraca" st={sl.neraca} />
            <StatusRow label="LO" st={sl.lo} />
            <StatusRow label="LPE" st={sl.lpe} />
            <StatusRow label="LAK" st={sl.lak} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <Text>CALK</Text>
              <Tag>
                {sl.calk?.final ?? 0}/{sl.calk?.total ?? 0} bab FINAL (
                {sl.calk?.persen_final ?? 0}%)
              </Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Rantai perencanaan">
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              RPJMD → Renstra → RKPD → Renja → RKA → DPA → Realisasi
            </Paragraph>
            <Space wrap>
              <Button onClick={() => nav("/dashboard-rpjmd")}>Buka RPJMD</Button>
              <Button onClick={() => nav("/dashboard-dpa")}>Buka DPA</Button>
              <Button onClick={() => nav("/dashboard-lakip")}>Lihat LAKIP</Button>
              {SIGAP_URL ? (
                <Button
                  type="link"
                  href={SIGAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buka SIGAP-MALUT
                </Button>
              ) : (
                <Text type="secondary">Atur VITE_SIGAP_MALUT_URL untuk link SIGAP</Text>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="Aksi cepat" style={{ marginTop: 16 }}>
        <Space wrap>
          <Button type="primary" onClick={generateAllLk} loading={loading}>
            Generate semua LK (berurutan)
          </Button>
          <Button onClick={() => nav("/lk/lra")}>Lihat LRA</Button>
          <Button onClick={() => nav("/lk/calk")}>Editor CALK</Button>
          <Button onClick={() => nav("/lk/generator")}>Generator PDF LK</Button>
          <Button onClick={onSync} loading={loading}>
            Sinkronisasi SIGAP (BKU + kinerja)
          </Button>
        </Space>
      </Card>
    </div>
  );
}
