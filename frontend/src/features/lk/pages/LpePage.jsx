import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  InputNumber,
  Typography,
  Tag,
  Form,
  Input,
  Alert,
  message,
} from "antd";
import { useAuth } from "../../../hooks/useAuth";
import { getLpe, generateLpe, kunciLpe, getLpeValidasi } from "../services/lkApi";
import { formatRupiah } from "../utils/lkFormat.jsx";

const { Title, Text } = Typography;

function canKunci(role) {
  const r = String(role || "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  return r === "SUPER_ADMIN" || r === "PPK_SKPD";
}

export default function LpePage() {
  const { user } = useAuth();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [val, setVal] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [lpe, v] = await Promise.all([getLpe(tahun), getLpeValidasi(tahun)]);
      setPayload(lpe);
      setVal(v);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat LPE");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tahun]);

  return (
    <div style={{ padding: 24 }}>
      <Card loading={loading}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space wrap>
            <Title level={4} style={{ margin: 0 }}>
              Laporan Perubahan Ekuitas (LPE)
            </Title>
            <Tag color={payload?.status === "FINAL" ? "green" : "gold"}>{payload?.status || "—"}</Tag>
            <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
            <Button onClick={load}>Muat ulang validasi</Button>
            {canKunci(user?.role) && (
              <Button danger onClick={async () => { try { await kunciLpe(tahun); message.success("OK"); load(); } catch (e) { message.error(e.response?.data?.message); } }}>
                Kunci LPE
              </Button>
            )}
          </Space>

          {val && (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Alert
                type={val.neraca?.balance ? "success" : "error"}
                showIcon
                message={`Neraca balance: ${val.neraca?.balance ? "YA" : "TIDAK"} (selisih ${formatRupiah(val.neraca?.selisih)})`}
              />
              <Alert
                type={val.lpe_neraca?.cocok ? "success" : "warning"}
                showIcon
                message={`LPE ↔ Neraca (ekuitas): ${val.lpe_neraca?.cocok ? "cocok" : "SELISIH"} ${val.lpe_neraca?.selisih != null ? formatRupiah(val.lpe_neraca.selisih) : "—"}`}
              />
              <Alert
                type={
                  val.lpe_lo?.cocok === true
                    ? "success"
                    : val.lpe_lo?.cocok === false
                      ? "warning"
                      : "info"
                }
                showIcon
                message={`LO ↔ LPE (surplus): ${
                  val.lpe_lo?.cocok === true
                    ? "cocok"
                    : val.lpe_lo?.cocok === false
                      ? `selisih ${formatRupiah(val.lpe_lo?.selisih)}`
                      : "belum ada snapshot LPE — generate LPE dulu"
                }`}
              />
              <Alert
                type={val.lra_bku_belanja?.cocok ? "success" : "info"}
                showIcon
                message={`LRA belanja vs BKU belanja: ${val.lra_bku_belanja?.cocok ? "cocok" : `selisih ${formatRupiah(val.lra_bku_belanja?.selisih)}`}`}
              />
            </Space>
          )}

          <Text strong>Koreksi manual (opsional) lalu generate</Text>
          <Form
            form={form}
            layout="inline"
            initialValues={{ persediaan: 0, aset_tetap: 0, lainnya: 0, kewajiban_konsolidasi: 0 }}
          >
            <Form.Item name="persediaan" label="Koreksi persediaan">
              <Input type="number" step="0.01" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="aset_tetap" label="Koreksi aset tetap">
              <Input type="number" step="0.01" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="lainnya" label="Koreksi lainnya">
              <Input type="number" step="0.01" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="kewajiban_konsolidasi" label="Kewajiban konsolidasi">
              <Input type="number" step="0.01" style={{ width: 160 }} />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                onClick={async () => {
                  try {
                    const v = await form.validateFields();
                    const body = {
                      persediaan: Number(v.persediaan) || 0,
                      aset_tetap: Number(v.aset_tetap) || 0,
                      lainnya: Number(v.lainnya) || 0,
                      kewajiban_konsolidasi: Number(v.kewajiban_konsolidasi) || 0,
                    };
                    const res = await generateLpe(tahun, body);
                    message.success(
                      res.balance_lpe_neraca
                        ? "LPE OK — ekuitas cocok dengan neraca"
                        : `LPE selesai — selisih vs neraca: ${formatRupiah(res.selisih_lpe_neraca)}`,
                    );
                    load();
                  } catch (e) {
                    if (e?.errorFields) return;
                    message.error(e.response?.data?.message || e.message);
                  }
                }}
              >
                Generate LPE
              </Button>
            </Form.Item>
          </Form>

          <Table
            size="small"
            rowKey="id"
            dataSource={payload?.data || []}
            pagination={false}
            columns={[
              { title: "Komponen", dataIndex: "komponen", key: "k" },
              {
                title: "Nilai",
                dataIndex: "nilai_tahun_ini",
                key: "v",
                align: "right",
                render: formatRupiah,
              },
            ]}
          />
        </Space>
      </Card>
    </div>
  );
}
