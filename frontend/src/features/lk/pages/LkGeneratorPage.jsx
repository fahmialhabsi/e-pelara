import React, { useEffect, useState } from "react";
import {
  Card,
  Typography,
  Button,
  Space,
  InputNumber,
  Table,
  Alert,
  List,
  Modal,
  message,
  Tag,
} from "antd";
import {
  getLkValidasiLengkap,
  postLkGeneratePdf,
  getLkPdfRiwayat,
  postLkFinalisasi,
  getLkPreviewHtmlUrl,
  getLkDownloadPdfUrl,
} from "../services/lkApi";
import { useAuth } from "../../../hooks/useAuth";

const { Title, Text, Paragraph } = Typography;

function canFinalisasi(role) {
  const r = String(role || "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  return r === "SUPER_ADMIN" || r === "PPK_SKPD" || r === "PPK-SKPD";
}

export default function LkGeneratorPage() {
  const { user } = useAuth();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [validasi, setValidasi] = useState(null);
  const [riwayat, setRiwayat] = useState([]);

  const loadValidasi = async () => {
    setLoading(true);
    try {
      const v = await getLkValidasiLengkap(tahun);
      setValidasi(v);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat validasi");
    } finally {
      setLoading(false);
    }
  };

  const loadRiwayat = async () => {
    try {
      const r = await getLkPdfRiwayat(tahun);
      setRiwayat(r.data || []);
    } catch (e) {
      message.warning(e.response?.data?.message || "Riwayat PDF tidak dimuat");
      setRiwayat([]);
    }
  };

  useEffect(() => {
    loadValidasi();
    loadRiwayat();
  }, [tahun]);

  const onGenerate = async () => {
    setLoading(true);
    try {
      const out = await postLkGeneratePdf(tahun, {});
      message.success(`PDF dibuat: ${out.filename}`);
      await loadRiwayat();
    } catch (e) {
      const d = e.response?.data;
      if (d?.validation) {
        setValidasi(d.validation);
        message.error(d.message || "Validasi gagal");
      } else {
        message.error(d?.message || "Generate PDF gagal");
      }
    } finally {
      setLoading(false);
    }
  };

  const onFinalisasi = () => {
    Modal.confirm({
      title: "Finalisasi LK?",
      content:
        "LRA, Neraca, LO, LPE, dan LAK akan dikunci untuk tahun ini. Pastikan data sudah benar.",
      okText: "Ya, kunci",
      cancelText: "Batal",
      onOk: async () => {
        setLoading(true);
        try {
          await postLkFinalisasi(tahun);
          message.success("Finalisasi berhasil");
          await loadValidasi();
        } catch (e) {
          message.error(e.response?.data?.message || "Finalisasi ditolak");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const previewTab = () => {
    window.open(getLkPreviewHtmlUrl(tahun), "_blank", "noopener,noreferrer");
  };

  const cols = [
    { title: "Tanggal", dataIndex: "created_at", key: "t", width: 180 },
    { title: "Oleh", dataIndex: "username", key: "u", render: (v) => v || "—" },
    { title: "Berkas", dataIndex: "filename", key: "f" },
    {
      title: "Ukuran",
      dataIndex: "size_bytes",
      key: "s",
      render: (n) => (n ? `${(n / 1024).toFixed(1)} KB` : "—"),
    },
    {
      title: "Unduh",
      key: "dl",
      render: (_, r) => (
        <Button
          type="link"
          size="small"
          href={getLkDownloadPdfUrl(tahun, { id: r.id })}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download
        </Button>
      ),
    },
  ];

  const blokirGenerate = !validasi?.valid;

  return (
    <div style={{ padding: 24 }}>
      <Space wrap align="center" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Generator PDF Laporan Keuangan
        </Title>
        <Text type="secondary">Tahun</Text>
        <InputNumber min={2000} max={2100} value={tahun} onChange={(v) => v && setTahun(v)} />
        <Button onClick={() => { loadValidasi(); loadRiwayat(); }} loading={loading}>
          Periksa ulang
        </Button>
      </Space>

      <Paragraph type="secondary">
        Library backend: <strong>Puppeteer</strong> (HTML → PDF). Pastikan Chromium dapat diunduh/dijalankan di server.
        Alternatif tersedia: <strong>pdfkit</strong> / <strong>pdfmake</strong> (belum dipakai untuk dokumen ini).
      </Paragraph>

      <Card title="Validasi sebelum generate" style={{ marginBottom: 16 }}>
        {validasi && (
          <>
            <Alert
              style={{ marginBottom: 12 }}
              type={validasi.valid ? "success" : "error"}
              message={validasi.valid ? "Semua validasi lolos — PDF dapat dibuat" : "Ada validasi yang gagal"}
            />
            <List
              size="small"
              dataSource={validasi.checks || []}
              renderItem={(c) => (
                <List.Item>
                  <Tag color={c.ok ? "green" : "red"}>{c.ok ? "✓" : "✗"}</Tag>
                  <Text strong>{c.id}</Text>
                  {!c.ok && c.message && (
                    <Text type="danger" style={{ marginLeft: 8 }}>
                      {c.message}
                    </Text>
                  )}
                </List.Item>
              )}
            />
            {validasi.errors?.length > 0 && (
              <ul style={{ marginTop: 8 }}>
                {validasi.errors.map((err, i) => (
                  <li key={i}>
                    <Text type="danger">{err}</Text>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>

      <Card title="Aksi" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button
            type="primary"
            onClick={onGenerate}
            loading={loading}
            disabled={blokirGenerate}
          >
            Generate PDF laporan keuangan lengkap
          </Button>
          <Button onClick={previewTab}>Pratinjau HTML (tab baru)</Button>
          <Button
            href={getLkDownloadPdfUrl(tahun, { latest: true })}
            target="_blank"
            rel="noopener noreferrer"
            disabled={riwayat.length === 0}
          >
            Unduh PDF terbaru
          </Button>
          {canFinalisasi(user?.role) && (
            <Button danger onClick={onFinalisasi} loading={loading} disabled={blokirGenerate}>
              Finalisasi LK (kunci snapshot)
            </Button>
          )}
        </Space>
      </Card>

      <Card title="Riwayat generate PDF">
        <Table rowKey="id" size="small" columns={cols} dataSource={riwayat} pagination={false} />
      </Card>
    </div>
  );
}
