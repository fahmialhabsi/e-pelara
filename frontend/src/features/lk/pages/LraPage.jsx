import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  InputNumber,
  Typography,
  Tag,
  Alert,
  message,
} from "antd";
import { useAuth } from "../../../hooks/useAuth";
import {
  getLra,
  generateLra,
  kunciLra,
  getLraCrosscheck,
  exportLra,
} from "../services/lkApi";
import { formatRupiah, formatPersen, warnaPersenRealisasi } from "../utils/lkFormat.jsx";

const { Title, Text } = Typography;

const KELOMPOK_LABEL = {
  PENDAPATAN: "Pendapatan",
  BELANJA: "Belanja",
  PEMBIAYAAN: "Pembiayaan",
  null: "Lainnya",
};

function canKunciLra(role) {
  const r = String(role || "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  return r === "SUPER_ADMIN" || r === "PPK_SKPD";
}

export default function LraPage() {
  const { user } = useAuth();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [cross, setCross] = useState(null);
  const [banding, setBanding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getLra(tahun);
      setPayload(res);
      const cc = await getLraCrosscheck(tahun);
      setCross(cc);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat LRA");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tahun]);

  const grouped = useMemo(() => {
    const data = payload?.data || [];
    const m = {};
    for (const row of data) {
      const k = row.kelompok || "null";
      if (!m[k]) m[k] = [];
      m[k].push(row);
    }
    const order = ["PENDAPATAN", "BELANJA", "PEMBIAYAAN", "null"];
    return order.filter((k) => m[k]?.length).map((k) => ({ key: k, rows: m[k] }));
  }, [payload]);

  const flatRows = useMemo(() => {
    const out = [];
    for (const g of grouped) {
      out.push({
        key: `h-${g.key}`,
        isHeader: true,
        kelompok: g.key,
      });
      let subAnggaran = 0;
      let subRealisasi = 0;
      g.rows.forEach((r, rowIdx) => {
        const am = Number(r.anggaran_murni) || 0;
        const ap = Number(r.anggaran_perubahan) || 0;
        const af = ap > 0 ? ap : am;
        subAnggaran += af;
        subRealisasi += Number(r.realisasi) || 0;
        const rk = `r-${g.key}-${rowIdx}-${r.id ?? r.kode_akun ?? "x"}`;
        out.push({ ...r, key: rk, isHeader: false });
      });
      const subSisa = subAnggaran - subRealisasi;
      const subPersen =
        subAnggaran > 0 ? (subRealisasi / subAnggaran) * 100 : 0;
      out.push({
        key: `t-${g.key}-total`,
        isTotal: true,
        kelompok: g.key,
        nama_akun: `Total ${KELOMPOK_LABEL[g.key] || g.key}`,
        anggaran_murni: subAnggaran,
        anggaran_perubahan: 0,
        realisasi: subRealisasi,
        sisa: subSisa,
        persen: subPersen,
      });
    }
    return out;
  }, [grouped]);

  const columns = [
    {
      title: "Kode Akun",
      dataIndex: "kode_akun",
      key: "kode_akun",
      width: 120,
      render: (v, r) => {
        if (r.isHeader) return <Text strong>{KELOMPOK_LABEL[r.kelompok]}</Text>;
        if (r.isTotal) return "";
        return v;
      },
    },
    {
      title: "Nama Akun",
      dataIndex: "nama_akun",
      key: "nama_akun",
      ellipsis: true,
      render: (v, r) => (r.isHeader ? "" : <Text strong={r.isTotal}>{v}</Text>),
    },
    {
      title: "Anggaran Murni",
      dataIndex: "anggaran_murni",
      key: "am",
      align: "right",
      render: (v, r) => {
        if (r.isHeader) return null;
        return formatRupiah(v);
      },
    },
    {
      title: "Anggaran Perubahan",
      dataIndex: "anggaran_perubahan",
      key: "ap",
      align: "right",
      render: (v, r) => {
        if (r.isHeader) return null;
        return formatRupiah(v);
      },
    },
    {
      title: "Realisasi",
      dataIndex: "realisasi",
      key: "realisasi",
      align: "right",
      render: (v, r) => {
        if (r.isHeader) return null;
        const t = banding ? (
          <div>
            <div>{formatRupiah(v)}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              th lalu: {formatRupiah(r.realisasi_tahun_lalu)}
            </Text>
          </div>
        ) : (
          formatRupiah(v)
        );
        return t;
      },
    },
    {
      title: "Sisa",
      dataIndex: "sisa",
      key: "sisa",
      align: "right",
      render: (v, r) => {
        if (r.isHeader) return null;
        return formatRupiah(v);
      },
    },
    {
      title: "%",
      dataIndex: "persen",
      key: "persen",
      width: 90,
      align: "right",
      render: (v, r) => {
        if (r.isHeader) return null;
        const p = Number(v) || 0;
        return (
          <span style={{ color: warnaPersenRealisasi(p), fontWeight: r.isTotal ? 700 : 400 }}>
            {formatPersen(p)}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card loading={loading}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space wrap align="center">
            <Title level={4} style={{ margin: 0 }}>
              Laporan Realisasi Anggaran (LRA)
            </Title>
            <Tag color={payload?.status === "FINAL" ? "green" : "gold"}>
              {payload?.status === "FINAL" ? "FINAL / TERKUNCI" : "DRAFT"}
            </Tag>
          </Space>
          <Space wrap>
            <Text>Tahun anggaran</Text>
            <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
            <Button
              type="primary"
              onClick={async () => {
                try {
                  const res = await generateLra(tahun);
                  message.success(
                    `Generate OK — ${res.total_akun} akun, peringatan silang ${(res.cross_check_warnings || []).length}`,
                  );
                  load();
                } catch (e) {
                  message.error(e.response?.data?.message || e.message);
                }
              }}
            >
              Generate / Refresh LRA
            </Button>
            <Button
              onClick={() => {
                setBanding((b) => {
                  const next = !b;
                  message.info(
                    next
                      ? "Perbandingan: menampilkan realisasi tahun lalu di bawah realisasi"
                      : "Perbandingan: disembunyikan",
                  );
                  return next;
                });
              }}
            >
              Lihat perbandingan tahun lalu
            </Button>
            <Button
              onClick={async () => {
                try {
                  const ex = await exportLra(tahun);
                  const blob = new Blob([JSON.stringify(ex, null, 2)], {
                    type: "application/json",
                  });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `lra-export-${tahun}.json`;
                  a.click();
                  message.success("Export JSON diunduh");
                } catch (e) {
                  message.error(e.response?.data?.message || e.message);
                }
              }}
            >
              Export
            </Button>
            {canKunciLra(user?.role) && (
              <Button
                danger
                onClick={async () => {
                  try {
                    await kunciLra(tahun);
                    message.success("LRA dikunci");
                    load();
                  } catch (e) {
                    message.error(e.response?.data?.message || e.message);
                  }
                }}
              >
                Kunci LRA
              </Button>
            )}
          </Space>

          {cross?.warnings?.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message="Cross-check BKU vs DPA (realisasi)"
              description={
                <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
                  {cross.warnings.slice(0, 12).map((w, wi) => (
                    <li key={`${w.kode_akun}-${w.kode_rekening}-${wi}`}>
                      {w.kode_akun} / {w.kode_rekening}: BKU {formatRupiah(w.realisasi_bku)} vs DPA{" "}
                      {formatRupiah(w.realisasi_dpa)} — selisih {formatRupiah(w.selisih)}
                    </li>
                  ))}
                  {cross.warnings.length > 12 && (
                    <li>… dan {cross.warnings.length - 12} lainnya</li>
                  )}
                </ul>
              }
            />
          )}

          <Table
            size="small"
            rowKey="key"
            dataSource={flatRows}
            columns={columns}
            pagination={false}
            scroll={{ x: 960 }}
            onRow={(r) =>
              r.isHeader
                ? { style: { background: "#f0f5ff" } }
                : r.isTotal
                  ? { style: { fontWeight: 700, background: "#fafafa" } }
                  : {}
            }
          />
        </Space>
      </Card>
    </div>
  );
}
