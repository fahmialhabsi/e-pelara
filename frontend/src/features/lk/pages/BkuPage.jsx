import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Space,
  Select,
  InputNumber,
  Typography,
  Tag,
  Modal,
  Input,
  Popconfirm,
  Form,
  DatePicker,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  getBkuList,
  syncBkuSigap,
  getBkuTutupBukuStatus,
  tutupBkuBulan,
  setujuiTutupBkuBulan,
  tolakTutupBkuBulan,
  deleteBku,
  getSaldoTunaiBank,
  pindahKas,
} from "../services/lkApi";
import { tampilSaldo, formatRupiah } from "../utils/lkFormat.jsx";

const STATUS_TUTUP_LABEL = {
  BELUM_TUTUP: { text: "Belum ditutup", color: "default" },
  DITUTUP: { text: "Ditutup (menunggu persetujuan PPK/PA)", color: "orange" },
  DISETUJUI: { text: "Disetujui — terkunci", color: "green" },
};

const { Title } = Typography;

const JENIS_OPTS = [
  "UP",
  "GU",
  "TUP",
  "LS_GAJI",
  "LS_BARANG",
  "PENERIMAAN_LAIN",
  "PENGELUARAN_LAIN",
  "SETORAN_SISA_UP",
].map((v) => ({ label: v, value: v }));

export default function BkuPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState();
  const [jenis, setJenis] = useState();
  const [tutupStatus, setTutupStatus] = useState(null);
  const [tutupLoading, setTutupLoading] = useState(false);
  const [tolakOpen, setTolakOpen] = useState(false);
  const [catatanTolak, setCatatanTolak] = useState("");
  const [saldoTunaiBank, setSaldoTunaiBank] = useState(null);
  const [pindahOpen, setPindahOpen] = useState(false);
  const [pindahForm] = Form.useForm();

  const loadSaldoTunaiBank = async () => {
    try {
      const res = await getSaldoTunaiBank(tahun, bulan || 12);
      setSaldoTunaiBank(res);
    } catch {
      setSaldoTunaiBank(null);
    }
  };

  const loadTutupStatus = async () => {
    if (!bulan) return setTutupStatus(null);
    try {
      const res = await getBkuTutupBukuStatus(tahun, bulan);
      setTutupStatus(res.data);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat status tutup buku");
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = { tahun_anggaran: tahun };
      if (bulan) params.bulan = bulan;
      if (jenis) params.jenis_transaksi = jenis;
      const res = await getBkuList(params);
      setRows(res.data || []);
    } catch (e) {
      console.error(e);
      message.error(e.response?.data?.message || "Gagal memuat BKU");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadTutupStatus();
    loadSaldoTunaiBank();
  }, [tahun, bulan, jenis]);

  const columns = [
    { title: "Tanggal", dataIndex: "tanggal", key: "tanggal", width: 110 },
    { title: "No. Bukti", dataIndex: "nomor_bukti", key: "nomor_bukti", width: 120 },
    { title: "Jenis", dataIndex: "jenis_transaksi", key: "jenis", width: 120 },
    {
      title: "Kas",
      dataIndex: "jenis_kas",
      key: "jenis_kas",
      width: 80,
      render: (v) => <Tag color={v === "TUNAI" ? "gold" : "blue"}>{v || "BANK"}</Tag>,
    },
    {
      title: "Penerimaan",
      dataIndex: "penerimaan",
      key: "penerimaan",
      render: (v) => formatRupiah(v),
    },
    {
      title: "Pengeluaran",
      dataIndex: "pengeluaran",
      key: "pengeluaran",
      render: (v) => formatRupiah(v),
    },
    {
      title: "Saldo",
      dataIndex: "saldo",
      key: "saldo",
      render: (v) => tampilSaldo(v),
    },
    { title: "Kode Akun", dataIndex: "kode_akun", key: "kode_akun", width: 100 },
    {
      title: "Validasi",
      dataIndex: "status_validasi",
      key: "status_validasi",
      width: 90,
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 160,
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => nav(`/lk/bku/${r.id}`)}>
            Ubah
          </Button>
          {r.status_validasi === "BELUM" && (
            <Popconfirm
              title="Hapus baris BKU ini?"
              description="Jurnal terkait akan di-void & saldo direkalkulasi."
              onConfirm={async () => {
                try {
                  await deleteBku(r.id);
                  message.success("BKU dihapus");
                  load();
                } catch (e) {
                  message.error(e.response?.data?.message || e.message);
                }
              }}
            >
              <Button type="link" size="small" danger>
                Hapus
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space wrap align="center">
            <Title level={4} style={{ margin: 0 }}>
              Buku Kas Umum (BKU)
            </Title>
            <Button type="primary" onClick={() => nav("/lk/bku/baru")}>
              Input baru
            </Button>
            <Button onClick={() => nav("/lk/bku/cetak")}>Cetak</Button>
            <Button onClick={() => nav("/lk/bku/up")}>UP / GU / TUP</Button>
            <Button
              onClick={() => {
                pindahForm.resetFields();
                pindahForm.setFieldsValue({ tahun_anggaran: tahun, tanggal: dayjs(), arah: "BANK_KE_TUNAI" });
                setPindahOpen(true);
              }}
            >
              Pindah Kas Bank ⇄ Tunai
            </Button>
          </Space>

          {saldoTunaiBank && (
            <Space wrap style={{ background: "rgba(0,0,0,0.02)", padding: 12, borderRadius: 8 }}>
              <span>Saldo kumulatif s.d. bulan {bulan || 12}:</span>
              <Tag color="blue">Bank: {formatRupiah(saldoTunaiBank.bank?.saldo)}</Tag>
              <Tag color="gold">Tunai: {formatRupiah(saldoTunaiBank.tunai?.saldo)}</Tag>
              <Tag>Total: {formatRupiah(saldoTunaiBank.total_gabungan)}</Tag>
            </Space>
          )}
          <Space wrap>
            <span>Tahun</span>
            <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
            <span>Bulan</span>
            <Select
              allowClear
              placeholder="Semua"
              style={{ width: 120 }}
              value={bulan}
              onChange={setBulan}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: i + 1,
                label: String(i + 1),
              }))}
            />
            <span>Jenis</span>
            <Select
              allowClear
              placeholder="Semua"
              style={{ width: 200 }}
              value={jenis}
              onChange={setJenis}
              options={JENIS_OPTS}
            />
            <Button onClick={load}>Muat ulang</Button>
            <Button
              loading={syncing}
              onClick={async () => {
                setSyncing(true);
                try {
                  const res = await syncBkuSigap({ tahun_anggaran: tahun });
                  message.success(
                    `Sync: berhasil ${res.data?.berhasil ?? 0}, skip ${res.data?.skip_sudah_ada ?? 0}, gagal ${res.data?.gagal ?? 0}`,
                  );
                  if (res.data?.fetch_note) message.info(res.data.fetch_note);
                  load();
                } catch (e) {
                  message.error(e.response?.data?.message || e.message);
                } finally {
                  setSyncing(false);
                }
              }}
            >
              Sync SPJ SIGAP
            </Button>
          </Space>

          {bulan && tutupStatus && (
            <Space wrap align="center" style={{ background: "rgba(0,0,0,0.02)", padding: 12, borderRadius: 8 }}>
              <span>Status tutup buku bulan {bulan}:</span>
              <Tag color={STATUS_TUTUP_LABEL[tutupStatus.status]?.color}>
                {STATUS_TUTUP_LABEL[tutupStatus.status]?.text || tutupStatus.status}
              </Tag>
              {tutupStatus.status !== "BELUM_TUTUP" && (
                <span>Saldo akhir snapshot: {formatRupiah(tutupStatus.saldo_akhir)}</span>
              )}
              {tutupStatus.status === "BELUM_TUTUP" && (
                <Button
                  loading={tutupLoading}
                  onClick={async () => {
                    setTutupLoading(true);
                    try {
                      await tutupBkuBulan(tahun, bulan);
                      message.success("BKU bulan ini ditutup — menunggu persetujuan PPK-SKPD/PA");
                      loadTutupStatus();
                    } catch (e) {
                      message.error(e.response?.data?.message || e.message);
                    } finally {
                      setTutupLoading(false);
                    }
                  }}
                >
                  Tutup Buku
                </Button>
              )}
              {tutupStatus.status === "DITUTUP" && (
                <>
                  <Button
                    type="primary"
                    loading={tutupLoading}
                    onClick={async () => {
                      setTutupLoading(true);
                      try {
                        await setujuiTutupBkuBulan(tahun, bulan);
                        message.success("Tutup buku disetujui — bulan ini terkunci final");
                        loadTutupStatus();
                      } catch (e) {
                        message.error(e.response?.data?.message || e.message);
                      } finally {
                        setTutupLoading(false);
                      }
                    }}
                  >
                    Setujui (PPK/PA)
                  </Button>
                  <Button danger onClick={() => setTolakOpen(true)}>
                    Tolak
                  </Button>
                </>
              )}
            </Space>
          )}

          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 20 }}
          />
        </Space>
      </Card>

      <Modal
        title={`Tolak Tutup Buku — Bulan ${bulan}`}
        open={tolakOpen}
        onCancel={() => setTolakOpen(false)}
        onOk={async () => {
          try {
            await tolakTutupBkuBulan(tahun, bulan, catatanTolak);
            message.success("Tutup buku ditolak — bulan dibuka lagi untuk dikoreksi Bendahara");
            setTolakOpen(false);
            setCatatanTolak("");
            loadTutupStatus();
          } catch (e) {
            message.error(e.response?.data?.message || e.message);
          }
        }}
        destroyOnHidden
      >
        <p>Catatan alasan penolakan (opsional):</p>
        <Input.TextArea rows={3} value={catatanTolak} onChange={(e) => setCatatanTolak(e.target.value)} />
      </Modal>

      <Modal
        title="Pindah Kas Bank ⇄ Tunai"
        open={pindahOpen}
        onCancel={() => setPindahOpen(false)}
        onOk={async () => {
          try {
            const v = await pindahForm.validateFields();
            await pindahKas({
              tahun_anggaran: v.tahun_anggaran,
              tanggal: v.tanggal.format("YYYY-MM-DD"),
              nominal: v.nominal,
              arah: v.arah,
              keterangan: v.keterangan || null,
            });
            message.success("Pemindahan kas tercatat");
            setPindahOpen(false);
            load();
            loadSaldoTunaiBank();
          } catch (e) {
            if (e?.errorFields) return;
            message.error(e.response?.data?.message || e.message);
          }
        }}
        destroyOnHidden
      >
        <Form form={pindahForm} layout="vertical">
          <Form.Item name="tahun_anggaran" label="Tahun anggaran" rules={[{ required: true }]}>
            <InputNumber min={2020} max={2035} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="tanggal" label="Tanggal" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="arah" label="Arah" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "BANK_KE_TUNAI", label: "Tarik dari Bank ke Tunai" },
                { value: "TUNAI_KE_BANK", label: "Setor dari Tunai ke Bank" },
              ]}
            />
          </Form.Item>
          <Form.Item name="nominal" label="Nominal" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="keterangan" label="Keterangan">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
